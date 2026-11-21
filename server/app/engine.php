<?php
/**
 * TACMS — mesin ujian: attempt, penilaian otomatis, penilaian manual, retake, dan sertifikat.
 * Mengikuti SRS 4.9–4.12, 5.4–5.8 dan flowchart: Start Exam → Answer → Auto Save → Submit/Time Expired →
 * Calculate Score → Passed? → (Retake: Wait / Request Approval) atau (Certificate Eligibility → Download).
 * Semua data di app/storage/enrollment.json (kunci: attempts, retakes, certificates).
 */
declare(strict_types=1);
require_once __DIR__ . '/questions.php';

function exam_cfg(string $exam): array { return EXAM_CONFIG[$exam] ?? ['passing' => 70, 'retake' => ['max' => 1, 'wait_hours' => 0, 'approval' => false, 'scoring' => 'LATEST_SCORE'], 'questions' => []]; }
function exam_q(string $exam, string $qid): ?array { foreach (exam_cfg($exam)['questions'] as $q) if ($q['id'] === $qid) return $q; return null; }
function exam_max(string $exam): float { return (float)array_sum(array_column(exam_cfg($exam)['questions'], 'points')); }

/** Soal untuk browser peserta: tanpa kunci, rubrik, atau jawaban yang diterima. */
function public_question(array $q): array
{
    $out = ['id' => $q['id'], 'type' => $q['type'], 'points' => $q['points'], 'comp' => $q['comp'], 'text' => $q['text']];
    foreach (['options', 'items', 'left', 'right', 'chart'] as $k) if (isset($q[$k])) $out[$k] = $q[$k];
    return $out;
}

function norm_text(string $s): string { return trim(preg_replace('/\s+/', ' ', mb_strtolower($s))); }

/** Poin soal objektif; null untuk soal yang dinilai manual. */
function grade_objective(array $q, $a): ?float
{
    $p = (float)$q['points'];
    switch ($q['type']) {
        case 'single': case 'tf':
            return ($a !== null && $a !== '' && (int)$a === (int)$q['key']) ? $p : 0.0;
        case 'multi':
            $sel = array_map('intval', (array)$a); $key = $q['key'];
            if (!$sel) return 0.0;
            $right = count(array_intersect($sel, $key)); $wrong = count(array_diff($sel, $key));
            return round(max(0, ($right - $wrong) / count($key)) * $p, 2);   // proporsional, salah pilih mengurangi
        case 'blank':
            return in_array(norm_text((string)$a), $q['accept'], true) ? $p : 0.0;
        case 'short':
            $t = norm_text((string)$a);
            if ($t === '') return 0.0;
            foreach ($q['accept'] as $k) if (mb_strpos($t, $k) !== false) return $p;
            return 0.0;
        case 'numeric':
            $v = str_replace(',', '.', trim((string)$a));
            return (is_numeric($v) && abs((float)$v - (float)$q['key']) <= (float)($q['tol'] ?? 0)) ? $p : 0.0;
        case 'order':
            return (is_array($a) && array_map('intval', array_values($a)) === $q['key']) ? $p : 0.0;
        case 'match':
            if (!is_array($a)) return 0.0;
            $ok = 0; foreach ($q['key'] as $i => $k) if (isset($a[$i]) && $a[$i] !== '' && (int)$a[$i] === $k) $ok++;
            return round($ok / count($q['key']) * $p, 2);
        default:
            return null; // essay
    }
}

function find_index(array $list, string $key, string $val): ?int { foreach ($list as $i => $x) if (($x[$key] ?? null) === $val) return $i; return null; }
function find_enrollment_idx(array $d, string $id): ?int { return find_index($d['enrollments'], 'id', $id); }
function enrollment_attempts(array $d, string $eid): array { return array_values(array_filter($d['attempts'] ?? [], fn($a) => $a['enrollment'] === $eid)); }

