<?php
/**
 * TACMS — API ujian peserta (SRS 4.9, 8.3, flowchart: Start Exam → Answer → Auto Save → Submit/Time Expired → Calculate Score).
 * GET  ?enrollment=ID   : instruksi, gate akses, status retake
 * GET  ?attempt=ID      : soal + jawaban tersimpan + sisa waktu (sedang berjalan) atau hasil (selesai)
 * POST start            : buat attempt dengan snapshot urutan soal (server memeriksa ulang semua gate)
 * POST save             : simpan jawaban (idempotent) — waktu habis → otomatis submit
 * POST submit           : kirim jawaban → nilai otomatis; essay → PENDING_REVIEW
 * POST retake_request   : ajukan ujian ulang (bila kebijakan memerlukan persetujuan)
 * Kunci jawaban tidak pernah dikirim ke browser.
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/enrollstore.php';

start_session();
$me = current_participant();
if (!$me || !$me['no']) json_out(['ok' => false, 'error' => 'auth'], 401);
$pid = $me['no'];

function own_enrollment(array $d, string $id, string $pid): ?array { $i = find_enrollment_idx($d, $id); return ($i !== null && $d['enrollments'][$i]['participant'] === $pid) ? $d['enrollments'][$i] : null; }
function cert_for(array $d, string $pid, string $training): ?array { foreach (array_reverse($d['certificates']) as $c) if ($c['participant'] === $pid && $c['training'] === $training) return public_certificate($d, $c); return null; }

function attempt_payload(array $d, array $a, string $pid): array
{
    $e = own_enrollment($d, $a['enrollment'], $pid);
    $t = TRAININGS[$a['training'] ?? $e['training']];
    $base = public_attempt($a, true) + ['trainingName' => $t['name'], 'examName' => $t['exams'][$a['exam']]['name'], 'passing' => exam_cfg($a['exam'])['passing']];
    if ($a['status'] === 'IN_PROGRESS') {
        $qs = [];
        foreach ($a['order'] as $qid) { $q = exam_q($a['exam'], $qid); if ($q) $qs[] = public_question($q); }
        return $base + ['questions' => $qs, 'remaining' => max(0, strtotime($a['deadline']) - time())];
    }
    $view = $e ? enrollment_view($d, $e, $GLOBALS['me']) : null;
    return $base + [
        'breakdown' => attempt_breakdown($a), 'enrollmentResult' => $e['result'] ?? null, 'finalScore' => $e['final_score'] ?? null,
        'retake' => $view['retake'] ?? null, 'canStart' => $view['canStart'] ?? false, 'certificate' => $e ? cert_for($d, $pid, $e['training']) : null,
        'scoring' => exam_cfg($a['exam'])['retake']['scoring'],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $d = enroll_update(function (array &$d) { sweep_attempts($d); return $d; });
    if (!empty($_GET['attempt'])) {
        $i = find_index($d['attempts'], 'id', (string)$_GET['attempt']);
        if ($i === null || $d['attempts'][$i]['participant'] !== $pid) json_out(['ok' => false, 'error' => 'not_found'], 404);
        json_out(['ok' => true, 'attempt' => attempt_payload($d, $d['attempts'][$i], $pid)]);
    }
    $e = own_enrollment($d, (string)($_GET['enrollment'] ?? ''), $pid);
    if (!$e) json_out(['ok' => false, 'error' => 'not_found'], 404);
    $v = enrollment_view($d, $e, $me);
    $cfg = exam_cfg($e['exam']);
    json_out(['ok' => true, 'enrollment' => $v, 'rules' => ['duration' => $v['duration'], 'questions' => count($cfg['questions']), 'passing' => $cfg['passing'], 'retake' => $cfg['retake'], 'late' => $e['late']],
        'certificate' => cert_for($d, $pid, $e['training'])]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
if (!check_csrf()) json_out(['ok' => false, 'error' => 'csrf'], 403);
$in = read_json_body();
$action = (string)($in['action'] ?? '');

switch ($action) {
    case 'start': {
        $eid = (string)($in['enrollment'] ?? '');
        $res = enroll_update(function (array &$d) use ($eid, $pid, $me) {
            sweep_attempts($d);
            $i = find_enrollment_idx($d, $eid);
            if ($i === null || $d['enrollments'][$i]['participant'] !== $pid) return ['error' => 'not_found'];
            $e = $d['enrollments'][$i];
            foreach ($d['attempts'] as $a) if ($a['enrollment'] === $eid && $a['status'] === 'IN_PROGRESS') return ['attempt' => $a['id'], 'resumed' => true];
            // Satu attempt aktif per peserta (SRS 5.4)
            foreach ($d['attempts'] as $a) if ($a['participant'] === $pid && $a['status'] === 'IN_PROGRESS') return ['error' => 'other_active'];
            $p = $d['participants'][$pid] + ['no' => $pid];
            $v = enrollment_view($d, $e, $p);
            if (!$v['canStart']) return ['error' => 'gate', 'gates' => $v['gates']];
            $now = time();
            $start = strtotime($e['start']); $end = strtotime($e['end']);
            if ($e['late'] === 'BLOCK' && $now > $start + 1800 && !count(enrollment_attempts($d, $eid))) return ['error' => 'late_blocked'];
            $dur = (TRAININGS[$e['training']]['exams'][$e['exam']]['duration'] ?? 60) * 60 + (int)($e['duration_bonus'] ?? 0);
            $deadline = min($now + $dur, $end);
            $order = array_column(exam_cfg($e['exam'])['questions'], 'id');
            shuffle($order);   // urutan soal diacak per attempt dan disimpan sebagai snapshot
            $d['seq']['att']++;
            $id = 'ATT-' . $d['seq']['att'];
            $d['attempts'][] = ['id' => $id, 'enrollment' => $eid, 'participant' => $pid, 'training' => $e['training'], 'exam' => $e['exam'], 'exam_version' => 'v3',
                'no' => count(enrollment_attempts($d, $eid)) + 1, 'order' => $order, 'answers' => [], 'flags' => [], 'started_at' => gmdate('c', $now),
                'deadline' => gmdate('c', $deadline), 'status' => 'IN_PROGRESS', 'tab_switches' => 0];
            $d['enrollments'][$i]['status'] = 'IN_PROGRESS';
            if (!empty($e['voucher_hash']) && isset($d['vouchers'][$e['voucher_hash']]) && $d['vouchers'][$e['voucher_hash']]['status'] === 'BOUND') {
                $d['vouchers'][$e['voucher_hash']]['status'] = 'REDEEMED';
                $d['vouchers'][$e['voucher_hash']]['redeemed_at'] = gmdate('c', $now);
            }
            return ['attempt' => $id, 'resumed' => false];
        });
        if (!empty($res['error'])) json_out(['ok' => false] + $res, 409);
        if (!$res['resumed']) audit('attempt.start', $pid, $res['attempt'] . ' · ' . $eid);
        json_out(['ok' => true] + $res);
    }

    case 'save': {
        $aid = (string)($in['attempt'] ?? '');
        $res = enroll_update(function (array &$d) use ($aid, $pid, $in) {
            $i = find_index($d['attempts'], 'id', $aid);
            if ($i === null || $d['attempts'][$i]['participant'] !== $pid) return ['error' => 'not_found'];
            if ($d['attempts'][$i]['status'] === 'IN_PROGRESS' && strtotime($d['attempts'][$i]['deadline']) <= time()) { attempt_finalize($d, $i, true, strtotime($d['attempts'][$i]['deadline'])); return ['error' => 'time_up']; }
            if ($d['attempts'][$i]['status'] !== 'IN_PROGRESS') return ['error' => 'closed'];
            $a = &$d['attempts'][$i];
            foreach ((array)($in['answers'] ?? []) as $qid => $val) {
                if (!in_array($qid, $a['order'], true)) continue;
                $q = exam_q($a['exam'], $qid);
                if (is_string($val)) $val = mb_substr($val, 0, $q['type'] === 'essay' ? 10000 : 200);
                elseif (is_array($val)) $val = array_slice($val, 0, 20);
                elseif (!is_int($val) && !is_float($val) && $val !== null) continue;
                $a['answers'][$qid] = $val;
            }
            foreach ((array)($in['flags'] ?? []) as $qid => $f) if (in_array($qid, $a['order'], true)) $a['flags'][$qid] = (bool)$f;
            if (isset($in['tabSwitches'])) $a['tab_switches'] = max((int)$a['tab_switches'], min(999, (int)$in['tabSwitches']));
            $a['last_save'] = gmdate('c');
            return ['savedAt' => $a['last_save'], 'remaining' => max(0, strtotime($a['deadline']) - time())];
        });
        if (!empty($res['error'])) json_out(['ok' => false] + $res, $res['error'] === 'not_found' ? 404 : 409);
        json_out(['ok' => true] + $res);
    }

    case 'submit': {
        $aid = (string)($in['attempt'] ?? '');
        $res = enroll_update(function (array &$d) use ($aid, $pid) {
            $i = find_index($d['attempts'], 'id', $aid);
            if ($i === null || $d['attempts'][$i]['participant'] !== $pid) return ['error' => 'not_found'];
            $auto = strtotime($d['attempts'][$i]['deadline']) <= time();
            attempt_finalize($d, $i, $auto, $auto ? strtotime($d['attempts'][$i]['deadline']) : null);
            $a = $d['attempts'][$i];
            return ['status' => $a['status'], 'result' => $a['result'] ?? null, 'score' => $a['score'] ?? null, 'auto' => $auto];
        });
        if (!empty($res['error'])) json_out(['ok' => false] + $res, 404);
        audit('attempt.submit', $pid, "$aid · " . ($res['auto'] ? 'waktu habis' : 'submit manual') . ' · ' . $res['status'] . ($res['score'] !== null ? ' · nilai ' . $res['score'] : ''));
        json_out(['ok' => true, 'attempt' => $aid] + $res);
    }

    case 'retake_request': {
        $eid = (string)($in['enrollment'] ?? '');
        $reason = trim(mb_substr((string)($in['reason'] ?? ''), 0, 300));
        $res = enroll_update(function (array &$d) use ($eid, $pid, $reason) {
            $e = own_enrollment($d, $eid, $pid);
            if (!$e) return ['error' => 'not_found'];
            $rs = retake_state($d, $e);
            if ($rs['state'] !== 'needs_request') return ['error' => 'not_allowed', 'state' => $rs['state']];
            $atts = enrollment_attempts($d, $eid);
            $d['seq']['ret']++;
            $id = sprintf('RTK-%05d', $d['seq']['ret']);
            $d['retakes'][] = ['id' => $id, 'enrollment' => $eid, 'participant' => $pid, 'exam' => $e['exam'], 'after_attempt' => end($atts)['id'], 'reason' => $reason, 'status' => 'PENDING', 'created_at' => gmdate('c')];
            return ['id' => $id];
        });
        if (!empty($res['error'])) json_out(['ok' => false] + $res, 409);
        audit('retake.request', $pid, $res['id'] . ' · ' . $eid);
        json_out(['ok' => true] + $res);
    }
}
json_out(['ok' => false, 'error' => 'action'], 400);
