<?php
// Menjaga session tetap aktif selama pengguna bekerja di halaman (navigasi SPA tidak memuat ulang server).
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/enrollstore.php';
start_session();
json_out(['ok' => current_user() !== null || (!empty($_SESSION['pid']) && current_participant() !== null)]);
