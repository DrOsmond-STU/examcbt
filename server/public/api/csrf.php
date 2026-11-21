<?php
// Memberi token CSRF (dan session) tepat sebelum login. Tidak pernah di-cache.
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
start_session();
json_out(['csrf' => csrf_token()]);
