<?php
/**
 * TACMS — penyimpanan enrollment di app/storage/enrollment.json (0600).
 * Berisi register peserta, enrollment ujian, dan alokasi voucher.
 * Kode voucher tidak pernah disimpan utuh: hanya HMAC-SHA256 (kunci rahasia di storage/secret.key) dan versi tersamar.
 */
declare(strict_types=1);
require_once __DIR__ . '/catalog.php';

const ENROLL_FILE = STORAGE_DIR . '/enrollment.json';

function enroll_empty(): array
{
    $p = [];
    foreach (SEED_PARTICIPANTS as $s) $p[$s['no']] = $s + ['created_at' => null, 'created_by' => 'seed'];
    return ['seq' => ['par' => 427, 'enr' => 0, 'att' => 58000, 'ret' => 0, 'cert' => 700], 'participants' => $p, 'enrollments' => [], 'vouchers' => [], 'attempts' => [], 'retakes' => [], 'certificates' => []];
}

function enroll_lock()
{
    if (!is_dir(STORAGE_DIR)) mkdir(STORAGE_DIR, 0700, true);
    $fh = fopen(STORAGE_DIR . '/enrollment.lock', 'c');
    flock($fh, LOCK_EX);
    return $fh;
}

function enroll_load_unlocked(): array
{
    $d = null;
    if (is_file(ENROLL_FILE)) $d = json_decode((string)file_get_contents(ENROLL_FILE), true);
    if (!is_array($d)) $d = enroll_empty();
    foreach (['attempts', 'retakes', 'certificates', 'vouchers', 'enrollments'] as $k) $d[$k] = $d[$k] ?? [];
    $d['seq'] = ($d['seq'] ?? []) + ['par' => 427, 'enr' => 0, 'att' => 58000, 'ret' => 0, 'cert' => 700];
    return $d;
}

function enroll_read(): array
{
    $fh = enroll_lock();
    $d = enroll_load_unlocked();
    flock($fh, LOCK_UN); fclose($fh);
    return $d;
}

/** Ubah data secara atomik; $fn menerima data by reference. */
function enroll_update(callable $fn)
{
    $fh = enroll_lock();
    $d = enroll_load_unlocked();
    $r = $fn($d);
    $tmp = ENROLL_FILE . '.tmp';
    file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    chmod($tmp, 0600);
    rename($tmp, ENROLL_FILE);
    flock($fh, LOCK_UN); fclose($fh);
    return $r;
}

function voucher_secret(): string
{
    $f = STORAGE_DIR . '/secret.key';
    if (!is_file($f)) { file_put_contents($f, bin2hex(random_bytes(32))); chmod($f, 0600); }
    return trim((string)file_get_contents($f));
}

function voucher_code(): string
{
    $a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $g = function () use ($a) { $s = ''; for ($i = 0; $i < 4; $i++) $s .= $a[random_int(0, strlen($a) - 1)]; return $s; };
    return 'TACMS-' . $g() . '-' . $g();
}

function voucher_hash(string $code): string
{
    return hash_hmac('sha256', strtoupper($code), voucher_secret());
}

/** Sisa kuota batch = qty − terpakai sebelumnya − alokasi aktif di sistem ini. */
function batch_remaining(array $d, string $code): int
{
    $b = VOUCHER_BATCHES[$code] ?? null;
    if (!$b) return 0;
    $alloc = 0;
    foreach ($d['vouchers'] as $v) if ($v['batch'] === $code && $v['status'] !== 'REVOKED') $alloc++;
    return max(0, $b['qty'] - $b['used'] - $alloc);
}

