<?php
// Menjaga session tetap aktif selama pengguna bekerja di halaman (navigasi SPA tidak memuat ulang server).
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
start_session();
json_out(['ok' => current_user() !== null]);
