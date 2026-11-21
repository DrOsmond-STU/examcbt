<?php
/**
 * TACMS — API audit log (baca saja).
 * Sumber: app/storage/audit.log (JSON per baris, hanya ditambah, tidak pernah diubah dari aplikasi).
 * Akses: role yang boleh membuka halaman Audit Log. Ekspor CSV butuh izin report.export dan ikut dicatat.
 *
 * GET ?q=&cat=&actor=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&per=25[&format=csv]
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';

start_session();
$me = require_user();
if (!user_can_route($me, 'a-audit')) json_out(['ok' => false, 'error' => 'forbidden'], 403);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['ok' => false, 'error' => 'method'], 405);

const AUDIT_MAX_BYTES = 8 * 1024 * 1024; // baca paling banyak 8 MB terakhir
$tz = new DateTimeZone('Asia/Jakarta');

/** Baca entri log, terbaru lebih dulu. */
function read_audit(): array
{
    $file = STORAGE_DIR . '/audit.log';
    if (!is_file($file)) return [];
    $size = filesize($file);
    $fh = fopen($file, 'r');
    if ($size > AUDIT_MAX_BYTES) { fseek($fh, $size - AUDIT_MAX_BYTES); fgets($fh); }
    $out = [];
    while (($line = fgets($fh)) !== false) {
        $e = json_decode($line, true);
        if (!is_array($e) || empty($e['t']) || empty($e['action'])) continue;
        $out[] = [
            't'      => (string)$e['t'],
            'actor'  => (string)($e['actor'] ?? ''),
            'role'   => (string)($e['role'] ?? ''),
            'action' => (string)$e['action'],
            'ip'     => (string)($e['ip'] ?? ''),
            'detail' => (string)($e['detail'] ?? ''),
        ];
    }
    fclose($fh);
    return array_reverse($out);
}

$all   = read_audit();
$users = users();
$roleLabel = fn(string $r) => ROLES[$r]['label'] ?? '';
foreach ($all as &$e) {
    $u = $users[$e['actor']] ?? null;
    $e['actorName'] = $u['name'] ?? '';
    // Role saat kejadian bila tercatat; jika tidak, role akun saat ini
    $e['roleLabel'] = $roleLabel($e['role'] ?: ($u['role'] ?? ''));
}
unset($e);

/* ---------- Filter ---------- */
$q     = mb_strtolower(trim((string)($_GET['q'] ?? '')));
$cat   = (string)($_GET['cat'] ?? '');
$actor = (string)($_GET['actor'] ?? '');
$parseDay = function (string $d, bool $end) use ($tz): ?int {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) return null;
    $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $d, $tz);
    if (!$dt) return null;
    return $end ? $dt->modify('+1 day')->getTimestamp() : $dt->getTimestamp();
};
$from = $parseDay((string)($_GET['from'] ?? ''), false);
$to   = $parseDay((string)($_GET['to'] ?? ''), true);
$cats = ['auth' => 'auth.', 'user' => 'user.', 'account' => 'account.', 'enrollment' => 'enrollment.', 'audit' => 'audit.'];

$filtered = array_values(array_filter($all, function (array $e) use ($q, $cat, $actor, $from, $to, $cats) {
    if ($cat !== '' && isset($cats[$cat]) && strpos($e['action'], $cats[$cat]) !== 0) return false;
    if ($actor !== '' && $e['actor'] !== $actor) return false;
    $ts = strtotime($e['t']);
    if ($from !== null && $ts < $from) return false;
    if ($to !== null && $ts >= $to) return false;
    if ($q !== '') {
        $hay = mb_strtolower(implode(' ', [$e['actor'], $e['actorName'], $e['action'], $e['detail'], $e['ip'], $e['roleLabel']]));
        if (mb_strpos($hay, $q) === false) return false;
    }
    return true;
}));

/* ---------- Ekspor CSV ---------- */
if (($_GET['format'] ?? '') === 'csv') {
    if (!user_can($me, 'report.export')) json_out(['ok' => false, 'error' => 'forbidden'], 403);
    $filters = array_filter(['q' => $q, 'kategori' => $cat, 'aktor' => $actor, 'dari' => $_GET['from'] ?? '', 'sampai' => $_GET['to'] ?? '']);
    audit('audit.export', $me['username'], count($filtered) . ' entri' . ($filters ? ' · ' . http_build_query($filters, '', ', ') : ''));
    // Cegah formula injection saat dibuka di spreadsheet
    $cell = fn($v) => preg_match('/^[=+\-@\t\r]/', (string)$v) ? "'" . $v : (string)$v;
    header('Content-Type: text/csv; charset=utf-8');
    header('Cache-Control: private, no-store');
    header('Content-Disposition: attachment; filename="tacms-audit-log-' . (new DateTimeImmutable('now', $tz))->format('Ymd-His') . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, ['waktu_wib', 'waktu_utc', 'aktor', 'nama', 'role', 'aksi', 'detail', 'ip']);
    foreach ($filtered as $e) {
        $wib = (new DateTimeImmutable($e['t']))->setTimezone($tz)->format('Y-m-d H:i:s');
        fputcsv($out, array_map($cell, [$wib, $e['t'], $e['actor'], $e['actorName'], $e['roleLabel'], $e['action'], $e['detail'], $e['ip']]));
    }
    fclose($out);
    exit;
}

/* ---------- Ringkasan & halaman ---------- */
$now = time();
$since = fn(int $sec) => array_filter($all, fn($e) => strtotime($e['t']) >= $now - $sec);
$day = $since(86400);
$week = $since(7 * 86400);
$count = fn(array $list, callable $f) => count(array_filter($list, $f));
$stats = [
    'total'        => count($all),
    'login24h'     => $count($day, fn($e) => $e['action'] === 'auth.login'),
    'fail24h'      => $count($day, fn($e) => in_array($e['action'], ['auth.fail', 'auth.locked', 'account.change_password_fail'], true)),
    'userChanges7d'=> $count($week, fn($e) => strpos($e['action'], 'user.') === 0 || $e['action'] === 'account.change_password'),
];

$per   = max(5, min(100, (int)($_GET['per'] ?? 25)));
$pages = max(1, (int)ceil(count($filtered) / $per));
$page  = max(1, min($pages, (int)($_GET['page'] ?? 1)));

$actors = [];
foreach ($all as $e) if ($e['actor'] !== '' && !isset($actors[$e['actor']])) $actors[$e['actor']] = $e['actorName'];
ksort($actors);

json_out([
    'ok'      => true,
    'total'   => count($filtered),
    'page'    => $page,
    'pages'   => $pages,
    'per'     => $per,
    'entries' => array_slice($filtered, ($page - 1) * $per, $per),
    'actors'  => array_map(fn($k, $v) => ['username' => $k, 'name' => $v], array_keys($actors), $actors),
    'stats'   => $stats,
    'canExport' => user_can($me, 'report.export'),
]);
