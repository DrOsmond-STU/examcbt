<?php
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';

start_session();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
if (!check_csrf()) json_out(['ok' => false, 'error' => 'csrf'], 403);

$in = json_decode(file_get_contents('php://input') ?: '', true) ?: [];
$username = strtolower(trim((string)($in['username'] ?? '')));
$password = (string)($in['password'] ?? '');
if ($username === '' || $password === '' || strlen($username) > 64 || strlen($password) > 200) {
    json_out(['ok' => false, 'error' => 'invalid'], 400);
}

$wait = lock_remaining($username);
if ($wait > 0) {
    audit('auth.locked', $username);
    json_out(['ok' => false, 'error' => 'locked', 'minutes' => (int)ceil($wait / 60)], 429);
}

$u = users()[$username] ?? null;
// Hash tiruan agar waktu respons sama untuk akun yang tidak ada.
$hash = $u['hash'] ?? '$2y$10$Lq.7R0mWzYSxKq/JN9ieuezoBu4NXgpn1.J96iZXZg7LZHrmK.G2.';
$ok = password_verify($password, $hash) && $u && !empty($u['active']);

if (!$ok) {
    $left = record_fail($username);
    audit('auth.fail', $username);
    if ($left <= 0) json_out(['ok' => false, 'error' => 'locked', 'minutes' => (int)ceil(LOGIN_LOCK_SECONDS / 60)], 429);
    json_out(['ok' => false, 'error' => 'credentials', 'left' => $left], 401);
}

clear_fails($username);
session_regenerate_id(true);
$now = time();
$_SESSION = ['uid' => $username, 'last' => $now, 'auth_at' => $now, 'csrf' => bin2hex(random_bytes(32))];
store_update(function (array &$all) use ($username, $now) {
    if (!isset($all[$username])) return;
    $all[$username]['prev_login'] = $all[$username]['last_login'] ?? null;
    $all[$username]['last_login'] = gmdate('c', $now);
    // Perbarui hash bila parameter bcrypt berubah
});
if (password_needs_rehash($u['hash'], PASSWORD_BCRYPT, ['cost' => 11])) {
    $new = password_hash($password, PASSWORD_BCRYPT, ['cost' => 11]);
    store_update(function (array &$all) use ($username, $new) { if (isset($all[$username])) $all[$username]['hash'] = $new; });
}
audit('auth.login', $username, ROLES[$u['role']]['label']);
json_out(['ok' => true, 'home' => !empty($u['must_change']) ? 'account' : ROLES[$u['role']]['home']]);
