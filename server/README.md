# TACMS ExamCBT — versi server (PHP) dengan login & RBAC

Live: https://examcbt.semestateknologiutama.com

## Struktur di server

```
/home/semestat/examcbt-app/
├── public/            ← document root subdomain
│   ├── index.php      ← memilih modul antarmuka sesuai role (modul lain tidak dikirim)
│   ├── styles.css
│   ├── .htaccess      ← paksa HTTPS, header keamanan
│   └── api/           ← csrf, login, logout, ping, users (kelola pengguna), account (ganti kata sandi)
└── app/               ← di luar document root
    ├── rbac.php       ← role, halaman, permission
    ├── bootstrap.php  ← session, CSRF, pembatasan login, audit log
    ├── userstore.php  ← penyimpanan akun (users.json) & aturan kata sandi
    ├── users.php      ← data akun awal (hash bcrypt) — tidak di-commit
    ├── assets/js/     ← modul antarmuka (dari prototype/js)
    └── storage/       ← users.json, login_attempts.json, audit.log
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

Lewat aplikasi (menu **Pengguna & Role**, butuh izin "Kelola pengguna & role"):
- Tambah pengguna: sistem membuat kata sandi sementara (ditampilkan sekali) yang wajib diganti saat login pertama.
- Ubah nama, email, dan role. Organization Admin tidak dapat memberi atau mengubah role Super Admin.
- Reset kata sandi: kata sandi lama langsung tidak berlaku dan semua sesi pengguna itu keluar.
- Nonaktifkan/aktifkan akun (wajib alasan saat menonaktifkan). Tidak bisa menonaktifkan diri sendiri atau Super Admin aktif terakhir.

Setiap pengguna dapat mengganti kata sandi sendiri di **Akun saya** (klik nama di pojok kanan atas → "Akun saya & kata sandi").
Aturan kata sandi: minimal 10 karakter, berisi huruf dan angka, tidak memuat nama pengguna atau kata umum.
Salah memasukkan kata sandi saat ini 5 kali mengunci penggantian kata sandi selama 15 menit.

Penyimpanan: `app/storage/users.json` (0600). File ini dibuat dari `app/users.php` saat pertama kali ada perubahan, dan tidak tertimpa saat deploy.
Semua tindakan tercatat di `app/storage/audit.log` (`user.create`, `user.update`, `user.reset_password`, `user.activate`, `user.deactivate`, `account.change_password`).

Membuat ulang akun awal dari nol (hanya bila `users.json` dihapus):

```bash
php server/tools/make-users.php /path/aman/credentials.tsv
server/build.sh
```

## Build & deploy

```bash
server/build.sh   # menghasilkan dist/examcbt-app/ dan dist/examcbt-app.tar.bz2 (tanpa isi storage)
```

Ekstrak arsip ke `/home/semestat/examcbt-app/`. Isi `app/storage/` di server tidak tersentuh.

## Catatan

Ini purwarupa: data di layar tetap data contoh dan aksi tulis disimulasikan di browser. Login, session, dan pembagian akses sudah nyata di server.