/** Hitung nilai bila semua soal manual sudah dinilai. */
function attempt_compute(array &$a): void
{
    $cfg = exam_cfg($a['exam']);
    $pts = 0.0; $max = 0.0; $pending = false;
    foreach ($cfg['questions'] as $q) {
        $max += $q['points'];
        if ($q['type'] === 'essay') {
            if (!isset($a['manual'][$q['id']]['points'])) { $pending = true; continue; }
            $pts += $a['manual'][$q['id']]['points'];
        } else {
            $pts += $a['auto'][$q['id']] ?? 0;
        }
    }
    $a['points'] = round($pts, 2); $a['max'] = $max;
    if ($pending) { $a['status'] = 'PENDING_REVIEW'; $a['score'] = null; $a['result'] = null; return; }
    $a['score'] = $max > 0 ? round($pts / $max * 100, 2) : 0;
    $a['result'] = $a['score'] >= $cfg['passing'] ? 'PASSED' : 'FAILED';
    $a['status'] = 'GRADED';
    $a['graded_at'] = $a['graded_at'] ?? gmdate('c');
}

/** Selesaikan attempt (submit manual atau waktu habis), nilai otomatis, lalu perbarui enrollment & sertifikat. */
function attempt_finalize(array &$d, int $ai, bool $auto, ?int $at = null): void
{
    $a = &$d['attempts'][$ai];
    if ($a['status'] !== 'IN_PROGRESS') return;
    $a['submitted_at'] = gmdate('c', $at ?? time());
    $a['auto_submit'] = $auto;
    $a['auto'] = [];
    foreach (exam_cfg($a['exam'])['questions'] as $q) {
        $g = grade_objective($q, $a['answers'][$q['id']] ?? null);
        if ($g !== null) $a['auto'][$q['id']] = $g;
    }
    $a['manual'] = $a['manual'] ?? [];
    attempt_compute($a);
    enrollment_after_attempt($d, $a['enrollment']);
}

/** Selesaikan otomatis attempt yang melewati batas waktu server (SRS FR-EXE-007). */
function sweep_attempts(array &$d): int
{
    $n = 0;
    foreach ($d['attempts'] ?? [] as $i => $a) {
        if ($a['status'] === 'IN_PROGRESS' && strtotime($a['deadline']) <= time()) { attempt_finalize($d, $i, true, strtotime($a['deadline'])); $n++; }
    }
    return $n;
}

/** Hasil enrollment menurut kebijakan nilai akhir (SRS 5.6). */
function enrollment_result(array $d, array $e): array
{
    $list = array_values(array_filter(enrollment_attempts($d, $e['id']), fn($a) => $a['status'] !== 'IN_PROGRESS'));
    if (!$list) return ['result' => null, 'score' => null];
    $graded = array_values(array_filter($list, fn($a) => $a['status'] === 'GRADED'));
    $pending = count($graded) < count($list);
    $policy = exam_cfg($e['exam'])['retake']['scoring'];
    $passing = exam_cfg($e['exam'])['passing'];
    if (!$graded) return ['result' => 'PENDING_REVIEW', 'score' => null];
    $scores = array_column($graded, 'score');
    switch ($policy) {
        case 'PASS_ONCE': $score = max($scores); $res = in_array('PASSED', array_column($graded, 'result'), true) ? 'PASSED' : 'FAILED'; break;
        case 'HIGHEST_SCORE': $score = max($scores); $res = $score >= $passing ? 'PASSED' : 'FAILED'; break;
        case 'FIRST_ATTEMPT': $score = $graded[0]['score']; $res = $score >= $passing ? 'PASSED' : 'FAILED'; break;
        case 'AVERAGE_SCORE': $score = round(array_sum($scores) / count($scores), 2); $res = $score >= $passing ? 'PASSED' : 'FAILED'; break;
        default: $score = end($scores); $res = $score >= $passing ? 'PASSED' : 'FAILED';
    }
    // Attempt terbaru masih menunggu penilaian → hasil akhir belum final
    if ($pending && $res !== 'PASSED') return ['result' => 'PENDING_REVIEW', 'score' => $score];
    return ['result' => $res, 'score' => $score];
}

function enrollment_after_attempt(array &$d, string $eid): void
{
    $i = find_enrollment_idx($d, $eid);
    if ($i === null) return;
    $e = &$d['enrollments'][$i];
    $r = enrollment_result($d, $e);
    $e['result'] = $r['result']; $e['final_score'] = $r['score'];
    $used = count(enrollment_attempts($d, $eid));
    $max = exam_cfg($e['exam'])['retake']['max'];
    if ($r['result'] === 'PASSED' || ($r['result'] === 'FAILED' && $used >= $max)) $e['status'] = 'COMPLETED';
    elseif ($e['status'] === 'IN_PROGRESS') $e['status'] = 'SCHEDULED';
    if ($r['result'] === 'PASSED') certificate_check($d, $e['participant'], $e['training']);
}

