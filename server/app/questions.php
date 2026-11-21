<?php
/**
 * TACMS — konfigurasi ujian & bank soal (server saja; kunci jawaban tidak pernah dikirim ke browser, FR-QST-011).
 * Tipe: single, multi, tf, blank, short, numeric, order, match, essay.
 * Kebijakan retake (SRS 5.6): max attempt, masa tunggu (jam), persetujuan admin, kebijakan nilai akhir.
 */
declare(strict_types=1);

const RUBRIC_ANALISIS = [
    ['name' => 'Validasi data & instrumentasi', 'desc' => 'Memeriksa apakah penurunan nyata, bukan artefak pelacakan', 'max' => 3],
    ['name' => 'Analisis funnel', 'desc' => 'Memecah proses per langkah dan menemukan titik drop-off', 'max' => 3],
    ['name' => 'Segmentasi & pembanding', 'desc' => 'Perangkat, kanal, periode pembanding', 'max' => 3],
    ['name' => 'Rekomendasi tindak lanjut', 'desc' => 'Usulan eksperimen dan metrik keberhasilan', 'max' => 3],
];
const RUBRIC_PRAKTIK = [
    ['name' => 'Ketepatan teknis', 'desc' => 'Langkah/kode benar dan dapat dijalankan', 'max' => 4],
    ['name' => 'Kelengkapan', 'desc' => 'Semua bagian tugas dijawab', 'max' => 3],
    ['name' => 'Interpretasi & komunikasi', 'desc' => 'Kesimpulan jelas dan didukung data', 'max' => 3],
];

