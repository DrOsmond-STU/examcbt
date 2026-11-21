<?php
/**
 * TACMS — API enrollment ujian & alokasi voucher (Addendum v1.1).
 * GET  ?training=KODE : data satu pelatihan (ujian, batch voucher, enrollment, register peserta)
 * GET               : semua enrollment + ringkasan per pelatihan
 * POST preview      : validasi daftar peserta tanpa menyimpan
 * POST enroll       : daftarkan peserta secara massal (+ alokasi voucher dari batch yang sudah dibayar)
 * POST cancel       : batalkan enrollment (voucher yang dialokasikan ikut dicabut)
 * Enrollment tidak membuka akses ujian; peserta tetap memasukkan voucher dan server memeriksa seluruh gate akses.
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/enrollstore.php';

start_session();
$me = require_user();
$canView = user_can_route($me, 'a-trainings') || user_can_route($me, 'a-enrollments') || user_can_route($me, 'a-training-enroll');
if (!$canView) json_out(['ok' => false, 'error' => 'forbidden'], 403);
$canWrite = user_can($me, 'enrollment.write');
$tz = new DateTimeZone('Asia/Jakarta');

function batch_list(array $d, string $training): array
{
    $out = [];
    foreach (VOUCHER_BATCHES as $code => $b) {
        if ($b['training'] !== $training) continue;
        $out[] = [
            'code' => $code, 'exam' => $b['exam'], 'qty' => $b['qty'], 'remaining' => batch_remaining($d, $code),
            'order' => $b['order'], 'orderStatus' => $b['order_status'], 'validUntil' => $b['valid_until'], 'type' => $b['type'],
        ];
    }
    return $out;
}

/** Validasi permintaan. Mengembalikan [galat global|null, baris hasil, jadwal ternormalisasi]. */
function evaluate(array $d, array $in): array
{
    $training = (string)($in['training'] ?? '');
    $exam     = (string)($in['exam'] ?? '');
    $t = TRAININGS[$training] ?? null;
    if (!$t) return ['training', [], null];
    if (!in_array($t['status'], ['Aktif', 'Terjadwal'], true)) return ['training_closed', [], null];
    if (!isset($t['exams'][$exam])) return ['exam', [], null];

    $s = (array)($in['schedule'] ?? []);
    $zone = (string)($s['tz'] ?? 'Asia/Jakarta');
    if (!isset(TIMEZONES[$zone])) return ['tz', [], null];
    if (!in_array((string)($s['late'] ?? ''), LATE_POLICIES, true)) return ['late', [], null];
    $date = (string)($s['date'] ?? ''); $st = (string)($s['start'] ?? ''); $en = (string)($s['end'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !preg_match('/^\d{2}:\d{2}$/', $st) || !preg_match('/^\d{2}:\d{2}$/', $en)) return ['schedule', [], null];
    $z = new DateTimeZone($zone);
    $start = DateTimeImmutable::createFromFormat('Y-m-d H:i', "$date $st", $z);
    $end   = DateTimeImmutable::createFromFormat('Y-m-d H:i', "$date $en", $z);
    if (!$start || !$end) return ['schedule', [], null];
    if ($end <= $start) return ['schedule_order', [], null];
    if ($start->format('Y-m-d') < (new DateTimeImmutable('now', $z))->format('Y-m-d')) return ['schedule_past', [], null];
    $sched = ['start' => $start->format('c'), 'end' => $end->format('c'), 'tz' => $zone, 'late' => (string)$s['late']];

    $rows = array_values((array)($in['participants'] ?? []));
    if (!$rows) return ['empty', [], null];
    if (count($rows) > ENROLL_MAX_ROWS) return ['too_many', [], null];

    $seen = [];
    $out = [];
    $okCount = 0;
    foreach ($rows as $i => $r) {
        $name  = trim(preg_replace('/\s+/', ' ', (string)($r['name'] ?? '')));
        $email = strtolower(trim((string)($r['email'] ?? '')));
        $phone = normalize_phone((string)($r['phone'] ?? ''));
        $res = ['row' => $i + 1, 'name' => $name, 'email' => $email, 'phone' => $phone, 'status' => '', 'participant' => null, 'note' => ''];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $res['status'] = 'invalid_email'; $out[] = $res; continue; }
        if (isset($seen[$email])) { $res['status'] = 'duplicate'; $res['note'] = (string)$seen[$email]; $out[] = $res; continue; }
        $seen[$email] = $i + 1;
        $no = find_participant_by_email($d, $email);
        if ($no) {
            $p = $d['participants'][$no];
            $res['participant'] = $no;
            if ($name !== '' && strcasecmp($name, $p['name']) !== 0) $res['note'] = 'name_differs';
            $res['name'] = $p['name'];
            // Sudah terdaftar di ujian yang sama, atau jadwalnya bentrok dengan enrollment lain?
            $block = null;
            foreach ($d['enrollments'] as $e) {
                if ($e['participant'] !== $no || $e['status'] === 'CANCELLED') continue;
                if ($e['exam'] === $exam) { $block = ['already', $e['id']]; break; }
                if (strtotime($e['start']) < strtotime($sched['end']) && strtotime($sched['start']) < strtotime($e['end'])) { $block = ['clash', $e['id']]; break; }
            }
            if ($block) { [$res['status'], $res['note']] = $block; $out[] = $res; continue; }
            $res['status'] = 'existing';
        } else {
            if (mb_strlen($name) < 2 || mb_strlen($name) > 80) { $res['status'] = 'invalid_name'; $out[] = $res; continue; }
            $res['status'] = 'new';
        }
        $okCount++;
        $out[] = $res;
    }

    $v = (array)($in['voucher'] ?? []);
    if (($v['mode'] ?? 'none') === 'allocate') {
        $prob = batch_problem($d, (string)($v['batch'] ?? ''), $training, $exam, $okCount);
        if ($prob) return [$prob, $out, $sched];
    }
    return [null, $out, $sched];
}

