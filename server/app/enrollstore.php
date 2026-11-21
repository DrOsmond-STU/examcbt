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
    return ['seq' => ['par' => 427, 'enr' => 0], 'participants' => $p, 'enrollments' => [], 'vouchers' => []];
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
    if (is_file(ENROLL_FILE)) {
        $d = json_decode((string)file_get_contents(ENROLL_FILE), true);
        if (is_array($d)) return $d;
    }
    return enroll_empty();
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
