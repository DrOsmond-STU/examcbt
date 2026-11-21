<?php
/**
 * TACMS — inisialisasi: session aman, pengguna aktif, CSRF, pembatasan login, audit log.
 * Folder app/ berada di luar document root sehingga tidak dapat diakses langsung dari web.
 */
declare(strict_types=1);

require __DIR__ . '/rbac.php';

const SESSION_IDLE_SECONDS = 1800;      // keluar otomatis setelah 30 menit tidak aktif
const LOGIN_MAX_FAILS      = 5;         // SRS FR-AUTH-005: batasi percobaan login
const LOGIN_LOCK_SECONDS   = 900;       // kunci 15 menit
const STORAGE_DIR          = __DIR__ . '/storage';

function users(): array
{
    static $users = null;
    if ($users === null) {
        $file = __DIR__ . '/users.php';
        $users = is_file($file) ? require $file : [];
    }
    return $users;
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('TACMSSESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_start();

    if (isset($_SESSION['uid'], $_SESSION['last']) && time() - $_SESSION['last'] > SESSION_IDLE_SECONDS) {
        audit('auth.timeout', $_SESSION['uid']);
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['last'] = time();
}

/** Lanjutkan session hanya bila browser sudah membawa cookie session.
 *  Tamu tidak diberi session, sehingga halaman tamu tidak memuat data pribadi dan aman di-cache CDN. */
function resume_session(): void
{
    if (isset($_COOKIE['TACMSSESSID'])) start_session();
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function check_csrf(): bool
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return is_string($sent) && !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $sent);
}

/** Pengguna yang sedang masuk beserta role dan hak aksesnya, atau null. */
function current_user(): ?array
{
    $uid = $_SESSION['uid'] ?? null;
    if (!$uid) return null;
    $u = users()[$uid] ?? null;
    if (!$u || empty($u['active']) || !isset(ROLES[$u['role']])) return null;
    $role = ROLES[$u['role']];
    return [
        'username'  => $uid,
        'name'      => $u['name'],
        'email'     => $u['email'],
        'role'      => $u['role'],
        'roleLabel' => $role['label'],
        'home'      => $role['home'],
        'routes'    => $role['routes'],
        'perms'     => $role['perms'],
        'bundles'   => $role['bundles'],
    ];
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/* ---------- Pembatasan percobaan login (per IP + nama pengguna) ---------- */
function attempts_file(): string
{
    if (!is_dir(STORAGE_DIR)) mkdir(STORAGE_DIR, 0700, true);
    return STORAGE_DIR . '/login_attempts.json';
}

function with_attempts(callable $fn)
{
    $fh = fopen(attempts_file(), 'c+');
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $data = $raw ? (json_decode($raw, true) ?: []) : [];
    $now = time();
    foreach ($data as $k => $v) if ($now - ($v['first'] ?? 0) > LOGIN_LOCK_SECONDS) unset($data[$k]);
    $result = $fn($data, $now);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $result;
}

function attempt_key(string $username): string
{
    return hash('sha256', client_ip() . '|' . strtolower($username));
}

/** Sisa detik penguncian, 0 jika tidak terkunci. */
function lock_remaining(string $username): int
{
    $k = attempt_key($username);
    return with_attempts(function (array &$d, int $now) use ($k) {
        $e = $d[$k] ?? null;
        if ($e && $e['count'] >= LOGIN_MAX_FAILS) return max(0, LOGIN_LOCK_SECONDS - ($now - $e['first']));
        return 0;
    });
}

function record_fail(string $username): int
{
    $k = attempt_key($username);
    return with_attempts(function (array &$d, int $now) use ($k) {
        $e = $d[$k] ?? ['count' => 0, 'first' => $now];
        $e['count']++;
        $d[$k] = $e;
        return LOGIN_MAX_FAILS - $e['count'];
    });
}

function clear_fails(string $username): void
{
    $k = attempt_key($username);
    with_attempts(function (array &$d) use ($k) { unset($d[$k]); });
}

/* ---------- Audit log (tanpa kata sandi) ---------- */
function audit(string $action, string $actor, string $detail = ''): void
{
    if (!is_dir(STORAGE_DIR)) mkdir(STORAGE_DIR, 0700, true);
    $line = json_encode([
        't'      => gmdate('c'),
        'actor'  => $actor,
        'action' => $action,
        'ip'     => client_ip(),
        'detail' => $detail,
    ], JSON_UNESCAPED_UNICODE) . "\n";
    file_put_contents(STORAGE_DIR . '/audit.log', $line, FILE_APPEND | LOCK_EX);
}

function json_out(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: private, no-store');
    header('X-Accel-Expires: 0');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