/* ---------------- GET ---------------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $d = enroll_read();
    $training = (string)($_GET['training'] ?? '');
    $counts = [];
    foreach ($d['enrollments'] as $e) if ($e['status'] !== 'CANCELLED') $counts[$e['training']] = ($counts[$e['training']] ?? 0) + 1;
    $trainings = [];
    foreach (TRAININGS as $code => $t) $trainings[] = ['code' => $code, 'name' => $t['name'], 'status' => $t['status'], 'enrolled' => $counts[$code] ?? 0,
        'exams' => array_map(fn($k, $x) => ['code' => $k, 'name' => $x['name'], 'duration' => $x['duration']], array_keys($t['exams']), $t['exams'])];

    $list = array_values(array_filter($d['enrollments'], fn($e) => $training === '' || $e['training'] === $training));
    usort($list, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));
    $resp = [
        'ok' => true, 'canWrite' => $canWrite, 'trainings' => $trainings,
        'enrollments' => array_map(fn($e) => public_enrollment($d, $e), $list),
        'timezones' => TIMEZONES, 'latePolicies' => LATE_POLICIES, 'maxRows' => ENROLL_MAX_ROWS,
    ];
    if ($training !== '') {
        if (!isset(TRAININGS[$training])) json_out(['ok' => false, 'error' => 'training'], 404);
        $resp['training'] = $training;
        $resp['batches'] = batch_list($d, $training);
        if ($canWrite) $resp['registry'] = array_values(array_map(fn($no, $p) => ['no' => $no, 'name' => $p['name'], 'email' => $p['email'], 'phone' => $p['phone'] ?? '', 'inst' => $p['inst'] ?? ''], array_keys($d['participants']), $d['participants']));
    }
    json_out($resp);
}

/* ---------------- POST ---------------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
if (!check_csrf()) json_out(['ok' => false, 'error' => 'csrf'], 403);
if (!$canWrite) json_out(['ok' => false, 'error' => 'forbidden'], 403);
$in = read_json_body();
$action = (string)($in['action'] ?? '');

if ($action === 'preview') {
    [$err, $rows] = evaluate(enroll_read(), $in);
    json_out(['ok' => $err === null, 'error' => $err, 'rows' => $rows]);
}

if ($action === 'enroll') {
    $result = enroll_update(function (array &$d) use ($in, $me) {
        [$err, $rows, $sched] = evaluate($d, $in);
        if ($err) return ['error' => $err, 'rows' => $rows];
        $alloc = (($in['voucher']['mode'] ?? 'none') === 'allocate') ? (string)$in['voucher']['batch'] : null;
        $now = gmdate('c');
        $created = [];
        $skipped = [];
        foreach ($rows as $r) {
            if (!in_array($r['status'], ['new', 'existing'], true)) { $skipped[] = $r; continue; }
            $no = $r['participant'];
            if (!$no) {
                $d['seq']['par']++;
                $no = sprintf('PAR-2026-%05d', $d['seq']['par']);
                $d['participants'][$no] = ['no' => $no, 'name' => $r['name'], 'email' => $r['email'], 'phone' => $r['phone'], 'inst' => '', 'created_at' => $now, 'created_by' => $me['username']];
            }
            $d['seq']['enr']++;
            $id = sprintf('ENR-%s-%05d', substr($in['training'], 4, 2), $d['seq']['enr']);
            $code = null; $masked = null;
            if ($alloc) {
                do { $code = voucher_code(); $h = voucher_hash($code); } while (isset($d['vouchers'][$h]));
                $masked = substr($code, 0, 10) . '-••••';
                $d['vouchers'][$h] = ['masked' => $masked, 'batch' => $alloc, 'training' => $in['training'], 'exam' => $in['exam'], 'participant' => $no, 'enrollment' => $id, 'status' => 'ALLOCATED', 'created_at' => $now, 'created_by' => $me['username']];
            }
            $d['enrollments'][] = ['id' => $id, 'training' => $in['training'], 'exam' => $in['exam'], 'participant' => $no] + $sched
                + ['batch' => $alloc, 'voucher_hash' => $alloc ? $h : null, 'voucher_masked' => $masked, 'status' => 'SCHEDULED', 'created_at' => $now, 'created_by' => $me['username']];
            $created[] = ['id' => $id, 'participant' => $no, 'name' => $r['name'], 'email' => $r['email'], 'phone' => $r['phone'], 'isNew' => $r['status'] === 'new', 'voucherCode' => $code];
        }
        return ['created' => $created, 'skipped' => $skipped, 'batch' => $alloc, 'remaining' => $alloc ? batch_remaining($d, $alloc) : null];
    });
    if (!empty($result['error'])) json_out(['ok' => false, 'error' => $result['error'], 'rows' => $result['rows']], 422);
    if (!$result['created']) json_out(['ok' => false, 'error' => 'nothing', 'skipped' => $result['skipped']], 422);
    $t = TRAININGS[$in['training']];
    audit('enrollment.bulk_create', $me['username'], sprintf('%s · %s · %d peserta%s%s', $in['training'], $t['exams'][$in['exam']]['name'], count($result['created']),
        $result['batch'] ? ' · voucher ' . $result['batch'] . ' (' . count($result['created']) . ')' : ' · tanpa voucher',
        $result['skipped'] ? ' · ' . count($result['skipped']) . ' dilewati' : ''));
    json_out(['ok' => true] + $result);
}

if ($action === 'cancel') {
    $id = (string)($in['id'] ?? '');
    $reason = trim(mb_substr((string)($in['reason'] ?? ''), 0, 200));
    if ($reason === '') json_out(['ok' => false, 'error' => 'reason'], 422);
    $res = enroll_update(function (array &$d) use ($id, $reason, $me) {
        foreach ($d['enrollments'] as &$e) {
            if ($e['id'] !== $id) continue;
            if ($e['status'] === 'CANCELLED') return 'already_cancelled';
            if (in_array($e['status'], ['IN_PROGRESS', 'COMPLETED'], true)) return 'not_cancellable';
            $e['status'] = 'CANCELLED';
            $e['cancel_reason'] = $reason;
            $e['cancelled_by'] = $me['username'];
            $e['cancelled_at'] = gmdate('c');
            if (!empty($e['voucher_hash']) && isset($d['vouchers'][$e['voucher_hash']])) $d['vouchers'][$e['voucher_hash']]['status'] = 'REVOKED';
            return public_enrollment($d, $e);
        }
        return 'not_found';
    });
    if (is_string($res)) json_out(['ok' => false, 'error' => $res], $res === 'not_found' ? 404 : 409);
    audit('enrollment.cancel', $me['username'], "$id · {$res['participant']}" . ($res['voucher'] ? " · voucher {$res['voucher']} dicabut" : '') . " · alasan: $reason");
    json_out(['ok' => true, 'enrollment' => $res]);
}

json_out(['ok' => false, 'error' => 'action'], 400);
