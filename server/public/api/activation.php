<?php
/**
 * TACMS — aktivasi voucher peserta (SRS 8.2, Addendum v1.1 §4) dan masuk peserta dengan OTP.
 * Publik (tanpa login), dilindungi CSRF, pembatasan percobaan per IP, dan reservasi voucher.
 *
 * POST action=check        {code}               → cek voucher, reservasi 15 menit
 * POST action=identity     {name,email,phone}   → email harus milik peserta yang dialokasikan; terbitkan OTP email & telepon
 * POST action=verify       {channel,code}       → verifikasi OTP
 * POST action=resend       {channel}            → kirim ulang (jeda 60 detik, kode lama batal)
 * POST action=bind                              → ikat voucher (ALLOCATED → BOUND) dan masuk sebagai peserta
 * POST action=login_start  {email}              → masuk dengan OTP (peserta yang sudah aktivasi)
 * POST action=login_verify {code}
 * GET                                           → status proses aktivasi di session ini
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/enrollstore.php';

start_session();
$SAFE = 'Kode voucher tidak dapat digunakan.';

/** Ringkasan voucher untuk ditampilkan (tanpa data pribadi peserta lain). */
function voucher_summary(array $d, array $v): array
{
    $e = null;
    foreach ($d['enrollments'] as $x) if ($x['id'] === $v['enrollment']) { $e = $x; break; }
    $t = TRAININGS[$v['training']] ?? ['name' => $v['training'], 'exams' => []];
    $p = $d['participants'][$v['participant']] ?? [];
    return [
        'masked' => $v['masked'], 'training' => $t['name'], 'exam' => $t['exams'][$v['exam']]['name'] ?? $v['exam'],
        'start' => $e['start'] ?? null, 'end' => $e['end'] ?? null, 'tz' => $e['tz'] ?? 'Asia/Jakarta',
        'emailHint' => mask_email($p['email'] ?? ''), 'enrollment' => $v['enrollment'],
    ];
}

