<?php
/**
 * TACMS — definisi role, halaman (route), dan permission.
 * Mengacu pada matriks hak akses SRS 3.2 dan Addendum v1.1 (role Finance).
 *
 * routes : halaman yang boleh dibuka role ini ('*' = semua).
 * perms  : aksi tulis yang boleh dilakukan ('*' = semua). Halaman tanpa perm terkait = baca saja.
 * bundles: modul antarmuka yang dikirim server ke browser. Modul yang tidak ada di sini tidak pernah dikirim.
 */

const ADMIN_ROUTES = [
    'a-dashboard', 'a-trainings', 'a-participants', 'a-enrollments', 'a-vouchers', 'a-questions',
    'a-exam-builder', 'a-monitoring', 'a-grading', 'a-retake', 'a-certificates', 'a-reports', 'a-audit', 'a-users',
];
const PARTICIPANT_ROUTES = [
    'p-start', 'p-identity', 'p-otp', 'p-bound', 'p-dashboard', 'p-instructions', 'p-exam', 'p-result',
    'p-history', 'p-certs', 'p-profile',
];

/** Daftar permission beserta keterangannya (ditampilkan di layar "Hak akses saya"). */
const PERMISSIONS = [
    'training.write'    => 'Kelola pelatihan',
    'participant.write' => 'Kelola peserta',
    'enrollment.write'  => 'Kelola enrollment & jadwal',
    'voucher.write'     => 'Kelola voucher & order',
    'payment.verify'    => 'Verifikasi pembayaran',
    'question.write'    => 'Kelola bank soal',
    'exam.write'        => 'Susun ujian',
    'exam.publish'      => 'Publikasi ujian',
    'monitoring.write'  => 'Intervensi ujian berjalan',
    'grade.write'       => 'Menilai essay & praktik',
    'retake.decide'     => 'Putuskan pengajuan retake',
    'cert.write'        => 'Buat & cabut sertifikat',
    'cert.approve'      => 'Setujui penerbitan sertifikat',
    'report.export'     => 'Ekspor laporan',
    'user.write'        => 'Kelola pengguna & role',
];

const ROLES = [
    'super_admin' => [
        'label'   => 'Super Admin',
        'home'    => 'a-dashboard',
        'routes'  => ['*'],
        'perms'   => ['*'],
        'bundles' => ['admin', 'participant'],
    ],
    'org_admin' => [
        'label'   => 'Organization Admin',
        'home'    => 'a-dashboard',
        'routes'  => ADMIN_ROUTES,
        'perms'   => ['training.write', 'participant.write', 'enrollment.write', 'voucher.write', 'question.write', 'exam.write',
                      'exam.publish', 'monitoring.write', 'grade.write', 'retake.decide', 'cert.write', 'cert.approve',
                      'report.export', 'user.write'],
        'bundles' => ['admin'],
    ],
    'training_admin' => [
        'label'   => 'Training Admin',
        'home'    => 'a-dashboard',
        'routes'  => ['a-dashboard', 'a-trainings', 'a-participants', 'a-enrollments', 'a-vouchers', 'a-questions',
                      'a-exam-builder', 'a-monitoring', 'a-retake', 'a-certificates', 'a-reports', 'a-users'],
        'perms'   => ['training.write', 'participant.write', 'enrollment.write', 'voucher.write', 'report.export'],
        'bundles' => ['admin'],
    ],
    'exam_admin' => [
        'label'   => 'Exam Admin',
        'home'    => 'a-dashboard',
        // Rute peserta dibuka untuk preview ujian (langkah 7 Exam Builder).
        'routes'  => ['a-dashboard', 'a-trainings', 'a-participants', 'a-vouchers', 'a-questions', 'a-exam-builder',
                      'a-monitoring', 'a-grading', 'a-retake', 'a-reports', 'a-users', ...PARTICIPANT_ROUTES],
        'perms'   => ['question.write', 'exam.write', 'exam.publish', 'monitoring.write', 'grade.write', 'retake.decide', 'report.export'],
        'bundles' => ['admin', 'participant'],
    ],
    'examiner' => [
        'label'   => 'Examiner (Penguji)',
        'home'    => 'a-grading',
        'routes'  => ['a-dashboard', 'a-participants', 'a-enrollments', 'a-monitoring', 'a-grading', 'a-reports'],
        'perms'   => ['grade.write'],
        'bundles' => ['admin'],
    ],
    'certificate_admin' => [
        'label'   => 'Certificate Admin',
        'home'    => 'a-certificates',
        'routes'  => ['a-dashboard', 'a-trainings', 'a-participants', 'a-certificates', 'a-reports', 'a-users'],
        'perms'   => ['cert.write', 'cert.approve', 'report.export'],
        'bundles' => ['admin'],
    ],
    'finance' => [
        'label'   => 'Finance',
        'home'    => 'a-vouchers',
        'routes'  => ['a-dashboard', 'a-vouchers', 'a-reports'],
        'perms'   => ['payment.verify', 'report.export'],
        'bundles' => ['admin'],
    ],
    'auditor' => [
        'label'   => 'Auditor',
        'home'    => 'a-audit',
        'routes'  => ADMIN_ROUTES,
        'perms'   => ['report.export'],
        'bundles' => ['admin'],
    ],
    'participant' => [
        'label'   => 'Peserta',
        'home'    => 'p-dashboard',
        'routes'  => PARTICIPANT_ROUTES,
        'perms'   => [],
        'bundles' => ['participant'],
    ],
];
