# TACMS ExamCBT — versi server (PHP) dengan login & RBAC

Live: https://examcbt.semestateknologiutama.com

## Struktur di server

```
/home/semestat/examcbt-app/
├── public/            ← document root subdomain
│   ├── index.php      ← memilih modul antarmuka sesuai role (modul lain tidak dikirim)
│   ├── styles.css
│   ├── .htaccess      ← paksa HTTPS, header keamanan
│   └── api/           ← csrf, login, logout, ping, users, account, audit, enrollments, activation (aktivasi voucher & masuk OTP), participant (portal peserta)
└── app/               ← di luar document root
    ├── rbac.php       ← role, halaman, permission
    ├── bootstrap.php  ← session, CSRF, pembatasan login, audit log
    ├── userstore.php  ← penyimpanan akun (users.json) & aturan kata sandi
    ├── config.php     ← pengaturan OTP & reservasi voucher
    ├── catalog.php    ← katalog pelatihan, ujian, batch voucher (data awal)
    ├── enrollstore.php← penyimpanan enrollment, peserta, voucher (enrollment.json)
    ├── users.php      ← data akun awal (hash bcrypt) — tidak di-commit
    ├── assets/js/     ← modul antarmuka (dari prototype/js)
    └── storage/       ← users.json, enrollment.json, secret.key, login_attempts.json, audit.log, sesi aktivasi disimpan di session PHP
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

## Enrollment voucher massal

Menu **Pelatihan** → tombol **Enroll** di setiap pelatihan berstatus Aktif/Terjadwal → **Tambah peserta**:

1. **Peserta** — tempel daftar (nama, email, telepon; bisa langsung dari Excel), unggah CSV (template tersedia), dan/atau pilih dari data peserta.
2. **Ujian & jadwal** — ujian, tanggal, jam, zona waktu (WIB/WITA/WIT), kebijakan keterlambatan.
3. **Voucher** — alokasikan dari batch yang order-nya sudah PAID/CONFIRMED dan belum kedaluwarsa, atau tanpa voucher.
4. **Tinjau** — server memvalidasi setiap baris: peserta baru, peserta terdaftar (dicocokkan lewat email), email/nama tidak valid, duplikat di daftar, sudah ter-enroll di ujian yang sama, jadwal bentrok. Hanya baris yang lolos yang didaftarkan.

Setelah disimpan, satu kode voucher unik per peserta ditampilkan **sekali** (bisa diunduh CSV/disalin). Server hanya menyimpan HMAC-SHA256 kode (kunci di `storage/secret.key`) dan versi tersamar.
Kuota batch berkurang otomatis; pembatalan enrollment mencabut voucher yang belum dipakai dan mengembalikan kuota.
Maksimal 500 peserta per proses. Menu **Enrollment & Jadwal** menampilkan semua enrollment asli dengan filter dan pembatalan.

Hak akses: Super Admin, Organization Admin, Training Admin, dan **Penguji** (Addendum v1.1 §2) dapat menambah/membatalkan; Exam Admin, Certificate Admin, dan Auditor hanya melihat.
Enrollment tidak membuka akses ujian; voucher tetap wajib dimasukkan peserta.
Tercatat di audit log sebagai `enrollment.bulk_create` dan `enrollment.cancel`.

Catatan purwarupa: katalog pelatihan/ujian/batch masih data awal di `catalog.php`.

## Aktivasi voucher peserta

Peserta tidak memerlukan akun berkata sandi. Dari halaman login → **Aktivasi voucher** (atau `#p-start`):

1. **Voucher** — kode dicocokkan (HMAC) dengan voucher hasil enrollment. Harus berstatus ALLOCATED, enrollment aktif, order dibayar, batch belum kedaluwarsa, dan tidak sedang dicadangkan sesi lain. Voucher dicadangkan 15 menit. Pesan gagal tidak membocorkan data; 5 kode salah per IP mengunci pemeriksaan 15 menit.
2. **Identitas** — email harus sama dengan email peserta penerima voucher (petunjuk email tersamar ditampilkan). Telepon wajib.
3. **OTP email & telepon** — 6 digit, disimpan sebagai hash di session, berlaku 5 menit, maks. 5 percobaan, kirim ulang setelah 60 detik (kode lama batal).
4. **Ikat** — voucher ALLOCATED → BOUND, kontak ditandai terverifikasi, peserta langsung masuk portal.

Dashboard peserta menampilkan ujian dari enrollment beserta gate akses (identitas, enrollment, jadwal, voucher, pembayaran, hak attempt). Tombol "Buka ujian" hanya aktif bila semua syarat terpenuhi dan dalam jadwal; ruang ujian sendiri masih simulasi.
Peserta yang sudah masuk dapat memasukkan voucher berikutnya dan langsung terikat. Peserta lama masuk lewat **Masuk dengan OTP** (`#p-login`); respons sama untuk email terdaftar/tidak.

**Mode demo OTP:** belum ada penyedia email/WhatsApp/SMS, jadi `OTP_DEMO_DISPLAY = true` di `app/config.php` menampilkan kode di layar dengan label "Mode demo". Setelah penyedia dipasang, isi `otp_deliver()` di `enrollstore.php`, set `OTP_DEMO_DISPLAY = false`, dan (untuk email via `mail()` server) `OTP_SEND_EMAIL = true`.

Audit: `voucher.reserve`, `voucher.bind`, `voucher.check_fail`, `voucher.identity_mismatch`, `otp.fail`, `participant.login`, `participant.login_fail`.

## Audit log

Semua kejadian keamanan ditulis ke `app/storage/audit.log` (satu baris JSON per kejadian: waktu UTC, aktor, role saat kejadian, aksi, IP, detail).
File hanya ditambah; aplikasi tidak menyediakan cara mengubah atau menghapus isinya.

Halaman **Audit Log** membaca file ini lewat `api/audit.php` (Super Admin, Organization Admin, Auditor):
pencarian, filter kategori/aktor/tanggal (WIB), paginasi, ringkasan 24 jam/7 hari, dan **Ekspor CSV** (butuh izin ekspor; setiap ekspor ikut tercatat sebagai `audit.export`).
Kartu "Aktivitas terbaru" di dashboard juga memakai data ini untuk role tersebut.

| Kode aksi | Arti |
|---|---|
| `auth.login` / `auth.logout` / `auth.timeout` | Masuk, keluar, sesi berakhir karena tidak aktif |
| `auth.fail` / `auth.locked` | Gagal masuk, login dikunci sementara |
| `user.create` / `user.update` / `user.activate` / `user.deactivate` / `user.reset_password` | Pengelolaan pengguna |
| `account.change_password` / `account.change_password_fail` | Ganti kata sandi sendiri |
| `enrollment.bulk_create` / `enrollment.cancel` | Enrollment massal, pembatalan enrollment |
| `voucher.*` / `otp.fail` / `participant.*` | Aktivasi voucher, OTP, masuk peserta |
| `audit.export` | Ekspor audit log |

Catatan: 24 baris paling awal di file log server (IP `127.0.0.1`, 21 Nov 2026 10:05 UTC) berasal dari pengujian lokal yang ikut terunggah satu kali, bukan aktivitas nyata.

## Build & deploy

```bash
server/build.sh   # menghasilkan dist/examcbt-app/ dan dist/examcbt-app.tar.bz2 (tanpa isi storage)
```

Ekstrak arsip ke `/home/semestat/examcbt-app/`. Isi `app/storage/` di server tidak tersentuh.

## Catatan

Ini purwarupa: data di layar tetap data contoh dan aksi tulis disimulasikan di browser. Login, session, dan pembagian akses sudah nyata di server.