/* ---------- Retake (SRS 4.11, 5.6) ---------- */
function attempts_allowed(array $d, array $e): int
{
    $extra = count(array_filter($d['retakes'] ?? [], fn($r) => $r['enrollment'] === $e['id'] && $r['status'] === 'APPROVED'));
    $cfg = exam_cfg($e['exam'])['retake'];
    if (!$cfg['approval']) return $cfg['max'];
    return min($cfg['max'], 1 + $extra);
}

/**
 * Status retake untuk enrollment:
 * none (belum ada attempt) | in_progress | pending_review | passed | available | wait | needs_request | requested | rejected | exhausted
 */
function retake_state(array $d, array $e): array
{
    $atts = enrollment_attempts($d, $e['id']);
    $cfg = exam_cfg($e['exam'])['retake'];
    $out = ['used' => count($atts), 'max' => $cfg['max'], 'allowed' => attempts_allowed($d, $e), 'policy' => $cfg, 'availableFrom' => null, 'request' => null];
    if (!$atts) return ['state' => 'none'] + $out;
    $last = end($atts);
    if ($last['status'] === 'IN_PROGRESS') return ['state' => 'in_progress', 'attempt' => $last['id']] + $out;
    if (($e['result'] ?? null) === 'PASSED') return ['state' => 'passed'] + $out;
    if ($last['status'] === 'PENDING_REVIEW') return ['state' => 'pending_review'] + $out;
    if (count($atts) >= $cfg['max']) return ['state' => 'exhausted'] + $out;
    $from = strtotime($last['submitted_at']) + $cfg['wait_hours'] * 3600;
    $out['availableFrom'] = gmdate('c', $from);
    $reqs = array_values(array_filter($d['retakes'] ?? [], fn($r) => $r['enrollment'] === $e['id'] && $r['after_attempt'] === $last['id']));
    $req = $reqs ? end($reqs) : null;
    $out['request'] = $req ? ['id' => $req['id'], 'status' => $req['status'], 'note' => $req['note'] ?? null] : null;
    if ($cfg['approval']) {
        if (!$req) return ['state' => 'needs_request'] + $out;
        if ($req['status'] === 'PENDING') return ['state' => 'requested'] + $out;
        if ($req['status'] === 'REJECTED') return ['state' => 'rejected'] + $out;
    }
    return ['state' => $from > time() ? 'wait' : 'available'] + $out;
}

/* ---------- Sertifikat (SRS 4.12, 5.7, 5.8) ---------- */
/** Buat sertifikat PENDING_APPROVAL bila semua ujian pelatihan sudah lulus (eligibility). */
function certificate_check(array &$d, string $pid, string $training): void
{
    $rule = CERT_RULES[$training] ?? null;
    if (!$rule) return;
    foreach ($d['certificates'] ?? [] as $c) if ($c['participant'] === $pid && $c['training'] === $training && $c['status'] !== 'REVOKED') return;
    $exams = array_keys(TRAININGS[$training]['exams']);
    $passed = [];
    foreach ($d['enrollments'] as $e) if ($e['participant'] === $pid && $e['training'] === $training && ($e['result'] ?? null) === 'PASSED') $passed[$e['exam']] = $e;
    // Competency: semua ujian pelatihan harus lulus. Attendance/Completion: ujian yang diikuti sudah lulus semua.
    $required = $rule['type'] === 'Competency' ? $exams : array_values(array_unique(array_map(fn($e) => $e['exam'], array_filter($d['enrollments'], fn($e) => $e['participant'] === $pid && $e['training'] === $training && $e['status'] !== 'CANCELLED'))));
    foreach ($required as $x) if (!isset($passed[$x])) return;
    $d['certificates'][] = [
        'id' => 'CRT-' . strtoupper(bin2hex(random_bytes(4))), 'no' => null, 'token' => null, 'participant' => $pid, 'training' => $training,
        'type' => $rule['type'], 'status' => 'PENDING_APPROVAL', 'method' => 'Generator', 'created_at' => gmdate('c'),
        'score' => round(array_sum(array_map(fn($e) => (float)($e['final_score'] ?? 0), $passed)) / max(1, count($passed)), 2),
    ];
}

