<?php
/**
 * TACMS — data portal peserta: profil dan ujian yang ditugaskan beserta pemeriksaan gate akses.
 * Untuk peserta yang masuk lewat aktivasi voucher / OTP, atau akun berkata sandi ber-role Peserta.
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/enrollstore.php';

start_session();
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['ok' => false, 'error' => 'method'], 405);
$d = enroll_read();
$p = current_participant($d);
if (!$p) json_out(['ok' => false, 'error' => 'auth'], 401);

$list = [];
if ($p['no']) {
    foreach ($d['enrollments'] as $e) {
        if ($e['participant'] !== $p['no'] || $e['status'] === 'CANCELLED') continue;
        $list[] = enrollment_view($d, $e, $p);
    }
    usort($list, fn($a, $b) => strcmp($a['start'], $b['start']));
}
json_out([
    'ok' => true,
    'participant' => [
        'no' => $p['no'], 'name' => $p['name'] ?? '', 'email' => $p['email'] ?? '', 'phone' => $p['phone'] ?? '', 'inst' => $p['inst'] ?? '',
        'emailVerifiedAt' => $p['email_verified_at'] ?? null, 'phoneVerifiedAt' => $p['phone_verified_at'] ?? null, 'via' => $p['via'],
    ],
    'enrollments' => $list,
    'now' => gmdate('c'),
]);
