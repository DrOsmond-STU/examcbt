<?php
/**
 * TACMS — akun demo untuk calon klien (dipakai bersama).
 * Flag 'demo': tidak wajib/ tidak bisa ganti kata sandi, dan tidak punya izin kelola pengguna (lihat current_user()).
 * Idempoten: akun yang sudah ada tidak diubah. Mengembalikan kata sandi bersama hanya saat akun dibuat.
 */
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

const DEMO_USERS = [
    'demo.org'        => ['Demo Organization Admin', 'org_admin', 'demo.org@demo.test'],
    'demo.training'   => ['Demo Training Admin', 'training_admin', 'demo.training@demo.test'],
    'demo.ujian'      => ['Demo Exam Admin', 'exam_admin', 'demo.ujian@demo.test'],
    'demo.penguji'    => ['Demo Penguji', 'examiner', 'demo.penguji@demo.test'],
    'demo.sertifikat' => ['Demo Certificate Admin', 'certificate_admin', 'demo.sertifikat@demo.test'],
    'demo.finance'    => ['Demo Finance', 'finance', 'demo.finance@demo.test'],
    'demo.auditor'    => ['Demo Auditor', 'auditor', 'demo.auditor@demo.test'],
    // Akun peserta berkata sandi, ditautkan ke peserta dummy Irfan Maulana (PAR-2026-00436) lewat email
    'demo.peserta'    => ['Irfan Maulana', 'participant', 'irfan.maulana@peserta.test'],
];

function demo_users_ensure(): array
{
    $pw = temp_password();
    $hash = password_hash($pw, PASSWORD_BCRYPT, ['cost' => 11]);
    $created = store_update(function (array &$all) use ($hash) {
        $made = [];
        foreach (DEMO_USERS as $u => [$name, $role, $email]) {
            if (isset($all[$u])) continue;
            $all[$u] = ['name' => $name, 'email' => $email, 'role' => $role, 'active' => true, 'must_change' => false, 'demo' => true,
                'hash' => $hash, 'created_at' => gmdate('c'), 'created_by' => 'system'];
            $made[] = $u;
        }
        return $made;
    });
    foreach ($created as $u) audit('user.create', 'system', "$u · " . ROLES[DEMO_USERS[$u][1]]['label'] . ' · akun demo bersama');
    return ['created' => $created, 'password' => $created ? $pw : null];
}

if (PHP_SAPI === 'cli' && realpath($argv[0] ?? '') === __FILE__) echo json_encode(demo_users_ensure()), "\n";
