<?php
/**
 * TACMS — katalog pelatihan, ujian, dan batch voucher (data awal purwarupa, sama dengan data contoh di antarmuka).
 * Enrollment hanya boleh untuk pelatihan berstatus Aktif atau Terjadwal.
 * Voucher hanya dialokasikan dari batch yang order-nya sudah PAID/CONFIRMED dan belum kedaluwarsa (Addendum v1.1 §4).
 */
declare(strict_types=1);

const TRAININGS = [
    'TRN-DA-2611' => ['name' => 'Data Analyst Associate', 'status' => 'Aktif', 'exams' => [
        'EXM-DA-T' => ['name' => 'Ujian Teori', 'duration' => 90],
        'EXM-DA-P' => ['name' => 'Ujian Praktik', 'duration' => 120],
    ]],
    'TRN-DM-2611' => ['name' => 'Digital Marketing Fundamental', 'status' => 'Aktif', 'exams' => [
        'EXM-DM-T' => ['name' => 'Ujian Teori', 'duration' => 60],
        'EXM-DM-P' => ['name' => 'Ujian Praktik', 'duration' => 90],
    ]],
    'TRN-CS-2610' => ['name' => 'Cyber Security Awareness', 'status' => 'Selesai', 'exams' => [
        'EXM-CS-T' => ['name' => 'Ujian Teori', 'duration' => 45],
    ]],
    'TRN-PM-2612' => ['name' => 'Project Management Essentials', 'status' => 'Terjadwal', 'exams' => [
        'EXM-PM-T' => ['name' => 'Ujian Teori', 'duration' => 90],
    ]],
    'TRN-UX-2612' => ['name' => 'UI/UX Research Practitioner', 'status' => 'Terjadwal', 'exams' => [
        'EXM-UX-T' => ['name' => 'Ujian Teori', 'duration' => 60],
        'EXM-UX-P' => ['name' => 'Ujian Praktik', 'duration' => 120],
    ]],
    'TRN-K3-2608' => ['name' => 'K3 Perkantoran Dasar', 'status' => 'Diarsipkan', 'exams' => [
        'EXM-K3-T' => ['name' => 'Post-test', 'duration' => 30],
    ]],
];

/** exam = null berarti berlaku untuk semua ujian pelatihan. used = voucher yang sudah terpakai/terikat sebelum sistem ini. */
const VOUCHER_BATCHES = [
    'VB-2611-014' => ['training' => 'TRN-DA-2611', 'exam' => 'EXM-DA-T', 'qty' => 80, 'used' => 60, 'order' => 'ORD-2026-0311', 'order_status' => 'PAID', 'valid_until' => '2026-12-31', 'type' => 'Individual'],
    'VB-2611-013' => ['training' => 'TRN-DM-2611', 'exam' => null, 'qty' => 50, 'used' => 40, 'order' => 'ORD-2026-0307', 'order_status' => 'CONFIRMED', 'valid_until' => '2027-01-15', 'type' => 'Institusi'],
    'VB-2610-011' => ['training' => 'TRN-CS-2610', 'exam' => 'EXM-CS-T', 'qty' => 130, 'used' => 118, 'order' => 'ORD-2026-0288', 'order_status' => 'PAID', 'valid_until' => '2026-11-15', 'type' => 'Individual'],
    'VB-2612-016' => ['training' => 'TRN-PM-2612', 'exam' => 'EXM-PM-T', 'qty' => 40, 'used' => 0, 'order' => 'ORD-2026-0320', 'order_status' => 'CONFIRMED', 'valid_until' => '2027-02-28', 'type' => 'Institusi'],
    // Order Universitas Brawijaya belum diverifikasi Finance → belum bisa dialokasikan
    'ORD-2026-0324' => ['training' => 'TRN-DA-2611', 'exam' => 'EXM-DA-T', 'qty' => 40, 'used' => 0, 'order' => 'ORD-2026-0324', 'order_status' => 'PROOF_SUBMITTED', 'valid_until' => '2027-03-31', 'type' => 'Institusi'],
];

/** Data peserta awal (sama dengan daftar peserta contoh). */
const SEED_PARTICIPANTS = [
    ['no' => 'PAR-2026-00418', 'name' => 'Nadia Putri Anggraini', 'email' => 'nadia.anggraini@mail.id', 'phone' => '+62 812-3456-7890', 'inst' => 'Universitas Padjadjaran'],
    ['no' => 'PAR-2026-00419', 'name' => 'Bagas Pratama', 'email' => 'bagas.pratama@mail.id', 'phone' => '+62 813-2201-4410', 'inst' => 'PT Sinar Data Mandiri'],
    ['no' => 'PAR-2026-00420', 'name' => 'Larasati Wibowo', 'email' => 'laras.w@mail.id', 'phone' => '+62 857-7781-0021', 'inst' => 'Politeknik Negeri Semarang'],
    ['no' => 'PAR-2026-00421', 'name' => 'Fajar Ramadhan', 'email' => 'fajar.rmd@mail.id', 'phone' => '+62 821-9090-1120', 'inst' => 'Mandiri'],
    ['no' => 'PAR-2026-00422', 'name' => 'Intan Permatasari', 'email' => 'intan.permata@mail.id', 'phone' => '+62 811-4400-7788', 'inst' => 'Universitas Brawijaya'],
    ['no' => 'PAR-2026-00423', 'name' => 'Andika Saputra', 'email' => 'andika.s@mail.id', 'phone' => '+62 878-1234-0099', 'inst' => 'PT Arunika Teknologi'],
    ['no' => 'PAR-2026-00424', 'name' => 'Yusuf Hidayatullah', 'email' => 'yusuf.h@mail.id', 'phone' => '+62 812-7000-1515', 'inst' => 'Universitas Hasanuddin'],
    ['no' => 'PAR-2026-00425', 'name' => 'Maya Kusumawardani', 'email' => 'maya.kw@mail.id', 'phone' => '+62 815-2626-3030', 'inst' => 'Mandiri'],
    ['no' => 'PAR-2026-00426', 'name' => 'Rizky Aditya Nugraha', 'email' => 'rizky.an@mail.id', 'phone' => '+62 822-6060-1212', 'inst' => 'PT Sinar Data Mandiri'],
    ['no' => 'PAR-2026-00427', 'name' => 'Putu Ayu Lestiani', 'email' => 'ayu.lestiani@mail.id', 'phone' => '+62 819-3300-4545', 'inst' => 'Universitas Udayana'],
];

const TIMEZONES = ['Asia/Jakarta' => 'WIB', 'Asia/Makassar' => 'WITA', 'Asia/Jayapura' => 'WIT'];
const LATE_POLICIES = ['ALLOW_WITH_REMAINING_TIME', 'BLOCK', 'EXTEND_WITH_APPROVAL'];
const ENROLL_MAX_ROWS = 500;
