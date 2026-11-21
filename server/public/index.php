<?php
/**
 * TACMS — halaman utama. Server memilih modul antarmuka sesuai role:
 * modul admin/peserta yang tidak menjadi hak role tersebut tidak pernah dikirim ke browser.
 */
declare(strict_types=1);
require __DIR__ . '/../app/bootstrap.php';

resume_session();
$user = session_status() === PHP_SESSION_ACTIVE ? current_user() : null;
$csrf = $user ? csrf_token() : null;   // tamu mengambil token lewat api/csrf.php saat login

$js = ['core.js', 'i18n-en.js', 'i18n.js', 'data.js', 'hub.js'];
if ($user) {
    if (in_array('participant', $user['bundles'], true)) $js[] = 'participant.js';
    if (in_array('admin', $user['bundles'], true))       $js[] = 'admin.js';
}
$js[] = 'auth.js';

$session = [
    'user'    => $user ? array_intersect_key($user, array_flip(['username', 'name', 'email', 'role', 'roleLabel'])) : null,
    'home'    => $user['home'] ?? 'login',
    'routes'  => $user['routes'] ?? [],
    'perms'   => $user['perms'] ?? [],
    'permLabels' => PERMISSIONS,
    'roles'   => array_map(fn($r) => $r['label'], ROLES),
    'csrf'    => $csrf,
    'idle'    => SESSION_IDLE_SECONDS,
];

$assets = __DIR__ . '/../app/assets/js/';
// Setiap skrip inline diizinkan lewat hash SHA-256-nya (CSP), bukan nonce, agar tetap valid bila halaman tamu di-cache.
$scripts = ['window.SESSION = ' . json_encode($session, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) . ';'];
foreach ($js as $f) $scripts[] = "\n" . file_get_contents($assets . $f) . "\n";
$scripts[] = 'App.start();';
$hashes = implode(' ', array_map(fn($c) => "'sha256-" . base64_encode(hash('sha256', $c, true)) . "'", $scripts));

header('Content-Type: text/html; charset=utf-8');
header('Vary: Cookie');
header($user ? 'Cache-Control: private, no-store' : 'Cache-Control: public, max-age=0, s-maxage=10');
header("Content-Security-Policy: default-src 'self'; script-src $hashes; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
?><!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>TACMS · ExamCBT</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap">
<link rel="stylesheet" href="styles.css?v=<?= filemtime(__DIR__ . '/styles.css') ?>">
</head>
<body>
<div id="app"></div>
<?php foreach ($scripts as $c): ?>
<script><?= $c ?></script>
<?php endforeach; ?>
</body>
</html>
