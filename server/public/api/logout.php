<?php
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';

start_session();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
if (!check_csrf()) json_out(['ok' => false, 'error' => 'csrf'], 403);

if (!empty($_SESSION['uid'])) audit('auth.logout', $_SESSION['uid']);
$_SESSION = [];
$p = session_get_cookie_params();
setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Lax']);
session_destroy();
json_out(['ok' => true]);
