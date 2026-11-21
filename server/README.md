# TACMS ExamCBT — versi server (PHP) dengan login & RBAC

Live: https://examcbt.semestateknologiutama.com

## Struktur di server

```
/home/semestat/examcbt-app/
├── public/            ← document root subdomain
│   ├── index.php      ← memilih modul antarmuka sesuai role (modul lain tidak dikirim)
│   ├── styles.css
│   ├── .htaccess      ← paksa HTTPS, header keamanan
│   └── api/           ← csrf.php, login.php, logout.php, ping.php
└── app/               ← di luar document root
    ├── rbac.php       ← role, halaman, permission
    ├── bootstrap.php  ← session, CSRF, pembatasan login, audit log
    ├── users.php      ← akun (hash bcrypt) — tidak di-commit
    ├── assets/js/     ← modul antarmuka (dari prototype/js)
    └── storage/       ← login_attempts.json, audit.log
```

## Role & hak akses

Diatur di `app/rbac.php`, mengikuti matriks SRS 3.2 + role Finance dari Addendum v1.1.

| Role | Halaman | Aksi tulis |
|---|---|---|
| Super Admin | Semua (admin + peserta) | Semua |
| Organization Admin | Semua halaman admin | Semua kecuali verifikasi pembayaran |
| Training Admin | Pelatihan, peserta, enrollment, voucher, bank soal & ujian (baca), monitoring, retake, sertifikat (baca), laporan, pengguna (baca) | Pelatihan, peserta, enrollment, voucher, ekspor |
| Exam Admin | Bank soal, exam builder, monitoring, penilaian, retake, laporan, + preview portal peserta | Soal, ujian, publikasi, intervensi ujian, penilaian, retake, ekspor |
| Examiner | Dashboard, peserta, enrollment (baca), monitoring, penilaian, laporan | Penilaian |
| Certificate Admin | Pelatihan, peserta, sertifikat, laporan, pengguna (baca) | Buat, setujui, cabut sertifikat, ekspor |
| Finance | Dashboard, voucher & order, laporan | Verifikasi pembayaran, ekspor |
| Auditor | Semua halaman admin (baca saja) + audit log | Ekspor |
| Peserta | Portal peserta | — |

Penegakan:
- **Server**: tanpa login hanya halaman login & verifikasi sertifikat yang tersedia; modul admin/peserta hanya dikirim ke role yang berhak; API memakai session + token CSRF.
- **Antarmuka**: menu di luar hak akses disembunyikan, halaman terlarang menampilkan "Akses ditolak", tombol aksi tanpa izin dinonaktifkan.

Keamanan login: bcrypt, session cookie `HttpOnly; Secure; SameSite=Lax`, regenerasi ID saat login, CSRF, kunci 15 menit setelah 5 kali gagal (per IP + nama pengguna), logout otomatis setelah 30 menit tidak aktif, audit log `app/storage/audit.log`, CSP berbasis hash skrip.

## Mengelola akun

Akun disimpan di `app/users.php`. Untuk membuat ulang semua akun dengan kata sandi acak baru:

```bash
php server/tools/make-users.php /path/aman/credentials.tsv
server/build.sh
```

Lalu unggah `app/users.php` ke server (izin file 0600). Untuk menonaktifkan akun, ubah `'active' => false`.

## Build & deploy

```bash
server/build.sh   # menghasilkan dist/examcbt-app/ dan dist/examcbt-app.tar.bz2 (tanpa isi storage)
```

Ekstrak arsip ke `/home/semestat/examcbt-app/`. Isi `app/storage/` di server tidak tersentuh.

## Catatan

Ini purwarupa: data di layar tetap data contoh dan aksi tulis disimulasikan di browser. Login, session, dan pembagian akses sudah nyata di server.
