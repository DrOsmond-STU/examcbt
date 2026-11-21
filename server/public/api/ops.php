<?php
/**
 * TACMS — API operasional staf: monitoring, penilaian, retake, sertifikat, peserta, dashboard.
 * GET  ?view=monitoring|grading|retake|certificates|participants|participant&no=|dashboard
 * POST action=extend|grade|retake_decide|cert_approve|cert_revoke
 * Setiap view & aksi diperiksa terhadap route/permission role (app/rbac.php).
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/enrollstore.php';

start_session();
$me = require_user();
$deny = fn() => json_out(['ok' => false, 'error' => 'forbidden'], 403);
$tz = new DateTimeZone('Asia/Jakarta');
$pname = fn(array $d, string $pid) => $d['participants'][$pid]['name'] ?? $pid;
$anon = fn(string $pid) => 'Peserta #' . substr($pid, -5);   // identitas disamarkan saat penilaian

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $d = enroll_update(function (array &$d) { sweep_attempts($d); return $d; });
    $view = (string)($_GET['view'] ?? '');
    switch ($view) {
        case 'monitoring':
            if (!user_can_route($me, 'a-monitoring')) $deny();
            $live = []; $today = 0; $auto = 0; $startDay = (new DateTimeImmutable('today', $tz))->getTimestamp();
            foreach ($d['attempts'] as $a) {
                if ($a['status'] === 'IN_PROGRESS') $live[] = public_attempt($a) + ['name' => $pname($d, $a['participant']), 'participant' => $a['participant'], 'examName' => TRAININGS[$a['training']]['exams'][$a['exam']]['name'], 'trainingName' => TRAININGS[$a['training']]['name'], 'remaining' => max(0, strtotime($a['deadline']) - time())];
                elseif (!empty($a['submitted_at']) && strtotime($a['submitted_at']) >= $startDay) { $today++; if (!empty($a['auto_submit'])) $auto++; }
            }
            json_out(['ok' => true, 'live' => $live, 'stats' => ['live' => count($live), 'today' => $today, 'auto' => $auto, 'signals' => count(array_filter($live, fn($x) => $x['tabSwitches'] > 3))], 'canExtend' => user_can($me, 'monitoring.write')]);

        case 'grading':
            if (!user_can_route($me, 'a-grading')) $deny();
            $items = []; $done = 0;
            foreach ($d['attempts'] as $a) {
                if (!in_array($a['status'], ['PENDING_REVIEW', 'GRADED'], true)) continue;
                foreach (exam_cfg($a['exam'])['questions'] as $q) {
                    if ($q['type'] !== 'essay') continue;
                    $m = $a['manual'][$q['id']] ?? null;
                    if ($m && isset($m['points'])) { $done++; if (empty($_GET['all'])) continue; }
                    $items[] = ['attempt' => $a['id'], 'question' => $q['id'], 'participant' => $anon($a['participant']), 'exam' => $a['exam'],
                        'examName' => TRAININGS[$a['training']]['name'] . ' — ' . TRAININGS[$a['training']]['exams'][$a['exam']]['name'],
                        'text' => $q['text'], 'answer' => (string)($a['answers'][$q['id']] ?? ''), 'max' => $q['points'], 'rubric' => $q['rubric'],
                        'submittedAt' => $a['submitted_at'], 'graded' => $m];
                }
            }
            usort($items, fn($x, $y) => strcmp($x['submittedAt'], $y['submittedAt']));
            json_out(['ok' => true, 'items' => $items, 'gradedCount' => $done, 'canGrade' => user_can($me, 'grade.write')]);

        case 'retake':
            if (!user_can_route($me, 'a-retake')) $deny();
            $list = [];
            foreach (array_reverse($d['retakes']) as $r) {
                $e = $d['enrollments'][find_enrollment_idx($d, $r['enrollment'])] ?? null;
                $a = $d['attempts'][find_index($d['attempts'], 'id', $r['after_attempt'])] ?? null;
                $cfg = exam_cfg($r['exam'])['retake'];
                $list[] = $r + ['name' => $pname($d, $r['participant']), 'examName' => TRAININGS[$e['training']]['name'] . ' — ' . TRAININGS[$e['training']]['exams'][$r['exam']]['name'],
                    'lastScore' => $a['score'] ?? null, 'attemptNo' => $a['no'] ?? null, 'passing' => exam_cfg($r['exam'])['passing'], 'max' => $cfg['max'],
                    'availableFrom' => $a ? gmdate('c', strtotime($a['submitted_at']) + $cfg['wait_hours'] * 3600) : null];
            }
            $pol = [];
            foreach (EXAM_CONFIG as $x => $c) foreach (TRAININGS as $t) if (isset($t['exams'][$x])) $pol[] = ['exam' => $x, 'name' => $t['name'] . ' — ' . $t['exams'][$x]['name'], 'passing' => $c['passing']] + $c['retake'];
            json_out(['ok' => true, 'requests' => $list, 'policies' => $pol, 'canDecide' => user_can($me, 'retake.decide')]);

        case 'certificates':
            if (!user_can_route($me, 'a-certificates')) $deny();
            json_out(['ok' => true, 'certificates' => array_map(fn($c) => public_certificate($d, $c), array_reverse($d['certificates'])),
                'canApprove' => user_can($me, 'cert.approve'), 'canRevoke' => user_can($me, 'cert.write')]);

        case 'participants':
            if (!user_can_route($me, 'a-participants')) $deny();
            $cnt = []; $certs = [];
            foreach ($d['enrollments'] as $e) if ($e['status'] !== 'CANCELLED') $cnt[$e['participant']][$e['training']] = true;
            foreach ($d['certificates'] as $c) if ($c['status'] === 'ISSUED') $certs[$c['participant']] = ($certs[$c['participant']] ?? 0) + 1;
            $list = [];
            foreach ($d['participants'] as $no => $p) $list[] = ['no' => $no, 'name' => $p['name'], 'email' => $p['email'], 'phone' => $p['phone'] ?? '', 'inst' => $p['inst'] ?? '',
                'emailVerified' => !empty($p['email_verified_at']), 'phoneVerified' => !empty($p['phone_verified_at']), 'trainings' => count($cnt[$no] ?? []), 'certificates' => $certs[$no] ?? 0];
            usort($list, fn($a, $b) => strcmp($b['no'], $a['no']));
            json_out(['ok' => true, 'participants' => $list]);

        case 'participant':
            if (!user_can_route($me, 'a-participants')) $deny();
            $no = (string)($_GET['no'] ?? '');
            if (!isset($d['participants'][$no])) json_out(['ok' => false, 'error' => 'not_found'], 404);
            $p = $d['participants'][$no] + ['no' => $no];
            $en = array_values(array_map(fn($e) => public_enrollment($d, $e) + ['result' => $e['result'] ?? null, 'finalScore' => $e['final_score'] ?? null], array_filter($d['enrollments'], fn($e) => $e['participant'] === $no)));
            $at = array_values(array_map(fn($a) => public_attempt($a) + ['examName' => TRAININGS[$a['training']]['name'] . ' — ' . TRAININGS[$a['training']]['exams'][$a['exam']]['name']], array_filter($d['attempts'], fn($a) => $a['participant'] === $no)));
            $ce = array_values(array_map(fn($c) => public_certificate($d, $c), array_filter($d['certificates'], fn($c) => $c['participant'] === $no)));
            json_out(['ok' => true, 'participant' => ['no' => $no, 'name' => $p['name'], 'email' => $p['email'], 'phone' => $p['phone'] ?? '', 'inst' => $p['inst'] ?? '', 'emailVerifiedAt' => $p['email_verified_at'] ?? null, 'phoneVerifiedAt' => $p['phone_verified_at'] ?? null],
                'enrollments' => $en, 'attempts' => $at, 'certificates' => $ce]);

        case 'dashboard':
            if (!user_can_route($me, 'a-dashboard')) $deny();
            $active = count(array_filter(TRAININGS, fn($t) => in_array($t['status'], ['Aktif', 'Terjadwal'], true)));
            $graded = array_filter($d['attempts'], fn($a) => $a['status'] === 'GRADED');
            $pendingEssay = 0;
            foreach ($d['attempts'] as $a) if ($a['status'] === 'PENDING_REVIEW') foreach (exam_cfg($a['exam'])['questions'] as $q) if ($q['type'] === 'essay' && !isset($a['manual'][$q['id']]['points'])) $pendingEssay++;
            json_out(['ok' => true, 'kpi' => [
                'participants' => count($d['participants']), 'trainings' => $active, 'trainingsTotal' => count(TRAININGS),
                'live' => count(array_filter($d['attempts'], fn($a) => $a['status'] === 'IN_PROGRESS')),
                'certificates' => count(array_filter($d['certificates'], fn($c) => $c['status'] === 'ISSUED')),
                'certPending' => count(array_filter($d['certificates'], fn($c) => $c['status'] === 'PENDING_APPROVAL')),
                'attempts' => count($graded), 'passRate' => $graded ? round(count(array_filter($graded, fn($a) => $a['result'] === 'PASSED')) / count($graded) * 100, 1) : null,
                'avgScore' => $graded ? round(array_sum(array_column($graded, 'score')) / count($graded), 1) : null,
                'pendingEssay' => $pendingEssay, 'retakePending' => count(array_filter($d['retakes'], fn($r) => $r['status'] === 'PENDING')),
                'enrollments' => count(array_filter($d['enrollments'], fn($e) => $e['status'] !== 'CANCELLED')),
            ]]);
    }
    json_out(['ok' => false, 'error' => 'view'], 400);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
if (!check_csrf()) json_out(['ok' => false, 'error' => 'csrf'], 403);
$in = read_json_body();
$action = (string)($in['action'] ?? '');

switch ($action) {
    case 'extend': {
        if (!user_can($me, 'monitoring.write')) $deny();
        $min = max(1, min(60, (int)($in['minutes'] ?? 10)));
        $reason = trim(mb_substr((string)($in['reason'] ?? ''), 0, 200));
        if ($reason === '') json_out(['ok' => false, 'error' => 'reason'], 422);
        $res = enroll_update(function (array &$d) use ($in, $min) {
            $i = find_index($d['attempts'], 'id', (string)($in['attempt'] ?? ''));
            if ($i === null || $d['attempts'][$i]['status'] !== 'IN_PROGRESS') return ['error' => 'not_found'];
            $d['attempts'][$i]['deadline'] = gmdate('c', strtotime($d['attempts'][$i]['deadline']) + $min * 60);
            return ['deadline' => $d['attempts'][$i]['deadline']];
        });
        if (!empty($res['error'])) json_out(['ok' => false] + $res, 404);
        audit('attempt.extend', $me['username'], ($in['attempt'] ?? '') . " · +$min menit · alasan: $reason");
        json_out(['ok' => true] + $res);
    }

    case 'grade': {
        if (!user_can($me, 'grade.write')) $deny();
        $res = enroll_update(function (array &$d) use ($in, $me) {
            $i = find_index($d['attempts'], 'id', (string)($in['attempt'] ?? ''));
            if ($i === null) return ['error' => 'not_found'];
            $a = &$d['attempts'][$i];
            if (!in_array($a['status'], ['PENDING_REVIEW', 'GRADED'], true)) return ['error' => 'not_gradable'];
            $q = exam_q($a['exam'], (string)($in['question'] ?? ''));
            if (!$q || $q['type'] !== 'essay') return ['error' => 'not_found'];
            $scores = array_values((array)($in['rubric'] ?? []));
            if (count($scores) !== count($q['rubric'])) return ['error' => 'rubric'];
            $sum = 0;
            foreach ($q['rubric'] as $k => $r) { $v = (int)$scores[$k]; if ($v < 0 || $v > $r['max']) return ['error' => 'rubric']; $sum += $v; }
            $points = round($sum / array_sum(array_column($q['rubric'], 'max')) * $q['points'], 2);
            $before = $a['manual'][$q['id']]['points'] ?? null;
            $a['manual'][$q['id']] = ['points' => $points, 'rubric' => $scores, 'feedback' => trim(mb_substr((string)($in['feedback'] ?? ''), 0, 1000)), 'grader' => $me['username'], 'graded_at' => gmdate('c')];
            unset($a['graded_at']);
            attempt_compute($a);
            enrollment_after_attempt($d, $a['enrollment']);
            return ['points' => $points, 'before' => $before, 'status' => $a['status'], 'score' => $a['score'] ?? null, 'result' => $a['result'] ?? null];
        });
        if (!empty($res['error'])) json_out(['ok' => false] + $res, $res['error'] === 'not_found' ? 404 : 422);
        audit('grade.finalize', $me['username'], ($in['attempt'] ?? '') . ' / ' . ($in['question'] ?? '') . ' · ' . ($res['before'] !== null ? "nilai {$res['before']} → " : '') . "{$res['points']} poin" . ($res['score'] !== null ? " · nilai akhir {$res['score']} ({$res['result']})" : ' · menunggu soal lain'));
        json_out(['ok' => true] + $res);
    }

    case 'retake_decide': {
        if (!user_can($me, 'retake.decide')) $deny();
        $approve = ($in['decision'] ?? '') === 'approve';
        $note = trim(mb_substr((string)($in['note'] ?? ''), 0, 300));
        if (!$approve && $note === '') json_out(['ok' => false, 'error' => 'reason'], 422);
        $res = enroll_update(function (array &$d) use ($in, $approve, $note, $me) {
            $i = find_index($d['retakes'], 'id', (string)($in['id'] ?? ''));
            if ($i === null) return ['error' => 'not_found'];
            if ($d['retakes'][$i]['status'] !== 'PENDING') return ['error' => 'decided'];
            $d['retakes'][$i]['status'] = $approve ? 'APPROVED' : 'REJECTED';
            $d['retakes'][$i]['note'] = $note;
            $d['retakes'][$i]['decided_by'] = $me['username'];
            $d['retakes'][$i]['decided_at'] = gmdate('c');
            return $d['retakes'][$i];
        });
        if (!empty($res['error'])) json_out(['ok' => false] + $res, 409);
        audit($approve ? 'retake.approve' : 'retake.reject', $me['username'], $res['id'] . ' · ' . $res['participant'] . ' · ' . $res['exam'] . ($note ? " · $note" : ''));
        json_out(['ok' => true, 'request' => $res]);
    }

    case 'cert_approve':
    case 'cert_revoke': {
        $revoke = $action === 'cert_revoke';
        if (!user_can($me, $revoke ? 'cert.write' : 'cert.approve')) $deny();
        $reason = trim(mb_substr((string)($in['reason'] ?? ''), 0, 200));
        if ($revoke && $reason === '') json_out(['ok' => false, 'error' => 'reason'], 422);
        $res = enroll_update(function (array &$d) use ($in, $revoke, $reason, $me) {
            $i = find_index($d['certificates'], 'id', (string)($in['id'] ?? ''));
            if ($i === null) return ['error' => 'not_found'];
            $c = $d['certificates'][$i];
            if ($revoke) {
                if ($c['status'] !== 'ISSUED') return ['error' => 'state'];
                $d['certificates'][$i]['status'] = 'REVOKED';
                $d['certificates'][$i]['revoked_reason'] = $reason;
                $d['certificates'][$i]['revoked_at'] = gmdate('c');
                $d['certificates'][$i]['revoked_by'] = $me['username'];
            } else {
                if ($c['status'] !== 'PENDING_APPROVAL') return ['error' => 'state'];
                certificate_issue($d, $i, $me['username']);
            }
            return public_certificate($d, $d['certificates'][$i]);
        });
        if (!empty($res['error'])) json_out(['ok' => false] + $res, 409);
        audit($revoke ? 'certificate.revoke' : 'certificate.issue', $me['username'], ($res['no'] ?? $res['id']) . ' · ' . $res['participant'] . ($revoke ? " · alasan: $reason" : ''));
        json_out(['ok' => true, 'certificate' => $res]);
    }
}
json_out(['ok' => false, 'error' => 'action'], 400);
