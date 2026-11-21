<?php
/**
 * TACMS — konfigurasi aktivasi voucher & OTP (SRS 5.3, 8.2).
 *
 * OTP_DEMO_DISPLAY: purwarupa belum punya penyedia email/WhatsApp/SMS, jadi kode OTP ditampilkan di layar
 * dengan label "Mode demo". Matikan (false) setelah penyedia pesan dipasang di otp_deliver().
 * OTP_SEND_EMAIL: kirim OTP email lewat mail() server. Default false agar tidak mengirim email ke alamat
 * sungguhan selama uji coba. Kanal telepon (WhatsApp/SMS) belum punya penyedia.
 */
declare(strict_types=1);

const OTP_DEMO_DISPLAY  = true;
const OTP_SEND_EMAIL    = false;
const OTP_TTL           = 300;   // berlaku 5 menit
const OTP_MAX_TRIES     = 5;     // per challenge
const OTP_RESEND_AFTER  = 60;    // detik
const RESERVE_TTL       = 900;   // reservasi voucher 15 menit
const MAIL_FROM         = 'no-reply@examcbt.semestateknologiutama.com';
