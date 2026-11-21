/* TACMS prototype — peta prototipe (hub) & verifikasi sertifikat publik */
(function () {
  const { ic, esc, status } = App;
  const D = window.DATA;
  const S = App.state;

  const screen = (route, label, code) => `<li><button data-go="${route}"><span>${label}</span><code>${code || route}</code></button></li>`;
  const node = (route, label, sub, dec) => `<div class="flow-node ${dec ? 'dec' : ''}"><button data-go="${route}">${label}<small>${sub}</small></button></div>`;
  const arrow = '<div class="flow-node"><span class="arrow"></span></div>';
  const flow = (nodes) => `<div class="flow-strip">${nodes.join(arrow)}</div>`;

  App.routes.home = () => `
  <div class="hub">
    <header class="hub-hero">
      <div class="hub-inner">
        <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start">
          <div class="row" style="flex-wrap:nowrap"><div class="logo">TA</div><div><b style="font:700 15px var(--font-display);color:#fff">TACMS</b><div class="xs" style="color:#8fa3c8">Training Assessment &amp; Certification Management System</div></div></div>
          <button class="icon-btn" style="color:#c5d2ea" data-action="theme" aria-label="Ganti tema">${ic(App.isDark() ? 'sun' : 'moon')}</button>
        </div>
        <h1>Purwarupa UI/UX TACMS</h1>
        <p>Purwarupa klikabel berdasarkan SRS v1.1: alur voucher dan OTP, ruang ujian, penilaian, retake, sertifikat, serta verifikasi publik. Semua data adalah contoh fiktif.</p>
        <div class="meta"><span>SRS v1.1 · 21 Nov 2026</span><span>Next.js / NestJS / PostgreSQL</span><span>Bahasa Indonesia</span><span>Responsif desktop · tablet · ponsel</span></div>
      </div>
    </header>

    <div class="hub-inner stack-lg" style="padding-bottom:56px">
      <div class="portal-grid">
        <section class="card portal">
          <div class="pi" style="background:var(--teal-soft);color:var(--teal)">${ic('user', 'ic-lg')}</div>
          <div><h3>Portal Peserta</h3><p class="small muted">Alur sederhana yang fokus pada ujian. Mobile-first.</p></div>
          <ul>
            ${screen('p-start', 'Aktivasi voucher')}
            ${screen('p-identity', 'Data identitas')}
            ${screen('p-otp', 'Verifikasi OTP email & telepon')}
            ${screen('p-bound', 'Voucher terikat')}
            ${screen('p-dashboard', 'Dashboard & jadwal ujian')}
            ${screen('p-instructions', 'Instruksi & gate akses')}
            ${screen('p-exam', 'Ruang ujian (exam workspace)')}
            ${screen('p-result', 'Hasil, retake & sertifikat')}
            ${screen('p-history', 'Histori ujian')}
            ${screen('p-certs', 'Sertifikat saya')}
            ${screen('p-profile', 'Profil & verifikasi kontak')}
          </ul>
        </section>
        <section class="card portal">
          <div class="pi" style="background:var(--brand-soft);color:var(--brand)">${ic('grid', 'ic-lg')}</div>
          <div><h3>Portal Admin</h3><p class="small muted">Sidebar + topbar, tabel dengan cari, filter, paginasi, ekspor.</p></div>
          <ul>
            ${screen('a-login', 'Login admin + MFA')}
            ${screen('a-dashboard', 'Dashboard')}
            ${screen('a-trainings', 'Pelatihan')}
            ${screen('a-participants', 'Peserta')}
            ${screen('a-enrollments', 'Enrollment & jadwal')}
            ${screen('a-vouchers', 'Voucher, order & pembayaran')}
            ${screen('a-questions', 'Bank soal & question builder')}
            ${screen('a-exam-builder', 'Exam builder (8 langkah)')}
            ${screen('a-monitoring', 'Monitoring ujian live')}
            ${screen('a-grading', 'Penilaian essay (rubrik)')}
            ${screen('a-retake', 'Manajemen retake')}
            ${screen('a-certificates', 'Sertifikat')}
            ${screen('a-reports', 'Laporan & analisis soal')}
            ${screen('a-audit', 'Audit log')}
            ${screen('a-users', 'Pengguna & role (RBAC)')}
          </ul>
        </section>
        <section class="card portal">
          <div class="pi" style="background:var(--success-soft);color:var(--success)">${ic('shield', 'ic-lg')}</div>
          <div><h3>Verifikasi Publik</h3><p class="small muted">Halaman terbatas untuk memeriksa keaslian sertifikat via nomor atau QR.</p></div>
          <ul>
            ${screen('verify', 'Cek sertifikat')}
          </ul>
          <div class="panel stack" style="gap:8px">
            <span class="eyebrow">Data uji untuk demo</span>
            <div class="small"><b>Voucher</b> <code>TACMS-7K4Q-92XD</code></div>
            <div class="small"><b>OTP</b> <code>123456</code> (selain itu dianggap salah)</div>
            <div class="small"><b>Sertifikat valid</b> <code>LSPTN/DA/2026/00731</code></div>
            <div class="small"><b>Dicabut</b> <code>LSPTN/CS/2026/00512</code></div>
            <div class="small"><b>Kedaluwarsa</b> <code>LSPTN/K3/2023/00105</code></div>
          </div>
        </section>
      </div>

      <section class="card">
        <div class="card-head"><div><h3>Alur utama</h3><p class="small muted">Setiap kotak membuka layar terkait. Kotak bergaris putus-putus adalah titik keputusan.</p></div></div>
        <div class="card-body stack-lg">
          <div class="stack" style="gap:8px"><span class="eyebrow">1 · Aktivasi voucher &amp; OTP (SRS 8.2)</span>
            ${flow([node('p-start', 'Buka portal', 'Masukkan voucher'), node('p-start', 'Voucher valid?', 'Tidak → pesan aman', 1), node('p-identity', 'Nama, email, telepon', 'Reservasi sementara'), node('p-otp', 'OTP email + telepon', '5 menit · 5× coba'), node('p-otp', 'Keduanya terverifikasi?', 'Tidak → ulangi', 1), node('p-bound', 'Bind voucher', 'Entitlement dibuat'), node('p-dashboard', 'Tampilkan ujian', 'Pelatihan & ujian')])}
          </div>
          <div class="stack" style="gap:8px"><span class="eyebrow">2 · Pelaksanaan ujian (SRS 8.3)</span>
            ${flow([node('p-instructions', 'Baca instruksi', 'Gate akses 9 syarat'), node('p-exam', 'Mulai ujian', 'Attempt + snapshot'), node('p-exam', 'Jawab soal', 'Autosave'), node('p-exam', 'Submit / waktu habis?', 'Tidak → lanjut jawab', 1), node('p-result', 'Hitung nilai', 'Essay → Pending Review')])}
          </div>
          <div class="stack" style="gap:8px"><span class="eyebrow">3 · Hasil, retake &amp; sertifikat (SRS 8.4–8.5)</span>
            ${flow([node('p-result', 'Lulus?', 'Ya / Tidak', 1), node('p-certs', 'Eligibility sertifikat', 'Lulus'), node('a-certificates', 'Approval sertifikat', 'Generator / upload'), node('p-certs', 'Unduh sertifikat', 'PDF + QR')])}
            ${flow([node('p-result', 'Retake tersedia?', 'Tidak lulus', 1), node('p-result', 'Tunggu / ajukan', 'Masa tunggu'), node('a-retake', 'Persetujuan admin', 'Entitlement +1'), node('p-instructions', 'Mulai ujian', 'Attempt ke-2')])}
          </div>
          <div class="stack" style="gap:8px"><span class="eyebrow">4 · Admin end-to-end (SRS 8.1)</span>
            ${flow([node('a-trainings', 'Buat pelatihan', 'Kode, sesi'), node('a-participants', 'Daftarkan peserta', 'Manual / impor'), node('a-questions', 'Bank soal', '14 tipe soal'), node('a-exam-builder', 'Konfigurasi ujian', 'Blueprint, retake'), node('a-vouchers', 'Batch voucher', 'Order terverifikasi'), node('a-monitoring', 'Monitor attempt', 'Live'), node('a-grading', 'Penilaian', 'Rubrik'), node('a-reports', 'Laporan & audit', 'Ekspor')])}
          </div>
        </div>
      </section>
    </div>
  </div>`;

  /* ---------- Verifikasi publik (SRS 9.7) ---------- */
  const lookup = (raw) => {
    const q = raw.trim().toUpperCase();
    if (!q) return null;
    const c = D.certs.find((x) => x.no.toUpperCase() === q);
    if (!c || c.status === 'PENDING_APPROVAL') return { state: 'NOT_FOUND', q };
    return { state: c.status === 'ISSUED' ? 'VALID' : c.status, c };
  };

  App.routes.verify = () => {
    const r = S.verifyResult;
    let res = '';
    if (r) {
      const map = {
        VALID: ['v-ok', 'checkCircle', 'VALID', 'Sertifikat ini asli dan berlaku.'],
        REVOKED: ['v-bad', 'xCircle', 'DICABUT', 'Sertifikat ini telah dibatalkan oleh penerbit dan tidak berlaku.'],
        EXPIRED: ['v-warn', 'clock', 'KEDALUWARSA', 'Sertifikat ini asli, tetapi masa berlakunya telah habis.'],
        NOT_FOUND: ['v-none', 'search', 'TIDAK DITEMUKAN', 'Tidak ada sertifikat dengan nomor tersebut. Periksa kembali penulisan nomor.'],
      }[r.state];
      res = `<section class="card verify-card" aria-live="polite">
        <div class="v-status ${map[0]}">${ic(map[1], 'ic-lg')}<div><div class="big">${map[2]}</div><div class="small" style="color:var(--fg-2)">${map[3]}</div></div></div>
        ${r.c ? `<div class="card-body stack-lg">
          <dl class="dl">
            <dt>Nama peserta</dt><dd>${esc(r.c.p)}</dd>
            <dt>Nomor sertifikat</dt><dd class="mono">${esc(r.c.no)}</dd>
            <dt>Jenis sertifikat</dt><dd>Certificate of ${esc(r.c.type)}</dd>
            <dt>Nama pelatihan</dt><dd>${esc(r.c.training)}</dd>
            <dt>Tanggal terbit</dt><dd>${esc(r.c.issued)}</dd>
            <dt>Masa berlaku</dt><dd>${r.c.exp === '—' ? 'Tanpa batas' : 'Sampai ' + esc(r.c.exp)}</dd>
            <dt>Penerbit</dt><dd>${esc(D.org.name)}</dd>
          </dl>
          <p class="xs dim">Diperiksa ${new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}. Halaman ini sengaja tidak menampilkan email, telepon, nilai, atau data pribadi lain.</p>
        </div>` : `<div class="card-body"><p class="small muted">Nomor yang dicari: <code>${esc(r.q)}</code></p></div>`}
      </section>`;
    }
    return `<div class="verify">
      <div class="row" style="justify-content:space-between;width:min(560px,100%)">
        <button class="pp-brand" data-go="home"><div class="logo">TN</div><div><b>${esc(D.org.name)}</b><small>Verifikasi Sertifikat</small></div></button>
        ${App.themeBtn()}
      </div>
      <section class="card verify-card card-pad stack-lg">
        <div class="stack" style="gap:6px"><h1>Cek keaslian sertifikat</h1><p class="muted">Masukkan nomor sertifikat seperti tertulis pada dokumen, atau pindai QR Code pada sertifikat.</p></div>
        <form class="stack" data-form="verify" onsubmit="return false">
          <div class="field"><label class="label" for="v-no">Nomor sertifikat</label>
            <input id="v-no" class="input input-mono" placeholder="LSPTN/DA/2026/00731" value="${esc(S.verifyInput)}" data-bind="verifyInput" autocomplete="off"></div>
          <div class="row"><button class="btn btn-primary" data-action="verify">${ic('search')} Periksa</button><button class="btn btn-secondary" data-action="verifyQr">${ic('qr')} Pindai QR</button></div>
        </form>
        <div class="row xs dim">${ic('info', 'ic-sm')} Coba: <button class="btn btn-ghost btn-sm" data-action="verifyTry" data-v="LSPTN/DA/2026/00731">00731</button><button class="btn btn-ghost btn-sm" data-action="verifyTry" data-v="LSPTN/CS/2026/00512">00512</button><button class="btn btn-ghost btn-sm" data-action="verifyTry" data-v="LSPTN/K3/2023/00105">00105</button><button class="btn btn-ghost btn-sm" data-action="verifyTry" data-v="LSPTN/XX/2026/99999">acak</button></div>
      </section>
      ${res}
      <p class="xs dim" style="text-align:center;max-width:56ch">Statistik pemeriksaan dicatat tanpa data pribadi. Token QR bersifat acak dan tidak memuat identitas peserta.</p>
    </div>`;
  };
  App.binds.verifyInput = (el) => { S.verifyInput = el.value; };
  App.actions.verify = () => { S.verifyResult = lookup(S.verifyInput); App.rerender(); };
  App.actions.verifyTry = (el) => { S.verifyInput = el.dataset.v; S.verifyResult = lookup(S.verifyInput); App.rerender(); };
  App.actions.verifyQr = () => { S.verifyInput = 'LSPTN/DA/2026/00731'; S.verifyResult = lookup(S.verifyInput); App.rerender(); App.toast('QR terbaca · token v_8Kq2…'); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'v-no') { e.preventDefault(); App.actions.verify(); } });
})();
