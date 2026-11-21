<?php
/**
 * TACMS — data dummy lengkap untuk uji coba seluruh alur (flowchart & SRS).
 * Idempoten: hanya dijalankan sekali (penanda seeded_dummy), tidak menghapus data yang sudah ada.
 * Nilai dihitung oleh mesin ujian yang sama dengan ujian sungguhan. Email peserta dummy memakai domain .test.
 * Mengembalikan daftar kode voucher yang belum diaktifkan (kode utuh hanya ada di keluaran ini).
 */
declare(strict_types=1);
require_once __DIR__ . '/enrollstore.php';

const SEED_PEOPLE = [
    ['Aditya Pratama', 'Universitas Indonesia'], ['Bunga Citra Lestari', 'Universitas Gadjah Mada'], ['Cahyo Nugroho', 'PT Data Prima Nusantara'],
    ['Dian Puspitasari', 'Institut Teknologi Sepuluh Nopember'], ['Eko Saputra', 'Politeknik Negeri Bandung'], ['Fitri Handayani', 'Mandiri'],
    ['Galih Ramadhan', 'Universitas Diponegoro'], ['Hesti Wulandari', 'PT Arunika Teknologi'], ['Irfan Maulana', 'Universitas Airlangga'],
    ['Juwita Sari', 'Universitas Sebelas Maret'], ['Kevin Wijaya', 'PT Sinar Data Mandiri'], ['Lina Marlina', 'Universitas Padjadjaran'],
    ['Muhammad Rizal', 'Universitas Hasanuddin'], ['Nurul Aini', 'Politeknik Negeri Jakarta'], ['Oki Setiawan', 'Mandiri'],
    ['Putri Ayuningtyas', 'Universitas Brawijaya'], ['Qori Amalia', 'Universitas Negeri Malang'], ['Reza Firmansyah', 'PT Data Prima Nusantara'],
    ['Sinta Dewi', 'Universitas Udayana'], ['Taufik Hidayat', 'Institut Pertanian Bogor'], ['Utami Rahayu', 'Universitas Andalas'],
    ['Vino Prasetyo', 'PT Arunika Teknologi'], ['Wulan Sari', 'Universitas Sumatera Utara'], ['Yoga Pradana', 'Mandiri'],
    ['Zahra Aulia', 'Universitas Islam Indonesia'], ['Arif Budiman', 'Politeknik Negeri Semarang'], ['Bella Anggraini', 'Universitas Lampung'],
    ['Candra Kirana', 'PT Sinar Data Mandiri'], ['Dodi Kurniawan', 'Universitas Jember'], ['Elsa Fitriani', 'Universitas Mulawarman'],
    ['Farhan Akbar', 'Universitas Syiah Kuala'], ['Gita Permata', 'Universitas Pendidikan Indonesia'],
];

const SEED_ESSAY_GOOD = "Langkah pertama memastikan penurunan itu nyata, bukan karena perubahan pelacakan: bandingkan event checkout_started dan purchase sebelum dan sesudah rilis serta periksa tag analitik.\n\nKedua, pecah funnel checkout per langkah (keranjang, alamat, pengiriman, pembayaran, konfirmasi) untuk menemukan titik drop-off. Data: log event per sesi, perangkat, browser, metode pembayaran, waktu muat halaman.\n\nKetiga, segmentasi per perangkat dan metode pembayaran, dan bandingkan dengan periode yang sama minggu lalu.\n\nTerakhir, rekomendasikan A/B test versi lama dan baru dengan metrik utama conversion rate.";
const SEED_ESSAY_MID = "Saya akan melihat data analitik untuk mengetahui halaman mana yang paling banyak ditinggalkan, membandingkan konversi sebelum dan sesudah perubahan, lalu memeriksa apakah masalah hanya terjadi di ponsel. Setelah itu saya laporkan ke tim produk.";
const SEED_ESSAY_POOR = "Saya akan bertanya kepada tim developer apa yang berubah lalu membuat laporan.";
const SEED_PRACTICAL_GOOD = "SELECT DATE_TRUNC('month', order_date) AS bulan, product_id, SUM(qty*price) AS pendapatan FROM orders GROUP BY 1,2 lalu gunakan ROW_NUMBER() OVER (PARTITION BY bulan ORDER BY pendapatan DESC) dan filter peringkat <= 5. Query menghitung pendapatan per produk per bulan lalu mengambil lima teratas.";
const SEED_PRACTICAL_MID = "SELECT product_id, SUM(qty*price) FROM orders GROUP BY product_id ORDER BY 2 DESC LIMIT 5. Ini menampilkan produk terlaris.";

