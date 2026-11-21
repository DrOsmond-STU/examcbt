<?php
/**
 * Jalankan data dummy sekali. CLI: php app/seed_run.php
 * Kode voucher yang belum diaktifkan disimpan di storage/dummy-vouchers.csv (0600) — hanya untuk uji coba.
 */
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/enrollstore.php';
require_once __DIR__ . '/seed.php';

function seed_run(): array
{
    $r = enroll_update(fn(array &$d) => seed_dummy($d, time()));
    if (!empty($r['skipped'])) return ['ok' => true, 'skipped' => true];
    $csv = STORAGE_DIR . '/dummy-vouchers.csv';
    $fh = fopen($csv, 'w');
    fputcsv($fh, ['participant', 'name', 'email', 'enrollment', 'training', 'exam', 'voucher_code']);
    foreach ($r['codes'] as $c) fputcsv($fh, [$c['participant'], $c['name'], $c['email'], $c['enrollment'], $c['training'], $c['exam'], $c['code']]);
    fclose($fh);
    chmod($csv, 0600);
    $s = $r['stats'];
    audit('system.seed', 'system', sprintf('Data dummy dibuat: %d peserta, %d enrollment, %d attempt, %d sertifikat terbit, %d permintaan retake', $s['participants'], $s['enrollments'], $s['attempts'], $s['certificates'], $s['retakes']));
    return ['ok' => true, 'skipped' => false, 'stats' => $s, 'codes' => $r['codes']];
}

if (PHP_SAPI === 'cli' && realpath($argv[0] ?? '') === __FILE__) {
    echo json_encode(seed_run(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
}