/** Alasan voucher tidak bisa diaktifkan, atau null. */
function voucher_problem(array $d, ?array $v, string $token): ?string
{
    if (!$v) return 'invalid';
    if ($v['status'] === 'BOUND') return 'bound';
    if ($v['status'] !== 'ALLOCATED') return 'invalid';
    $e = null;
    foreach ($d['enrollments'] as $x) if ($x['id'] === $v['enrollment']) { $e = $x; break; }
    if (!$e || $e['status'] !== 'SCHEDULED') return 'invalid';
    $b = VOUCHER_BATCHES[$v['batch']] ?? null;
    if (!$b || !in_array($b['order_status'], ['PAID', 'CONFIRMED'], true)) return 'unpaid';
    if ($b['valid_until'] < (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d')) return 'expired';
    if (!empty($v['reserved_by']) && $v['reserved_by'] !== $token && ($v['reserved_until'] ?? 0) > time()) return 'reserved';
    return null;
}

/** Masuk sebagai peserta (session baru). */
function login_participant(string $pid): void
{
    session_regenerate_id(true);
    $_SESSION = ['pid' => $pid, 'last' => time(), 'auth_at' => time(), 'csrf' => bin2hex(random_bytes(32))];
}

$act = &$_SESSION['act'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($act['hash'])) json_out(['ok' => true, 'step' => 'start']);
    json_out(['ok' => true, 'step' => $act['step'], 'voucher' => $act['summary'], 'reservedUntil' => $act['until'],
        'otp' => isset($act['otp']) ? array_map(fn($s) => ['target' => $s['target'], 'verified' => !empty($s['verified']), 'resendIn' => max(0, $s['sent'] + OTP_RESEND_AFTER - time()), 'triesLeft' => max(0, OTP_MAX_TRIES - $s['tries'])], $act['otp']) : null,
        'demo' => OTP_DEMO_DISPLAY ? ($act['demo'] ?? null) : null]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
if (!check_csrf()) json_out(['ok' => false, 'error' => 'csrf'], 403);
$in = read_json_body();
$action = (string)($in['action'] ?? '');
$ipKey = 'voucher-check';

switch ($action) {
    /* ---------- 1. Cek voucher & reservasi ---------- */
    case 'check': {
        $wait = lock_remaining($ipKey);
        if ($wait > 0) json_out(['ok' => false, 'error' => 'locked', 'minutes' => (int)ceil($wait / 60)], 429);
        $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($in['code'] ?? '')));
        $code = strlen($code) === 13 ? substr($code, 0, 5) . '-' . substr($code, 5, 4) . '-' . substr($code, 9, 4) : '';
        $hash = $code ? voucher_hash($code) : '';
        $me = current_participant();
        $token = $act['token'] ?? bin2hex(random_bytes(16));

        $res = enroll_update(function (array &$d) use ($hash, $token, $me) {
            $v = $hash !== '' ? ($d['vouchers'][$hash] ?? null) : null;
            $prob = voucher_problem($d, $v, $token);
            if ($prob) return ['error' => $prob];
            // Peserta yang sudah masuk dan voucher memang miliknya → langsung diikat (identitas sudah terverifikasi)
            if ($me && $me['no'] === $v['participant'] && !empty($me['email_verified_at']) && !empty($me['phone_verified_at'])) {
                $d['vouchers'][$hash]['status'] = 'BOUND';
                $d['vouchers'][$hash]['bound_at'] = gmdate('c');
                foreach ($d['enrollments'] as &$e) if ($e['id'] === $v['enrollment']) $e['activated_at'] = gmdate('c');
                return ['bound' => true, 'summary' => voucher_summary($d, $d['vouchers'][$hash])];
            }
            if ($me && $me['no'] && $me['no'] !== $v['participant']) return ['error' => 'other'];
            $d['vouchers'][$hash]['reserved_by'] = $token;
            $d['vouchers'][$hash]['reserved_until'] = time() + RESERVE_TTL;
            return ['summary' => voucher_summary($d, $d['vouchers'][$hash])];
        });

        if (!empty($res['error'])) {
            if (in_array($res['error'], ['invalid', 'other'], true)) {
                $left = record_fail($ipKey);
                audit('voucher.check_fail', $me['no'] ?? 'tamu', $res['error'] === 'other' ? 'voucher milik peserta lain' : 'kode tidak dikenal');
                if ($left <= 0) json_out(['ok' => false, 'error' => 'locked', 'minutes' => (int)ceil(LOGIN_LOCK_SECONDS / 60)], 429);
            }
            json_out(['ok' => false, 'error' => $res['error']], 422);
        }
        clear_fails($ipKey);
        if (!empty($res['bound'])) {
            audit('voucher.bind', $me['no'], $res['summary']['masked'] . ' · ' . $res['summary']['enrollment'] . ' · peserta sudah masuk');
            json_out(['ok' => true, 'bound' => true, 'voucher' => $res['summary']]);
        }
        $act = ['token' => $token, 'hash' => $hash, 'step' => 'identity', 'until' => time() + RESERVE_TTL, 'summary' => $res['summary']];
        audit('voucher.reserve', $me['no'] ?? 'tamu', $res['summary']['masked'] . ' · ' . $res['summary']['enrollment']);
        json_out(['ok' => true, 'step' => 'identity', 'voucher' => $res['summary'], 'reservedUntil' => $act['until']]);
    }

    /* ---------- 2. Identitas → terbitkan OTP ---------- */
    case 'identity': {
        if (empty($act['hash']) || $act['until'] < time()) json_out(['ok' => false, 'error' => 'expired_reservation'], 409);
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $phone = normalize_phone((string)($in['phone'] ?? ''));
        $name  = trim(preg_replace('/\s+/', ' ', (string)($in['name'] ?? '')));
        if (mb_strlen($name) < 2 || mb_strlen($name) > 80) json_out(['ok' => false, 'error' => 'name'], 422);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['ok' => false, 'error' => 'email'], 422);
        if (strlen(preg_replace('/\D/', '', $phone)) < 9) json_out(['ok' => false, 'error' => 'phone'], 422);
        $d = enroll_read();
        $v = $d['vouchers'][$act['hash']] ?? null;
        $p = $v ? ($d['participants'][$v['participant']] ?? null) : null;
        if (!$p || strcasecmp($p['email'], $email) !== 0) {
            audit('voucher.identity_mismatch', 'tamu', $v['masked'] ?? '');
            json_out(['ok' => false, 'error' => 'mismatch'], 422);
        }
        $channel = in_array($in['channel'] ?? '', ['WhatsApp', 'SMS'], true) ? $in['channel'] : 'WhatsApp';
        $act['otp'] = ['email' => [], 'phone' => []];
        $ce = otp_issue($act['otp']['email'], $email);
        $cp = otp_issue($act['otp']['phone'], $phone);
        $sent = ['email' => otp_deliver('email', $email, $ce), 'phone' => otp_deliver('phone', $phone, $cp)];
        $act['identity'] = ['name' => $name, 'email' => $email, 'phone' => $phone, 'channel' => $channel];
        $act['demo'] = ['email' => $ce, 'phone' => $cp];
        $act['step'] = 'otp';
        json_out(['ok' => true, 'step' => 'otp', 'targets' => ['email' => mask_email($email), 'phone' => mask_phone($phone)], 'channel' => $channel, 'sent' => $sent,
            'demo' => OTP_DEMO_DISPLAY ? $act['demo'] : null]);
    }

    /* ---------- 3. Verifikasi & kirim ulang OTP ---------- */
    case 'verify':
    case 'resend': {
        $ch = (string)($in['channel'] ?? '');
        if (empty($act['otp'][$ch]) || !in_array($ch, ['email', 'phone'], true)) json_out(['ok' => false, 'error' => 'no_otp'], 409);
        if ($action === 'resend') {
            $left = $act['otp'][$ch]['sent'] + OTP_RESEND_AFTER - time();
            if ($left > 0) json_out(['ok' => false, 'error' => 'cooldown', 'seconds' => $left], 429);
            $code = otp_issue($act['otp'][$ch], $act['otp'][$ch]['target']);
            $act['demo'][$ch] = $code;
            json_out(['ok' => true, 'sent' => otp_deliver($ch, $act['otp'][$ch]['target'], $code), 'demo' => OTP_DEMO_DISPLAY ? $code : null]);
        }
        $r = otp_check($act['otp'][$ch], (string)($in['code'] ?? ''));
        if ($r !== 'ok') {
            audit('otp.fail', 'tamu', "$ch · $r");
            json_out(['ok' => false, 'error' => 'otp_' . $r, 'triesLeft' => max(0, OTP_MAX_TRIES - $act['otp'][$ch]['tries'])], 422);
        }
        unset($act['demo'][$ch]);
        json_out(['ok' => true, 'verified' => array_map(fn($s) => !empty($s['verified']), $act['otp'])]);
    }

    /* ---------- 4. Ikat voucher ---------- */
    case 'bind': {
        if (empty($act['hash']) || empty($act['otp']['email']['verified']) || empty($act['otp']['phone']['verified'])) json_out(['ok' => false, 'error' => 'not_verified'], 409);
        $ident = $act['identity'];
        $res = enroll_update(function (array &$d) use ($act, $ident) {
            $v = $d['vouchers'][$act['hash']] ?? null;
            if ($prob = voucher_problem($d, $v, $act['token'])) return ['error' => $prob];
            $now = gmdate('c');
            $h = $act['hash'];
            $d['vouchers'][$h]['status'] = 'BOUND';
            $d['vouchers'][$h]['bound_at'] = $now;
            unset($d['vouchers'][$h]['reserved_by'], $d['vouchers'][$h]['reserved_until']);
            $pid = $v['participant'];
            $d['participants'][$pid]['phone'] = $ident['phone'];
            $d['participants'][$pid]['email_verified_at'] = $now;
            $d['participants'][$pid]['phone_verified_at'] = $now;
            $d['participants'][$pid]['phone_channel'] = $ident['channel'];
            foreach ($d['enrollments'] as &$e) if ($e['id'] === $v['enrollment']) $e['activated_at'] = $now;
            return ['pid' => $pid, 'summary' => voucher_summary($d, $d['vouchers'][$h])];
        });
        if (!empty($res['error'])) json_out(['ok' => false, 'error' => $res['error']], 409);
        login_participant($res['pid']);
        audit('voucher.bind', $res['pid'], $res['summary']['masked'] . ' · ' . $res['summary']['enrollment'] . ' · OTP email + ' . $ident['channel']);
        json_out(['ok' => true, 'home' => 'p-bound']);
    }

    /* ---------- Masuk dengan OTP (peserta yang sudah aktivasi) ---------- */
    case 'login_start': {
        $wait = lock_remaining('otp-login');
        if ($wait > 0) json_out(['ok' => false, 'error' => 'locked', 'minutes' => (int)ceil($wait / 60)], 429);
        $email = strtolower(trim((string)($in['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['ok' => false, 'error' => 'email'], 422);
        $d = enroll_read();
        $no = find_participant_by_email($d, $email);
        $_SESSION['otplogin'] = ['pid' => null];
        $demo = null;
        // Respons sama untuk email terdaftar maupun tidak (mencegah enumerasi); kode hanya dibuat bila email sudah terverifikasi.
        if ($no && !empty($d['participants'][$no]['email_verified_at'])) {
            $_SESSION['otplogin'] = ['pid' => $no, 'otp' => []];
            $code = otp_issue($_SESSION['otplogin']['otp'], $email);
            otp_deliver('email', $email, $code);
            $demo = $code;
        }
        json_out(['ok' => true, 'target' => mask_email($email), 'demo' => OTP_DEMO_DISPLAY ? $demo : null]);
    }

    case 'login_verify': {
        $s = &$_SESSION['otplogin'];
        if (empty($s['pid'])) {
            record_fail('otp-login');
            json_out(['ok' => false, 'error' => 'otp_wrong', 'triesLeft' => 0], 422);
        }
        $r = otp_check($s['otp'], (string)($in['code'] ?? ''));
        if ($r !== 'ok') {
            record_fail('otp-login');
            audit('participant.login_fail', $s['pid'], $r);
            json_out(['ok' => false, 'error' => 'otp_' . $r, 'triesLeft' => max(0, OTP_MAX_TRIES - $s['otp']['tries'])], 422);
        }
        $pid = $s['pid'];
        clear_fails('otp-login');
        login_participant($pid);
        audit('participant.login', $pid, 'OTP email');
        json_out(['ok' => true, 'home' => 'p-dashboard']);
    }
}

json_out(['ok' => false, 'error' => 'action'], 400);