/** Jawaban peserta: benar semua kecuali soal di $wrong (berdasarkan indeks soal). */
function seed_answers(string $exam, array $wrong = [], array $essays = []): array
{
    $ans = [];
    foreach (exam_cfg($exam)['questions'] as $i => $q) {
        $bad = in_array($i, $wrong, true);
        switch ($q['type']) {
            case 'single': case 'tf': $ans[$q['id']] = $bad ? ($q['key'] + 1) % count($q['options']) : $q['key']; break;
            case 'multi': $ans[$q['id']] = $bad ? [0] : $q['key']; break;
            case 'blank': $ans[$q['id']] = $bad ? 'sum' : $q['accept'][0]; break;
            case 'short': $ans[$q['id']] = $bad ? 'tidak tahu' : $q['accept'][0] . ' sesuai konteks data'; break;
            case 'numeric': $ans[$q['id']] = $bad ? 9 : $q['key']; break;
            case 'order': $ans[$q['id']] = $bad ? range(0, count($q['items']) - 1) : $q['key']; break;
            case 'match': $ans[$q['id']] = $bad ? array_reverse($q['key']) : $q['key']; break;
            case 'essay': $ans[$q['id']] = $essays[$q['id']] ?? ($essays['*'] ?? SEED_ESSAY_MID); break;
        }
    }
    return $ans;
}