function certificate_issue(array &$d, int $ci, string $by, ?int $at = null): void
{
    $c = &$d['certificates'][$ci];
    $rule = CERT_RULES[$c['training']];
    $t = $at ?? time();
    $year = gmdate('Y', $t);
    $d['seq']['cert'] = ($d['seq']['cert'] ?? 700) + 1;
    $c['no'] = sprintf('LSPTN/%s/%s/%05d', $rule['code'], $year, $d['seq']['cert']);
    $c['token'] = 'v_' . rtrim(strtr(base64_encode(random_bytes(12)), '+/', '-_'), '=');
    $c['status'] = 'ISSUED';
    $c['issued_at'] = gmdate('c', $t);
    $c['issued_by'] = $by;
    $c['expires_at'] = $rule['valid_years'] ? gmdate('c', strtotime('+' . $rule['valid_years'] . ' years', $t)) : null;
}

function certificate_public_state(array $c): string
{
    if ($c['status'] === 'REVOKED') return 'REVOKED';
    if ($c['status'] !== 'ISSUED') return 'NOT_FOUND';
    if (!empty($c['expires_at']) && strtotime($c['expires_at']) < time()) return 'EXPIRED';
    return 'VALID';
}

function public_certificate(array $d, array $c): array
{
    $p = $d['participants'][$c['participant']] ?? [];
    return [
        'id' => $c['id'], 'no' => $c['no'], 'token' => $c['token'], 'participant' => $c['participant'], 'name' => $p['name'] ?? '', 'email' => $p['email'] ?? '',
        'training' => $c['training'], 'trainingName' => TRAININGS[$c['training']]['name'] ?? $c['training'], 'type' => $c['type'], 'method' => $c['method'],
        'status' => $c['status'], 'state' => certificate_public_state($c), 'createdAt' => $c['created_at'], 'issuedAt' => $c['issued_at'] ?? null,
        'expiresAt' => $c['expires_at'] ?? null, 'issuedBy' => $c['issued_by'] ?? null, 'score' => $c['score'] ?? null,
        'revokedReason' => $c['revoked_reason'] ?? null, 'revokedAt' => $c['revoked_at'] ?? null,
    ];
}

/** Ringkasan attempt untuk peserta/admin (tanpa kunci jawaban). */
function public_attempt(array $a, bool $withAnswers = false): array
{
    $out = [
        'id' => $a['id'], 'enrollment' => $a['enrollment'], 'exam' => $a['exam'], 'no' => $a['no'], 'status' => $a['status'],
        'startedAt' => $a['started_at'], 'deadline' => $a['deadline'], 'submittedAt' => $a['submitted_at'] ?? null, 'autoSubmit' => $a['auto_submit'] ?? false,
        'score' => $a['score'] ?? null, 'result' => $a['result'] ?? null, 'points' => $a['points'] ?? null, 'max' => $a['max'] ?? exam_max($a['exam']),
        'answered' => count(array_filter($a['answers'] ?? [], fn($v) => $v !== null && $v !== '' && $v !== [])), 'total' => count($a['order']),
        'tabSwitches' => $a['tab_switches'] ?? 0, 'lastSave' => $a['last_save'] ?? null,
    ];
    if ($withAnswers) { $out['answers'] = (object)($a['answers'] ?? []); $out['flags'] = (object)($a['flags'] ?? []); }
    return $out;
}

/** Capaian per kompetensi (hanya bila attempt sudah dinilai). */
function attempt_breakdown(array $a): array
{
    $by = [];
    foreach (exam_cfg($a['exam'])['questions'] as $q) {
        $c = $q['comp'];
        $by[$c] = $by[$c] ?? ['comp' => $c, 'points' => 0, 'max' => 0, 'pending' => false];
        $by[$c]['max'] += $q['points'];
        if ($q['type'] === 'essay') {
            if (isset($a['manual'][$q['id']]['points'])) $by[$c]['points'] += $a['manual'][$q['id']]['points']; else $by[$c]['pending'] = true;
        } else $by[$c]['points'] += $a['auto'][$q['id']] ?? 0;
    }
    return array_values(array_map(fn($x) => $x + ['pct' => $x['pending'] ? null : round($x['points'] / max(1, $x['max']) * 100)], $by));
}