const EXAM_CONFIG = [
    'EXM-DA-T' => ['passing' => 70, 'retake' => ['max' => 3, 'wait_hours' => 24, 'approval' => true, 'scoring' => 'PASS_ONCE'], 'questions' => [
        ['id' => 'Q-DA-0187', 'type' => 'single', 'points' => 2, 'comp' => 'Statistik Deskriptif', 'text' => 'Ukuran pemusatan data yang paling tahan (robust) terhadap outlier adalah…', 'options' => ['Rata-rata (mean)', 'Median', 'Rentang (range)', 'Simpangan baku'], 'key' => 1],
        ['id' => 'Q-DA-0188', 'type' => 'multi', 'points' => 3, 'comp' => 'SQL', 'text' => 'Pilih semua jenis JOIN pada SQL yang dapat menghasilkan nilai NULL pada kolom tabel lain.', 'options' => ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'], 'key' => [1, 2, 3]],
        ['id' => 'Q-DA-0190', 'type' => 'tf', 'points' => 1, 'comp' => 'Statistik Inferensial', 'text' => 'Korelasi yang kuat antara dua variabel sudah cukup untuk membuktikan hubungan sebab-akibat.', 'options' => ['Benar', 'Salah'], 'key' => 1],
        ['id' => 'Q-DA-0195', 'type' => 'blank', 'points' => 2, 'comp' => 'SQL', 'text' => 'Fungsi agregasi SQL untuk menghitung jumlah baris adalah ______( ).', 'accept' => ['count', 'count()', 'count(*)']],
        ['id' => 'Q-DA-0220', 'type' => 'numeric', 'points' => 2, 'comp' => 'Statistik Deskriptif', 'text' => 'Hitung median dari data berikut: 12, 7, 3, 21, 9, 15', 'key' => 10.5, 'tol' => 0],
        ['id' => 'Q-DA-0205', 'type' => 'single', 'points' => 2, 'comp' => 'Visualisasi', 'text' => 'Perhatikan grafik penjualan Q1–Q4 di bawah. Tren yang paling tepat adalah…', 'chart' => [25, 60, 68, 70], 'options' => ['Turun stabil', 'Naik lalu stagnan', 'Naik konsisten', 'Fluktuatif tanpa pola'], 'key' => 1],
        ['id' => 'Q-DA-0201', 'type' => 'order', 'points' => 3, 'comp' => 'Metodologi', 'text' => 'Urutkan tahapan CRISP-DM dari awal hingga akhir.', 'items' => ['Data Preparation', 'Business Understanding', 'Modeling', 'Data Understanding', 'Evaluation', 'Deployment'], 'key' => [1, 3, 0, 2, 4, 5]],
        ['id' => 'Q-DA-0207', 'type' => 'match', 'points' => 3, 'comp' => 'Visualisasi', 'text' => 'Pasangkan jenis grafik dengan kegunaan yang paling sesuai.', 'left' => ['Histogram', 'Scatter plot', 'Line chart', 'Box plot'], 'right' => ['Tren dari waktu ke waktu', 'Distribusi satu variabel', 'Hubungan dua variabel numerik', 'Sebaran & outlier per kelompok'], 'key' => [1, 2, 0, 3]],
        ['id' => 'Q-DA-0210', 'type' => 'short', 'points' => 2, 'comp' => 'Metodologi', 'text' => 'Sebutkan satu metode untuk menangani nilai yang hilang (missing values) pada data numerik.', 'accept' => ['imputasi', 'imputation', 'impute', 'mean', 'median', 'rata-rata', 'hapus', 'dropna', 'listwise', 'interpolasi', 'interpolation', 'regresi']],
        ['id' => 'Q-DA-0214', 'type' => 'essay', 'points' => 12, 'comp' => 'Problem Solving', 'text' => 'Sebuah toko daring melihat penurunan konversi 18% setelah perubahan halaman checkout. Jelaskan langkah analisis yang Anda lakukan untuk menemukan penyebabnya, termasuk data yang dibutuhkan dan metrik yang akan dibandingkan.', 'rubric' => RUBRIC_ANALISIS],
    ]],
    'EXM-DA-P' => ['passing' => 70, 'retake' => ['max' => 2, 'wait_hours' => 24, 'approval' => true, 'scoring' => 'HIGHEST_SCORE'], 'questions' => [
        ['id' => 'Q-DA-P01', 'type' => 'essay', 'points' => 10, 'comp' => 'SQL', 'text' => 'Tulis query SQL untuk menampilkan 5 produk dengan pendapatan tertinggi per bulan dari tabel orders(order_id, product_id, qty, price, order_date). Jelaskan logika query Anda.', 'rubric' => RUBRIC_PRAKTIK],
        ['id' => 'Q-DA-P02', 'type' => 'essay', 'points' => 10, 'comp' => 'Problem Solving', 'text' => 'Ringkas temuan analisis churn pelanggan (maks. 200 kata): faktor utama, bukti data, dan rekomendasi.', 'rubric' => RUBRIC_PRAKTIK],
    ]],
    'EXM-DM-T' => ['passing' => 70, 'retake' => ['max' => 2, 'wait_hours' => 0, 'approval' => false, 'scoring' => 'HIGHEST_SCORE'], 'questions' => [
        ['id' => 'Q-DM-0101', 'type' => 'single', 'points' => 2, 'comp' => 'Strategi', 'text' => 'Metrik yang paling tepat untuk mengukur biaya memperoleh satu pelanggan adalah…', 'options' => ['CTR', 'CAC', 'CPM', 'Bounce rate'], 'key' => 1],
        ['id' => 'Q-DM-0102', 'type' => 'multi', 'points' => 3, 'comp' => 'Kanal', 'text' => 'Pilih semua yang termasuk owned media.', 'options' => ['Website perusahaan', 'Iklan berbayar di media sosial', 'Newsletter email', 'Ulasan pelanggan di forum'], 'key' => [0, 2]],
        ['id' => 'Q-DM-0103', 'type' => 'tf', 'points' => 1, 'comp' => 'SEO', 'text' => 'Meta description secara langsung menjadi faktor peringkat utama di mesin pencari.', 'options' => ['Benar', 'Salah'], 'key' => 1],
        ['id' => 'Q-DM-0104', 'type' => 'blank', 'points' => 2, 'comp' => 'Analitik', 'text' => 'Persentase pengunjung yang melakukan tindakan yang diinginkan disebut conversion ______.', 'accept' => ['rate']],
        ['id' => 'Q-DM-0105', 'type' => 'short', 'points' => 2, 'comp' => 'Email', 'text' => 'Sebutkan dua metrik untuk mengukur efektivitas kampanye email.', 'accept' => ['open rate', 'click', 'ctr', 'conversion', 'unsubscribe', 'bounce']],
        ['id' => 'Q-DM-0106', 'type' => 'numeric', 'points' => 2, 'comp' => 'Analitik', 'text' => 'Kampanye mendapat 2.000 klik dan 50 konversi. Berapa persen conversion rate-nya?', 'key' => 2.5, 'tol' => 0.01],
    ]],
    'EXM-DM-P' => ['passing' => 70, 'retake' => ['max' => 2, 'wait_hours' => 0, 'approval' => false, 'scoring' => 'HIGHEST_SCORE'], 'questions' => [
        ['id' => 'Q-DM-P01', 'type' => 'essay', 'points' => 10, 'comp' => 'Strategi', 'text' => 'Susun rencana kampanye digital 4 minggu untuk peluncuran produk kopi kemasan: target audiens, kanal, anggaran, dan KPI.', 'rubric' => RUBRIC_PRAKTIK],
    ]],
    'EXM-CS-T' => ['passing' => 75, 'retake' => ['max' => 3, 'wait_hours' => 0, 'approval' => false, 'scoring' => 'LATEST_SCORE'], 'questions' => [
        ['id' => 'Q-CS-0001', 'type' => 'single', 'points' => 2, 'comp' => 'Phishing', 'text' => 'Tanda paling kuat sebuah email phishing adalah…', 'options' => ['Logo perusahaan buram', 'Tautan ke domain yang mirip tetapi berbeda', 'Dikirim pada malam hari', 'Menggunakan bahasa formal'], 'key' => 1],
        ['id' => 'Q-CS-0002', 'type' => 'tf', 'points' => 1, 'comp' => 'Kata sandi', 'text' => 'Menggunakan kata sandi yang sama untuk banyak layanan aman selama kata sandinya panjang.', 'options' => ['Benar', 'Salah'], 'key' => 1],
        ['id' => 'Q-CS-0003', 'type' => 'multi', 'points' => 3, 'comp' => 'Perangkat', 'text' => 'Pilih semua praktik yang mengurangi risiko perangkat kerja.', 'options' => ['Mengaktifkan pembaruan otomatis', 'Mematikan kunci layar', 'Mengenkripsi disk', 'Memasang aplikasi dari sumber resmi'], 'key' => [0, 2, 3]],
        ['id' => 'Q-CS-0004', 'type' => 'blank', 'points' => 2, 'comp' => 'Autentikasi', 'text' => 'Singkatan untuk verifikasi login dengan dua faktor atau lebih adalah ______.', 'accept' => ['mfa', '2fa', 'multi-factor authentication', 'multifactor authentication']],
        ['id' => 'Q-CS-0005', 'type' => 'single', 'points' => 2, 'comp' => 'Insiden', 'text' => 'Langkah pertama yang tepat setelah tidak sengaja mengklik tautan mencurigakan adalah…', 'options' => ['Diam saja', 'Melapor ke tim keamanan dan memutus koneksi', 'Menghapus riwayat browser', 'Mengganti wallpaper'], 'key' => 1],
    ]],
    'EXM-PM-T' => ['passing' => 70, 'retake' => ['max' => 2, 'wait_hours' => 48, 'approval' => true, 'scoring' => 'PASS_ONCE'], 'questions' => [
        ['id' => 'Q-PM-0001', 'type' => 'single', 'points' => 2, 'comp' => 'Lingkup', 'text' => 'Dokumen yang memecah lingkup proyek menjadi paket kerja disebut…', 'options' => ['Gantt chart', 'Work Breakdown Structure', 'Risk register', 'RACI'], 'key' => 1],
        ['id' => 'Q-PM-0002', 'type' => 'order', 'points' => 3, 'comp' => 'Siklus', 'text' => 'Urutkan fase siklus hidup proyek.', 'items' => ['Penutupan', 'Inisiasi', 'Eksekusi', 'Perencanaan'], 'key' => [1, 3, 2, 0]],
        ['id' => 'Q-PM-0003', 'type' => 'numeric', 'points' => 2, 'comp' => 'Biaya', 'text' => 'EV = 40 juta, AC = 50 juta. Berapa CPI (2 desimal)?', 'key' => 0.8, 'tol' => 0.01],
        ['id' => 'Q-PM-0004', 'type' => 'tf', 'points' => 1, 'comp' => 'Risiko', 'text' => 'Risiko hanya berdampak negatif terhadap proyek.', 'options' => ['Benar', 'Salah'], 'key' => 1],
        ['id' => 'Q-PM-0005', 'type' => 'essay', 'points' => 10, 'comp' => 'Pemangku kepentingan', 'text' => 'Jelaskan cara Anda menangani pemangku kepentingan yang terus mengubah kebutuhan di tengah proyek.', 'rubric' => RUBRIC_PRAKTIK],
    ]],
    'EXM-UX-T' => ['passing' => 70, 'retake' => ['max' => 2, 'wait_hours' => 0, 'approval' => false, 'scoring' => 'HIGHEST_SCORE'], 'questions' => [
        ['id' => 'Q-UX-0001', 'type' => 'single', 'points' => 2, 'comp' => 'Riset', 'text' => 'Metode yang paling tepat untuk memahami alasan di balik perilaku pengguna adalah…', 'options' => ['Survei skala besar', 'Wawancara mendalam', 'A/B test', 'Heatmap'], 'key' => 1],
        ['id' => 'Q-UX-0002', 'type' => 'match', 'points' => 3, 'comp' => 'Metode', 'text' => 'Pasangkan metode dengan tujuannya.', 'left' => ['Card sorting', 'Usability test', 'Diary study'], 'right' => ['Perilaku dalam jangka waktu panjang', 'Struktur informasi', 'Menemukan hambatan penggunaan'], 'key' => [1, 2, 0]],
        ['id' => 'Q-UX-0003', 'type' => 'tf', 'points' => 1, 'comp' => 'Usability', 'text' => 'Lima partisipan umumnya cukup untuk menemukan sebagian besar masalah usability utama.', 'options' => ['Benar', 'Salah'], 'key' => 0],
    ]],
    'EXM-UX-P' => ['passing' => 70, 'retake' => ['max' => 2, 'wait_hours' => 0, 'approval' => false, 'scoring' => 'HIGHEST_SCORE'], 'questions' => [
        ['id' => 'Q-UX-P01', 'type' => 'essay', 'points' => 10, 'comp' => 'Riset', 'text' => 'Rancang rencana riset untuk aplikasi antrean puskesmas: pertanyaan riset, metode, partisipan, dan keluaran.', 'rubric' => RUBRIC_PRAKTIK],
    ]],
    'EXM-K3-T' => ['passing' => 70, 'retake' => ['max' => 3, 'wait_hours' => 0, 'approval' => false, 'scoring' => 'HIGHEST_SCORE'], 'questions' => [
        ['id' => 'Q-K3-0001', 'type' => 'single', 'points' => 2, 'comp' => 'Ergonomi', 'text' => 'Posisi layar monitor yang dianjurkan adalah…', 'options' => ['Di atas kepala', 'Sejajar atau sedikit di bawah mata', 'Di samping kiri', 'Sejauh 2 meter'], 'key' => 1],
        ['id' => 'Q-K3-0002', 'type' => 'tf', 'points' => 1, 'comp' => 'Kebakaran', 'text' => 'APAR jenis CO2 cocok untuk kebakaran peralatan listrik.', 'options' => ['Benar', 'Salah'], 'key' => 0],
    ]],
];

const CERT_RULES = [
    'TRN-DA-2611' => ['type' => 'Competency', 'code' => 'DA', 'valid_years' => 3],
    'TRN-DM-2611' => ['type' => 'Completion', 'code' => 'DM', 'valid_years' => null],
    'TRN-CS-2610' => ['type' => 'Attendance', 'code' => 'CS', 'valid_years' => null],
    'TRN-PM-2612' => ['type' => 'Competency', 'code' => 'PM', 'valid_years' => 3],
    'TRN-UX-2612' => ['type' => 'Competency', 'code' => 'UX', 'valid_years' => 3],
    'TRN-K3-2608' => ['type' => 'Attendance', 'code' => 'K3', 'valid_years' => 3],
];
