<?php
/**
 * TACMS — API pengelolaan pengguna.
 * GET  : daftar akun (role dengan akses halaman Pengguna & Role).
 * POST : create | update | set_active | reset_password (wajib izin user.write + token CSRF).
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';

start_session();
$me = require_user();
if (!user_can_route($me, 'a-users')) json_out(['ok' => false, 'error' => 'forbidden'], 403);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $list = [];
    foreach (users() as $username => $u) $list[] = public_user($username, $u);
    usort($list, fn($a, $b) => strcmp($a['username'], $b['username']));
    json_out(['ok' => true, 'users' => $list, 'assignable' => assignable_roles($me)]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
if (!check_csrf()) json_out(['ok' => false, 'error' => 'csrf'], 403);
if (!user_can($me, 'user.write')) json_out(['ok' => false, 'error' => 'forbidden'], 403);

$in       = read_json_body();
$action   = (string)($in['action'] ?? '');
$username = strtolower(trim((string)($in['username'] ?? '')));
$assignable = assignable_roles($me);

/** Validasi data profil; kembalikan kode kesalahan atau null. */
$validate = function (array $in) use ($assignable): ?string {
    $name  = trim((string)($in['name'] ?? ''));
    $email = trim((string)($in['email'] ?? ''));
    $role  = (string)($in['role'] ?? '');
    if (mb_strlen($name) < 2 || mb_strlen($name) > 80) return 'name';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 120) return 'email';
    if (!isset(ROLES[$role])) return 'role';
    if (!in_array($role, $assignable, true)) return 'role_forbidden';
    return null;
};

/** Pengguna non-Super Admin tidak boleh mengubah akun Super Admin. */
$guardTarget = function (array $all, string $username) use ($me): ?string {
    if (!isset($all[$username])) return 'not_found';
    if (($all[$username]['role'] ?? '') === 'super_admin' && $me['role'] !== 'super_admin') return 'target_forbidden';
    return null;
};

$activeSupers = fn(array $all) => count(array_filter($all, fn($u) => ($u['role'] ?? '') === 'super_admin' && !empty($u['active'])));

switch ($action) {
    case 'create': {
        if (!preg_match('/^[a-z0-9][a-z0-9._-]{2,31}$/', $username)) json_out(['ok' => false, 'error' => 'username'], 422);
        if ($e = $validate($in)) json_out(['ok' => false, 'error' => $e], 422);
        $temp = temp_password();
        $res = store_update(function (array &$all) use ($username, $in, $temp, $me) {
            if (isset($all[$username])) return 'username_taken';
            foreach ($all as $u) if (strcasecmp($u['email'] ?? '', trim((string)$in['email'])) === 0) return 'email_taken';
            $all[$username] = [
                'name' => trim((string)$in['name']), 'email' => trim((string)$in['email']), 'role' => (string)$in['role'],
                'active' => true, 'must_change' => true, 'hash' => password_hash($temp, PASSWORD_BCRYPT, ['cost' => 11]),
                'pw_changed_at' => time(), 'created_at' => gmdate('c'), 'created_by' => $me['username'],
            ];
            return null;
        });
        if ($res) json_out(['ok' => false, 'error' => $res], 409);
        audit('user.create', $me['username'], "$username · " . ROLES[$in['role']]['label']);
        json_out(['ok' => true, 'user' => public_user($username, users()[$username]), 'tempPassword' => $temp]);
    }

    case 'update': {
        if ($e = $validate($in)) json_out(['ok' => false, 'error' => $e], 422);
        $res = store_update(function (array &$all) use ($username, $in, $me, $guardTarget, $activeSupers) {
            if ($g = $guardTarget($all, $username)) return [$g, null];
            if ($username === $me['username'] && $in['role'] !== $all[$username]['role']) return ['self_role', null];
            foreach ($all as $k => $u) if ($k !== $username && strcasecmp($u['email'] ?? '', trim((string)$in['email'])) === 0) return ['email_taken', null];
            $before = $all[$username];
            $all[$username]['name']  = trim((string)$in['name']);
            $all[$username]['email'] = trim((string)$in['email']);
            $all[$username]['role']  = (string)$in['role'];
            if ($activeSupers($all) < 1) { $all[$username] = $before; return ['last_super', null]; }
            return [null, $before['role']];
        });
        [$err, $oldRole] = $res;
        if ($err) json_out(['ok' => false, 'error' => $err], $err === 'not_found' ? 404 : 409);
        $detail = $username . ($oldRole !== $in['role'] ? ' · role ' . ROLES[$oldRole]['label'] . ' → ' . ROLES[$in['role']]['label'] : '');
        audit('user.update', $me['username'], $detail);
        json_out(['ok' => true, 'user' => public_user($username, users()[$username])]);
    }

    case 'set_active': {
        $active = !empty($in['active']);
        if ($username === $me['username']) json_out(['ok' => false, 'error' => 'self_deactivate'], 409);
        $err = store_update(function (array &$all) use ($username, $active, $guardTarget, $activeSupers) {
            if ($g = $guardTarget($all, $username)) return $g;
            $before = $all[$username]['active'] ?? false;
            $all[$username]['active'] = $active;
            if ($activeSupers($all) < 1) { $all[$username]['active'] = $before; return 'last_super'; }
            return null;
        });
        if ($err) json_out(['ok' => false, 'error' => $err], $err === 'not_found' ? 404 : 409);
        audit($active ? 'user.activate' : 'user.deactivate', $me['username'], $username . (!empty($in['reason']) ? ' · ' . mb_substr((string)$in['reason'], 0, 200) : ''));
        json_out(['ok' => true, 'user' => public_user($username, users()[$username])]);
    }

    case 'reset_password': {
        if ($username === $me['username']) json_out(['ok' => false, 'error' => 'self_reset'], 409);
        $temp = temp_password();
        $err = store_update(function (array &$all) use ($username, $temp, $guardTarget) {
            if ($g = $guardTarget($all, $username)) return $g;
            $all[$username]['hash'] = password_hash($temp, PASSWORD_BCRYPT, ['cost' => 11]);
            $all[$username]['must_change'] = true;
            $all[$username]['pw_changed_at'] = time();
            return null;
        });
        if ($err) json_out(['ok' => false, 'error' => $err], $err === 'not_found' ? 404 : 409);
        audit('user.reset_password', $me['username'], $username);
        json_out(['ok' => true, 'user' => public_user($username, users()[$username]), 'tempPassword' => $temp]);
    }
}

json_out(['ok' => false, 'error' => 'action'], 400);
