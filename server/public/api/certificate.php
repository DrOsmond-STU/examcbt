<?php
/**
 * TACMS — tampilan cetak/unduh sertifikat (flowchart: Download Certificate).
 * Pemilik (peserta) atau staf dengan akses halaman Sertifikat. Simpan sebagai PDF lewat dialog cetak browser.
 * QR Code berisi tautan verifikasi publik dengan token acak (SRS 5.8: tidak membocorkan data pribadi).
 */
declare(strict_types=1);
require __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/enrollstore.php';

start_session();
$d = enroll_read();
$id = (string)($_GET['id'] ?? '');
$i = find_index($d['certificates'], 'id', $id);
$c = $i !== null ? $d['certificates'][$i] : null;
$staff = current_user();
$p = current_participant($d);
$allowed = $c && (($staff && user_can_route($staff, 'a-certificates')) || ($p && $p['no'] === $c['participant']));
if (!$allowed || $c['status'] === 'PENDING_APPROVAL') { http_response_code(404); header('Content-Type: text/plain; charset=utf-8'); echo 'Sertifikat tidak ditemukan.'; exit; }

$pp = $d['participants'][$c['participant']];
$t = TRAININGS[$c['training']];
$host = $_SERVER['HTTP_HOST'] ?? 'examcbt.semestateknologiutama.com';
$verifyUrl = 'https://' . $host . '/?v=' . rawurlencode($c['token']) . '#verify';
$fmt = function (?string $iso) { if (!$iso) return '—'; $m = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; $t = (new DateTimeImmutable($iso))->setTimezone(new DateTimeZone('Asia/Jakarta')); return $t->format('j') . ' ' . $m[(int)$t->format('n') - 1] . ' ' . $t->format('Y'); };
$titles = ['Competency' => 'Sertifikat Kompetensi', 'Completion' => 'Sertifikat Penyelesaian', 'Attendance' => 'Sertifikat Kehadiran'];
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$revoked = $c['status'] === 'REVOKED';

$qrLib = file_get_contents(__DIR__ . '/../../app/vendor/qrcode.js');
$qrRun = 'var q=qrcode(0,"M");q.addData(' . json_encode($verifyUrl, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . ');q.make();document.getElementById("qr").innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});'
    . 'var b=document.getElementById("print");if(b)b.addEventListener("click",function(){window.print();});';
$hashes = "'sha256-" . base64_encode(hash('sha256', $qrLib, true)) . "' 'sha256-" . base64_encode(hash('sha256', $qrRun, true)) . "'";
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: private, no-store');
header("Content-Security-Policy: default-src 'none'; script-src $hashes; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; base-uri 'none'; frame-ancestors 'none'");
?><!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title><?= $h($c['no']) ?> · <?= $h($pp['name']) ?></title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap">
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e9ecef; font-family: "Open Sans", system-ui, sans-serif; color: #1b2a44; }
  .bar { display: flex; gap: 12px; justify-content: center; align-items: center; padding: 16px; font-size: 14px; flex-wrap: wrap; }
  .bar button { border: 0; border-radius: 8px; padding: 10px 18px; font: 700 12px "Open Sans", sans-serif; letter-spacing: .03em; text-transform: uppercase; color: #fff; background: linear-gradient(310deg, #7928ca, #ff0080); cursor: pointer; }
  .sheet { width: 297mm; height: 210mm; max-width: 100%; margin: 0 auto 24px; background: #fffdf7; position: relative; box-shadow: 0 20px 27px rgba(0,0,0,.08); overflow: hidden; }
  .frame { position: absolute; inset: 9mm; border: 1.2mm solid #a57a24; padding: 16mm 20mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .frame::before { content: ""; position: absolute; inset: 2.5mm; border: .4mm solid #a57a24; }
  .org { font-weight: 700; letter-spacing: .25em; text-transform: uppercase; color: #1d4b94; font-size: 13pt; }
  .title { font-weight: 800; font-size: 34pt; margin-top: 8mm; letter-spacing: .02em; }
  .sub { color: #4b5872; font-size: 12pt; margin-top: 4mm; }
  .name { font-weight: 800; font-size: 32pt; color: #0e2148; border-bottom: .6mm solid #a57a24; padding: 0 14mm 2mm; margin-top: 4mm; }
  .body { font-size: 12pt; color: #33415c; max-width: 190mm; line-height: 1.55; margin-top: 6mm; }
  .foot { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; text-align: left; font-size: 10pt; color: #4b5872; }
  #qr { width: 30mm; height: 30mm; } #qr svg { width: 100%; height: 100%; }
  .sign { text-align: center; } .sign .line { width: 60mm; border-top: .4mm solid #33415c; margin: 16mm auto 2mm; }
  .void { position: absolute; inset: 0; display: grid; place-items: center; font: 800 72pt "Open Sans", sans-serif; color: rgba(234, 6, 6, .18); transform: rotate(-18deg); pointer-events: none; }
  @media print { body { background: #fff; } .bar { display: none; } .sheet { margin: 0; box-shadow: none; width: 297mm; height: 210mm; } }
</style></head><body>
<div class="bar"><span>Pratinjau sertifikat · gunakan <b>Cetak</b> lalu pilih <b>Simpan sebagai PDF</b> untuk mengunduh.</span><button id="print" type="button">Cetak / Simpan PDF</button></div>
<div class="sheet"><div class="frame">
  <div class="org">LSP Teknologi Nusantara</div>
  <div class="title"><?= $h($titles[$c['type']] ?? 'Sertifikat') ?></div>
  <div class="sub">Certificate of <?= $h($c['type']) ?> · diberikan kepada</div>
  <div class="name"><?= $h($pp['name']) ?></div>
  <div class="body">atas keberhasilan memenuhi persyaratan program <b><?= $h($t['name']) ?></b><?= $c['type'] === 'Competency' ? ' berdasarkan asesmen teori dan praktik' : '' ?>.<br>Nomor peserta <?= $h($c['participant']) ?></div>
  <div class="foot">
    <div><div id="qr" aria-label="QR verifikasi"></div><div style="margin-top:2mm">No. <b><?= $h($c['no']) ?></b></div><div style="font-size:8pt">Verifikasi: <?= $h($host) ?></div></div>
    <div class="sign"><div class="line"></div><b>Ir. Hendrawan Saputro, M.T.</b><div>Ketua LSP-TN</div></div>
    <div style="text-align:right">Diterbitkan <?= $h($fmt($c['issued_at'] ?? null)) ?><br><?= !empty($c['expires_at']) ? 'Berlaku s/d ' . $h($fmt($c['expires_at'])) : 'Tanpa masa berlaku' ?></div>
  </div>
  <?php if ($revoked): ?><div class="void">DICABUT</div><?php endif; ?>
</div></div>
<script><?= $qrLib ?></script>
<script><?= $qrRun ?></script>
</body></html>
