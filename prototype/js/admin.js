/* TACMS prototype — Portal Admin (SRS 9.3, 9.5, Addendum v1.1) */
(function () {
  const { ic, esc, status, pill, fmt } = App;
  const D = window.DATA;
  const S = App.state;

  /* ---------- Shell ---------- */
  const NAV = [
    ['Ringkasan', [['a-dashboard', 'Dashboard', 'grid']]],
    ['Pelatihan', [['a-trainings', 'Pelatihan', 'book'], ['a-participants', 'Peserta', 'users'], ['a-enrollments', 'Enrollment & Jadwal', 'calendar']]],
    ['Voucher', [['a-vouchers', 'Voucher & Order', 'ticket', '2']]],
    ['Asesmen', [['a-questions', 'Bank Soal', 'layers'], ['a-exam-builder', 'Exam Builder', 'clipboard'], ['a-monitoring', 'Monitoring', 'monitor'], ['a-grading', 'Penilaian', 'edit', '14'], ['a-retake', 'Retake', 'repeat', '2']]],
    ['Sertifikat', [['a-certificates', 'Sertifikat', 'award', '3']]],
    ['Tata kelola', [['a-reports', 'Laporan', 'chart'], ['a-audit', 'Audit Log', 'log'], ['a-users', 'Pengguna & Role', 'key']]],
  ];
  const titleOf = (r) => { for (const [, items] of NAV) for (const [k, l] of items) if (k === r) return l; return ''; };
  const groupOf = (r) => { for (const [g, items] of NAV) for (const [k] of items) if (k === r) return g; return ''; };

  const shell = (route, body) => `
  <div class="admin ${S.navOpen ? 'nav-open' : ''}">
    <aside class="sidebar" aria-label="Navigasi admin">
      <div class="sb-brand"><div class="logo">TA</div><div><b>TACMS</b><small>Admin Portal</small></div></div>
      <div class="sb-org">${ic('building', 'ic-sm')}<span class="grow">${esc(D.org.name)}</span>${ic('chevD', 'ic-sm')}</div>
      ${NAV.map(([g, items]) => `<div class="sb-section">${g}</div>${items.map(([k, l, i, b]) => `<button class="sb-link ${route === k ? 'on' : ''}" data-go="${k}">${ic(i)}<span>${l}</span>${k === 'a-monitoring' ? '<span class="badge" style="background:#3cc3b6;color:#06231f">23</span>' : b ? `<span class="badge">${b}</span>` : ''}</button>`).join('')}`).join('')}
      <div class="sb-foot"><div class="row" style="flex-wrap:nowrap"><div class="avatar avatar-sm">${App.initials(D.admin.name)}</div><div class="grow"><div style="color:#e5ecf9;font-weight:600">${esc(D.admin.name)}</div><div>${esc(D.admin.role)}</div></div><button class="icon-btn" style="color:var(--nav-fg-dim)" data-go="a-login" aria-label="Keluar">${ic('logout')}</button></div></div>
    </aside>
    <div class="scrim" data-action="navToggle"></div>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" data-action="navToggle" aria-label="Menu">${ic('menu')}</button>
        <div class="crumbs">${groupOf(route) !== titleOf(route) ? `${groupOf(route)} ${ic('chevR', 'ic-sm')} ` : ''}<b>${titleOf(route)}</b></div>
        <label class="input-group search">${ic('search', 'ic-sm')}<input placeholder="Cari peserta, voucher, sertifikat…" aria-label="Pencarian global"><span class="tag">/</span></label>
        <button class="icon-btn" aria-label="Notifikasi" data-action="aNotif">${ic('bell')}</button>
        ${App.themeBtn()}
        <div class="avatar">${App.initials(D.admin.name)}</div>
      </header>
      <div class="content">${body}</div>
    </div>
    <div class="fab-admin">${App.protoFab()}</div>
  </div>`;
  App.actions.navToggle = () => { S.navOpen = !S.navOpen; App.rerender(); };
  App.actions.aNotif = () => App.modal(`${App.modalHead('Notifikasi')}<div class="modal-body">${[['receipt', 'Bukti bayar ORD-2026-0324 diunggah Universitas Brawijaya.', '10 menit lalu'], ['wifi', 'Yusuf Hidayatullah terputus 47 detik dari ujian.', '12 menit lalu'], ['repeat', '2 pengajuan retake menunggu keputusan.', '1 jam lalu'], ['award', '3 sertifikat menunggu persetujuan.', 'Kemarin']].map(([i, t, d]) => `<div class="row" style="flex-wrap:nowrap;align-items:flex-start">${ic(i)}<div class="grow"><div class="small">${t}</div><div class="xs dim">${d}</div></div></div>`).join('<hr class="hr">')}</div>`);

  const pageHead = (title, desc, actions = '') => `<div class="page-head"><div><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div><div class="row">${actions}</div></div>`;
  const toolbar = (search, filters = [], right = '') => `<div class="toolbar"><label class="input-group">${ic('search', 'ic-sm')}<input placeholder="${search}" ${filters.bind ? `data-bind="${filters.bind}"` : ''}></label>${filters.map((f) => `<select class="select" aria-label="${f[0]}">${f.map((o, i) => `<option>${i === 0 ? o + ': Semua' : o}</option>`).join('')}</select>`).join('')}<div class="grow"></div>${right}</div>`;
  const pager = (shown, total) => `<div class="pager"><span>Menampilkan ${shown} dari ${fmt(total)}</span><div class="pages"><button aria-label="Sebelumnya">‹</button><button class="on">1</button><button>2</button><button>3</button><button aria-label="Berikutnya">›</button></div></div>`;
  const exportBtn = `<button class="btn btn-secondary btn-sm" data-action="export">${ic('download', 'ic-sm')} Ekspor</button>`;
  App.actions.export = () => App.modal(`${App.modalHead('Ekspor data', 'Ekspor dibatasi sesuai permission dan tercatat di audit log.')}
    <div class="modal-body"><div class="field"><span class="label">Format</span><div class="seg"><button class="on">XLSX</button><button>CSV</button><button>PDF</button></div></div>
    <label class="check"><input type="checkbox" checked><span class="small">Samarkan email dan nomor telepon</span></label>
    <div class="field"><label class="label" for="ex-r">Tujuan ekspor</label><input id="ex-r" class="input" value="Rekap peserta pelatihan November 2026"></div></div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="exportOk">${ic('download')} Ekspor</button></div>`);
  App.actions.exportOk = () => { App.closeModal(); App.toast('Berkas ekspor sedang disiapkan · tercatat di audit log', 'download'); };

  /* ---------- Login ---------- */
  App.routes['a-login'] = () => `
  <div class="verify" style="justify-content:center">
    <section class="card verify-card card-pad stack-lg" style="max-width:420px">
      <div class="row"><div class="logo">TA</div><div><b style="font:700 16px var(--font-display)">TACMS Admin</b><div class="xs dim">${esc(D.org.name)}</div></div></div>
      ${S.loginStep === 2 ? `
        <div class="stack" style="gap:4px"><h2>Verifikasi dua langkah</h2><p class="small muted">Masukkan 6 digit kode dari aplikasi autentikator Anda.</p></div>
        <div class="otp">${[0, 1, 2, 3, 4, 5].map((i) => `<input inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}" value="${'482915'[i]}">`).join('')}</div>
        <button class="btn btn-primary btn-lg btn-block" data-action="loginOk">Masuk</button>
        <button class="btn btn-ghost btn-sm" data-action="loginBack">${ic('arrowL', 'ic-sm')} Gunakan kode cadangan</button>`
      : `
        <div class="stack" style="gap:4px"><h2>Masuk</h2><p class="small muted">Gunakan akun admin organisasi Anda.</p></div>
        <div class="field"><label class="label" for="lg-e">Email</label><input id="lg-e" class="input" value="${D.admin.email}" autocomplete="username"></div>
        <div class="field"><div class="row-between"><label class="label" for="lg-p">Kata sandi</label><a class="xs" href="#a-login">Lupa kata sandi?</a></div><input id="lg-p" type="password" class="input" value="••••••••••••" autocomplete="current-password"></div>
        <button class="btn btn-primary btn-lg btn-block" data-action="loginNext">Lanjutkan</button>
        <p class="xs dim">Setelah 5 kali gagal, akun dikunci sementara selama 15 menit. Semua upaya masuk tercatat di audit log.</p>`}
    </section>
    ${App.protoFab()}
  </div>`;
  App.actions.loginNext = () => { S.loginStep = 2; App.rerender(); };
  App.actions.loginBack = () => { S.loginStep = 1; App.rerender(); };
  App.actions.loginOk = () => { S.loginStep = 1; App.go('a-dashboard'); App.toast('Masuk sebagai ' + D.admin.name); };

  /* ---------- Dashboard ---------- */
  const trendChart = () => {
    const att = [120, 134, 98, 156, 170, 142, 188, 205, 176, 214, 230, 198];
    const rate = [.78, .81, .76, .80, .83, .79, .84, .82, .80, .85, .86, .84];
    const labels = ['1 Sep', '8', '15', '22', '29', '6 Okt', '13', '20', '27', '3 Nov', '10', '17'];
    const W = 640, H = 220, L = 40, R = 10, T = 12, B = 30, max = 250;
    const bw = (W - L - R) / att.length;
    const y = (v) => T + (H - T - B) * (1 - v / max);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Attempt per minggu, lulus dan tidak lulus">`;
    [0, 50, 100, 150, 200, 250].forEach((v) => { s += `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; });
    att.forEach((a, i) => {
      const p = Math.round(a * rate[i]); const x = L + i * bw + bw * 0.2; const w = bw * 0.6;
      s += `<rect x="${x}" y="${y(a)}" width="${w}" height="${y(p) - y(a)}" fill="var(--danger)" opacity=".55" rx="2"><title>${labels[i]}: ${a - p} tidak lulus</title></rect>`;
      s += `<rect x="${x}" y="${y(p)}" width="${w}" height="${y(0) - y(p)}" fill="var(--teal)" rx="2"><title>${labels[i]}: ${p} lulus dari ${a}</title></rect>`;
      s += `<text x="${x + w / 2}" y="${H - 10}" text-anchor="middle">${labels[i]}</text>`;
    });
    return s + '</svg>';
  };

  App.routes['a-dashboard'] = () => shell('a-dashboard', `
    ${pageHead('Dashboard', 'Ringkasan operasional 21 November 2026, 10:45 WIB.', `<select class="select" style="width:auto;height:38px" aria-label="Periode"><option>12 minggu terakhir</option><option>30 hari</option><option>Tahun ini</option></select>${exportBtn}`)}
    <div class="grid g4">
      <div class="card kpi"><span class="eyebrow">Peserta terdaftar</span><span class="v">1.284</span><span class="d"><span class="up">+86</span> bulan ini</span></div>
      <div class="card kpi"><span class="eyebrow">Program pelatihan</span><span class="v">12</span><span class="d">8 aktif · 2 terjadwal · 2 selesai</span></div>
      <div class="card kpi"><span class="eyebrow">Ujian berlangsung</span><span class="v" style="color:var(--teal)">23</span><span class="d">${pill('Live', 'teal')} 1 peserta terputus</span></div>
      <div class="card kpi"><span class="eyebrow">Sertifikat terbit</span><span class="v">912</span><span class="d"><span class="up">+41</span> minggu ini · 3 menunggu</span></div>
    </div>
    <div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)" id="dash-a">
      <section class="card">
        <div class="card-head"><div><h3>Attempt ujian per minggu</h3><p class="xs dim">Lulus dan tidak lulus · semua pelatihan</p></div><div class="legend"><span><i style="background:var(--teal)"></i>Lulus</span><span><i style="background:var(--danger);opacity:.55"></i>Tidak lulus</span></div></div>
        <div class="card-body">${trendChart()}<div class="row small muted" style="margin-top:8px;gap:20px"><span>Total <b class="num" style="color:var(--fg)">2.031</b> attempt</span><span>Tingkat kelulusan <b class="num" style="color:var(--fg)">81,7%</b></span><span>Rata-rata nilai <b class="num" style="color:var(--fg)">76,4</b></span></div></div>
      </section>
      <section class="card">
        <div class="card-head"><h3>Status voucher</h3><button class="btn btn-ghost btn-sm" data-go="a-vouchers">Detail ${ic('chevR', 'ic-sm')}</button></div>
        <div class="card-body stack">
          <div class="split-bar"><span style="width:34%;background:var(--brand)"></span><span style="width:6%;background:var(--teal)"></span><span style="width:54%;background:var(--success)"></span><span style="width:4%;background:var(--warning)"></span><span style="width:2%;background:var(--danger)"></span></div>
          ${[['Aktif (CREATED)', 642, 'var(--brand)'], ['Terikat (BOUND)', 112, 'var(--teal)'], ['Terpakai (REDEEMED)', 1018, 'var(--success)'], ['Kedaluwarsa', 74, 'var(--warning)'], ['Dicabut / terkunci', 37, 'var(--danger)']].map(([l, v, c]) => `<div class="row-between small"><span class="row" style="gap:8px"><i style="width:9px;height:9px;border-radius:2px;background:${c};display:inline-block"></i>${l}</span><b class="num">${fmt(v)}</b></div>`).join('')}
          <hr class="hr"><div class="row-between small"><span class="muted">Order menunggu verifikasi</span>${pill('2 order', 'warning')}</div>
        </div>
      </section>
    </div>
    <div class="grid g3">
      <section class="card">
        <div class="card-head"><h3>Perlu tindakan</h3></div>
        <div class="card-body" style="padding-top:4px;padding-bottom:4px">
          ${[['edit', 'var(--warning-soft)', 'var(--warning)', '14 jawaban essay belum dinilai', 'Tertua 2 hari', 'a-grading'], ['receipt', 'var(--info-soft)', 'var(--info)', '2 order menunggu verifikasi bayar', 'Rp 30.650.000', 'a-vouchers'], ['repeat', 'var(--teal-soft)', 'var(--teal)', '2 pengajuan retake', 'Data Analyst, Digital Marketing', 'a-retake'], ['award', 'var(--success-soft)', 'var(--success)', '3 sertifikat menunggu persetujuan', 'Data Analyst Associate', 'a-certificates']]
            .map(([i, bg, c, t, d, r]) => `<div class="task"><div class="ti" style="background:${bg};color:${c}">${ic(i)}</div><div class="grow"><div class="small" style="font-weight:600">${t}</div><div class="xs dim">${d}</div></div><button class="icon-btn" data-go="${r}" aria-label="Buka">${ic('chevR')}</button></div>`).join('')}
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h3>Kelulusan per pelatihan</h3></div>
        <div class="card-body stack">
          ${[['Data Analyst Associate', 78, 54], ['Digital Marketing', 84, 31], ['Cyber Security', 91, 118], ['K3 Perkantoran', 96, 84]].map(([n, p, c]) => `<div class="stack" style="gap:4px"><div class="row-between small"><span>${n}</span><span class="num"><b>${p}%</b> <span class="dim">· ${c} peserta</span></span></div><div class="progress"><span style="width:${p}%;background:var(--teal)"></span></div></div>`).join('')}
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h3>Aktivitas terbaru</h3><button class="btn btn-ghost btn-sm" data-go="a-audit">Audit log ${ic('chevR', 'ic-sm')}</button></div>
        <div class="card-body feed" style="padding-top:4px;padding-bottom:4px">
          ${D.audit.slice(0, 5).map((a) => `<div class="feed-item"><div class="avatar avatar-sm">${a.actor === 'Sistem' ? 'SY' : App.initials(a.actor)}</div><div><div class="small"><b>${a.actor}</b> · <code class="xs">${a.act}</code></div><div class="xs dim" style="overflow-wrap:anywhere">${a.ent}</div></div><span class="xs dim num">${a.t.slice(12, 17)}</span></div>`).join('')}
        </div>
      </section>
    </div>
    <style>@media (max-width:1100px){#dash-a{grid-template-columns:minmax(0,1fr) !important}}</style>`);

  /* ---------- Pelatihan ---------- */
  App.routes['a-trainings'] = () => shell('a-trainings', `
    ${pageHead('Pelatihan', 'Program pelatihan beserta jadwal, peserta, ujian, dan tipe sertifikat.', `<button class="btn btn-primary" data-action="newTraining">${ic('plus')} Buat pelatihan</button>`)}
    <section class="card">
      ${toolbar('Cari kode atau nama pelatihan', [['Kategori', 'Data & Analitik', 'Pemasaran', 'Keamanan Informasi', 'Manajemen'], ['Status', 'Aktif', 'Terjadwal', 'Selesai', 'Diarsipkan']], exportBtn)}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Kode</th><th>Nama pelatihan</th><th>Kategori</th><th>Jadwal</th><th class="t-right">Peserta</th><th class="t-right">Ujian</th><th>Sertifikat</th><th>Status</th><th></th></tr></thead>
        <tbody>${D.trainings.map((t) => `<tr>
          <td class="mono small">${t.code}</td><td class="cell-title">${t.name}</td><td>${t.cat}</td><td class="num">${t.date}</td>
          <td class="t-right num">${t.participants}</td><td class="t-right num">${t.exams}</td><td><span class="tag">${t.cert}</span></td><td>${status(t.status)}</td>
          <td class="t-right"><div class="row" style="flex-wrap:nowrap;justify-content:flex-end;gap:2px"><button class="btn btn-ghost btn-sm" data-action="trainingDetail" data-code="${t.code}">Detail</button><button class="icon-btn" aria-label="Edit" data-action="newTraining">${ic('edit', 'ic-sm')}</button>${t.status !== 'Diarsipkan' ? `<button class="icon-btn" aria-label="Arsipkan" data-action="archiveTraining" data-code="${t.code}">${ic('trash', 'ic-sm')}</button>` : ''}</div></td>
        </tr>`).join('')}</tbody>
      </table></div>
      ${pager(6, 12)}
    </section>`);
  App.actions.newTraining = () => App.modal(`${App.modalHead('Buat pelatihan', 'Langkah 1 dari 3 · Informasi dasar')}
    <div class="modal-body">
      <div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="t-code">Kode pelatihan</label><input id="t-code" class="input mono" value="TRN-DA-2701"></div><div class="field"><label class="label" for="t-cat">Kategori</label><select id="t-cat" class="select"><option>Data &amp; Analitik</option><option>Pemasaran</option></select></div></div>
      <div class="field"><label class="label" for="t-name">Nama pelatihan</label><input id="t-name" class="input" value="Data Analyst Associate — Batch Januari"></div>
      <div class="field"><label class="label" for="t-desc">Deskripsi</label><textarea id="t-desc" class="textarea" style="min-height:80px">Pelatihan 5 hari tentang SQL, statistik, dan visualisasi data untuk analis tingkat pemula.</textarea></div>
      <div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="t-s">Mulai</label><input id="t-s" type="date" class="input" value="2027-01-11"></div><div class="field"><label class="label" for="t-e">Selesai</label><input id="t-e" type="date" class="input" value="2027-01-15"></div></div>
      <div class="field"><span class="label">Tipe sertifikat yang tersedia</span><div class="row"><label class="check"><input type="checkbox">Attendance</label><label class="check"><input type="checkbox">Completion</label><label class="check"><input type="checkbox" checked>Competency</label></div></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="trainingSaved">Simpan &amp; lanjut ke sesi</button></div>`, { wide: true });
  App.actions.trainingSaved = () => { App.closeModal(); App.toast('Pelatihan TRN-DA-2701 disimpan sebagai draf'); };
  App.actions.archiveTraining = (el) => App.confirm({ title: 'Arsipkan pelatihan?', body: `Pelatihan <b>${el.dataset.code}</b> tidak lagi tampil di daftar aktif. Riwayat peserta, attempt, dan sertifikat tetap tersimpan.`, confirmText: 'Arsipkan', danger: true, reason: true, onOk: () => App.toast('Pelatihan diarsipkan · tercatat di audit log') });
  App.actions.trainingDetail = (el) => {
    const t = D.trainings.find((x) => x.code === el.dataset.code);
    App.modal(`${App.modalHead(t.name, `<span class="mono">${t.code}</span> · ${t.cat}`)}
      <div class="modal-body">
        <div class="grid g3" style="gap:10px"><div class="panel"><div class="eyebrow">Peserta</div><b class="num" style="font-size:1.25rem">${t.participants}</b></div><div class="panel"><div class="eyebrow">Ujian</div><b class="num" style="font-size:1.25rem">${t.exams}</b></div><div class="panel"><div class="eyebrow">Status</div>${status(t.status)}</div></div>
        <h4>Sesi pelatihan</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>Sesi</th><th>Tanggal</th><th>Instruktur</th><th>Hadir</th></tr></thead><tbody>
          ${[['Pengantar & SQL dasar', 'Hari 1', 'Arief Wicaksono', '60/62'], ['Statistik deskriptif', 'Hari 2', 'Dr. Ratna Dewi', '61/62'], ['Visualisasi data', 'Hari 3', 'Arief Wicaksono', '58/62'], ['Studi kasus & review', 'Hari 4–5', 'Tim instruktur', '59/62']].map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
        <h4>Ujian</h4>
        <div class="row-between small"><span>Ujian Teori · EXM-DA-T v3 · 40 soal · 90 menit</span>${status('Active')}</div>
        <div class="row-between small"><span>Ujian Praktik · EXM-DA-P v1 · 3 tugas · 120 menit</span>${status('Published')}</div>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Tutup</button><button class="btn btn-primary" data-go="a-exam-builder" data-action="closeModal">Kelola ujian</button></div>`, { wide: true });
  };

  /* ---------- Peserta ---------- */
  App.routes['a-participants'] = () => {
    const q = (S.participantsQuery || '').toLowerCase();
    const list = D.participants.filter((p) => !q || [p.no, p.name, p.email, p.phone, p.inst].join(' ').toLowerCase().includes(q));
    const v = (ok, val) => `<div class="row" style="gap:6px;flex-wrap:nowrap">${ok ? `<span title="Terverifikasi" style="color:var(--success)">${ic('checkCircle', 'ic-sm')}</span>` : `<span title="Belum terverifikasi" style="color:var(--fg-3)">${ic('clock', 'ic-sm')}</span>`}<span class="small" style="white-space:nowrap">${val}</span></div>`;
    return shell('a-participants', `
    ${pageHead('Peserta', 'Satu ID peserta mewakili satu individu. Data dengan transaksi ujian tidak dapat dihapus permanen.', `<button class="btn btn-secondary" data-action="importParticipants">${ic('upload')} Impor</button><button class="btn btn-primary" data-action="addParticipant">${ic('plus')} Tambah peserta</button>`)}
    <section class="card">
      <div class="toolbar"><label class="input-group">${ic('search', 'ic-sm')}<input placeholder="Cari nama, email, telepon, atau ID" value="${esc(S.participantsQuery || '')}" data-bind="pq" id="pq"></label>
        <select class="select" aria-label="Institusi"><option>Institusi: Semua</option><option>Universitas Padjadjaran</option><option>PT Sinar Data Mandiri</option></select>
        <select class="select" aria-label="Verifikasi"><option>Verifikasi: Semua</option><option>Lengkap</option><option>Belum lengkap</option></select>
        <div class="grow"></div>${exportBtn}</div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>No. peserta</th><th>Nama</th><th>Email</th><th>Telepon</th><th>Institusi</th><th class="t-right">Pelatihan</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((p) => `<tr><td class="mono small">${p.no}</td><td class="cell-title">${p.name}</td><td>${v(p.ev, p.email)}</td><td>${v(p.pv, p.phone)}</td><td class="small">${p.inst}</td><td class="t-right num">${p.trainings}</td><td>${p.status === 'Aktif' ? status('Aktif') : p.status === 'Nonaktif' ? pill('Nonaktif', 'outline') : pill(p.status, 'warning')}</td><td><button class="btn btn-ghost btn-sm" data-action="participantProfile" data-no="${p.no}">Profil</button></td></tr>`).join('') || `<tr><td colspan="8" style="text-align:center;padding:40px" class="muted">Tidak ada peserta yang cocok dengan “${esc(S.participantsQuery)}”.</td></tr>`}</tbody>
      </table></div>
      ${pager(list.length, 1284)}
    </section>`);
  };
  App.binds.pq = (el) => { S.participantsQuery = el.value; App.rerender(); const n = document.getElementById('pq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  App.actions.addParticipant = () => App.modal(`${App.modalHead('Tambah peserta', 'Sistem memeriksa duplikasi berdasarkan email dan nomor telepon.')}
    <div class="modal-body">
      <div class="field"><label class="label" for="ap-n">Nama lengkap</label><input id="ap-n" class="input" placeholder="Sesuai dokumen resmi"></div>
      <div class="field"><label class="label" for="ap-e">Email</label><input id="ap-e" class="input" value="laras.w@mail.id"><span class="err">Email sudah terdaftar atas nama Larasati Wibowo (PAR-2026-00420). Gunakan data peserta yang ada atau ajukan penggabungan.</span></div>
      <div class="field"><label class="label" for="ap-p">Nomor telepon</label><input id="ap-p" class="input" placeholder="+62"></div>
      <div class="field"><label class="label" for="ap-i">Institusi</label><input id="ap-i" class="input" placeholder="Opsional"></div>
      <div class="field"><label class="label" for="ap-t">Daftarkan ke pelatihan</label><select id="ap-t" class="select"><option>Tidak sekarang</option>${D.trainings.slice(0, 4).map((t) => `<option>${t.name}</option>`).join('')}</select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="closeModal">Simpan peserta</button></div>`, { drawer: true });
  App.actions.importParticipants = () => App.modal(`${App.modalHead('Impor peserta', 'Gunakan template spreadsheet. Baris yang gagal validasi tidak diimpor.')}
    <div class="modal-body">
      <div class="dropzone">${ic('upload', 'ic-lg')}<b>peserta_DA_batch_jan.xlsx</b><span class="small">48 baris · 21 KB</span><button class="btn btn-ghost btn-sm" data-action="dlTemplate">${ic('download', 'ic-sm')} Unduh template</button></div>
      <div class="grid g3" style="gap:10px"><div class="panel"><div class="eyebrow">Valid</div><b class="num" style="font-size:1.25rem;color:var(--success)">44</b></div><div class="panel"><div class="eyebrow">Duplikat</div><b class="num" style="font-size:1.25rem;color:var(--warning)">3</b></div><div class="panel"><div class="eyebrow">Error</div><b class="num" style="font-size:1.25rem;color:var(--danger)">1</b></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Baris</th><th>Masalah</th></tr></thead><tbody>
        <tr><td class="num">7</td><td class="small">Email sudah terdaftar (PAR-2026-00422) · akan ditautkan, bukan dibuat baru</td></tr>
        <tr><td class="num">19</td><td class="small">Nomor telepon tidak valid: <code>0812-3</code></td></tr>
        <tr><td class="num">31, 40</td><td class="small">Duplikat dalam berkas yang sama</td></tr>
      </tbody></table></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="importOk">Impor 44 peserta</button></div>`, { wide: true });
  App.actions.dlTemplate = () => App.toast('Prototipe: template XLSX', 'download');
  App.actions.importOk = () => { App.closeModal(); App.toast('44 peserta diimpor · 1 baris error disimpan sebagai laporan'); };
  App.actions.participantProfile = (el) => {
    const p = D.participants.find((x) => x.no === el.dataset.no);
    App.modal(`${App.modalHead(p.name, `<span class="mono">${p.no}</span> · ${p.inst}`)}
      <div class="modal-body">
        <dl class="dl"><dt>Email</dt><dd>${p.email} ${p.ev ? pill('Terverifikasi', 'success') : pill('Belum', 'warning')}</dd><dt>Telepon</dt><dd>${p.phone} ${p.pv ? pill('Terverifikasi', 'success') : pill('Belum', 'warning')}</dd><dt>Status</dt><dd>${p.status}</dd></dl>
        <hr class="hr"><h4>Riwayat</h4>
        <div class="timeline">
          <div class="tl-item"><span class="tl-dot w"></span><div><div class="small" style="font-weight:600">Data Analyst — Teori · attempt 1</div><div class="xs dim">21 Nov 2026 · Pending Review</div></div></div>
          <div class="tl-item"><span class="tl-dot s"></span><div><div class="small" style="font-weight:600">Voucher TACMS-7K4Q-•••• diikat</div><div class="xs dim">21 Nov 2026 08:51 · OTP email + WhatsApp</div></div></div>
          <div class="tl-item"><span class="tl-dot s"></span><div><div class="small" style="font-weight:600">Cyber Security Awareness · Lulus (86)</div><div class="xs dim">28 Okt 2026 · attempt 2 · sertifikat LSPTN/CS/2026/00488</div></div></div>
          <div class="tl-item"><span class="tl-dot d"></span><div><div class="small" style="font-weight:600">Cyber Security Awareness · Tidak lulus (68)</div><div class="xs dim">21 Okt 2026 · attempt 1</div></div></div>
        </div>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" data-action="export">${ic('download', 'ic-sm')} Ekspor histori</button><button class="btn btn-primary" data-action="closeModal">Tutup</button></div>`, { drawer: true });
  };

  /* ---------- Enrollment & jadwal (Addendum) ---------- */
  App.routes['a-enrollments'] = () => shell('a-enrollments', `
    ${pageHead('Enrollment & jadwal', 'Penugasan peserta ke ujian beserta jadwalnya.', `<button class="btn btn-secondary" data-action="visibility">${ic('eye')} Visibilitas dashboard</button><button class="btn btn-primary" data-action="newEnrollment">${ic('plus')} Tambah enrollment</button>`)}
    <div class="callout callout-info">${ic('lock')}<div class="small"><b>Enrollment tidak membuka akses ujian.</b> Peserta tetap harus memasukkan voucher dari order yang sudah dibayar. Server memeriksa seluruh gate akses saat peserta menekan Mulai.</div></div>
    <section class="card">
      ${toolbar('Cari peserta atau kode enrollment', [['Pelatihan', 'Data Analyst Associate', 'Digital Marketing'], ['Status', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED']], exportBtn)}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Enrollment</th><th>Peserta</th><th>Ujian</th><th>Jadwal (WIB)</th><th>Keterlambatan</th><th>Voucher</th><th>Pembayaran</th><th>Status</th><th></th></tr></thead>
        <tbody>${D.enrollments.map((e) => `<tr>
          <td class="mono small">${e.code}</td><td class="cell-title">${e.p}</td><td><div class="small">${e.training}</div><div class="cell-sub">${e.exam}</div></td>
          <td class="num small">${e.start}<div class="cell-sub">s/d ${e.end.split('· ')[1]}</div></td><td><code class="xs">${e.late}</code></td>
          <td>${e.voucher === '—' ? '<span class="xs dim">Belum ada</span>' : status(e.voucher)}</td><td>${status(e.pay)}</td><td>${status(e.status)}</td>
          <td><button class="btn btn-ghost btn-sm" data-action="reschedule" data-code="${e.code}">Ubah jadwal</button></td></tr>`).join('')}</tbody>
      </table></div>
      ${pager(5, 214)}
    </section>`);
  App.actions.newEnrollment = () => App.modal(`${App.modalHead('Tambah enrollment', 'Satuan atau massal. Perubahan tercatat di audit log.')}
    <div class="modal-body">
      <div class="seg"><button class="on">Satuan</button><button>Massal (impor)</button></div>
      <div class="field"><label class="label" for="en-p">Peserta</label><select id="en-p" class="select">${D.participants.map((p) => `<option>${p.name} · ${p.no}</option>`).join('')}</select></div>
      <div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="en-t">Pelatihan</label><select id="en-t" class="select"><option>Data Analyst Associate</option></select></div><div class="field"><label class="label" for="en-x">Ujian</label><select id="en-x" class="select"><option>Ujian Teori · EXM-DA-T</option><option>Ujian Praktik · EXM-DA-P</option></select></div></div>
      <div class="grid g3" style="gap:12px"><div class="field"><label class="label" for="en-d">Tanggal</label><input id="en-d" type="date" class="input" value="2026-11-28"></div><div class="field"><label class="label" for="en-s">Mulai</label><input id="en-s" type="time" class="input" value="09:00"></div><div class="field"><label class="label" for="en-e">Selesai</label><input id="en-e" type="time" class="input" value="12:00"></div></div>
      <div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="en-z">Zona waktu</label><select id="en-z" class="select"><option>Asia/Jakarta (WIB)</option><option>Asia/Makassar (WITA)</option><option>Asia/Jayapura (WIT)</option></select></div><div class="field"><label class="label" for="en-w">Jendela mulai</label><select id="en-w" class="select"><option>30 menit setelah jadwal</option><option>60 menit</option><option>Sepanjang jadwal</option></select></div></div>
      <div class="field"><label class="label" for="en-l">Kebijakan keterlambatan</label><select id="en-l" class="select"><option>ALLOW_WITH_REMAINING_TIME — boleh masuk dengan sisa waktu</option><option>BLOCK — tidak boleh masuk</option><option>EXTEND_WITH_APPROVAL — perpanjangan dengan persetujuan</option></select></div>
      <div class="field"><label class="label" for="en-o">Durasi khusus (menit)</label><input id="en-o" class="input" placeholder="Kosongkan untuk mengikuti durasi ujian (90 menit)"><span class="hint">Misalnya untuk peserta dengan kebutuhan aksesibilitas.</span></div>
      <div class="callout callout-warning">${ic('alert')}<div class="small">Larasati Wibowo sudah memiliki jadwal Ujian Praktik pada 24 Nov 13:00–16:00. Tidak ada benturan dengan jadwal ini.</div></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="enrollOk">Simpan enrollment</button></div>`, { drawer: true });
  App.actions.enrollOk = () => { App.closeModal(); App.toast('Enrollment ENR-DA-0428 dibuat · peserta tetap perlu voucher'); };
  App.actions.reschedule = (el) => App.confirm({ title: 'Ubah jadwal ' + el.dataset.code, body: 'Peserta akan menerima notifikasi jadwal baru. Perubahan setelah ujian dimulai memerlukan permission khusus.', confirmText: 'Simpan jadwal baru', reason: true, onOk: () => App.toast('Jadwal diperbarui · tercatat di audit log') });
  App.actions.visibility = () => App.modal(`${App.modalHead('Visibilitas ujian di dashboard peserta', 'Hanya mengatur tampilan. Server tetap memeriksa enrollment, pembayaran, voucher, jadwal, dan hak attempt.')}
    <div class="modal-body">
      <div class="field"><label class="label" for="vs-x">Ujian</label><select id="vs-x" class="select"><option>Data Analyst Associate — Teori</option></select></div>
      <div class="stack" style="gap:8px">${[['ALL_AVAILABLE_EXAMS', 'Semua ujian aktif yang relevan'], ['ASSIGNED_EXAMS_ONLY', 'Hanya ujian yang ditugaskan melalui enrollment'], ['SELECTED_TRAININGS', 'Hanya ujian dari pelatihan terpilih'], ['SELECTED_GROUPS', 'Grup atau peserta tertentu'], ['SCHEDULED_WINDOW', 'Tampil menjelang dan selama jadwal'], ['HIDDEN_UNTIL_ELIGIBLE', 'Tampil setelah syarat terpenuhi']].map(([k, l], i) => `<label class="check panel" style="padding:10px 12px"><input type="radio" name="vis" ${i === 1 ? 'checked' : ''}><span><code class="xs">${k}</code><br><span class="small">${l}</span></span></label>`).join('')}</div>
      <div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="vs-f">Tampil dari</label><input id="vs-f" type="datetime-local" class="input" value="2026-11-14T00:00"></div><div class="field"><label class="label" for="vs-u">Sampai</label><input id="vs-u" type="datetime-local" class="input" value="2026-12-31T23:59"></div></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="closeModal">Simpan aturan</button></div>`, { wide: true });

  /* ---------- Voucher ---------- */
  App.routes['a-vouchers'] = () => {
    const tab = S.voucherTab;
    const tabs = `<div class="tabs" role="tablist">${[['batches', 'Batch', 4], ['list', 'Daftar voucher', '1.883'], ['orders', 'Order & pembayaran', 2]].map(([k, l, c]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-action="vTab" data-v="${k}">${l} <span class="count">${c}</span></button>`).join('')}</div>`;
    let body = '';
    if (tab === 'batches') body = `
      ${toolbar('Cari batch atau pelatihan', [['Tipe', 'Individual', 'Institusi']], exportBtn)}
      <div class="table-wrap"><table class="table"><thead><tr><th>Batch</th><th>Pelatihan &amp; cakupan</th><th>Tipe</th><th>Order</th><th>Pemakaian</th><th>Berlaku s/d</th><th>Dibuat</th><th></th></tr></thead>
      <tbody>${D.batches.map((b) => `<tr><td class="mono small">${b.id}</td><td><div class="cell-title">${b.training}</div><div class="cell-sub">${b.exam}</div></td><td><span class="tag">${b.type}</span></td><td class="mono xs">${b.order}</td>
        <td style="min-width:170px"><div class="split-bar" style="height:6px"><span style="width:${(b.used / b.qty) * 100}%;background:var(--success)"></span><span style="width:${(b.bound / b.qty) * 100}%;background:var(--teal)"></span><span style="width:${(b.expired / b.qty) * 100}%;background:var(--warning)"></span></div><div class="xs dim num" style="margin-top:4px">${b.used} terpakai · ${b.bound} terikat · ${b.qty - b.used - b.bound - b.expired} sisa / ${b.qty}</div></td>
        <td class="num small">${b.valid}</td><td class="small">${b.by}</td><td><button class="btn btn-ghost btn-sm" data-action="distribute" data-id="${b.id}">${ic('send', 'ic-sm')} Distribusi</button></td></tr>`).join('')}</tbody></table></div>`;
    else if (tab === 'list') body = `
      ${toolbar('Cari kode (4 karakter terakhir) atau peserta', [['Status', 'CREATED', 'RESERVED', 'BOUND', 'REDEEMED', 'EXPIRED', 'REVOKED', 'LOCKED'], ['Batch', ...D.batches.map((b) => b.id)]], exportBtn)}
      <div class="table-wrap"><table class="table"><thead><tr><th>Kode</th><th>Batch</th><th>Pelatihan</th><th>Status</th><th>Peserta terikat</th><th>Kedaluwarsa</th><th>Dibuat oleh</th><th></th></tr></thead>
      <tbody>${D.vouchers.map((v) => `<tr><td class="mono small" style="white-space:nowrap">${v.code}</td><td class="mono xs">${v.batch}</td><td class="small">${v.training}</td><td>${status(v.status)}</td><td class="small">${v.who}</td><td class="num small">${v.exp}</td><td class="small">${v.by}</td>
        <td><div class="row" style="flex-wrap:nowrap;gap:2px">${v.status === 'LOCKED' ? `<button class="btn btn-ghost btn-sm" data-action="unlockV">Buka kunci</button>` : ''}${['CREATED', 'BOUND', 'RESERVED', 'LOCKED'].includes(v.status) ? `<button class="btn btn-danger-ghost btn-sm" data-action="revokeV" data-code="${v.code}">Cabut</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>
      <div class="pager"><span class="row" style="gap:6px">${ic('lock', 'ic-sm')} Kode penuh hanya tampil pada proses distribusi yang diotorisasi. Sistem menyimpan hash kode.</span><div class="pages"><button class="on">1</button><button>2</button><button>›</button></div></div>`;
    else body = `
      ${toolbar('Cari nomor order, pembeli, atau referensi', [['Status', 'PENDING_PAYMENT', 'PROOF_SUBMITTED', 'PAID', 'CONFIRMED'], ['Tipe', 'Individual', 'Institusi']], `<button class="btn btn-primary btn-sm" data-action="newOrder">${ic('plus', 'ic-sm')} Order institusi</button>`)}
      <div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Pembeli</th><th>Item</th><th class="t-right">Total</th><th>Referensi</th><th>Status</th><th></th></tr></thead>
      <tbody>${D.orders.map((o) => `<tr><td><div class="mono small">${o.no}</div><div class="cell-sub">${o.date}</div></td><td><div class="cell-title">${o.buyer}</div><div class="cell-sub">${o.type}${o.pic !== '—' ? ' · PIC ' + o.pic : ''}</div></td><td class="small">${o.items}</td><td class="t-right num" style="font-weight:600;white-space:nowrap">${o.total}</td><td class="mono xs">${o.ref}</td><td>${status(o.status, o.status === 'PROOF_SUBMITTED' ? 'BUKTI DIUNGGAH' : o.status)}</td>
        <td>${o.status === 'PROOF_SUBMITTED' ? `<button class="btn btn-primary btn-sm" data-action="verifyPay" data-no="${o.no}">Verifikasi</button>` : o.status === 'CONFIRMED' && o.type === 'Institusi' ? `<button class="btn btn-secondary btn-sm" data-action="allocate">Alokasikan</button>` : '<span class="xs dim">—</span>'}</td></tr>`).join('')}</tbody></table></div>
      <div class="pager"><span>Order luar aplikasi hanya dapat ditandai PAID/CONFIRMED oleh role Finance setelah bukti diperiksa.</span></div>`;
    return shell('a-vouchers', `
      ${pageHead('Voucher & order', 'Voucher adalah sarana klaim hak ujian. Batch baru hanya dapat dibuat dari order yang sudah dibayar.', `<button class="btn btn-primary" data-action="newBatch">${ic('plus')} Generate batch</button>`)}
      <div class="grid g4">
        ${[['CREATED', 642, 'Siap didistribusikan'], ['BOUND', 112, 'Terikat, belum dipakai'], ['REDEEMED', 1018, 'Sudah dipakai ujian'], ['EXPIRED / REVOKED', 111, 'Tidak dapat dipakai']].map(([k, v, d]) => `<div class="card kpi"><span class="eyebrow">${k}</span><span class="v">${fmt(v)}</span><span class="d">${d}</span></div>`).join('')}
      </div>
      <section class="card">${tabs}${body}</section>`);
  };
  App.actions.vTab = (el) => { S.voucherTab = el.dataset.v; App.rerender(); };
  App.actions.newBatch = () => App.modal(`${App.modalHead('Generate batch voucher', 'Kode dibuat acak 12 karakter dan disimpan sebagai hash.')}
    <div class="modal-body">
      <div class="field"><label class="label" for="nb-o">Order terbayar</label><select id="nb-o" class="select"><option>ORD-2026-0320 · PT Arunika Teknologi · 40 voucher · CONFIRMED</option><option disabled>ORD-2026-0324 · Universitas Brawijaya · menunggu verifikasi</option></select><span class="hint">Order yang belum PAID/CONFIRMED tidak dapat dipilih.</span></div>
      <div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="nb-t">Pelatihan</label><select id="nb-t" class="select"><option>Project Management Essentials</option></select></div><div class="field"><label class="label" for="nb-x">Cakupan ujian</label><select id="nb-x" class="select"><option>Ujian Teori saja</option><option>Semua ujian pelatihan</option></select></div></div>
      <div class="grid g3" style="gap:12px"><div class="field"><label class="label" for="nb-q">Jumlah</label><input id="nb-q" class="input num" value="40"></div><div class="field"><label class="label" for="nb-u">Batas pakai</label><select id="nb-u" class="select"><option>1× (individual)</option><option>Multi-use</option></select></div><div class="field"><label class="label" for="nb-v">Berlaku s/d</label><input id="nb-v" type="date" class="input" value="2027-02-28"></div></div>
      <div class="field"><label class="label" for="nb-p">Prefix</label><input id="nb-p" class="input mono" value="TACMS"><span class="hint">Contoh hasil: TACMS-••••-••••</span></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="batchOk">Generate 40 voucher</button></div>`, { drawer: true });
  App.actions.batchOk = () => { App.closeModal(); App.toast('Batch VB-2612-017 dibuat · 40 voucher CREATED'); };
  App.actions.distribute = (el) => App.modal(`${App.modalHead('Distribusi voucher ' + el.dataset.id, 'Kode penuh hanya ditampilkan di sini. Aksi ini tercatat di audit log.')}
    <div class="modal-body">
      <div class="callout callout-warning">${ic('lock')}<div class="small">Konfirmasi ulang dengan kode autentikator untuk menampilkan kode penuh.</div></div>
      <div class="field"><span class="label">Metode distribusi</span><div class="stack" style="gap:6px"><label class="check"><input type="radio" name="dm" checked>Kirim email langsung ke peserta yang dialokasikan</label><label class="check"><input type="radio" name="dm">Unduh XLSX terenkripsi kata sandi</label><label class="check"><input type="radio" name="dm">Serahkan ke PIC institusi</label></div></div>
      <div class="field"><label class="label" for="ds-m">Kode MFA</label><input id="ds-m" class="input mono" placeholder="6 digit"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="distOk">Distribusikan</button></div>`);
  App.actions.distOk = () => { App.closeModal(); App.toast('Voucher dikirim ke 14 peserta', 'send'); };
  App.actions.revokeV = (el) => App.confirm({ title: 'Cabut voucher?', body: `Voucher <b class="mono">${el.dataset.code}</b> tidak dapat dipakai lagi. Status menjadi REVOKED dan tidak dapat dikembalikan.`, confirmText: 'Cabut voucher', danger: true, reason: true, onOk: () => App.toast('Voucher dicabut · tercatat di audit log') });
  App.actions.unlockV = () => App.confirm({ title: 'Buka kunci voucher?', body: 'Voucher terkunci setelah 5 kali percobaan klaim gagal. Pastikan pemilik sah telah dihubungi.', confirmText: 'Buka kunci', reason: true, onOk: () => App.toast('Voucher dibuka kembali') });
  App.actions.verifyPay = (el) => {
    const o = D.orders.find((x) => x.no === el.dataset.no);
    App.modal(`${App.modalHead('Verifikasi pembayaran ' + o.no, 'Hanya role Finance. Penguji tidak berwenang mengesahkan pembayaran.')}
      <div class="modal-body">
        <div class="grid g2" style="gap:16px;align-items:start">
          <dl class="dl" style="grid-template-columns:110px minmax(0,1fr)"><dt>Pembeli</dt><dd>${o.buyer}</dd><dt>PIC</dt><dd>${o.pic}</dd><dt>No. PO</dt><dd class="mono">${o.ref}</dd><dt>Item</dt><dd>${o.items}</dd><dt>Tagihan</dt><dd style="font-weight:700">${o.total}</dd></dl>
          <div class="stack" style="gap:8px"><span class="label">Bukti transfer</span><div class="panel" style="aspect-ratio:4/3;display:grid;place-items:center;text-align:center"><div class="stack" style="align-items:center;gap:6px">${ic('receipt', 'ic-lg')}<span class="small">bukti_transfer_UB_1187.pdf</span><span class="xs dim">Bank BNI · 20 Nov 2026 16:12 · Rp 30.000.000</span></div></div></div>
        </div>
        <div class="field"><label class="label" for="vp-r">Referensi transaksi bank</label><input id="vp-r" class="input mono" value="BNI-20261120-0091827"></div>
        <label class="check"><input type="checkbox" checked><span class="small">Nominal, rekening tujuan, dan referensi sudah dicocokkan dengan mutasi rekening.</span></label>
      </div>
      <div class="modal-foot"><button class="btn btn-danger-ghost" data-action="closeModal">Tolak bukti</button><button class="btn btn-primary" data-action="payOk">Tandai CONFIRMED</button></div>`, { wide: true });
  };
  App.actions.payOk = () => { App.closeModal(); App.toast('ORD-2026-0324 CONFIRMED · siap generate batch'); };
  App.actions.allocate = () => App.modal(`${App.modalHead('Alokasi voucher institusi', 'ORD-2026-0320 · PT Arunika Teknologi · 40 kuota')}
    <div class="modal-body"><div class="seg"><button class="on">Ke peserta tertentu</button><button>Buka kuota distribusi PIC</button></div>
    <div class="table-wrap"><table class="table"><thead><tr><th></th><th>Peserta</th><th>Enrollment</th></tr></thead><tbody>${D.participants.slice(3, 7).map((p, i) => `<tr><td><input type="checkbox" ${i < 3 ? 'checked' : ''} aria-label="Pilih ${p.name}"></td><td class="small">${p.name}</td><td class="xs mono">ENR-PM-04${30 + i}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted">3 dipilih · sisa kuota 37</p></div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="closeModal">Alokasikan 3 voucher</button></div>`);
  App.actions.newOrder = () => App.modal(`${App.modalHead('Order institusi baru')}
    <div class="modal-body"><div class="field"><label class="label" for="no-b">Institusi</label><input id="no-b" class="input" value="Politeknik Negeri Semarang"></div><div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="no-p">PIC</label><input id="no-p" class="input"></div><div class="field"><label class="label" for="no-r">No. PO / referensi</label><input id="no-r" class="input mono"></div></div>
    <div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="no-t">Program</label><select id="no-t" class="select"><option>Data Analyst Associate — Teori</option></select></div><div class="field"><label class="label" for="no-q">Jumlah</label><input id="no-q" class="input num" value="25"></div></div></div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="closeModal">Buat order (PENDING_PAYMENT)</button></div>`, { drawer: true });

  /* ---------- Bank soal & question builder ---------- */
  const QTYPES = [['single', 'Single choice'], ['multi', 'Multiple response'], ['tf', 'True/False'], ['blank', 'Fill in the blank'], ['short', 'Short answer'], ['essay', 'Essay'], ['match', 'Matching'], ['order', 'Ordering'], ['numeric', 'Numerical'], ['image', 'Image-based'], ['video', 'Video-based'], ['file', 'File upload'], ['oral', 'Oral assessment'], ['hotspot', 'Hotspot']];
  App.routes['a-questions'] = () => {
    const t = S.qType;
    const optEditor = () => {
      if (['single', 'multi', 'image', 'video'].includes(t)) {
        const opts = ['Rata-rata (mean)', 'Median', 'Rentang (range)', 'Simpangan baku'];
        return `<div class="stack" style="gap:8px"><div class="row-between"><span class="label">Opsi jawaban &amp; kunci</span><label class="check small"><input type="checkbox" checked>Acak urutan opsi</label></div>
          ${opts.map((o, i) => `<div class="opt-row"><button class="opt-key ${i === 1 ? 'correct' : ''}" aria-label="Tandai sebagai kunci">${i === 1 ? '✓' : 'ABCD'[i]}</button><input class="input" value="${o}" aria-label="Opsi ${'ABCD'[i]}"><button class="icon-btn" aria-label="Hapus opsi">${ic('trash', 'ic-sm')}</button></div>`).join('')}
          <button class="btn btn-ghost btn-sm" style="align-self:flex-start">${ic('plus', 'ic-sm')} Tambah opsi</button>
          ${t === 'multi' ? `<div class="field"><label class="label" for="qb-ps">Kebijakan skor parsial</label><select id="qb-ps" class="select"><option>Proporsional, salah pilih mengurangi</option><option>Semua benar atau 0</option></select></div>` : ''}</div>`;
      }
      if (t === 'tf') return `<div class="field"><span class="label">Kunci jawaban</span><div class="seg"><button>Benar</button><button class="on">Salah</button></div></div>`;
      if (t === 'numeric') return `<div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="qb-n">Jawaban benar</label><input id="qb-n" class="input num" value="10.5"></div><div class="field"><label class="label" for="qb-tol">Toleransi ±</label><input id="qb-tol" class="input num" value="0"></div></div>`;
      if (t === 'blank' || t === 'short') return `<div class="field"><label class="label" for="qb-k">Kunci jawaban yang diterima</label><input id="qb-k" class="input" value="COUNT; count"><span class="hint">Pisahkan dengan titik koma. Normalisasi: huruf besar/kecil &amp; spasi diabaikan.</span></div>`;
      if (t === 'essay' || t === 'oral' || t === 'file') return `<div class="field"><span class="label">Rubrik penilaian</span>${D.rubric.map((r) => `<div class="row-between panel" style="padding:8px 12px"><span class="small">${r.name}</span><span class="tag">maks ${r.max}</span></div>`).join('')}<button class="btn btn-ghost btn-sm" style="align-self:flex-start">${ic('plus', 'ic-sm')} Kriteria</button></div>`;
      if (t === 'match') return `<div class="stack" style="gap:8px"><span class="label">Pasangan</span>${[['Histogram', 'Distribusi satu variabel'], ['Scatter plot', 'Hubungan dua variabel numerik'], ['Line chart', 'Tren dari waktu ke waktu']].map(([a, b]) => `<div class="match-row"><input class="input" value="${a}"><input class="input" value="${b}"></div>`).join('')}</div>`;
      if (t === 'order') return `<div class="stack" style="gap:6px"><span class="label">Urutan benar</span>${['Business Understanding', 'Data Understanding', 'Data Preparation', 'Modeling', 'Evaluation', 'Deployment'].map((x, i) => `<div class="order-item"><span class="pos">${i + 1}</span><span class="grow small">${x}</span>${ic('grip', 'ic-sm')}</div>`).join('')}</div>`;
      if (t === 'hotspot') return `<div class="field"><span class="label">Area benar pada gambar</span><div class="panel" style="aspect-ratio:16/9;position:relative">${ic('image', 'ic-lg')}<span style="position:absolute;left:58%;top:30%;width:22%;height:30%;border:2px dashed var(--success);border-radius:6px;background:var(--success-soft);opacity:.8"></span></div></div>`;
      return '';
    };
    return shell('a-questions', `
    ${pageHead('Bank soal', 'Setiap perubahan soal membuat versi baru. Ujian yang sudah berjalan memakai snapshot versinya sendiri.', `<button class="btn btn-secondary" data-action="importQ">${ic('upload')} Impor</button>`)}
    <div class="split">
      <section class="card">
        <div class="card-head"><select class="select" style="height:36px" aria-label="Bank soal"><option>Data Analyst — Teori (186)</option><option>SQL Dasar (54)</option><option>Digital Marketing (140)</option></select></div>
        <div class="toolbar" style="padding:10px 16px"><label class="input-group" style="max-width:none">${ic('search', 'ic-sm')}<input placeholder="Cari soal"></label></div>
        ${D.questions.map((q, i) => `<button class="list-item ${i === 0 ? 'on' : ''}"><div class="row-between" style="flex-wrap:nowrap"><span class="mono xs dim">${q.id} · ${q.ver}</span>${status(q.status)}</div><div class="small" style="margin:4px 0;font-weight:500">${q.text}</div><div class="row" style="gap:6px"><span class="tag">${q.type}</span><span class="tag">${q.comp}</span><span class="tag">${q.diff}</span><span class="tag">${q.pts} poin</span></div></button>`).join('')}
        <div class="pager"><span>6 dari 186</span><div class="pages"><button class="on">1</button><button>2</button><button>›</button></div></div>
      </section>
      <section class="card">
        <div class="card-head"><div><h3>Question builder</h3><p class="xs dim mono">Q-DA-0187 · mengedit membuat v3</p></div><div class="row"><button class="btn btn-secondary btn-sm" data-action="previewQ">${ic('eye', 'ic-sm')} Preview</button><button class="btn btn-primary btn-sm" data-action="saveQ">Simpan versi baru</button></div></div>
        <div class="card-body stack-lg">
          <div class="field"><span class="label">Tipe soal</span><div class="type-grid">${QTYPES.map(([k, l]) => `<button class="type-chip ${t === k ? 'on' : ''}" data-action="qType" data-v="${k}">${l}</button>`).join('')}</div></div>
          <div class="field"><label class="label" for="qb-t">Pertanyaan</label><div class="rte-bar" aria-hidden="true"><button>B</button><button><i>I</i></button><button><u>U</u></button><button>•</button><button>1.</button><button>∑</button><button>&lt;/&gt;</button></div><textarea id="qb-t" class="textarea" style="min-height:90px">Ukuran pemusatan data yang paling tahan (robust) terhadap outlier adalah…</textarea></div>
          <div class="row"><button class="btn btn-secondary btn-sm">${ic('image', 'ic-sm')} Gambar</button><button class="btn btn-secondary btn-sm">${ic('play', 'ic-sm')} Video</button><button class="btn btn-secondary btn-sm">${ic('file', 'ic-sm')} Lampiran</button></div>
          ${optEditor()}
          <div class="grid g3" style="gap:12px">
            <div class="field"><label class="label" for="qb-c">Kompetensi</label><select id="qb-c" class="select"><option>Statistik Deskriptif</option><option>SQL</option><option>Visualisasi</option></select></div>
            <div class="field"><label class="label" for="qb-d">Tingkat kesulitan</label><select id="qb-d" class="select"><option>Mudah</option><option>Sedang</option><option>Sulit</option></select></div>
            <div class="field"><label class="label" for="qb-p">Poin</label><input id="qb-p" class="input num" value="2"></div>
          </div>
          <div class="field"><label class="label" for="qb-e">Pembahasan</label><textarea id="qb-e" class="textarea" style="min-height:70px">Median adalah nilai tengah sehingga tidak terpengaruh nilai ekstrem, berbeda dengan mean.</textarea><span class="hint">Tampil ke peserta hanya jika kebijakan ujian mengizinkan. Kunci jawaban tidak pernah dikirim ke browser peserta.</span></div>
        </div>
      </section>
    </div>`);
  };
  App.actions.qType = (el) => { S.qType = el.dataset.v; App.rerender(); };
  App.actions.saveQ = () => App.toast('Q-DA-0187 v3 disimpan · v2 tetap dipakai ujian berjalan');
  App.actions.importQ = () => App.toast('Prototipe: impor bank soal dengan validasi', 'upload');
  App.actions.previewQ = () => App.modal(`${App.modalHead('Preview tampilan peserta')}<div class="modal-body"><div class="row"><span class="eyebrow">Soal 1</span><span class="tag">Single Choice</span><span class="tag">2 poin</span></div><p class="q-text">Ukuran pemusatan data yang paling tahan (robust) terhadap outlier adalah…</p>${['Rata-rata (mean)', 'Median', 'Rentang (range)', 'Simpangan baku'].map((o, i) => `<div class="choice"><span class="k">${'ABCD'[i]}</span><span>${o}</span></div>`).join('')}</div>`, { wide: true });

  /* ---------- Exam builder (8 langkah) ---------- */
  const STEPS = [['Informasi dasar', 'Nama, pelatihan, tipe'], ['Waktu & akses', 'Durasi, jadwal, navigasi'], ['Blueprint', 'Komposisi per kompetensi'], ['Bank soal', 'Sumber & pengacakan'], ['Kebijakan retake', 'Attempt, masa tunggu'], ['Hasil & pembahasan', 'Kapan hasil tampil'], ['Preview', 'Coba sebagai peserta'], ['Review & publish', 'Validasi akhir']];
  const sw = (on, label, hint) => `<label class="row-between panel" style="flex-wrap:nowrap;cursor:pointer"><span><span class="small" style="font-weight:600">${label}</span>${hint ? `<br><span class="xs dim">${hint}</span>` : ''}</span><span class="switch"><input type="checkbox" ${on ? 'checked' : ''}><span></span></span></label>`;
  const stepBody = (n) => {
    switch (n) {
      case 0: return `<div class="grid g2"><div class="field span2"><label class="label" for="eb-n">Nama ujian</label><input id="eb-n" class="input" value="Ujian Kompetensi Data Analyst Associate — Teori"></div>
        <div class="field"><label class="label" for="eb-c">Kode</label><input id="eb-c" class="input mono" value="EXM-DA-T"></div><div class="field"><label class="label" for="eb-t">Pelatihan</label><select id="eb-t" class="select"><option>Data Analyst Associate</option></select></div>
        <div class="field"><label class="label" for="eb-y">Jenis</label><select id="eb-y" class="select"><option>Teori</option><option>Praktik</option><option>Pre-test</option><option>Post-test</option></select></div><div class="field"><label class="label" for="eb-l">Bahasa</label><select id="eb-l" class="select"><option>Bahasa Indonesia</option><option>English</option></select></div>
        <div class="field span2"><label class="label" for="eb-i">Instruksi untuk peserta</label><textarea id="eb-i" class="textarea">Kerjakan 40 soal dalam 90 menit. Jawaban tersimpan otomatis. Soal essay dinilai oleh penguji.</textarea></div></div>`;
      case 1: return `<div class="grid g2"><div class="field"><label class="label" for="eb-d">Durasi (menit)</label><input id="eb-d" class="input num" value="90"></div><div class="field"><label class="label" for="eb-ps">Nilai lulus</label><input id="eb-ps" class="input num" value="70"></div>
        <div class="field"><label class="label" for="eb-o">Tersedia dari</label><input id="eb-o" type="datetime-local" class="input" value="2026-11-14T00:00"></div><div class="field"><label class="label" for="eb-u">Sampai</label><input id="eb-u" type="datetime-local" class="input" value="2026-12-31T23:59"></div>
        <div class="field"><label class="label" for="eb-nv">Navigasi soal</label><select id="eb-nv" class="select"><option>Bebas (boleh kembali)</option><option>Linear (tidak bisa kembali)</option></select></div><div class="field"><label class="label" for="eb-pp">Soal per halaman</label><select id="eb-pp" class="select"><option>1</option><option>5</option><option>Semua</option></select></div>
        <div class="field"><label class="label" for="eb-rd">Pembulatan nilai</label><select id="eb-rd" class="select"><option>2 desimal, half-up</option><option>Bilangan bulat</option></select></div><div class="field"><label class="label" for="eb-rs">Lanjutkan setelah terputus</label><select id="eb-rs" class="select"><option>Ya, waktu tetap berjalan</option><option>Ya, maks. 2 kali</option><option>Tidak</option></select></div>
        <div class="span2 stack" style="gap:8px">${sw(true, 'Catat perpindahan tab', 'Sinyal integritas untuk ditinjau, bukan bukti kecurangan')}${sw(true, 'Konfirmasi sebelum submit')}</div></div>`;
      case 2: return `<div class="stack"><p class="small muted">Tentukan jumlah soal per kompetensi dan tingkat kesulitan. Sistem mengambil soal acak dari bank sesuai aturan ini.</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Kompetensi</th><th class="t-right">Mudah</th><th class="t-right">Sedang</th><th class="t-right">Sulit</th><th class="t-right">Total</th><th class="t-right">Bobot</th><th class="t-right">Tersedia</th></tr></thead><tbody>
        ${[['Statistik Deskriptif', 4, 3, 1, '20%', 42], ['Statistik Inferensial', 2, 3, 1, '15%', 28], ['SQL', 3, 4, 2, '22,5%', 54], ['Visualisasi', 3, 3, 1, '17,5%', 31], ['Metodologi', 2, 2, 1, '12,5%', 19], ['Problem Solving', 0, 0, 2, '12,5%', 12]].map(([c, a, b, d, w, av]) => `<tr><td class="cell-title">${c}</td>${[a, b, d].map((x) => `<td class="t-right"><input class="input num" style="width:60px;height:32px;text-align:right" value="${x}" aria-label="${c}"></td>`).join('')}<td class="t-right num" style="font-weight:700">${a + b + d}</td><td class="t-right num">${w}</td><td class="t-right num dim">${av}</td></tr>`).join('')}
        <tr><td class="cell-title">Total</td><td class="t-right num">14</td><td class="t-right num">15</td><td class="t-right num">8</td><td class="t-right num" style="font-weight:700">37</td><td class="t-right num">100%</td><td></td></tr></tbody></table></div>
        <div class="callout callout-warning">${ic('alert')}<div class="small">Total 37 soal, target 40. Tambahkan 3 soal atau ubah target jumlah soal di langkah 1.</div></div></div>`;
      case 3: return `<div class="stack">${['Data Analyst — Teori · 186 soal aktif', 'SQL Dasar · 54 soal aktif', 'Statistik Umum · 72 soal aktif'].map((b, i) => `<label class="check panel" style="padding:12px"><input type="checkbox" ${i < 2 ? 'checked' : ''}><span class="small">${b}</span></label>`).join('')}
        ${sw(true, 'Acak urutan soal', 'Urutan dibuat per attempt dan disimpan sebagai snapshot')}${sw(true, 'Acak urutan opsi jawaban')}${sw(false, 'Hanya pakai soal berstatus Active', 'Soal Draft dan Review otomatis dikecualikan')}</div>`;
      case 4: return `<div class="grid g2">${'<div class="span2">' + sw(true, 'Izinkan ujian ulang (retake)') + '</div>'}
        <div class="field"><label class="label" for="rt-m">Maksimal attempt</label><select id="rt-m" class="select"><option>3</option><option>2</option><option>5</option><option>Tanpa batas</option></select></div>
        <div class="field"><label class="label" for="rt-w">Masa tunggu antar-attempt</label><select id="rt-w" class="select"><option>24 jam</option><option>Tanpa jeda</option><option>3 hari</option><option>7 hari</option></select></div>
        <div class="field"><label class="label" for="rt-e">Siapa yang boleh retake</label><select id="rt-e" class="select"><option>Hanya peserta tidak lulus</option><option>Semua peserta</option></select></div>
        <div class="field"><label class="label" for="rt-s">Kebijakan nilai akhir</label><select id="rt-s" class="select"><option>PASS_ONCE — lulus jika satu attempt lulus</option><option>HIGHEST_SCORE</option><option>LATEST_SCORE</option><option>FIRST_ATTEMPT</option><option>AVERAGE_SCORE</option></select></div>
        <div class="span2 stack" style="gap:8px">${sw(true, 'Perlu persetujuan admin')}${sw(false, 'Perlu voucher tambahan')}${sw(true, 'Acak ulang soal pada attempt berikutnya')}</div>
        <div class="callout callout-info span2">${ic('info')}<div class="small">Perubahan kebijakan tidak mengubah hasil attempt yang sudah tercatat.</div></div></div>`;
      case 5: return `<div class="stack"><div class="field"><label class="label" for="rs-w">Tampilkan nilai ke peserta</label><select id="rs-w" class="select"><option>Segera setelah seluruh penilaian selesai</option><option>Setelah tanggal tertentu</option><option>Tidak ditampilkan</option></select></div>
        ${sw(true, 'Tampilkan status lulus/tidak lulus')}${sw(true, 'Tampilkan capaian per kompetensi')}${sw(false, 'Tampilkan jawaban benar & pembahasan', 'Rekomendasi: nonaktif untuk ujian kompetensi yang dipakai ulang')}${sw(false, 'Tampilkan nilai di sertifikat')}</div>`;
      case 6: return `<div class="stack"><p class="small muted">Coba ujian dengan akun uji. Attempt preview tidak tercatat di laporan.</p><div class="panel row-between"><div><div class="cell-title">Preview sebagai peserta</div><div class="xs dim">40 soal dari blueprint · waktu disimulasikan</div></div><button class="btn btn-primary btn-sm" data-go="p-instructions">${ic('play', 'ic-sm')} Buka preview</button></div></div>`;
      default: return `<div class="stack">${[['ok', 'Informasi dasar lengkap'], ['ok', 'Durasi 90 menit · nilai lulus 70'], ['warn', 'Blueprint 37 dari 40 soal'], ['ok', 'Kebijakan retake: 3 attempt, 24 jam, persetujuan admin, PASS_ONCE'], ['ok', 'Hasil tampil setelah penilaian selesai'], ['ok', '2 penguji ditugaskan untuk soal essay']].map(([s, t]) => `<div class="gate-row">${ic(s === 'ok' ? 'checkCircle' : 'alert', s === 'ok' ? 'ok' : 'wait')}<div>${t}</div></div>`).join('')}
        <div class="callout callout-info">${ic('info')}<div class="small">Publikasi membuat <b>versi 4</b> yang tidak dapat diubah. Attempt yang sedang berjalan tetap memakai versi 3.</div></div>
        <div class="row"><button class="btn btn-secondary" data-action="sendReview">Kirim untuk review</button><button class="btn btn-primary" data-action="publishExam">${ic('send')} Publikasikan</button></div></div>`;
    }
  };
  App.routes['a-exam-builder'] = () => {
    const n = S.examStep;
    return shell('a-exam-builder', `
    ${pageHead('Exam builder', '<span class="mono">EXM-DA-T</span> · versi 4 (draf) · terakhir disimpan 10:41', `${status('Draft')}<button class="btn btn-secondary" data-action="saveDraft">Simpan draf</button>`)}
    <div class="builder">
      <nav class="card stepper" style="padding:8px">${STEPS.map(([l, d], i) => `<button class="step ${i === n ? 'on' : ''} ${i < n ? 'done' : ''}" data-action="ebStep" data-v="${i}"><span class="n">${i < n ? '✓' : i + 1}</span><span><b>${l}</b><small>${d}</small></span></button>`).join('')}</nav>
      <section class="card">
        <div class="card-head"><div><span class="eyebrow">Langkah ${n + 1} dari 8</span><h3>${STEPS[n][0]}</h3></div></div>
        <div class="card-body">${stepBody(n)}</div>
        <div class="pager" style="justify-content:space-between"><button class="btn btn-secondary" data-action="ebPrev" ${n === 0 ? 'disabled' : ''}>${ic('chevL')} Sebelumnya</button>${n < 7 ? `<button class="btn btn-primary" data-action="ebNext">Lanjut ${ic('chevR')}</button>` : ''}</div>
      </section>
    </div>`);
  };
  App.actions.ebStep = (el) => { S.examStep = +el.dataset.v; App.rerender(); };
  App.actions.ebPrev = () => { S.examStep = Math.max(0, S.examStep - 1); App.rerender(); };
  App.actions.ebNext = () => { S.examStep = Math.min(7, S.examStep + 1); App.rerender(); };
  App.actions.saveDraft = () => App.toast('Draf disimpan');
  App.actions.sendReview = () => App.toast('Dikirim ke Exam Admin untuk review', 'send');
  App.actions.publishExam = () => App.confirm({ title: 'Publikasikan EXM-DA-T versi 4?', body: 'Masih ada 1 peringatan: blueprint 37 dari 40 soal. Versi yang dipublikasikan tidak dapat diubah.', confirmText: 'Publikasikan', onOk: () => App.toast('EXM-DA-T v4 dipublikasikan') });

  /* ---------- Monitoring ---------- */
  App.routes['a-monitoring'] = () => shell('a-monitoring', `
    ${pageHead('Monitoring ujian', 'Diperbarui setiap 15 detik · 10:45:12 WIB', `<select class="select" style="width:auto;height:38px" aria-label="Ujian"><option>Semua ujian aktif</option><option>Data Analyst — Teori</option></select>`)}
    <div class="grid g4">
      <div class="card kpi"><span class="eyebrow">Sedang mengerjakan</span><span class="v" style="color:var(--teal)">23</span><span class="d">dari 31 terjadwal hari ini</span></div>
      <div class="card kpi"><span class="eyebrow">Terputus</span><span class="v" style="color:var(--danger)">1</span><span class="d">Sesi masih dapat dilanjutkan</span></div>
      <div class="card kpi"><span class="eyebrow">Selesai hari ini</span><span class="v">41</span><span class="d">6 auto-submit karena waktu habis</span></div>
      <div class="card kpi"><span class="eyebrow">Sinyal integritas</span><span class="v" style="color:var(--warning)">3</span><span class="d">Perlu ditinjau, bukan bukti</span></div>
    </div>
    <section class="card">
      ${toolbar('Cari peserta', [['Koneksi', 'Online', 'Terputus']])}
      <div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>Ujian</th><th>Mulai</th><th>Progres</th><th>Sisa waktu</th><th>Koneksi</th><th>Pindah tab</th><th></th></tr></thead>
      <tbody>${D.monitoring.map((m) => `<tr><td class="cell-title">${m.p}</td><td class="small">${m.exam}</td><td class="num">${m.start}</td><td style="min-width:140px"><div class="row" style="flex-wrap:nowrap"><div class="progress grow"><span style="width:${(m.prog / m.total) * 100}%;background:var(--teal)"></span></div><span class="xs num">${m.prog}/${m.total}</span></div></td><td class="mono small">${m.left}</td>
        <td>${m.conn === 'Online' ? pill('Online', 'success') : pill(m.conn, 'danger')}</td><td class="num">${m.tab ? `<span style="color:${m.tab > 3 ? 'var(--warning)' : 'inherit'};font-weight:600">${m.tab}×</span>` : '<span class="dim">0</span>'}</td>
        <td><div class="row" style="flex-wrap:nowrap;gap:2px"><button class="btn btn-ghost btn-sm" data-action="attemptLog" data-p="${m.p}">Log</button><button class="btn btn-ghost btn-sm" data-action="extendTime">+ Waktu</button></div></td></tr>`).join('')}</tbody></table></div>
    </section>`);
  App.actions.extendTime = () => App.confirm({ title: 'Perpanjang waktu ujian?', body: 'Tambahan 10 menit untuk attempt ini. Gunakan hanya untuk gangguan teknis yang terverifikasi.', confirmText: 'Tambah 10 menit', reason: true, onOk: () => App.toast('Waktu ditambah 10 menit · tercatat di audit log') });
  App.actions.attemptLog = (el) => App.modal(`${App.modalHead('Log attempt · ' + el.dataset.p, 'ATT-58219 · Data Analyst — Teori')}
    <div class="modal-body"><div class="timeline">${[['09:20:04', 'Attempt dimulai · snapshot soal v3 dibuat', 's'], ['09:31:47', 'Pindah tab (8 detik)', 'w'], ['09:44:10', 'Pindah tab (21 detik)', 'w'], ['09:52:33', 'Koneksi terputus 12 detik · 2 jawaban disinkronkan ulang', 'w'], ['10:05:18', 'Pindah tab (4 detik) ×3', 'w'], ['10:44:51', 'Autosave terakhir · soal 12', 's']].map(([t, d, c]) => `<div class="tl-item"><span class="tl-dot ${c}"></span><div><div class="small mono">${t}</div><div class="small">${d}</div></div></div>`).join('')}</div>
    <p class="xs dim">Sinyal ini membantu penguji meninjau konteks. Sistem tidak menyimpulkan kecurangan secara otomatis.</p></div>`, { drawer: true });

  /* ---------- Penilaian ---------- */
  App.routes['a-grading'] = () => {
    const g = D.grading[S.gradingIdx];
    const isEssay = S.gradingIdx === 0;
    const total = D.rubric.reduce((a, r) => a + (S.rubric[r.id] ?? 0), 0);
    const filled = D.rubric.every((r) => S.rubric[r.id] != null);
    return shell('a-grading', `
    ${pageHead('Penilaian', 'Jawaban yang memerlukan penilaian penguji. Identitas peserta disamarkan selama penilaian.', `<select class="select" style="width:auto;height:38px" aria-label="Ujian"><option>Semua ujian · 14 menunggu</option></select>`)}
    <div class="split">
      <section class="card">
        <div class="card-head"><h3>Antrean</h3>${pill('14 menunggu', 'warning')}</div>
        ${D.grading.map((x, i) => `<button class="list-item ${i === S.gradingIdx ? 'on' : ''}" data-action="gradePick" data-i="${i}"><div class="row-between" style="flex-wrap:nowrap"><b class="small">${x.p}</b><span class="xs dim num">${x.submitted}</span></div><div class="small muted">${x.exam}</div><div class="row" style="gap:6px;margin-top:4px"><span class="tag">${x.q}</span><span class="tag">maks ${x.max}</span></div></button>`).join('')}
      </section>
      <section class="card">
        <div class="card-head"><div><span class="eyebrow">${g.id} · ${g.p}</span><h3>${g.q}</h3></div>${status('Pending Review')}</div>
        <div class="card-body stack-lg">
          <div class="stack" style="gap:6px"><span class="label">Pertanyaan</span><p class="small" style="max-width:75ch">${g.question}</p></div>
          <div class="stack" style="gap:6px"><span class="label">Jawaban peserta</span><div class="answer-box">${esc(g.answer).replace(/\n/g, '<br>')}</div><span class="xs dim">${g.answer.split(/\s+/).length} kata · dikirim ${g.submitted}</span></div>
          ${isEssay ? `
          <div class="stack" style="gap:0"><div class="row-between"><span class="label">Rubrik penilaian</span><span class="small">Total <b class="num" style="font-size:1.125rem">${total}</b> / ${g.max}</span></div>
            ${D.rubric.map((r) => `<div class="rubric"><div><div class="small" style="font-weight:600">${r.name}</div><div class="xs dim">${r.desc}</div></div><div class="score-btns" role="group" aria-label="${r.name}">${Array.from({ length: r.max + 1 }, (_, v) => `<button class="${S.rubric[r.id] === v ? 'on' : ''}" data-action="rubric" data-r="${r.id}" data-v="${v}">${v}</button>`).join('')}</div></div>`).join('')}
          </div>
          <div class="panel stack" style="gap:6px"><div class="row-between"><span class="small" style="font-weight:600">${ic('info', 'ic-sm')} Saran AI (opsional)</span>${pill('Rekomendasi, bukan keputusan', 'outline')}</div><p class="small muted">Jawaban mencakup validasi instrumentasi, funnel per langkah, segmentasi perangkat, dan usulan A/B test. Saran skor: 3 · 3 · 2 · 3.</p></div>
          <div class="field"><label class="label" for="gr-f">Umpan balik untuk peserta</label><textarea id="gr-f" class="textarea" style="min-height:80px">Analisis runtut dan lengkap. Segmentasi bisa diperkuat dengan kanal akuisisi dan metode pembayaran secara lebih rinci.</textarea></div>
          <div class="row-between"><span class="xs dim">Penilai: Dewanti Lestari · nilai dan perubahannya tercatat di audit log</span><div class="row"><button class="btn btn-secondary" data-action="gradeDraft">Simpan draf</button><button class="btn btn-primary" data-action="gradeFinal" ${filled ? '' : 'disabled'}>Finalisasi nilai</button></div></div>`
          : `<div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="gr-s">Skor</label><input id="gr-s" class="input num" placeholder="0–${g.max}"></div><div class="field"><label class="label" for="gr-f2">Umpan balik</label><input id="gr-f2" class="input"></div></div><div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-action="gradeFinal">Finalisasi nilai</button></div>`}
        </div>
      </section>
    </div>`);
  };
  App.actions.gradePick = (el) => { S.gradingIdx = +el.dataset.i; S.rubric = {}; App.rerender(); };
  App.actions.rubric = (el) => { S.rubric[el.dataset.r] = +el.dataset.v; App.rerender(); };
  App.actions.gradeDraft = () => App.toast('Draf penilaian disimpan');
  App.actions.gradeFinal = () => App.confirm({ title: 'Finalisasi nilai?', body: 'Nilai akhir attempt akan dihitung ulang dan peserta menerima notifikasi hasil. Perubahan setelah finalisasi memerlukan alasan.', confirmText: 'Finalisasi', onOk: () => { S.rubric = {}; S.gradingIdx = (S.gradingIdx + 1) % D.grading.length; App.rerender(); App.toast('Nilai difinalisasi · ATT-58213 → 84 (Lulus)'); } });

  /* ---------- Retake ---------- */
  App.routes['a-retake'] = () => shell('a-retake', `
    ${pageHead('Manajemen retake', 'Pengajuan ujian ulang dan hak attempt tambahan. Semua attempt sebelumnya tetap tersimpan.')}
    <div class="grid g3">
      ${[['Data Analyst — Teori', '3 attempt · 24 jam · persetujuan admin · PASS_ONCE'], ['Digital Marketing — Teori', '2 attempt · 48 jam · admin + voucher tambahan · HIGHEST_SCORE'], ['Cyber Security — Teori', '3 attempt · tanpa jeda · otomatis · LATEST_SCORE']].map(([n, d]) => `<div class="card card-pad stack" style="gap:6px"><span class="eyebrow">Kebijakan</span><div class="cell-title">${n}</div><div class="small muted">${d}</div><button class="btn btn-ghost btn-sm" style="align-self:flex-start" data-go="a-exam-builder">Ubah ${ic('chevR', 'ic-sm')}</button></div>`).join('')}
    </div>
    <section class="card">
      <div class="card-head"><h3>Pengajuan</h3></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>Ujian</th><th>Attempt terakhir</th><th>Nilai</th><th>Masa tunggu</th><th>Syarat</th><th>Status</th><th></th></tr></thead>
      <tbody>${D.retakes.map((r, i) => `<tr><td class="cell-title">${r.p}</td><td class="small">${r.exam}</td><td class="num">ke-${r.attempt}</td><td class="num"><b style="color:var(--danger)">${r.last}</b> <span class="dim">/ ${r.pass}</span></td><td class="small">${r.wait}</td><td class="small">${r.policy}</td><td>${status(r.status)}</td>
        <td>${r.status === 'PENDING' ? `<div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn btn-danger-ghost btn-sm" data-action="retakeNo">Tolak</button><button class="btn btn-primary btn-sm" data-action="retakeYes" data-i="${i}">Setujui</button></div>` : '<span class="xs dim">' + r.date + '</span>'}</td></tr>`).join('')}</tbody></table></div>
    </section>`);
  App.actions.retakeYes = (el) => App.confirm({ title: 'Setujui retake?', body: `${D.retakes[el.dataset.i].p} mendapat hak 1 attempt tambahan. ${D.retakes[el.dataset.i].policy.includes('voucher') ? 'Peserta tetap perlu memasukkan voucher tambahan.' : ''}`, confirmText: 'Setujui', onOk: () => { D.retakes[el.dataset.i].status = 'APPROVED'; App.rerender(); App.toast('Entitlement +1 attempt dibuat'); } });
  App.actions.retakeNo = () => App.confirm({ title: 'Tolak pengajuan retake?', body: 'Peserta akan menerima notifikasi beserta alasan penolakan.', confirmText: 'Tolak', danger: true, reason: true, onOk: () => App.toast('Pengajuan ditolak') });

  /* ---------- Sertifikat ---------- */
  App.routes['a-certificates'] = () => {
    const tab = S.certTab;
    const pend = D.certs.filter((c) => c.status === 'PENDING_APPROVAL');
    const tabs = `<div class="tabs" role="tablist">${[['templates', 'Template', 3], ['generate', 'Generator otomatis'], ['upload', 'Upload admin'], ['approval', 'Persetujuan', pend.length], ['issued', 'Terbit', 912], ['revoked', 'Dicabut / kedaluwarsa', 2]].map(([k, l, c]) => `<button role="tab" class="${tab === k ? 'on' : ''}" data-action="cTab" data-v="${k}">${l}${c != null ? ` <span class="count">${c}</span>` : ''}</button>`).join('')}</div>`;
    const certRow = (c, act) => `<tr><td class="mono small">${c.no}</td><td class="cell-title">${c.p}</td><td><span class="tag">${c.type}</span></td><td class="small">${c.training}</td><td class="small">${c.method}</td><td class="num small">${c.issued}</td><td class="num small">${c.exp}</td><td>${status(c.status)}</td><td>${act || ''}</td></tr>`;
    const head = '<thead><tr><th>Nomor</th><th>Peserta</th><th>Jenis</th><th>Pelatihan</th><th>Metode</th><th>Terbit</th><th>Berlaku s/d</th><th>Status</th><th></th></tr></thead>';
    let body = '';
    if (tab === 'templates') body = `<div class="card-body"><div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:24px" id="ct-grid">
      <div class="stack">${App.certHTML({ vars: true })}<div class="row"><button class="btn btn-secondary btn-sm">${ic('image', 'ic-sm')} Ganti background</button><button class="btn btn-secondary btn-sm">${ic('upload', 'ic-sm')} Tanda tangan</button><button class="btn btn-secondary btn-sm" data-action="tplPreview">${ic('eye', 'ic-sm')} Preview dengan data</button></div></div>
      <div class="stack">
        <div class="field"><label class="label" for="tp">Template</label><select id="tp" class="select"><option>Competency · Lanskap A4 · v2</option><option>Completion · Lanskap A4 · v1</option><option>Attendance · Lanskap A4 · v3</option></select></div>
        <div class="field"><label class="label" for="tp-n">Format nomor</label><input id="tp-n" class="input mono" value="LSPTN/{training}/{yyyy}/{seq:5}"></div>
        <div class="field"><span class="label">Variabel dinamis</span><div class="row" style="gap:6px">${['participant_name', 'participant_number', 'certificate_number', 'training_name', 'training_date', 'exam_date', 'issue_date', 'expiry_date', 'instructor_name', 'organization_name', 'score', 'qr_code'].map((v) => `<code class="tag" style="font-family:var(--font-mono)">{{${v}}}</code>`).join('')}</div></div>
        <div class="field"><label class="label" for="tp-v">Masa berlaku</label><select id="tp-v" class="select"><option>3 tahun sejak terbit</option><option>Tanpa batas</option></select></div>
      </div></div></div><style>@media (max-width:1000px){#ct-grid{grid-template-columns:minmax(0,1fr) !important}}</style>`;
    else if (tab === 'generate') body = `<div class="card-body stack-lg">
      <div class="grid g3"><div class="field"><label class="label" for="cg-t">Pelatihan</label><select id="cg-t" class="select"><option>Data Analyst Associate</option></select></div><div class="field"><label class="label" for="cg-y">Jenis sertifikat</label><select id="cg-y" class="select"><option>Competency</option></select></div><div class="field"><label class="label" for="cg-tp">Template</label><select id="cg-tp" class="select"><option>Competency · Lanskap A4 · v2</option></select></div></div>
      <div class="callout callout-info">${ic('info')}<div class="small">Syarat eligibility Competency: lulus Ujian Teori (PASS_ONCE ≥ 70) <b>dan</b> lulus Ujian Praktik, kehadiran ≥ 80%.</div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th><input type="checkbox" checked aria-label="Pilih semua"></th><th>Peserta</th><th>Teori</th><th>Praktik</th><th>Kehadiran</th><th>Eligibility</th></tr></thead><tbody>
        ${[['Bagas Pratama', '82', 'Lulus', '100%', true, 'Sudah terbit'], ['Intan Permatasari', '88', 'Lulus', '100%', true, ''], ['Yusuf Hidayatullah', '79', 'Lulus', '90%', true, ''], ['Andika Saputra', '64', '—', '100%', false, 'Teori belum lulus'], ['Larasati Wibowo', '66', 'Terjadwal', '80%', false, 'Praktik belum dinilai']].map(([n, t, p, h, ok, note]) => `<tr><td><input type="checkbox" ${ok && !note ? 'checked' : ''} ${!ok || note ? 'disabled' : ''} aria-label="Pilih ${n}"></td><td class="cell-title">${n}</td><td class="num">${t}</td><td>${p}</td><td class="num">${h}</td><td>${ok ? (note ? pill(note, 'muted') : pill('Eligible', 'success')) : pill(note, 'danger')}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="row-between"><span class="small muted">2 dipilih · nomor sertifikat diberikan saat disetujui</span><div class="row"><button class="btn btn-secondary" data-action="tplPreview">${ic('eye')} Preview PDF</button><button class="btn btn-primary" data-action="genOk">Ajukan persetujuan</button></div></div></div>`;
    else if (tab === 'upload') body = `<div class="card-body grid g2" style="align-items:start;gap:24px">
      <div class="stack"><h4>Upload satu sertifikat</h4>
        <div class="field"><label class="label" for="cu-p">Peserta</label><select id="cu-p" class="select"><option>Rizky Aditya Nugraha · PAR-2026-00426</option></select></div>
        <div class="field"><label class="label" for="cu-t">Program</label><select id="cu-t" class="select"><option>Data Analyst Associate</option></select></div>
        <div class="grid g2" style="gap:12px"><div class="field"><label class="label" for="cu-n">Nomor sertifikat</label><input id="cu-n" class="input mono" value="BNSP/TIK/2026/88120"></div><div class="field"><label class="label" for="cu-d">Tanggal terbit</label><input id="cu-d" type="date" class="input" value="2026-11-20"></div></div>
        <div class="dropzone">${ic('upload', 'ic-lg')}<span class="small">Seret PDF ke sini atau <a href="#a-certificates">pilih berkas</a></span><span class="xs dim">PDF · maks. 10 MB</span></div>
        <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-action="genOk">Ajukan persetujuan</button></div></div>
      <div class="stack"><h4>Bulk upload</h4><p class="small muted">Spreadsheet + ZIP berisi PDF. Baris yang tidak cocok masuk daftar error dan tidak diterbitkan.</p>
        <div class="panel stack" style="gap:8px"><div class="row-between small"><span>${ic('file', 'ic-sm')} sertifikat_bnsp_nov.xlsx</span>${pill('32 baris', 'muted')}</div><div class="row-between small"><span>${ic('file', 'ic-sm')} sertifikat_bnsp_nov.zip</span>${pill('31 PDF', 'muted')}</div></div>
        <div class="grid g3" style="gap:10px"><div class="panel"><div class="eyebrow">Cocok</div><b class="num" style="font-size:1.25rem;color:var(--success)">29</b></div><div class="panel"><div class="eyebrow">Error</div><b class="num" style="font-size:1.25rem;color:var(--danger)">3</b></div><div class="panel"><div class="eyebrow">Total</div><b class="num" style="font-size:1.25rem">32</b></div></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Baris</th><th>Masalah</th></tr></thead><tbody><tr><td class="num">4</td><td class="small">Email tidak ditemukan: <code>r.adit@mail.id</code></td></tr><tr><td class="num">17</td><td class="small">Berkas <code>BNSP_88133.pdf</code> tidak ada di ZIP</td></tr><tr><td class="num">26</td><td class="small">Nomor sertifikat sudah dipakai</td></tr></tbody></table></div>
        <button class="btn btn-secondary" style="align-self:flex-start" data-action="dlTemplate">${ic('download', 'ic-sm')} Unduh template</button></div></div>`;
    else if (tab === 'approval') body = `<div class="table-wrap"><table class="table">${head}<tbody>${pend.map((c) => certRow(c, `<div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn btn-ghost btn-sm" data-action="tplPreview">Preview</button><button class="btn btn-secondary btn-sm" data-action="certReturn">Kembalikan</button><button class="btn btn-primary btn-sm" data-action="certApprove" data-no="${c.no}">Setujui</button></div>`)).join('') || '<tr><td colspan="9" class="muted" style="text-align:center;padding:40px">Tidak ada sertifikat yang menunggu persetujuan.</td></tr>'}</tbody></table></div>`;
    else if (tab === 'issued') body = `<div class="table-wrap"><table class="table">${head}<tbody>${D.certs.filter((c) => c.status === 'ISSUED').map((c) => certRow(c, `<div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn btn-ghost btn-sm" data-go="verify">Verifikasi</button><button class="btn btn-danger-ghost btn-sm" data-action="certRevoke" data-no="${c.no}">Cabut</button></div>`)).join('')}</tbody></table></div>`;
    else body = `<div class="table-wrap"><table class="table">${head}<tbody>${D.certs.filter((c) => ['REVOKED', 'EXPIRED'].includes(c.status)).map((c) => certRow(c, `<button class="btn btn-ghost btn-sm" data-go="verify">Cek publik</button>`)).join('')}</tbody></table></div><div class="pager"><span>Sertifikat yang dicabut tetap dapat ditemukan di halaman verifikasi dengan status tidak berlaku.</span></div>`;
    return shell('a-certificates', `
      ${pageHead('Sertifikat', 'Penerbitan otomatis dari template atau upload admin. Semua sertifikat melalui persetujuan sebelum terbit.')}
      <section class="card">${tabs}${body}</section>`);
  };
  App.actions.cTab = (el) => { S.certTab = el.dataset.v; App.rerender(); };
  App.actions.tplPreview = () => App.modal(`${App.modalHead('Preview sertifikat', 'Data peserta terisi otomatis. Nomor final diberikan saat disetujui.')}<div class="modal-body">${App.certHTML({ name: 'Intan Permatasari', training: 'Data Analyst Associate', no: 'LSPTN/DA/2026/00732', date: '21 November 2026' })}</div>`, { wide: true });
  App.actions.genOk = () => { App.toast('Diajukan ke Certificate Admin untuk persetujuan', 'send'); S.certTab = 'approval'; App.rerender(); };
  App.actions.certApprove = (el) => App.confirm({ title: 'Setujui & terbitkan?', body: `Sertifikat <b class="mono">${el.dataset.no}</b> akan diterbitkan dengan QR verifikasi. Peserta menerima notifikasi. Sertifikat terbit tidak dapat ditimpa; revisi menghasilkan penerbitan pengganti.`, confirmText: 'Terbitkan', onOk: () => { const c = D.certs.find((x) => x.no === el.dataset.no); c.status = 'ISSUED'; c.issued = '21 Nov 2026'; c.exp = c.type === 'Competency' ? '21 Nov 2029' : '—'; App.rerender(); App.toast('Sertifikat diterbitkan'); } });
  App.actions.certReturn = () => App.confirm({ title: 'Kembalikan ke draf?', body: 'Sertifikat dikembalikan ke pembuat untuk diperbaiki.', confirmText: 'Kembalikan', reason: true, onOk: () => App.toast('Dikembalikan ke draf') });
  App.actions.certRevoke = (el) => App.confirm({ title: 'Cabut sertifikat?', body: `Sertifikat <b class="mono">${el.dataset.no}</b> akan tampil sebagai DICABUT di halaman verifikasi publik. Tindakan ini tercatat permanen.`, confirmText: 'Cabut sertifikat', danger: true, reason: true, onOk: () => App.toast('Sertifikat dicabut') });

  /* ---------- Laporan ---------- */
  App.routes['a-reports'] = () => shell('a-reports', `
    ${pageHead('Laporan & analitik', 'Akses laporan dibatasi sesuai organisasi dan permission.', `<select class="select" style="width:auto;height:38px" aria-label="Pelatihan"><option>Data Analyst Associate</option></select><select class="select" style="width:auto;height:38px" aria-label="Periode"><option>November 2026</option></select>${exportBtn}`)}
    <div class="tabs">${['Peserta', 'Voucher', 'Hasil ujian', 'Analisis soal', 'Sertifikat'].map((t, i) => `<button class="${i === 3 ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="grid g4">
      <div class="card kpi"><span class="eyebrow">Attempt dianalisis</span><span class="v">214</span><span class="d">EXM-DA-T v3</span></div>
      <div class="card kpi"><span class="eyebrow">Reliabilitas (KR-20)</span><span class="v">0,84</span><span class="d">Baik (≥ 0,70)</span></div>
      <div class="card kpi"><span class="eyebrow">Rata-rata nilai</span><span class="v">74,2</span><span class="d">Simpangan baku 11,8</span></div>
      <div class="card kpi"><span class="eyebrow">Soal perlu ditinjau</span><span class="v" style="color:var(--warning)">2</span><span class="d">Daya beda rendah / negatif</span></div>
    </div>
    <section class="card">
      <div class="card-head"><div><h3>Analisis butir soal</h3><p class="xs dim">p = indeks kesukaran (proporsi benar) · D = daya beda (point-biserial)</p></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Soal</th><th>Kompetensi</th><th>Kesukaran (p)</th><th class="t-right">Daya beda (D)</th><th>Sebaran jawaban</th><th>Catatan</th></tr></thead>
      <tbody>${D.qAnalysis.map((q) => `<tr><td class="mono small">${q.id}</td><td class="small">${q.comp}</td><td style="min-width:150px"><div class="row" style="flex-wrap:nowrap"><div class="progress grow"><span style="width:${q.p * 100}%;background:${q.p < 0.3 || q.p > 0.9 ? 'var(--warning)' : 'var(--teal)'}"></span></div><span class="num small">${q.p.toFixed(2).replace('.', ',')}</span></div></td><td class="t-right num" style="font-weight:600;color:${q.d < 0.1 ? 'var(--danger)' : 'inherit'}">${q.d.toFixed(2).replace('.', ',')}</td><td class="small">${q.dist}</td><td>${q.flag ? pill(q.flag, q.d < 0 ? 'danger' : 'warning') : '<span class="dim xs">—</span>'}</td></tr>`).join('')}</tbody></table></div>
    </section>`);

  /* ---------- Audit ---------- */
  App.routes['a-audit'] = () => shell('a-audit', `
    ${pageHead('Audit log', 'Catatan tidak dapat diubah. Tidak memuat OTP, kode voucher penuh, atau kata sandi.', exportBtn)}
    <section class="card">
      ${toolbar('Cari aktor, entitas, atau aksi', [['Aksi', 'auth.*', 'voucher.*', 'grade.*', 'certificate.*', 'payment.*'], ['Aktor', 'Rahmat Hidayat', 'Budi Santoso', 'Sistem']], `<input type="date" class="input" style="width:auto;height:38px" value="2026-11-21" aria-label="Tanggal">`)}
      <div class="table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Entitas</th><th>Detail</th><th>IP</th></tr></thead>
      <tbody>${D.audit.map((a) => `<tr><td class="num small" style="white-space:nowrap">${a.t}</td><td><div class="cell-title small">${a.actor}</div><div class="cell-sub">${a.role}</div></td><td><code class="xs">${a.act}</code></td><td class="mono xs">${a.ent}</td><td class="small">${a.detail}</td><td class="mono xs">${a.ip}</td></tr>`).join('')}</tbody></table></div>
      ${pager(9, 18402)}
    </section>`);

  /* ---------- Pengguna & role ---------- */
  App.routes['a-users'] = () => {
    const cell = (v) => `<td class="${v === 'Ya' ? 'yes' : v === 'Tidak' ? 'no' : 'lim'} small">${v === 'Ya' ? '✓' : v === 'Tidak' ? '—' : v}</td>`;
    return shell('a-users', `
    ${pageHead('Pengguna & role', 'Permission diterapkan di backend. Menyembunyikan tombol di antarmuka bukan kontrol keamanan.', `<button class="btn btn-primary" data-action="inviteUser">${ic('plus')} Undang pengguna</button>`)}
    <section class="card">
      <div class="table-wrap"><table class="table"><thead><tr><th>Pengguna</th><th>Role</th><th>MFA</th><th>Login terakhir</th><th>Status</th><th></th></tr></thead>
      <tbody>${D.users.map((u) => `<tr><td><div class="row" style="flex-wrap:nowrap"><div class="avatar avatar-sm">${App.initials(u.name)}</div><div><div class="cell-title">${u.name}</div><div class="cell-sub">${u.email}</div></div></div></td><td class="small">${u.role}</td><td>${u.mfa ? pill('Aktif', 'success') : pill('Belum', 'warning')}</td><td class="num small">${u.last}</td><td>${status('Aktif')}</td><td><button class="btn btn-ghost btn-sm" data-action="sessions">Sesi</button></td></tr>`).join('')}</tbody></table></div>
    </section>
    <section class="card">
      <div class="card-head"><div><h3>Matriks hak akses</h3><p class="xs dim">SRS 3.2 · ✓ penuh · — tidak ada · teks = akses terbatas</p></div></div>
      <div class="table-wrap"><table class="table matrix"><thead><tr><th>Fitur</th>${D.roles.map((r) => `<th>${r}</th>`).join('')}</tr></thead>
      <tbody>${D.matrix.map((row) => `<tr><td class="cell-title small">${row[0]}</td>${row.slice(1).map(cell).join('')}</tr>`).join('')}</tbody></table></div>
    </section>`);
  };
  App.actions.inviteUser = () => App.modal(`${App.modalHead('Undang pengguna')}
    <div class="modal-body"><div class="field"><label class="label" for="iu-e">Email</label><input id="iu-e" class="input" placeholder="nama@lsptn.id"></div>
    <div class="field"><label class="label" for="iu-r">Role</label><select id="iu-r" class="select">${D.roles.slice(1, 7).map((r) => `<option>${r}</option>`).join('')}</select></div>
    <label class="check"><input type="checkbox" checked><span class="small">Wajibkan MFA saat login pertama</span></label></div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="closeModal">Kirim undangan</button></div>`);
  App.actions.sessions = () => App.modal(`${App.modalHead('Sesi aktif')}<div class="modal-body">${[['Chrome · Windows', '10.12.4.21 · Bandung', 'Sesi ini'], ['Safari · iPhone', '114.122.x.x · Bandung', '2 jam lalu']].map(([a, b, c]) => `<div class="row-between"><div><div class="small" style="font-weight:600">${a}</div><div class="xs dim">${b} · ${c}</div></div>${c === 'Sesi ini' ? pill('Aktif', 'success') : '<button class="btn btn-danger-ghost btn-sm" data-action="closeModal">Cabut</button>'}</div>`).join('<hr class="hr">')}</div>`);
})();
