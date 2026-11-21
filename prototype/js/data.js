/* TACMS prototype — data contoh (fiktif). Seluruh nama, kode, dan angka hanya ilustrasi. */
(function () {
  const D = (window.DATA = {});

  D.org = { name: 'LSP Teknologi Nusantara', short: 'LSP-TN', tz: 'Asia/Jakarta (WIB)' };
  D.admin = { name: 'Rahmat Hidayat', role: 'Organization Admin', email: 'rahmat.h@lsptn.id' };

  D.trainings = [
    { code: 'TRN-DA-2611', name: 'Data Analyst Associate', cat: 'Data & Analitik', date: '3–7 Nov 2026', participants: 62, exams: 2, status: 'Aktif', cert: 'Competency' },
    { code: 'TRN-DM-2611', name: 'Digital Marketing Fundamental', cat: 'Pemasaran', date: '10–14 Nov 2026', participants: 48, exams: 2, status: 'Aktif', cert: 'Completion' },
    { code: 'TRN-CS-2610', name: 'Cyber Security Awareness', cat: 'Keamanan Informasi', date: '20–22 Okt 2026', participants: 120, exams: 1, status: 'Selesai', cert: 'Attendance' },
    { code: 'TRN-PM-2612', name: 'Project Management Essentials', cat: 'Manajemen', date: '1–5 Des 2026', participants: 35, exams: 1, status: 'Terjadwal', cert: 'Competency' },
    { code: 'TRN-UX-2612', name: 'UI/UX Research Practitioner', cat: 'Desain Produk', date: '8–12 Des 2026', participants: 28, exams: 2, status: 'Terjadwal', cert: 'Competency' },
    { code: 'TRN-K3-2608', name: 'K3 Perkantoran Dasar', cat: 'K3', date: '12–13 Agu 2026', participants: 84, exams: 1, status: 'Diarsipkan', cert: 'Attendance' },
  ];

  D.participants = [
    { no: 'PAR-2026-00418', name: 'Nadia Putri Anggraini', email: 'nadia.anggraini@mail.id', ev: true, phone: '+62 812-3456-7890', pv: true, inst: 'Universitas Padjadjaran', trainings: 2, status: 'Aktif' },
    { no: 'PAR-2026-00419', name: 'Bagas Pratama', email: 'bagas.pratama@mail.id', ev: true, phone: '+62 813-2201-4410', pv: true, inst: 'PT Sinar Data Mandiri', trainings: 1, status: 'Aktif' },
    { no: 'PAR-2026-00420', name: 'Larasati Wibowo', email: 'laras.w@mail.id', ev: true, phone: '+62 857-7781-0021', pv: false, inst: 'Politeknik Negeri Semarang', trainings: 3, status: 'Aktif' },
    { no: 'PAR-2026-00421', name: 'Fajar Ramadhan', email: 'fajar.rmd@mail.id', ev: false, phone: '+62 821-9090-1120', pv: false, inst: 'Mandiri', trainings: 1, status: 'Belum verifikasi' },
    { no: 'PAR-2026-00422', name: 'Intan Permatasari', email: 'intan.permata@mail.id', ev: true, phone: '+62 811-4400-7788', pv: true, inst: 'Universitas Brawijaya', trainings: 2, status: 'Aktif' },
    { no: 'PAR-2026-00423', name: 'Andika Saputra', email: 'andika.s@mail.id', ev: true, phone: '+62 878-1234-0099', pv: true, inst: 'PT Arunika Teknologi', trainings: 1, status: 'Aktif' },
    { no: 'PAR-2026-00424', name: 'Yusuf Hidayatullah', email: 'yusuf.h@mail.id', ev: true, phone: '+62 812-7000-1515', pv: true, inst: 'Universitas Hasanuddin', trainings: 4, status: 'Aktif' },
    { no: 'PAR-2026-00425', name: 'Maya Kusumawardani', email: 'maya.kw@mail.id', ev: true, phone: '+62 815-2626-3030', pv: true, inst: 'Mandiri', trainings: 1, status: 'Nonaktif' },
    { no: 'PAR-2026-00426', name: 'Rizky Aditya Nugraha', email: 'rizky.an@mail.id', ev: true, phone: '+62 822-6060-1212', pv: true, inst: 'PT Sinar Data Mandiri', trainings: 2, status: 'Aktif' },
    { no: 'PAR-2026-00427', name: 'Putu Ayu Lestiani', email: 'ayu.lestiani@mail.id', ev: true, phone: '+62 819-3300-4545', pv: false, inst: 'Universitas Udayana', trainings: 1, status: 'Aktif' },
  ];

  D.batches = [
    { id: 'VB-2611-014', training: 'Data Analyst Associate', exam: 'Teori', qty: 80, used: 54, bound: 6, expired: 0, valid: '31 Des 2026', type: 'Individual', by: 'Rahmat H.', order: 'ORD-2026-0311' },
    { id: 'VB-2611-013', training: 'Digital Marketing Fundamental', exam: 'Semua ujian', qty: 50, used: 31, bound: 9, expired: 0, valid: '15 Jan 2027', type: 'Institusi', by: 'Sari M.', order: 'ORD-2026-0307' },
    { id: 'VB-2610-011', training: 'Cyber Security Awareness', exam: 'Teori', qty: 130, used: 118, bound: 0, expired: 12, valid: '15 Nov 2026', type: 'Individual', by: 'Rahmat H.', order: 'ORD-2026-0288' },
    { id: 'VB-2612-016', training: 'Project Management Essentials', exam: 'Teori', qty: 40, used: 0, bound: 0, expired: 0, valid: '28 Feb 2027', type: 'Institusi', by: 'Sari M.', order: 'ORD-2026-0320' },
  ];

  D.vouchers = [
    { code: 'TACMS-7K4Q-••••', batch: 'VB-2611-014', training: 'Data Analyst Associate', status: 'BOUND', who: 'Nadia Putri Anggraini', exp: '31 Des 2026', by: 'Rahmat H.' },
    { code: 'TACMS-P2M8-••••', batch: 'VB-2611-014', training: 'Data Analyst Associate', status: 'REDEEMED', who: 'Bagas Pratama', exp: '31 Des 2026', by: 'Rahmat H.' },
    { code: 'TACMS-X9RT-••••', batch: 'VB-2611-014', training: 'Data Analyst Associate', status: 'RESERVED', who: '— (reservasi 08:42 tersisa)', exp: '31 Des 2026', by: 'Rahmat H.' },
    { code: 'TACMS-H3LD-••••', batch: 'VB-2611-013', training: 'Digital Marketing Fundamental', status: 'CREATED', who: '—', exp: '15 Jan 2027', by: 'Sari M.' },
    { code: 'TACMS-Q7VB-••••', batch: 'VB-2611-013', training: 'Digital Marketing Fundamental', status: 'LOCKED', who: '— (5× gagal klaim)', exp: '15 Jan 2027', by: 'Sari M.' },
    { code: 'TACMS-B4NZ-••••', batch: 'VB-2610-011', training: 'Cyber Security Awareness', status: 'EXPIRED', who: '—', exp: '15 Nov 2026', by: 'Rahmat H.' },
    { code: 'TACMS-W2CF-••••', batch: 'VB-2610-011', training: 'Cyber Security Awareness', status: 'REVOKED', who: '—', exp: '15 Nov 2026', by: 'Rahmat H.' },
    { code: 'TACMS-M6YU-••••', batch: 'VB-2611-014', training: 'Data Analyst Associate', status: 'REDEEMED', who: 'Larasati Wibowo', exp: '31 Des 2026', by: 'Rahmat H.' },
  ];

  D.orders = [
    { no: 'ORD-2026-0324', buyer: 'Universitas Brawijaya', type: 'Institusi', pic: 'Dr. Wulan Sari', ref: 'PO/UB/FILKOM/1187', items: 'Data Analyst Associate — Teori × 40', total: 'Rp 30.000.000', status: 'PROOF_SUBMITTED', date: '20 Nov 2026' },
    { no: 'ORD-2026-0323', buyer: 'Fajar Ramadhan', type: 'Individual', pic: '—', ref: 'VA-BCA 8808 1234 5678', items: 'Digital Marketing — Teori × 1', total: 'Rp 650.000', status: 'PENDING_PAYMENT', date: '20 Nov 2026' },
    { no: 'ORD-2026-0320', buyer: 'PT Arunika Teknologi', type: 'Institusi', pic: 'Hendra Gunawan', ref: 'PO-ARK-2026-118', items: 'Project Management — Teori × 40', total: 'Rp 28.000.000', status: 'CONFIRMED', date: '14 Nov 2026' },
    { no: 'ORD-2026-0311', buyer: 'Bagas Pratama', type: 'Individual', pic: '—', ref: 'QRIS 20261103-77812', items: 'Data Analyst Associate — Teori × 1', total: 'Rp 750.000', status: 'PAID', date: '3 Nov 2026' },
  ];

  D.enrollments = [
    { code: 'ENR-DA-0418', p: 'Nadia Putri Anggraini', training: 'Data Analyst Associate', exam: 'Ujian Teori', start: '21 Nov 2026 · 09:00', end: '21 Nov 2026 · 12:00', late: 'ALLOW_WITH_REMAINING_TIME', voucher: 'BOUND', pay: 'PAID', status: 'SCHEDULED' },
    { code: 'ENR-DA-0419', p: 'Bagas Pratama', training: 'Data Analyst Associate', exam: 'Ujian Teori', start: '21 Nov 2026 · 09:00', end: '21 Nov 2026 · 12:00', late: 'ALLOW_WITH_REMAINING_TIME', voucher: 'REDEEMED', pay: 'PAID', status: 'IN_PROGRESS' },
    { code: 'ENR-DA-0420', p: 'Larasati Wibowo', training: 'Data Analyst Associate', exam: 'Ujian Praktik', start: '24 Nov 2026 · 13:00', end: '24 Nov 2026 · 16:00', late: 'BLOCK', voucher: 'CREATED', pay: 'PENDING_PAYMENT', status: 'SCHEDULED' },
    { code: 'ENR-DM-0421', p: 'Fajar Ramadhan', training: 'Digital Marketing Fundamental', exam: 'Ujian Teori', start: '25 Nov 2026 · 09:00', end: '25 Nov 2026 · 11:00', late: 'EXTEND_WITH_APPROVAL', voucher: '—', pay: 'PENDING_PAYMENT', status: 'RESCHEDULED' },
    { code: 'ENR-DA-0422', p: 'Intan Permatasari', training: 'Data Analyst Associate', exam: 'Ujian Teori', start: '18 Nov 2026 · 09:00', end: '18 Nov 2026 · 12:00', late: 'BLOCK', voucher: 'REDEEMED', pay: 'PAID', status: 'COMPLETED' },
  ];

  D.monitoring = [
    { p: 'Bagas Pratama', exam: 'Data Analyst — Teori', start: '09:04', prog: 31, total: 40, left: '41:18', conn: 'Online', tab: 0 },
    { p: 'Rizky Aditya Nugraha', exam: 'Data Analyst — Teori', start: '09:01', prog: 36, total: 40, left: '38:02', conn: 'Online', tab: 2 },
    { p: 'Yusuf Hidayatullah', exam: 'Digital Marketing — Teori', start: '09:12', prog: 18, total: 30, left: '29:40', conn: 'Terputus 00:47', tab: 0 },
    { p: 'Andika Saputra', exam: 'Data Analyst — Teori', start: '09:20', prog: 12, total: 40, left: '64:55', conn: 'Online', tab: 5 },
    { p: 'Putu Ayu Lestiani', exam: 'Digital Marketing — Teori', start: '09:15', prog: 25, total: 30, left: '12:30', conn: 'Online', tab: 0 },
  ];

  D.grading = [
    { id: 'ATT-58213', p: 'Peserta #00418', exam: 'Data Analyst — Teori', q: 'Soal 10 · Essay', submitted: '21 Nov · 10:31', max: 12,
      question: 'Sebuah toko daring melihat penurunan konversi 18% setelah perubahan halaman checkout. Jelaskan langkah analisis yang Anda lakukan untuk menemukan penyebabnya, termasuk data yang Anda butuhkan dan metrik yang akan dibandingkan.',
      answer: 'Langkah pertama saya memastikan penurunan itu nyata, bukan karena perubahan pelacakan. Saya bandingkan jumlah event checkout_started dan purchase sebelum dan sesudah rilis, lalu cek apakah tag analitik ikut berubah.\n\nKedua, saya pecah funnel checkout per langkah (keranjang → alamat → pengiriman → pembayaran → konfirmasi) untuk melihat di langkah mana drop-off bertambah. Data yang dibutuhkan: log event per sesi, jenis perangkat, browser, metode pembayaran, dan waktu muat halaman.\n\nKetiga, saya segmentasi per perangkat dan metode pembayaran. Jika penurunan hanya terjadi di mobile, kemungkinan ada masalah tampilan. Saya juga bandingkan dengan periode yang sama minggu lalu untuk menghilangkan efek musiman.\n\nTerakhir, saya rekomendasikan A/B test antara versi lama dan baru dengan metrik utama conversion rate dan metrik pendukung average order value serta error rate formulir.' },
    { id: 'ATT-58207', p: 'Peserta #00422', exam: 'Data Analyst — Teori', q: 'Soal 10 · Essay', submitted: '21 Nov · 10:12', max: 12, question: 'Sama seperti di atas.', answer: 'Saya akan melihat Google Analytics untuk mengetahui halaman mana yang paling banyak ditinggalkan, kemudian bertanya kepada tim developer apa yang berubah. Setelah itu saya membuat laporan.' },
    { id: 'ATT-58190', p: 'Peserta #00426', exam: 'Data Analyst — Praktik', q: 'Tugas 2 · Unggah berkas', submitted: '20 Nov · 16:48', max: 20, question: 'Unggah notebook analisis churn beserta ringkasan temuan (maks. 1 halaman).', answer: '[Berkas] churn_analysis_rizky.ipynb (412 KB) · ringkasan_temuan.pdf (96 KB)' },
    { id: 'ATT-58166', p: 'Peserta #00427', exam: 'Digital Marketing — Teori', q: 'Soal 28 · Short answer', submitted: '20 Nov · 11:05', max: 4, question: 'Sebutkan dua metrik untuk mengukur efektivitas kampanye email.', answer: 'Open rate dan click-through rate.' },
  ];

  D.rubric = [
    { id: 'r1', name: 'Validasi data & instrumentasi', desc: 'Memeriksa apakah penurunan nyata, bukan artefak pelacakan', max: 3 },
    { id: 'r2', name: 'Analisis funnel', desc: 'Memecah proses per langkah dan menemukan titik drop-off', max: 3 },
    { id: 'r3', name: 'Segmentasi & pembanding', desc: 'Perangkat, kanal, periode pembanding', max: 3 },
    { id: 'r4', name: 'Rekomendasi tindak lanjut', desc: 'Usulan eksperimen dan metrik keberhasilan', max: 3 },
  ];

  D.retakes = [
    { p: 'Andika Saputra', exam: 'Data Analyst — Teori', attempt: 2, last: 64, pass: 70, wait: 'Masa tunggu selesai', policy: 'Persetujuan Admin', status: 'PENDING', date: '20 Nov 2026' },
    { p: 'Putu Ayu Lestiani', exam: 'Digital Marketing — Teori', attempt: 1, last: 58, pass: 70, wait: 'Selesai 22 Nov · 09:00', policy: 'Persetujuan Admin + voucher tambahan', status: 'PENDING', date: '20 Nov 2026' },
    { p: 'Maya Kusumawardani', exam: 'Cyber Security — Teori', attempt: 3, last: 61, pass: 75, wait: '—', policy: 'Maks. 3 attempt tercapai', status: 'REJECTED', date: '29 Okt 2026' },
    { p: 'Larasati Wibowo', exam: 'Data Analyst — Teori', attempt: 1, last: 66, pass: 70, wait: 'Masa tunggu selesai', policy: 'Persetujuan Admin', status: 'APPROVED', date: '15 Nov 2026' },
  ];

  D.certs = [
    { no: 'LSPTN/DA/2026/00731', p: 'Bagas Pratama', type: 'Competency', training: 'Data Analyst Associate', method: 'Generator', issued: '19 Nov 2026', exp: '19 Nov 2029', status: 'ISSUED' },
    { no: 'LSPTN/DA/2026/00732', p: 'Intan Permatasari', type: 'Competency', training: 'Data Analyst Associate', method: 'Generator', issued: '—', exp: '—', status: 'PENDING_APPROVAL' },
    { no: 'LSPTN/DA/2026/00733', p: 'Yusuf Hidayatullah', type: 'Competency', training: 'Data Analyst Associate', method: 'Generator', issued: '—', exp: '—', status: 'PENDING_APPROVAL' },
    { no: 'BNSP/TIK/2026/88120', p: 'Rizky Aditya Nugraha', type: 'Competency', training: 'Data Analyst Associate', method: 'Upload Admin', issued: '—', exp: '—', status: 'PENDING_APPROVAL' },
    { no: 'LSPTN/CS/2026/00512', p: 'Maya Kusumawardani', type: 'Attendance', training: 'Cyber Security Awareness', method: 'Generator', issued: '23 Okt 2026', exp: '—', status: 'REVOKED' },
    { no: 'LSPTN/K3/2023/00105', p: 'Larasati Wibowo', type: 'Attendance', training: 'K3 Perkantoran Dasar', method: 'Upload Admin', issued: '14 Agu 2023', exp: '14 Agu 2026', status: 'EXPIRED' },
    { no: 'LSPTN/CS/2026/00498', p: 'Larasati Wibowo', type: 'Attendance', training: 'Cyber Security Awareness', method: 'Generator', issued: '23 Okt 2026', exp: '—', status: 'ISSUED' },
  ];

  D.audit = [
    { t: '21 Nov 2026 10:42:18', actor: 'Rahmat Hidayat', role: 'Org Admin', act: 'voucher.revoke', ent: 'TACMS-W2CF-••••', ip: '10.12.4.21', detail: 'Alasan: voucher tersebar di grup publik' },
    { t: '21 Nov 2026 10:31:05', actor: 'Sistem', role: '—', act: 'attempt.submit', ent: 'ATT-58213', ip: '—', detail: 'Submit manual · 38/40 terjawab · status PENDING_REVIEW' },
    { t: '21 Nov 2026 10:15:47', actor: 'Dewanti Lestari', role: 'Examiner', act: 'grade.update', ent: 'ATT-58166 / Q28', ip: '10.12.4.33', detail: 'Nilai 2 → 4 · alasan: kunci sinonim diterima' },
    { t: '21 Nov 2026 09:58:02', actor: 'Sari Mulyani', role: 'Finance', act: 'payment.verify', ent: 'ORD-2026-0320', ip: '10.12.4.40', detail: 'Bukti transfer Mandiri · ref PO-ARK-2026-118' },
    { t: '21 Nov 2026 09:20:11', actor: 'Rahmat Hidayat', role: 'Org Admin', act: 'retake.approve', ent: 'Larasati Wibowo / DA-Teori', ip: '10.12.4.21', detail: 'Entitlement +1 attempt' },
    { t: '21 Nov 2026 08:47:30', actor: 'Rahmat Hidayat', role: 'Org Admin', act: 'auth.login', ent: 'user:rahmat.h', ip: '10.12.4.21', detail: 'MFA TOTP berhasil' },
    { t: '20 Nov 2026 17:02:44', actor: 'Budi Santoso', role: 'Exam Admin', act: 'exam.publish', ent: 'EXM-DA-T v3', ip: '10.12.4.18', detail: 'Versi 3 dipublikasikan · 40 soal · passing 70' },
    { t: '20 Nov 2026 16:30:10', actor: 'Budi Santoso', role: 'Exam Admin', act: 'question.update', ent: 'Q-DA-0187', ip: '10.12.4.18', detail: 'Snapshot v2 dibuat · opsi C diperbaiki' },
    { t: '20 Nov 2026 14:11:59', actor: 'Rahmat Hidayat', role: 'Org Admin', act: 'enrollment.reschedule', ent: 'ENR-DM-0421', ip: '10.12.4.21', detail: '22 Nov → 25 Nov · alasan: peserta sakit (surat dokter)' },
  ];

  D.questions = [
    { id: 'Q-DA-0187', text: 'Ukuran pemusatan data yang paling tahan terhadap outlier adalah…', type: 'Single Choice', comp: 'Statistik Deskriptif', diff: 'Mudah', pts: 2, ver: 'v2', status: 'Active' },
    { id: 'Q-DA-0188', text: 'Pilih SEMUA jenis join yang dapat menghasilkan nilai NULL…', type: 'Multiple Response', comp: 'SQL', diff: 'Sedang', pts: 3, ver: 'v1', status: 'Active' },
    { id: 'Q-DA-0190', text: 'Korelasi yang kuat antara dua variabel membuktikan hubungan sebab-akibat.', type: 'True/False', comp: 'Statistik Inferensial', diff: 'Mudah', pts: 1, ver: 'v1', status: 'Active' },
    { id: 'Q-DA-0201', text: 'Urutkan tahapan proses CRISP-DM…', type: 'Ordering', comp: 'Metodologi', diff: 'Sedang', pts: 3, ver: 'v1', status: 'Review' },
    { id: 'Q-DA-0214', text: 'Jelaskan langkah analisis penurunan konversi checkout…', type: 'Essay', comp: 'Problem Solving', diff: 'Sulit', pts: 12, ver: 'v1', status: 'Active' },
    { id: 'Q-DA-0220', text: 'Hitung median dari data berikut: 12, 7, 3, 21, 9, 15', type: 'Numerical', comp: 'Statistik Deskriptif', diff: 'Mudah', pts: 2, ver: 'v1', status: 'Draft' },
  ];

  /* Ujian peserta — 10 soal contoh mewakili tipe SRS 4.7 */
  D.exam = {
    title: 'Ujian Kompetensi Data Analyst Associate — Teori',
    short: 'Data Analyst Associate — Teori',
    code: 'EXM-DA-T',
    version: 'v3',
    duration: 90,
    passing: 70,
    total: 10,
    attempt: 1,
    maxAttempts: 3,
    questions: [
      { type: 'single', label: 'Single Choice', pts: 2, text: 'Ukuran pemusatan data yang paling tahan (robust) terhadap outlier adalah…', opts: ['Rata-rata (mean)', 'Median', 'Rentang (range)', 'Simpangan baku'] },
      { type: 'multi', label: 'Multiple Response', pts: 3, text: 'Pilih <b>semua</b> jenis JOIN pada SQL yang dapat menghasilkan nilai NULL pada kolom tabel lain.', opts: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'] },
      { type: 'tf', label: 'True/False', pts: 1, text: 'Korelasi yang kuat antara dua variabel sudah cukup untuk membuktikan hubungan sebab-akibat.', opts: ['Benar', 'Salah'] },
      { type: 'blank', label: 'Fill in the Blank', pts: 2, text: 'Fungsi agregasi SQL untuk menghitung jumlah baris adalah <span class="tag">______</span>( ).', placeholder: 'Ketik jawaban' },
      { type: 'numeric', label: 'Numerical', pts: 2, text: 'Hitung median dari data berikut: <code>12, 7, 3, 21, 9, 15</code>', placeholder: 'Contoh: 10.5', unit: '' },
      { type: 'single', label: 'Image-based', pts: 2, text: 'Perhatikan grafik di bawah. Tren yang paling tepat menggambarkan penjualan Q1–Q4 adalah…', chart: true, opts: ['Turun stabil', 'Naik lalu stagnan', 'Naik konsisten', 'Fluktuatif tanpa pola'] },
      { type: 'order', label: 'Ordering', pts: 3, text: 'Urutkan tahapan CRISP-DM dari awal hingga akhir.', items: ['Data Preparation', 'Business Understanding', 'Modeling', 'Data Understanding', 'Evaluation', 'Deployment'] },
      { type: 'match', label: 'Matching', pts: 3, text: 'Pasangkan jenis grafik dengan kegunaan yang paling sesuai.', left: ['Histogram', 'Scatter plot', 'Line chart', 'Box plot'], right: ['Tren dari waktu ke waktu', 'Distribusi satu variabel', 'Hubungan dua variabel numerik', 'Sebaran & outlier per kelompok'] },
      { type: 'short', label: 'Short Answer', pts: 2, text: 'Sebutkan satu metode untuk menangani nilai yang hilang (missing values) pada data numerik.', placeholder: 'Jawaban singkat' },
      { type: 'essay', label: 'Essay', pts: 12, text: 'Sebuah toko daring melihat penurunan konversi 18% setelah perubahan halaman checkout. Jelaskan langkah analisis yang Anda lakukan untuk menemukan penyebabnya, termasuk data yang dibutuhkan dan metrik yang akan dibandingkan.', placeholder: 'Tulis jawaban Anda…' },
    ],
  };

  D.history = [
    { date: '21 Nov 2026', time: '09:02 – 10:31', training: 'Data Analyst Associate', exam: 'Teori', attempt: 1, score: null, grading: 'Pending Review', result: 'Menunggu', dur: '1 j 29 m', cert: null },
    { date: '28 Okt 2026', time: '13:00 – 13:41', training: 'Cyber Security Awareness', exam: 'Teori', attempt: 2, score: 86, grading: 'Graded', result: 'Lulus', dur: '41 m', cert: 'LSPTN/CS/2026/00488' },
    { date: '21 Okt 2026', time: '13:00 – 13:52', training: 'Cyber Security Awareness', exam: 'Teori', attempt: 1, score: 68, grading: 'Graded', result: 'Tidak Lulus', dur: '52 m', cert: null },
    { date: '13 Agu 2026', time: '10:00 – 10:25', training: 'K3 Perkantoran Dasar', exam: 'Post-test', attempt: 1, score: 92, grading: 'Graded', result: 'Lulus', dur: '25 m', cert: 'LSPTN/K3/2026/00211' },
  ];

  D.roles = ['Super Admin', 'Org Admin', 'Training Admin', 'Exam Admin', 'Examiner', 'Certificate Admin', 'Auditor', 'Peserta'];
  D.matrix = [
    ['Kelola organisasi', 'Ya', 'Terbatas', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Baca', 'Tidak'],
    ['Kelola pengguna', 'Ya', 'Ya', 'Terbatas', 'Terbatas', 'Tidak', 'Terbatas', 'Baca', 'Tidak'],
    ['Kelola pelatihan', 'Ya', 'Ya', 'Ya', 'Baca', 'Baca', 'Baca', 'Baca', 'Milik sendiri'],
    ['Kelola peserta', 'Ya', 'Ya', 'Ya', 'Baca', 'Terbatas', 'Baca', 'Baca', 'Profil sendiri'],
    ['Kelola voucher', 'Ya', 'Ya', 'Ya', 'Baca', 'Tidak', 'Tidak', 'Baca', 'Klaim sendiri'],
    ['Kelola bank soal', 'Ya', 'Ya', 'Opsional', 'Ya', 'Baca', 'Tidak', 'Baca', 'Tidak'],
    ['Publikasi ujian', 'Ya', 'Ya', 'Opsional', 'Ya', 'Tidak', 'Tidak', 'Baca', 'Tidak'],
    ['Menilai essay', 'Ya', 'Opsional', 'Tidak', 'Opsional', 'Ya', 'Tidak', 'Baca', 'Tidak'],
    ['Terbitkan sertifikat', 'Ya', 'Ya', 'Opsional', 'Tidak', 'Tidak', 'Ya', 'Baca', 'Unduh sendiri'],
    ['Lihat laporan', 'Ya', 'Ya', 'Ya', 'Ya', 'Terbatas', 'Ya', 'Ya', 'Hasil sendiri'],
    ['Pengaturan sistem', 'Ya', 'Terbatas', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak'],
  ];
  D.users = [
    { name: 'Rahmat Hidayat', email: 'rahmat.h@lsptn.id', role: 'Organization Admin', mfa: true, last: '21 Nov 2026 08:47', status: 'Aktif' },
    { name: 'Budi Santoso', email: 'budi.s@lsptn.id', role: 'Exam Admin', mfa: true, last: '20 Nov 2026 17:05', status: 'Aktif' },
    { name: 'Dewanti Lestari', email: 'dewanti.l@lsptn.id', role: 'Examiner', mfa: true, last: '21 Nov 2026 10:02', status: 'Aktif' },
    { name: 'Sari Mulyani', email: 'sari.m@lsptn.id', role: 'Finance · Training Admin', mfa: true, last: '21 Nov 2026 09:51', status: 'Aktif' },
    { name: 'Hana Prameswari', email: 'hana.p@lsptn.id', role: 'Certificate Admin', mfa: false, last: '19 Nov 2026 15:20', status: 'Aktif' },
    { name: 'Tommy Kurniawan', email: 'tommy.k@lsptn.id', role: 'Auditor', mfa: true, last: '12 Nov 2026 11:00', status: 'Aktif' },
  ];

  D.qAnalysis = [
    { id: 'Q-DA-0187', comp: 'Statistik Deskriptif', p: 0.82, d: 0.31, dist: 'A 9% · B 82% · C 4% · D 5%', flag: '' },
    { id: 'Q-DA-0188', comp: 'SQL', p: 0.41, d: 0.48, dist: 'Skor parsial dominan', flag: '' },
    { id: 'Q-DA-0190', comp: 'Statistik Inferensial', p: 0.93, d: 0.08, dist: 'Benar 7% · Salah 93%', flag: 'Daya beda rendah' },
    { id: 'Q-DA-0201', comp: 'Metodologi', p: 0.36, d: 0.44, dist: 'Urutan 2–3 sering tertukar', flag: '' },
    { id: 'Q-DA-0205', comp: 'Visualisasi', p: 0.18, d: -0.06, dist: 'A 18% · B 22% · C 51% · D 9%', flag: 'Cek kunci jawaban' },
    { id: 'Q-DA-0214', comp: 'Problem Solving', p: 0.64, d: 0.52, dist: 'Rata-rata 7,7 / 12', flag: '' },
  ];
})();
