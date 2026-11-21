<?php
/**
 * TACMS — verifikasi sertifikat publik (SRS 8.6, 9.7). Tanpa login.
 * GET ?no=NOMOR atau ?token=TOKEN_QR → status VALID/REVOKED/EXPIRED/NOT_FOUND + data minimum.
 * Tidak pernah menampilkan email, telepon, nilai, atau data sensitif. Pencarian gagal dibatasi per IP.
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/enrollstore.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['ok' => false, 'error' => 'method'], 405);
$key = 'verify';
$wait = lock_remaining($key);
if ($wait > 0) json_out(['ok' => false, 'error' => 'locked', 'minutes' => (int)ceil($wait / 60)], 429);
$no = strtoupper(trim((string)($_GET['no'] ?? '')));
$token = trim((string)($_GET['token'] ?? ''));
if ($no === '' && $token === '') json_out(['ok' => false, 'error' => 'empty'], 422);

$res = enroll_update(function (array &$d) use ($no, $token) {
    foreach ($d['certificates'] as $i => $c) {
        if (empty($c['no'])) continue;
        if (($no !== '' && strtoupper($c['no']) === $no) || ($token !== '' && hash_equals((string)$c['token'], $token))) {
            $d['certificates'][$i]['verify_count'] = ($c['verify_count'] ?? 0) + 1;   // statistik tanpa data pribadi
            $p = $d['participants'][$c['participant']] ?? [];
            return ['state' => certificate_public_state($c), 'no' => $c['no'], 'name' => $p['name'] ?? '', 'type' => $c['type'],
                'training' => TRAININGS[$c['training']]['name'] ?? $c['training'], 'issuedAt' => $c['issued_at'] ?? null, 'expiresAt' => $c['expires_at'] ?? null];
        }
    }
    return null;
});
if (!$res) {
    record_fail($key);
    json_out(['ok' => true, 'state' => 'NOT_FOUND', 'query' => $no ?: '(QR)']);
}
json_out(['ok' => true, 'org' => 'LSP Teknologi Nusantara'] + $res);