function seed_dummy(array &$d, int $now): array
{
    if (!empty($d['seeded_dummy'])) return ['skipped' => true];
    $wib = new DateTimeZone('Asia/Jakarta');
    $iso = fn(int $t) => gmdate('c', $t);
    $day = 86400;
    $codes = [];
    $stats = ['participants' => 0, 'enrollments' => 0, 'attempts' => 0, 'certificates' => 0, 'retakes' => 0];

    // ---------- Peserta ----------
    $people = [];
    foreach (SEED_PEOPLE as $i => [$name, $inst]) {
        $d['seq']['par']++;
        $no = sprintf('PAR-2026-%05d', $d['seq']['par']);
        $slug = strtolower(preg_replace('/[^a-z]+/i', '.', $name));
        $d['participants'][$no] = ['no' => $no, 'name' => $name, 'email' => trim($slug, '.') . '@peserta.test', 'phone' => sprintf('+62812%08d', 31000000 + $i * 137),
            'inst' => $inst, 'created_at' => $iso($now - 20 * $day), 'created_by' => 'seed'];
        $people[] = $no;
        $stats['participants']++;
    }
    $verify = function (string $no, int $t) use (&$d, $iso) { $d['participants'][$no]['email_verified_at'] = $iso($t); $d['participants'][$no]['phone_verified_at'] = $iso($t); $d['participants'][$no]['phone_channel'] = 'WhatsApp'; };

    $P = $people;

    // ---------- Enrollment + voucher ----------
    $enroll = function (string $pid, string $training, string $exam, int $start, int $end, ?string $batch, string $vstatus, string $late = 'ALLOW_WITH_REMAINING_TIME', string $by = 'training')
        use (&$d, &$codes, &$stats, $iso, $now) : string {
        $d['seq']['enr']++;
        $id = sprintf('ENR-%s-%05d', substr($training, 4, 2), $d['seq']['enr']);
        $hash = null; $masked = null;
        if ($batch) {
            do { $code = voucher_code(); $hash = voucher_hash($code); } while (isset($d['vouchers'][$hash]));
            $masked = substr($code, 0, 10) . '-••••';
            $d['vouchers'][$hash] = ['masked' => $masked, 'batch' => $batch, 'training' => $training, 'exam' => $exam, 'participant' => $pid, 'enrollment' => $id,
                'status' => $vstatus, 'created_at' => $iso($start - 5 * 86400), 'created_by' => $by];
            if (in_array($vstatus, ['BOUND', 'REDEEMED'], true)) $d['vouchers'][$hash]['bound_at'] = $iso(min($now, $start) - 86400);
            if ($vstatus === 'ALLOCATED') $codes[] = ['participant' => $pid, 'name' => $d['participants'][$pid]['name'], 'email' => $d['participants'][$pid]['email'], 'enrollment' => $id, 'training' => TRAININGS[$training]['name'], 'exam' => TRAININGS[$training]['exams'][$exam]['name'], 'code' => $code];
        }
        $d['enrollments'][] = ['id' => $id, 'training' => $training, 'exam' => $exam, 'participant' => $pid, 'start' => $iso($start), 'end' => $iso($end), 'tz' => 'Asia/Jakarta', 'late' => $late,
            'batch' => $batch, 'voucher_hash' => $hash, 'voucher_masked' => $masked, 'status' => 'SCHEDULED', 'created_at' => $iso($start - 6 * 86400), 'created_by' => $by];
        $stats['enrollments']++;
        return $id;
    };

    /** Attempt yang sudah selesai: jawaban → nilai otomatis → (opsional) nilai essay per rubrik. */
    $attempt = function (string $eid, int $startedAt, int $minutes, array $answers, ?array $rubric = null, string $grader = 'penguji', int $tabs = 0) use (&$d, &$stats, $iso): int {
        $e = $d['enrollments'][find_enrollment_idx($d, $eid)];
        $d['seq']['att']++;
        $d['attempts'][] = ['id' => 'ATT-' . $d['seq']['att'], 'enrollment' => $eid, 'participant' => $e['participant'], 'training' => $e['training'], 'exam' => $e['exam'], 'exam_version' => 'v3',
            'no' => count(enrollment_attempts($d, $eid)) + 1, 'order' => array_column(exam_cfg($e['exam'])['questions'], 'id'), 'answers' => $answers, 'flags' => [],
            'started_at' => $iso($startedAt), 'deadline' => $iso($startedAt + (TRAININGS[$e['training']]['exams'][$e['exam']]['duration'] ?? 60) * 60), 'status' => 'IN_PROGRESS', 'tab_switches' => $tabs, 'last_save' => $iso($startedAt + $minutes * 60)];
        $i = count($d['attempts']) - 1;
        $hi = $d['vouchers'][$e['voucher_hash'] ?? ''] ?? null;
        if ($hi && $hi['status'] === 'BOUND') { $d['vouchers'][$e['voucher_hash']]['status'] = 'REDEEMED'; $d['vouchers'][$e['voucher_hash']]['redeemed_at'] = $iso($startedAt); }
        attempt_finalize($d, $i, false, $startedAt + $minutes * 60);
        if ($rubric !== null) {
            $a = &$d['attempts'][$i];
            foreach (exam_cfg($a['exam'])['questions'] as $q) {
                if ($q['type'] !== 'essay') continue;
                $r = $rubric[$q['id']] ?? $rubric['*'];
                $a['manual'][$q['id']] = ['points' => round(array_sum($r) / array_sum(array_column($q['rubric'], 'max')) * $q['points'], 2), 'rubric' => $r,
                    'feedback' => 'Penilaian contoh (data dummy).', 'grader' => $grader, 'graded_at' => $iso($startedAt + $minutes * 60 + 7200)];
            }
            attempt_compute($a);
            $a['graded_at'] = $iso($startedAt + $minutes * 60 + 7200);
            unset($a);
            enrollment_after_attempt($d, $eid);
        }
        $stats['attempts']++;
        return $i;
    };
    /** Terbitkan sertifikat PENDING milik peserta (atau semua peserta pelatihan bila $pid null). */
    $issue = function (string $training, int $issuedAt, ?array $only = null) use (&$d, &$stats, $iso) {
        foreach ($d['certificates'] as $ci => $c) {
            if ($c['training'] !== $training || $c['status'] !== 'PENDING_APPROVAL') continue;
            if ($only !== null && !in_array($c['participant'], $only, true)) continue;
            certificate_issue($d, $ci, 'sertifikat', $issuedAt);
            $d['certificates'][$ci]['created_at'] = $iso($issuedAt - 20 * 3600);
            $stats['certificates']++;
        }
    };
    $pendingAt = function (string $training, int $t) use (&$d, $iso) {
        foreach ($d['certificates'] as $ci => $c) if ($c['training'] === $training && $c['status'] === 'PENDING_APPROVAL') $d['certificates'][$ci]['created_at'] = $iso($t);
    };

    // ---------- K3 Perkantoran (2023) — sertifikat kedaluwarsa ----------
    $k3S = (new DateTimeImmutable('2023-08-13 10:00', $wib))->getTimestamp();
    foreach (['PAR-2026-00420', 'PAR-2026-00423', $P[29]] as $pid) {
        $verify($pid, $k3S - $day);
        $e = $enroll($pid, 'TRN-K3-2608', 'EXM-K3-T', $k3S, $k3S + 3600, null, 'BOUND', 'BLOCK');
        $attempt($e, $k3S + 300, 15, seed_answers('EXM-K3-T'));
    }
    $issue('TRN-K3-2608', (new DateTimeImmutable('2023-08-14 10:00', $wib))->getTimestamp());

    // ---------- Cyber Security Awareness — sudah selesai (Okt 2026), LATEST_SCORE ----------
    $csS = (new DateTimeImmutable('2026-10-22 09:00', $wib))->getTimestamp(); $csE = $csS + 3 * 3600;
    $csPeople = array_merge(['PAR-2026-00419', 'PAR-2026-00420', 'PAR-2026-00422', 'PAR-2026-00424', 'PAR-2026-00425', 'PAR-2026-00426'], array_slice($P, 27, 2));
    foreach ($csPeople as $k => $pid) {
        $verify($pid, $csS - 2 * $day);
        $e = $enroll($pid, 'TRN-CS-2610', 'EXM-CS-T', $csS, $csE, 'VB-2610-011', 'BOUND', 'BLOCK');
        if ($k === 6) {   // gagal 3× → kesempatan habis
            foreach ([0, 1, 2] as $t) $attempt($e, $csS + $t * 3000, 20, seed_answers('EXM-CS-T', [0, 2, 3]));
        } elseif ($k === 7) {
            $attempt($e, $csS + 600, 25, seed_answers('EXM-CS-T', [1, 2, 4]));
        } else {
            $attempt($e, $csS + 300 * $k, 18 + $k, seed_answers('EXM-CS-T', $k % 2 ? [1] : []));
        }
    }
    $issue('TRN-CS-2610', (new DateTimeImmutable('2026-10-23 14:00', $wib))->getTimestamp());
    foreach ($d['certificates'] as $ci => $c) if ($c['training'] === 'TRN-CS-2610' && $c['participant'] === 'PAR-2026-00425' && $c['status'] === 'ISSUED') {
        $d['certificates'][$ci]['status'] = 'REVOKED'; $d['certificates'][$ci]['revoked_reason'] = 'Data kehadiran tidak valid (contoh data dummy)'; $d['certificates'][$ci]['revoked_at'] = $iso($csS + 10 * $day); $d['certificates'][$ci]['revoked_by'] = 'orgadmin';
    }

    // ---------- Data Analyst Associate — ujian dibuka (jendela 3 hari lalu s/d 14 hari lagi) ----------
    $daS = $now - 3 * $day; $daE = $now + 14 * $day;
    // 6 voucher belum diaktifkan (uji alur aktivasi)
    foreach (array_slice($P, 0, 6) as $pid) $enroll($pid, 'TRN-DA-2611', 'EXM-DA-T', $daS, $daE, 'VB-2611-014', 'ALLOCATED');
    // 4 sudah aktivasi, siap mulai ujian (+ akun peserta Nadia)
    foreach (array_merge(array_slice($P, 6, 4), ['PAR-2026-00418']) as $pid) { $verify($pid, $now - 2 * $day); $enroll($pid, 'TRN-DA-2611', 'EXM-DA-T', $daS, $daE, 'VB-2611-014', 'BOUND'); }
    // 3 lulus teori (essay sudah dinilai) + ikut praktik
    $passT = array_slice($P, 10, 3);
    foreach ($passT as $k => $pid) {
        $verify($pid, $now - 3 * $day);
        $e = $enroll($pid, 'TRN-DA-2611', 'EXM-DA-T', $daS, $daE, 'VB-2611-014', 'BOUND');
        $attempt($e, $now - 2 * $day - 3600 * (3 + $k), 70 + $k * 5, seed_answers('EXM-DA-T', $k === 2 ? [6, 7] : [], ['*' => SEED_ESSAY_GOOD]), ['*' => $k === 0 ? [3, 3, 2, 3] : [2, 3, 2, 2]]);
        $ep = $enroll($pid, 'TRN-DA-2611', 'EXM-DA-P', $now - 1 * $day, $daE, 'VB-2611-015', 'BOUND');
        if ($k < 2) $attempt($ep, $now - $day + 3600 * $k, 95, seed_answers('EXM-DA-P', [], ['*' => SEED_PRACTICAL_GOOD]), ['*' => [4, 3, 2]]);
        else $attempt($ep, $now - 5 * 3600, 100, seed_answers('EXM-DA-P', [], ['*' => SEED_PRACTICAL_MID]));   // menunggu penilaian
    }
    $issue('TRN-DA-2611', $now - 6 * 3600, [$passT[0]]);          // satu terbit
    $pendingAt('TRN-DA-2611', $now - 20 * 3600);                    // satu menunggu persetujuan
    // 3 menunggu penilaian essay
    foreach (array_slice($P, 13, 3) as $k => $pid) {
        $verify($pid, $now - 2 * $day);
        $e = $enroll($pid, 'TRN-DA-2611', 'EXM-DA-T', $daS, $daE, 'VB-2611-014', 'BOUND');
        $attempt($e, $now - 3600 * (6 + $k * 3), 60 + $k * 10, seed_answers('EXM-DA-T', [$k, 6], ['*' => [SEED_ESSAY_GOOD, SEED_ESSAY_MID, SEED_ESSAY_POOR][$k]]));
    }
    // 2 tidak lulus: satu sudah mengajukan retake (masa tunggu lewat), satu belum (masih masa tunggu)
    $fail = array_slice($P, 16, 2);
    foreach ($fail as $k => $pid) {
        $verify($pid, $now - 3 * $day);
        $e = $enroll($pid, 'TRN-DA-2611', 'EXM-DA-T', $daS, $daE, 'VB-2611-014', 'BOUND');
        $t0 = $k === 0 ? $now - 2 * $day : $now - 3 * 3600;
        $attempt($e, $t0, 80, seed_answers('EXM-DA-T', [0, 1, 2, 6, 7, 8], ['*' => SEED_ESSAY_POOR]), ['*' => [1, 1, 1, 1]]);
        if ($k === 0) {
            $atts = enrollment_attempts($d, $e);
            $d['seq']['ret']++;
            $d['retakes'][] = ['id' => sprintf('RTK-%05d', $d['seq']['ret']), 'enrollment' => $e, 'participant' => $pid, 'exam' => 'EXM-DA-T', 'after_attempt' => end($atts)['id'],
                'reason' => 'Saya sakit saat ujian pertama dan ingin mencoba lagi.', 'status' => 'PENDING', 'created_at' => $iso($t0 + 4 * 3600)];
            $stats['retakes']++;
        }
    }
    // 2 sedang mengerjakan (tampil di Monitoring)
    foreach (array_slice($P, 18, 2) as $k => $pid) {
        $verify($pid, $now - $day);
        $e = $enroll($pid, 'TRN-DA-2611', 'EXM-DA-T', $daS, $daE, 'VB-2611-014', 'REDEEMED');
        $d['seq']['att']++;
        $ans = array_slice(seed_answers('EXM-DA-T', [2], ['*' => SEED_ESSAY_MID]), 0, 4 + $k * 3, true);
        $d['attempts'][] = ['id' => 'ATT-' . $d['seq']['att'], 'enrollment' => $e, 'participant' => $pid, 'training' => 'TRN-DA-2611', 'exam' => 'EXM-DA-T', 'exam_version' => 'v3', 'no' => 1,
            'order' => array_column(exam_cfg('EXM-DA-T')['questions'], 'id'), 'answers' => $ans, 'flags' => [], 'started_at' => $iso($now - (20 + $k * 25) * 60),
            'deadline' => $iso($now + (70 - $k * 25) * 60), 'status' => 'IN_PROGRESS', 'tab_switches' => $k ? 5 : 0, 'last_save' => $iso($now - 60)];
        $d['enrollments'][find_enrollment_idx($d, $e)]['status'] = 'IN_PROGRESS';
        $stats['attempts']++;
    }

    // ---------- Digital Marketing — HIGHEST_SCORE, retake tanpa persetujuan ----------
    $dmS = $now - 2 * $day;
    foreach (array_slice($P, 20, 2) as $k => $pid) {   // lulus → sertifikat Completion (satu terbit, satu menunggu)
        $verify($pid, $now - 2 * $day);
        $e = $enroll($pid, 'TRN-DM-2611', 'EXM-DM-T', $dmS, $daE, 'VB-2611-013', 'BOUND');
        $attempt($e, $now - $day - 3600 * $k, 35, seed_answers('EXM-DM-T', $k ? [2] : []));
    }
    $issue('TRN-DM-2611', $now - 10 * 3600, [$P[21]]);
    $pendingAt('TRN-DM-2611', $now - 22 * 3600);
    $pid = $P[22]; $verify($pid, $now - 2 * $day);   // gagal 1× → retake langsung tersedia
    $e = $enroll($pid, 'TRN-DM-2611', 'EXM-DM-T', $dmS, $daE, 'VB-2611-013', 'BOUND');
    $attempt($e, $now - $day, 40, seed_answers('EXM-DM-T', [0, 1, 4]));
    foreach (array_slice($P, 23, 2) as $pid) { $verify($pid, $now - $day); $enroll($pid, 'TRN-DM-2611', 'EXM-DM-T', $dmS, $daE, 'VB-2611-013', 'BOUND'); }
    foreach (array_slice($P, 25, 2) as $pid) $enroll($pid, 'TRN-DM-2611', 'EXM-DM-T', $dmS, $daE, 'VB-2611-013', 'ALLOCATED');

    // ---------- Project Management (1 Des) & UI/UX (8 Des) — terjadwal ----------
    $pmS = (new DateTimeImmutable('2026-12-01 09:00', $wib))->getTimestamp();
    foreach (array_slice($P, 0, 5) as $k => $pid) {
        if ($k < 2) $verify($pid, $now - $day);
        $enroll($pid, 'TRN-PM-2612', 'EXM-PM-T', $pmS, $pmS + 5400, 'VB-2612-016', $k < 2 ? 'BOUND' : 'ALLOCATED', 'BLOCK');
    }
    $uxS = (new DateTimeImmutable('2026-12-08 13:00', $wib))->getTimestamp();
    foreach (array_slice($P, 26, 3) as $pid) $enroll($pid, 'TRN-UX-2612', 'EXM-UX-T', $uxS, $uxS + 3600, null, 'ALLOCATED', 'ALLOW_WITH_REMAINING_TIME');

    // ---------- Enrollment dibatalkan (voucher dicabut) ----------
    foreach ([$P[30], $P[31]] as $pid) {
        $e = $enroll($pid, 'TRN-DA-2611', 'EXM-DA-T', $daS, $daE, 'VB-2611-014', 'ALLOCATED');
        $i = find_enrollment_idx($d, $e);
        $d['enrollments'][$i]['status'] = 'CANCELLED';
        $d['enrollments'][$i]['cancel_reason'] = 'Peserta mengundurkan diri (contoh data dummy)';
        $d['enrollments'][$i]['cancelled_by'] = 'training';
        $d['enrollments'][$i]['cancelled_at'] = $iso($now - $day);
        $d['vouchers'][$d['enrollments'][$i]['voucher_hash']]['status'] = 'REVOKED';
        $codes = array_values(array_filter($codes, fn($c) => $c['enrollment'] !== $e));
    }

    $d['seeded_dummy'] = $iso($now);
    return ['skipped' => false, 'stats' => $stats, 'codes' => $codes];
}
