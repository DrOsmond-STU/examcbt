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
$d = enroll_update(function (array &$d) { sweep_attempts($d); return $d; });
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
    'attempts' => $p['no'] ? array_values(array_map(fn($a) => public_attempt($a) + ['trainingName' => TRAININGS[$a['training']]['name'], 'examName' => TRAININGS[$a['training']]['exams'][$a['exam']]['name']],
        array_reverse(array_filter($d['attempts'], fn($a) => $a['participant'] === $p['no'])))) : [],
    'certificates' => $p['no'] ? array_values(array_map(fn($c) => public_certificate($d, $c), array_filter($d['certificates'], fn($c) => $c['participant'] === $p['no']))) : [],
    'now' => gmdate('c'),
]);
