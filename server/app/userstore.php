<?php
/**
 * TACMS — penyimpanan akun di app/storage/users.json (di luar document root, izin 0600).
 * Saat pertama kali dipakai, data awal diambil dari app/users.php.
 * Folder storage tidak ikut dikemas saat deploy, jadi perubahan akun tidak tertimpa.
 */
declare(strict_types=1);

const USERS_FILE = STORAGE_DIR . '/users.json';
const PASSWORD_MIN = 10;

function store_lock()
{
    if (!is_dir(STORAGE_DIR)) mkdir(STORAGE_DIR, 0700, true);
    $fh = fopen(STORAGE_DIR . '/users.lock', 'c');
    flock($fh, LOCK_EX);
    return $fh;
}

function store_load_unlocked(): array
{
    if (is_file(USERS_FILE)) {
        $d = json_decode((string)file_get_contents(USERS_FILE), true);
        if (is_array($d)) return $d;
    }
    $seed = __DIR__ . '/users.php';
    return is_file($seed) ? require $seed : [];
}

function store_save_unlocked(array $users): void
{
    $tmp = USERS_FILE . '.tmp';
    file_put_contents($tmp, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    chmod($tmp, 0600);
    rename($tmp, USERS_FILE);
}

/** Baca semua akun. */
function store_read(): array
{
    $fh = store_lock();
    $users = store_load_unlocked();
    flock($fh, LOCK_UN);
    fclose($fh);
    return $users;
}

/** Ubah akun secara atomik. $fn menerima array akun (by reference) dan mengembalikan hasil. */
function store_update(callable $fn)
{
    $fh = store_lock();
    $users = store_load_unlocked();
    $result = $fn($users);
    store_save_unlocked($users);
    flock($fh, LOCK_UN);
    fclose($fh);
    users(true);
    return $result;
}

function temp_password(): string
{
    $a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
        $s = '';
        for ($i = 0; $i < 14; $i++) $s .= $a[random_int(0, strlen($a) - 1)];
    } while (!preg_match('/\d/', $s) || !preg_match('/[A-Za-z]/', $s));
    return $s;
}

/** Kembalikan pesan kesalahan (kode) bila kata sandi tidak memenuhi aturan, atau null. */
function password_problem(string $pw, string $username): ?string
{
    if (strlen($pw) < PASSWORD_MIN) return 'pw_short';
    if (strlen($pw) > 200) return 'pw_long';
    if (!preg_match('/[A-Za-z]/', $pw) || !preg_match('/\d/', $pw)) return 'pw_mix';
    if ($username !== '' && stripos($pw, $username) !== false) return 'pw_username';
    $common = ['password', 'qwerty', '123456', 'admin', 'tacms', 'examcbt', 'semesta'];
    foreach ($common as $c) if (stripos($pw, $c) !== false) return 'pw_common';
    return null;
}

function public_user(string $username, array $u): array
{
    return [
        'username'   => $username,
        'name'       => $u['name'] ?? '',
        'email'      => $u['email'] ?? '',
        'role'       => $u['role'] ?? '',
        'roleLabel'  => ROLES[$u['role'] ?? '']['label'] ?? ($u['role'] ?? ''),
        'active'     => !empty($u['active']),
        'mustChange' => !empty($u['must_change']),
        'lastLogin'  => $u['last_login'] ?? null,
        'createdAt'  => $u['created_at'] ?? null,
        'createdBy'  => $u['created_by'] ?? null,
        'demo'       => !empty($u['demo']),
    ];
}
