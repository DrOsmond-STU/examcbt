# Purwarupa UI/UX TACMS

Purwarupa klikabel (HTML/CSS/JS murni, tanpa build) untuk **Training Assessment & Certification Management System** berdasarkan SRS v1.1.

## Cara membuka

Buka `prototype/index.html` langsung di browser. Halaman awal (`#home`) adalah peta prototipe berisi semua layar dan alur utama.

## Cakupan layar

| Area | Layar | Rujukan SRS |
|---|---|---|
| Portal Peserta | Aktivasi voucher, identitas, OTP email + telepon, voucher terikat | 8.2, 4.5, 4.6, 5.3 |
| | Dashboard & jadwal, gate akses ujian | Addendum §4–6 |
| | Instruksi, ruang ujian (timer server, autosave, navigator, tandai soal, 9 tipe soal, simulasi offline, sinyal pindah tab), konfirmasi submit | 8.3, 9.6, 4.9 |
| | Hasil (menunggu penilaian / lulus / tidak lulus + retake), histori, sertifikat, profil | 8.4, Addendum §7 |
| Portal Admin | Login + MFA, dashboard | 4.1, 9.5 |
| | Pelatihan, peserta (cari, impor, profil), enrollment & jadwal, visibilitas dashboard | 4.3, 4.4, Addendum |
| | Voucher: batch, daftar (kode tersamar), order & verifikasi pembayaran, alokasi institusi | 4.5, Addendum §4 |
| | Bank soal & question builder (14 tipe), exam builder 8 langkah, monitoring live | 4.7, 4.8, 9.5 |
| | Penilaian essay dengan rubrik, manajemen retake | 4.10, 4.11 |
| | Sertifikat: template, generator, upload/bulk, persetujuan, terbit, dicabut | 4.12, 8.5 |
| | Laporan analisis soal, audit log, pengguna & matriks RBAC | 4.13, 4.15, 3.2 |
| Publik | Verifikasi sertifikat (VALID / DICABUT / KEDALUWARSA / TIDAK DITEMUKAN) | 8.6, 9.7 |

## Data uji

- Voucher valid: `TACMS-7K4Q-92XD`
- OTP: `123456`
- Sertifikat: `LSPTN/DA/2026/00731` (valid), `LSPTN/CS/2026/00512` (dicabut), `LSPTN/K3/2023/00105` (kedaluwarsa)

Semua nama, organisasi, dan angka adalah data fiktif.

## Struktur

```
prototype/
├── index.html
├── styles.css          # design tokens (navy/teal, Inter + Plus Jakarta Sans), tema terang & gelap
└── js/
    ├── core.js         # router hash, ikon, modal, toast, konfirmasi
    ├── data.js         # data contoh
    ├── hub.js          # peta prototipe & verifikasi publik
    ├── participant.js  # portal peserta & exam workspace
    └── admin.js        # portal admin
```

Catatan: ini purwarupa tampilan. Kunci jawaban, validasi OTP, dan gate akses disimulasikan di browser; pada implementasi nyata semuanya wajib di backend (SRS 3.2, FR-QST-011).
