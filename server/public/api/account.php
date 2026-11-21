<?php
/**
 * TACMS — akun sendiri: ganti kata sandi.
 * Wajib kata sandi saat ini. Setelah berhasil, session lain milik akun ini otomatis keluar.
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';

start_session();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
if (!check_csrf()) json_out(['ok' => false, 'error' => 'csrf'], 403);
$me = require_user(true);
if (!empty($me['demo'])) json_out(['ok' => false, 'error' => 'demo'], 403);   // akun demo dipakai bersama

$in      = read_json_body();
$current = (string)($in['current'] ?? '');
$new     = (string)($in['new'] ?? '');
$key     = 'pwchange:' . $me['username'];

$wait = lock_remaining($key);
if ($wait > 0) json_out(['ok' => false, 'error' => 'locked', 'minutes' => (int)ceil($wait / 60)], 429);

$u = users()[$me['username']];
if (!password_verify($current, $u['hash'])) {
    $left = record_fail($key);
    audit('account.change_password_fail', $me['username']);
    if ($left <= 0) json_out(['ok' => false, 'error' => 'locked', 'minutes' => (int)ceil(LOGIN_LOCK_SECONDS / 60)], 429);
    json_out(['ok' => false, 'error' => 'current', 'left' => $left], 422);
}
clear_fails($key);

if ($p = password_problem($new, $me['username'])) json_out(['ok' => false, 'error' => $p], 422);
if (hash_equals($current, $new)) json_out(['ok' => false, 'error' => 'pw_same'], 422);

$now = time();
store_update(function (array &$all) use ($me, $new, $now) {
    $all[$me['username']]['hash'] = password_hash($new, PASSWORD_BCRYPT, ['cost' => 11]);
    $all[$me['username']]['must_change'] = false;
    $all[$me['username']]['pw_changed_at'] = $now;
});
session_regenerate_id(true);
$_SESSION['auth_at'] = $now;
$_SESSION['csrf'] = bin2hex(random_bytes(32));
audit('account.change_password', $me['username']);
json_out(['ok' => true, 'home' => $me['home'], 'csrf' => $_SESSION['csrf']]);