/** Alasan batch tidak bisa dipakai untuk ujian ini, atau null. */
function batch_problem(array $d, string $code, string $training, string $exam, int $need): ?string
{
    $b = VOUCHER_BATCHES[$code] ?? null;
    if (!$b || $b['training'] !== $training) return 'batch_scope';
    if ($b['exam'] !== null && $b['exam'] !== $exam) return 'batch_scope';
    if (!in_array($b['order_status'], ['PAID', 'CONFIRMED'], true)) return 'batch_unpaid';
    if ($b['valid_until'] < (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d')) return 'batch_expired';
    if (batch_remaining($d, $code) < $need) return 'batch_quota';
    return null;
}

function normalize_phone(string $p): string
{
    $p = trim($p);
    if ($p === '') return '';
    $digits = preg_replace('/\D/', '', $p);
    if ($digits !== '' && $digits[0] === '0') $digits = '62' . substr($digits, 1);
    return '+' . $digits;
}

function find_participant_by_email(array $d, string $email): ?string
{
    foreach ($d['participants'] as $no => $p) if (strcasecmp($p['email'], $email) === 0) return $no;
    return null;
}

function public_enrollment(array $d, array $e): array
{
    $p = $d['participants'][$e['participant']] ?? [];
    $t = TRAININGS[$e['training']] ?? null;
    return [
        'id' => $e['id'], 'training' => $e['training'], 'trainingName' => $t['name'] ?? $e['training'],
        'exam' => $e['exam'], 'examName' => $t['exams'][$e['exam']]['name'] ?? $e['exam'],
        'participant' => $e['participant'], 'name' => $p['name'] ?? '', 'email' => $p['email'] ?? '', 'phone' => $p['phone'] ?? '', 'inst' => $p['inst'] ?? '',
        'start' => $e['start'], 'end' => $e['end'], 'tz' => $e['tz'], 'late' => $e['late'],
        'voucher' => $e['voucher_masked'] ?? null, 'voucherStatus' => $e['voucher_masked'] ? ($e['status'] === 'CANCELLED' ? 'REVOKED' : 'ALLOCATED') : null,
        'batch' => $e['batch'] ?? null, 'status' => $e['status'],
        'createdAt' => $e['created_at'], 'createdBy' => $e['created_by'], 'cancelReason' => $e['cancel_reason'] ?? null,
    ];
}

/* =====================================================================
   Aktivasi voucher & portal peserta
   ===================================================================== */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/engine.php';

function mask_email(string $email): string
{
    $at = strpos($email, '@');
    if ($at === false) return '•••';
    return substr($email, 0, min(2, $at)) . '•••' . substr($email, $at);
}

function mask_phone(string $phone): string
{
    $d = preg_replace('/\D/', '', $phone);
    return strlen($d) < 6 ? '•••' : '+' . substr($d, 0, 4) . '••••' . substr($d, -2);
}

/**
 * Peserta yang sedang masuk: lewat akun berkata sandi ber-role Peserta (dicocokkan dengan email),
 * atau lewat aktivasi voucher / masuk dengan OTP ($_SESSION['pid']).
 */
function current_participant(?array $d = null): ?array
{
    $d = $d ?? enroll_read();
    $u = current_user();
    if ($u && $u['role'] === 'participant') {
        $no = find_participant_by_email($d, $u['email']);
        return ['no' => $no, 'via' => 'account', 'name' => $u['name'], 'email' => $u['email']] + ($no ? $d['participants'][$no] : []);
    }
    $pid = $_SESSION['pid'] ?? null;
    if ($pid && isset($d['participants'][$pid])) return ['no' => $pid, 'via' => 'otp'] + $d['participants'][$pid];
    return null;
}

/* ---------- OTP (disimpan di session sebagai hash) ---------- */
function otp_issue(array &$slot, string $target): string
{
    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $slot = ['hash' => password_hash($code, PASSWORD_DEFAULT), 'target' => $target, 'exp' => time() + OTP_TTL, 'tries' => 0, 'sent' => time(), 'verified' => false];
    return $code;
}

/** 'ok' | 'wrong' | 'expired' | 'locked' | 'none' */
function otp_check(array &$slot, string $code): string
{
    if (empty($slot['hash'])) return 'none';
    if (!empty($slot['verified'])) return 'ok';
    if ($slot['tries'] >= OTP_MAX_TRIES) return 'locked';
    if (time() > $slot['exp']) return 'expired';
    $slot['tries']++;
    if (!preg_match('/^\d{6}$/', $code) || !password_verify($code, $slot['hash'])) return $slot['tries'] >= OTP_MAX_TRIES ? 'locked' : 'wrong';
    $slot['verified'] = true;
    $slot['hash'] = '';   // OTP yang berhasil tidak dapat dipakai lagi
    return 'ok';
}

/** Kirim OTP. Mengembalikan true bila benar-benar terkirim lewat penyedia. */
function otp_deliver(string $channel, string $target, string $code): bool
{
    if ($channel === 'email' && OTP_SEND_EMAIL) {
        $subject = 'Kode verifikasi TACMS';
        $body = "Kode verifikasi Anda: $code\nBerlaku 5 menit. Jangan berikan kode ini kepada siapa pun.";
        return @mail($target, $subject, $body, 'From: ' . MAIL_FROM);
    }
    return false; // WhatsApp/SMS belum memiliki penyedia
}

/* ---------- Gate akses ujian (Addendum v1.1 §4) ---------- */
function enrollment_view(array $d, array $e, array $p): array
{
    $now = time();
    $start = strtotime($e['start']); $end = strtotime($e['end']);
    $v = !empty($e['voucher_hash']) ? ($d['vouchers'][$e['voucher_hash']] ?? null) : null;
    $batch = $e['batch'] ? (VOUCHER_BATCHES[$e['batch']] ?? null) : null;
    $identity = !empty($p['email_verified_at']) && !empty($p['phone_verified_at']);
    $active = in_array($e['status'], ['SCHEDULED', 'IN_PROGRESS'], true);
    $sched = $now < $start ? 'upcoming' : ($now <= $end ? 'open' : 'closed');
    $vState = !$v ? 'none' : (in_array($v['status'], ['BOUND', 'REDEEMED'], true) && $v['participant'] === $p['no'] ? 'bound' : ($v['status'] === 'ALLOCATED' ? 'allocated' : 'invalid'));
    $paid = $batch && in_array($batch['order_status'], ['PAID', 'CONFIRMED'], true);
    $rs = retake_state($d, $e);
    $entitled = $vState === 'bound' && $active && ($rs['state'] === 'in_progress' || (in_array($rs['state'], ['none', 'available'], true) && $rs['used'] < $rs['allowed']));
    $gates = [
        ['identity', $identity],
        ['enrollment', $active],
        ['schedule', $sched === 'open' ? true : ($sched === 'upcoming' ? 'wait' : false)],
        ['voucher', $vState === 'bound'],
        ['payment', $vState === 'none' ? false : $paid],
        ['entitlement', $entitled],
    ];
    $base = public_enrollment($d, $e);
    $cfg = exam_cfg($e['exam']);
    return $base + [
        'scheduleState' => $sched, 'voucherState' => $vState, 'boundAt' => $v['bound_at'] ?? null,
        'gates' => array_map(fn($g) => ['key' => $g[0], 'ok' => $g[1]], $gates),
        'canStart' => !in_array(false, array_column($gates, 1), true) && !in_array('wait', array_column($gates, 1), true),
        'retake' => $rs, 'result' => $e['result'] ?? null, 'finalScore' => $e['final_score'] ?? null,
        'passing' => $cfg['passing'], 'questionCount' => count($cfg['questions']), 'duration' => TRAININGS[$e['training']]['exams'][$e['exam']]['duration'] ?? 0,
        'attempts' => array_map(fn($a) => public_attempt($a), enrollment_attempts($d, $e['id'])),
    ];
}
