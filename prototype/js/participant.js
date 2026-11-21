/* TACMS prototype — Portal Peserta (SRS 9.4, 9.6, Addendum v1.1) */
(function () {
  const { ic, esc, status, pill } = App;
  const D = window.DATA;
  const S = App.state;
  const VALID_VOUCHER = 'TACMS-7K4Q-92XD';
  const OTP_OK = '123456';

  /* ---------- Shell ---------- */
  const preShell = (body, step) => `
  <div class="pp">
    <header class="pp-top"><div class="pp-top-inner">
      <button class="pp-brand" data-go="home"><div class="logo">TN</div><div><b>${esc(D.org.name)}</b><small>Portal Peserta</small></div></button>
      <div class="grow"></div>
      ${App.langToggle()}
      ${App.themeBtn()}
    </div></header>
    <main class="pp-main"><div class="pp-narrow stack-lg">
      ${step != null ? stepsLine(step) : ''}
      ${body}
    </div></main>
    ${App.protoFab()}
  </div>`;

  const stepsLine = (cur) => {
    const labels = ['Voucher', 'Identitas', 'Verifikasi OTP', 'Selesai'];
    return `<nav class="steps-line" aria-label="Tahapan aktivasi">${labels.map((l, i) => `<span class="${i < cur ? 'done' : i === cur ? 'on' : ''}"><span class="dot">${i < cur ? '✓' : i + 1}</span>${l}</span>`).join('<span class="sep"></span>')}</nav>`;
  };

  const navItems = [
    ['p-dashboard', 'Beranda', 'home'],
    ['p-history', 'Histori', 'clock'],
    ['p-certs', 'Sertifikat', 'award'],
    ['p-profile', 'Profil', 'user'],
  ];
  const shell = (active, body, fab = '') => `
  <div class="pp">
    <header class="pp-top"><div class="pp-top-inner">
      <button class="pp-brand" data-go="p-dashboard"><div class="logo">TN</div><div><b>${esc(D.org.name)}</b><small>Portal Peserta</small></div></button>
      <nav class="pp-nav">${navItems.map(([r, l]) => `<button class="${active === r ? 'on' : ''}" data-go="${r}">${l}</button>`).join('')}</nav>
      <div class="grow"></div>
      ${App.langToggle()}
      <button class="icon-btn" aria-label="Notifikasi" data-action="pNotif">${ic('bell')}</button>
      ${App.themeBtn()}
      <div class="avatar" title="${esc(S.identity.name)}">${App.initials(S.identity.name)}</div>
    </div></header>
    <main class="pp-main">${body}</main>
    <nav class="pp-tabbar">${navItems.map(([r, l, i]) => `<button class="${active === r ? 'on' : ''}" data-go="${r}">${ic(i)}${l}</button>`).join('')}</nav>
    ${App.protoFab(fab)}
  </div>`;

  App.actions.pNotif = () => App.modal(`${App.modalHead('Notifikasi')}<div class="modal-body">
    ${[['ticket', 'Voucher TACMS-7K4Q-•••• berhasil diaktifkan.', '21 Nov · 08:51'], ['calendar', 'Ujian Teori Data Analyst dimulai hari ini pukul 09:00 WIB.', '21 Nov · 07:00'], ['award', 'Sertifikat Cyber Security Awareness telah diterbitkan.', '29 Okt · 14:20']]
      .map(([i, t, d]) => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap">${ic(i)}<div class="grow"><div class="small">${t}</div><div class="xs dim">${d}</div></div></div>`).join('<hr class="hr">')}
  </div>`);

  /* ---------- 1. Aktivasi voucher ---------- */
  App.routes['p-start'] = () => preShell(`
    <div class="stack" style="gap:6px"><h1>Aktivasi voucher ujian</h1><p class="muted">Masukkan kode voucher yang Anda terima dari penyelenggara pelatihan. Kode terdiri dari 12 karakter.</p></div>
    <section class="card card-pad stack-lg">
      <div class="field">
        <label class="label" for="vc">Kode voucher</label>
        <input id="vc" class="input input-mono ${S.voucherError ? 'is-invalid' : ''}" style="height:50px;font-size:1.125rem" placeholder="TACMS-XXXX-XXXX" maxlength="15" value="${esc(S.voucherInput)}" data-bind="voucher" autocomplete="off" spellcheck="false" aria-describedby="vc-h">
        ${S.voucherError ? `<span class="err" role="alert">${S.voucherError}</span>` : `<span class="hint" id="vc-h">Huruf besar/kecil tidak berpengaruh. Tanda hubung otomatis ditambahkan.</span>`}
      </div>
      <button class="btn btn-primary btn-lg btn-block" data-action="checkVoucher">Periksa voucher ${ic('arrowR')}</button>
      <div class="callout callout-info">${ic('info')}<div class="small">Voucher hanya dapat diikat ke <b>satu identitas</b>. Setelah diperiksa, voucher dicadangkan selama 15 menit selagi Anda memverifikasi email dan nomor telepon.</div></div>
    </section>
    <div class="row-between small"><span class="muted">Sudah pernah aktivasi?</span><button class="btn btn-secondary btn-sm" data-go="p-dashboard">Masuk dengan OTP</button></div>
    <p class="xs dim">Contoh demo: <code>${VALID_VOUCHER}</code>. Kode lain menampilkan pesan error aman yang tidak membocorkan status voucher.</p>
  `, 0);
  App.binds.voucher = (el) => {
    let v = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
    const parts = [v.slice(0, 5), v.slice(5, 9), v.slice(9, 13)].filter(Boolean);
    const f = parts.join('-');
    if (f !== el.value) { el.value = f; }
    S.voucherInput = f;
  };
  App.actions.checkVoucher = () => {
    if (!S.voucherInput) { S.voucherError = 'Kode voucher wajib diisi.'; return App.rerender(); }
    if (S.voucherInput !== VALID_VOUCHER) {
      S.voucherError = 'Kode voucher tidak dapat digunakan. Periksa kembali penulisan atau hubungi penyelenggara pelatihan Anda.';
      return App.rerender();
    }
    S.voucherError = '';
    App.go('p-identity');
  };
  App.after['p-start'] = () => {
    const el = document.getElementById('vc');
    if (el) { el.focus(); el.addEventListener('keydown', (e) => { if (e.key === 'Enter') App.actions.checkVoucher(); }); }
  };

  /* ---------- 2. Identitas ---------- */
  const voucherTicket = () => `<div class="voucher-ticket">
    <div class="pi" style="width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--teal-soft);color:var(--teal)">${ic('ticket')}</div>
    <div class="grow"><div class="mono" style="font-weight:600">${VALID_VOUCHER.slice(0, 10)}••••</div><div class="small muted">Data Analyst Associate · Ujian Teori &amp; Praktik</div></div>
    ${pill('Dicadangkan 14:52', 'info')}
  </div>`;

  App.routes['p-identity'] = () => preShell(`
    <div class="stack" style="gap:6px"><h1>Lengkapi identitas</h1><p class="muted">Data ini dipakai untuk sertifikat dan verifikasi. Pastikan nama sesuai dokumen resmi.</p></div>
    ${voucherTicket()}
    <section class="card card-pad stack-lg">
      <div class="field"><label class="label" for="id-name">Nama lengkap</label><input id="id-name" class="input" value="${esc(S.identity.name)}" data-bind="idName" autocomplete="name"><span class="hint">Nama ini tercetak di sertifikat.</span></div>
      <div class="field"><label class="label" for="id-email">Email</label><input id="id-email" type="email" class="input" value="${esc(S.identity.email)}" data-bind="idEmail" autocomplete="email"></div>
      <div class="field"><label class="label" for="id-phone">Nomor telepon</label><input id="id-phone" type="tel" class="input" value="${esc(S.identity.phone)}" data-bind="idPhone" autocomplete="tel">
        <div class="row small" style="margin-top:4px"><span class="muted">Kirim OTP telepon melalui</span>
          <div class="seg" role="group">${['WhatsApp', 'SMS'].map((c) => `<button class="${S.otp.phone.channel === c ? 'on' : ''}" data-action="otpChannel" data-v="${c}">${c}</button>`).join('')}</div></div>
      </div>
      <label class="check"><input type="checkbox" checked id="id-consent"><span class="small">Saya menyetujui pemrosesan data pribadi untuk keperluan ujian dan sertifikasi sesuai <a href="#p-identity">kebijakan privasi</a>.</span></label>
      <div class="row"><button class="btn btn-secondary" data-go="p-start">${ic('arrowL')} Kembali</button><button class="btn btn-primary grow" data-action="sendOtp">Kirim kode OTP ${ic('send')}</button></div>
    </section>
  `, 1);
  App.binds.idName = (el) => { S.identity.name = el.value; };
  App.binds.idEmail = (el) => { S.identity.email = el.value; };
  App.binds.idPhone = (el) => { S.identity.phone = el.value; };
  App.actions.otpChannel = (el) => { S.otp.phone.channel = el.dataset.v; App.rerender(); };
  App.actions.sendOtp = () => {
    S.otp.email = { sent: true, verified: false, code: '', error: '', attempts: 0, cooldown: 60 };
    S.otp.phone = { ...S.otp.phone, sent: true, verified: false, code: '', error: '', attempts: 0, cooldown: 60 };
    App.go('p-otp');
    App.toast('OTP dikirim ke email dan ' + S.otp.phone.channel, 'send');
  };

  /* ---------- 3. OTP ---------- */
  const mask = (k) => k === 'email'
    ? S.identity.email.replace(/^(.{2}).*(@.*)$/, '$1•••••$2')
    : S.identity.phone.replace(/(\+62 \d{3})-\d{4}-(\d{2})(\d{2})/, '$1-••••-••$3');
  const otpCard = (k) => {
    const o = S.otp[k];
    const title = k === 'email' ? 'Email' : 'Nomor telepon';
    const via = k === 'email' ? 'email' : o.channel;
    const left = 5 - o.attempts;
    if (o.verified) return `<section class="card card-pad row" style="flex-wrap:nowrap">
      <div style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);color:var(--success);flex:none">${ic('check')}</div>
      <div class="grow"><h4>${title} terverifikasi</h4><div class="small muted">${esc(mask(k))} · ${new Date().toLocaleTimeString(App.locale(), { hour: '2-digit', minute: '2-digit' })}</div></div>${pill('Terverifikasi', 'success')}</section>`;
    return `<section class="card card-pad stack">
      <div class="row-between"><div class="row">${ic(k === 'email' ? 'mail' : 'phone')}<h4>${title}</h4></div>${pill(left <= 0 ? 'Terkunci' : 'Menunggu kode', left <= 0 ? 'danger' : 'warning')}</div>
      <p class="small muted">Kode 6 digit dikirim melalui ${via} ke <b>${esc(mask(k))}</b>. Berlaku 5 menit.</p>
      <div class="otp" data-otp="${k}">${[0, 1, 2, 3, 4, 5].map((i) => `<input inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}" value="${esc(o.code[i] || '')}" ${left <= 0 ? 'disabled' : ''}>`).join('')}</div>
      ${o.error ? `<span class="err" role="alert">${o.error}</span>` : ''}
      <div class="row-between">
        <span class="xs dim">Sisa ${Math.max(left, 0)} dari 5 percobaan</span>
        <button class="btn btn-ghost btn-sm" data-action="resendOtp" data-k="${k}" ${o.cooldown > 0 ? 'disabled' : ''}>${ic('refresh', 'ic-sm')} <span data-cd="${k}">${o.cooldown > 0 ? `Kirim ulang (${o.cooldown} d)` : 'Kirim ulang'}</span></button>
      </div>
      <button class="btn btn-primary" data-action="verifyOtp" data-k="${k}" ${left <= 0 ? 'disabled' : ''}>Verifikasi ${title.toLowerCase()}</button>
    </section>`;
  };
  App.routes['p-otp'] = () => {
    const both = S.otp.email.verified && S.otp.phone.verified;
    return preShell(`
    <div class="stack" style="gap:6px"><h1>Verifikasi kontak</h1><p class="muted">Email dan nomor telepon wajib diverifikasi sebelum voucher diikat ke identitas Anda.</p></div>
    ${otpCard('email')}
    ${otpCard('phone')}
    ${both ? `<div class="callout callout-success">${ic('checkCircle')}<div class="small">Kedua kontak terverifikasi. Voucher siap diikat ke identitas Anda.</div></div>`
      : `<div class="callout callout-info">${ic('info')}<div class="small">Kode demo: <code>${OTP_OK}</code>. Kode OTP lama otomatis batal saat kode baru dikirim.</div></div>`}
    <button class="btn btn-primary btn-lg btn-block" data-action="bindVoucher" ${both ? '' : 'disabled'}>Ikat voucher &amp; lanjutkan ${ic('arrowR')}</button>
  `, 2);
  };
  App.after['p-otp'] = () => {
    document.querySelectorAll('.otp').forEach((box) => {
      const k = box.dataset.otp;
      const ins = [...box.querySelectorAll('input')];
      const sync = () => { S.otp[k].code = ins.map((i) => i.value).join(''); };
      ins.forEach((inp, i) => {
        inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(-1); sync(); if (inp.value && ins[i + 1]) ins[i + 1].focus(); if (S.otp[k].code.length === 6) App.actions.verifyOtp({ dataset: { k } }); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); });
        inp.addEventListener('paste', (e) => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (t) { e.preventDefault(); t.split('').forEach((c, j) => { if (ins[j]) ins[j].value = c; }); sync(); if (t.length === 6) App.actions.verifyOtp({ dataset: { k } }); } });
      });
    });
    const first = document.querySelector('.otp input:not([disabled])');
    if (first) first.focus();
  };
  App.actions.verifyOtp = (el) => {
    const k = el.dataset.k; const o = S.otp[k];
    if (o.code.length < 6) { o.error = 'Masukkan 6 digit kode.'; return App.rerender(); }
    if (o.code === OTP_OK) { o.verified = true; o.error = ''; App.toast((k === 'email' ? 'Email' : 'Nomor telepon') + ' terverifikasi'); }
    else { o.attempts++; o.code = ''; o.error = 5 - o.attempts > 0 ? 'Kode salah atau sudah kedaluwarsa.' : 'Batas percobaan tercapai. Minta kode baru setelah jeda berakhir.'; }
    App.rerender();
  };
  App.actions.resendOtp = (el) => { const o = S.otp[el.dataset.k]; o.cooldown = 60; o.attempts = 0; o.code = ''; o.error = ''; App.rerender(); App.toast('Kode baru dikirim. Kode sebelumnya tidak berlaku.', 'send'); };
  App.actions.bindVoucher = () => { S.bound = true; App.go('p-bound'); };

  /* ---------- 4. Voucher terikat ---------- */
  App.routes['p-bound'] = () => preShell(`
    <section class="card card-pad stack-lg" style="text-align:center;align-items:center">
      <div style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);color:var(--success)">${ic('checkCircle', 'ic-lg')}</div>
      <div class="stack" style="gap:6px"><h1>Voucher berhasil diaktifkan</h1><p class="muted">Voucher kini terikat ke identitas Anda dan hak ujian telah dibuat.</p></div>
      <dl class="dl" style="text-align:left;width:100%">
        <dt>Peserta</dt><dd>${esc(S.identity.name)} · <span class="mono">PAR-2026-00418</span></dd>
        <dt>Voucher</dt><dd class="mono">${VALID_VOUCHER.slice(0, 10)}•••• ${status('BOUND')}</dd>
        <dt>Pelatihan</dt><dd>Data Analyst Associate</dd>
        <dt>Hak ujian</dt><dd>Ujian Teori (3 attempt) · Ujian Praktik (1 attempt)</dd>
        <dt>Berlaku sampai</dt><dd>31 Desember 2026</dd>
      </dl>
      <button class="btn btn-primary btn-lg btn-block" data-go="p-dashboard">Lihat ujian saya ${ic('arrowR')}</button>
    </section>
  `, 3);

  /* ---------- Gate akses (Addendum §4) ---------- */
  const gateRows = (variant) => {
    const ok = (t, d) => `<div class="gate-row">${ic('checkCircle', 'ok')}<div><div>${t}</div>${d ? `<div class="xs dim">${d}</div>` : ''}</div></div>`;
    const no = (t, d) => `<div class="gate-row">${ic('xCircle', 'no')}<div><div>${t}</div>${d ? `<div class="xs dim">${d}</div>` : ''}</div></div>`;
    const wait = (t, d) => `<div class="gate-row">${ic('clock', 'wait')}<div><div>${t}</div>${d ? `<div class="xs dim">${d}</div>` : ''}</div></div>`;
    if (variant === 'praktik') return [ok('Identitas & kontak terverifikasi'), ok('Enrollment aktif · ENR-DA-0420'), wait('Jadwal: 24 Nov 2026, 13:00–16:00 WIB', 'Ujian belum dibuka'), no('Voucher ujian praktik belum dimasukkan'), no('Pembayaran order belum terverifikasi', 'ORD-2026-0324 · menunggu verifikasi Finance')].join('');
    return [
      ok('Identitas & kontak terverifikasi', 'Email dan WhatsApp · 21 Nov 08:50'),
      ok('Enrollment aktif & sesuai ujian', 'ENR-DA-0418 · Ujian Teori'),
      ok('Dalam jadwal yang diizinkan', '21 Nov 2026 · 09:00–12:00 WIB'),
      ok('Voucher valid & sesuai cakupan', 'TACMS-7K4Q-•••• · BOUND'),
      ok('Pembelian terkonfirmasi', 'ORD-2026-0311 · PAID'),
      ok('Hak attempt tersedia', '3 dari 3 tersisa'),
    ].join('');
  };

  /* ---------- 5. Dashboard ---------- */
  App.routes['p-dashboard'] = () => {
    const inProgress = S.exam.started && !S.exam.submitted;
    const done = S.exam.submitted;
    return shell('p-dashboard', `
    <div class="row-between"><div class="stack" style="gap:4px"><span class="eyebrow">Sabtu, 21 November 2026</span><h1>Halo, ${esc(S.identity.name.split(' ')[0])}</h1></div>
      <button class="btn btn-secondary" data-go="p-start">${ic('ticket')} Masukkan voucher</button></div>

    <section class="card" style="overflow:hidden">
      <div class="exam-card">
        <div class="row-between"><span class="eyebrow">${inProgress ? 'Ujian berlangsung' : done ? 'Ujian terakhir' : 'Ujian berikutnya · hari ini'}</span>
          ${inProgress ? status('IN_PROGRESS', 'Sedang dikerjakan') : done ? status('Pending Review') : pill('Siap dimulai', 'success')}</div>
        <div class="stack" style="gap:4px"><h2>${esc(D.exam.title)}</h2><p class="small muted">Data Analyst Associate · ${esc(D.exam.code)} ${esc(D.exam.version)}</p></div>
        <div class="exam-meta"><span>${ic('calendar', 'ic-sm')} 21 Nov 2026 · 09:00–12:00 WIB</span><span>${ic('clock', 'ic-sm')} ${D.exam.duration} menit</span><span>${ic('list', 'ic-sm')} ${D.exam.total} soal (demo)</span><span>${ic('repeat', 'ic-sm')} Attempt ${D.exam.attempt} dari ${D.exam.maxAttempts}</span></div>
        ${inProgress ? `<div class="callout callout-warning">${ic('wifi')}<div class="small">Attempt Anda masih aktif. Sisa waktu dihitung oleh server dan terus berjalan. Jawaban yang sudah tersimpan tidak hilang.</div></div>` : ''}
        <div class="row">
          ${inProgress ? `<button class="btn btn-primary" data-go="p-exam">${ic('play')} Lanjutkan ujian</button>`
            : done ? `<button class="btn btn-primary" data-go="p-result">Lihat hasil</button>`
            : `<button class="btn btn-primary" data-go="p-instructions">${ic('play')} Buka ujian</button>`}
          <button class="btn btn-ghost" data-action="gateInfo" data-v="teori">${ic('shield')} Syarat akses</button>
        </div>
      </div>
    </section>

    <div class="grid g2">
      <section class="card">
        <div class="card-head"><h3>Ujian ditugaskan</h3><span class="xs dim">Mode: Assigned exams only</span></div>
        <div class="card-body stack">
          <div class="row-between" style="flex-wrap:nowrap;align-items:flex-start"><div class="grow"><div class="cell-title">Data Analyst Associate — Praktik</div><div class="xs dim">24 Nov 2026 · 13:00–16:00 WIB · 120 menit</div></div>${pill('Voucher belum ada', 'warning')}</div>
          <div class="row"><button class="btn btn-secondary btn-sm" data-action="gateInfo" data-v="praktik">Lihat syarat</button><button class="btn btn-ghost btn-sm" data-go="p-start">Masukkan voucher</button></div>
          <hr class="hr">
          <div class="row-between" style="flex-wrap:nowrap;align-items:flex-start"><div class="grow"><div class="cell-title">Digital Marketing — Teori</div><div class="xs dim">Pendaftaran dibuka 1 Des 2026</div></div>${pill('Belum terbuka', 'muted')}</div>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h3>Ringkasan</h3><button class="btn btn-ghost btn-sm" data-go="p-history">Histori ${ic('chevR', 'ic-sm')}</button></div>
        <div class="card-body grid g2" style="gap:12px">
          <div class="panel"><div class="eyebrow">Pelatihan</div><div class="kpi-v" style="font:700 1.5rem var(--font-display)">3</div><div class="xs dim">1 aktif · 2 selesai</div></div>
          <div class="panel"><div class="eyebrow">Sertifikat</div><div style="font:700 1.5rem var(--font-display)">2</div><div class="xs dim">1 diproses</div></div>
          <div class="panel"><div class="eyebrow">Hasil terbaru</div><div style="font:700 1.5rem var(--font-display)">86</div><div class="xs dim">Cyber Security · Lulus</div></div>
          <div class="panel"><div class="eyebrow">Voucher</div><div style="font:700 1.5rem var(--font-display)">1</div><div class="xs dim">BOUND · s/d 31 Des</div></div>
        </div>
      </section>
    </div>`);
  };
  App.actions.gateInfo = (el) => App.modal(`${App.modalHead('Syarat memulai ujian', el.dataset.v === 'praktik' ? 'Ujian Praktik · Data Analyst Associate' : 'Ujian Teori · Data Analyst Associate')}
    <div class="modal-body"><div class="gate">${gateRows(el.dataset.v)}</div>
    <p class="xs dim">Pendaftaran (enrollment) saja tidak membuka akses. Semua syarat diperiksa ulang oleh server saat Anda menekan Mulai.</p></div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Tutup</button></div>`);

  /* ---------- 6. Instruksi ---------- */
  App.routes['p-instructions'] = () => shell('p-dashboard', `
    <button class="btn btn-ghost btn-sm" data-go="p-dashboard" style="align-self:flex-start">${ic('arrowL', 'ic-sm')} Beranda</button>
    <div class="stack" style="gap:6px"><span class="eyebrow">Instruksi ujian</span><h1>${esc(D.exam.title)}</h1></div>
    <div class="grid g4">
      ${[['Durasi', D.exam.duration + ' menit'], ['Jumlah soal', D.exam.total + ' soal'], ['Nilai lulus', '≥ ' + D.exam.passing], ['Attempt', `${D.exam.attempt} dari ${D.exam.maxAttempts}`]].map(([k, v]) => `<div class="card kpi"><span class="eyebrow">${k}</span><span class="v" style="font-size:1.4rem">${v}</span></div>`).join('')}
    </div>
    <div class="grid g2" style="align-items:start">
      <section class="card card-pad stack">
        <h3>Ketentuan</h3>
        <ol class="stack small" style="padding-left:18px;margin:0;gap:8px">
          <li>Waktu dihitung oleh server sejak Anda menekan <b>Mulai</b> dan tidak berhenti saat koneksi terputus.</li>
          <li>Jawaban tersimpan otomatis setiap kali Anda mengubahnya. Status penyimpanan terlihat di bagian atas layar.</li>
          <li>Anda bebas berpindah soal dan menandai soal untuk ditinjau kembali.</li>
          <li>Ujian terkirim otomatis saat waktu habis. Setelah dikirim, jawaban tidak dapat diubah.</li>
          <li>Perpindahan tab atau jendela dicatat sebagai sinyal integritas untuk ditinjau penguji.</li>
          <li>Soal essay dinilai penguji. Hasil akhir tampil setelah penilaian selesai.</li>
          <li>Kebijakan nilai: <b>Pass once</b>. Retake memerlukan persetujuan admin dengan masa tunggu 24 jam.</li>
        </ol>
      </section>
      <section class="card card-pad stack">
        <div class="row-between"><h3>Pemeriksaan akses</h3>${pill('Semua syarat terpenuhi', 'success')}</div>
        <div class="gate">${gateRows('teori')}</div>
      </section>
    </div>
    <section class="card card-pad stack">
      <label class="check"><input type="checkbox" id="agree" data-change="agree" ${S.agree ? 'checked' : ''}><span>Saya telah membaca ketentuan dan siap memulai. Saya memahami bahwa attempt ke-1 akan tercatat begitu ujian dimulai.</span></label>
      <div class="row"><button class="btn btn-primary btn-lg" data-action="startExam" ${S.agree ? '' : 'disabled'}>${ic('play')} Mulai ujian</button><span class="small muted">Waktu mulai berjalan setelah tombol ditekan.</span></div>
    </section>`);
  App.changes.agree = (el) => { S.agree = el.checked; App.rerender(); };
  App.actions.startExam = () => {
    if (!S.exam.started) { S.exam.started = true; S.exam.startedAt = new Date(); }
    App.go('p-exam');
  };

  /* ---------- 7. Exam workspace ---------- */
  const Q = () => D.exam.questions;
  const answered = (i) => {
    const a = S.exam.answers[i];
    if (a == null) return false;
    if (Array.isArray(a)) return a.length > 0;
    if (typeof a === 'object') return Object.keys(a).length > 0;
    return String(a).trim() !== '';
  };
  const answeredCount = () => Q().filter((_, i) => answered(i)).length;
  const fmtTime = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const miniChart = () => `<svg viewBox="0 0 320 150" class="chart" style="width:100%;max-width:420px;background:var(--surface-2);border-radius:8px" role="img" aria-label="Grafik penjualan Q1 sampai Q4">
    ${[30, 60, 90, 120].map((y) => `<line class="grid-line" x1="40" x2="305" y1="${y}" y2="${y}"/>`).join('')}
    ${[['Q1', 95], ['Q2', 60], ['Q3', 52], ['Q4', 50]].map(([l, y], i) => `<rect x="${62 + i * 62}" y="${y}" width="30" height="${120 - y}" rx="3" fill="var(--brand)" opacity=".85"/><text x="${77 + i * 62}" y="138" text-anchor="middle">${l}</text>`).join('')}
    <text x="34" y="34" text-anchor="end">300</text><text x="34" y="94" text-anchor="end">100</text><text x="34" y="124" text-anchor="end">0</text>
  </svg>`;

  const answerUI = (q, i) => {
    const a = S.exam.answers[i];
    const L = 'ABCDEFGH';
    if (q.type === 'single' || q.type === 'tf') return `<div class="stack" role="radiogroup">${q.opts.map((o, j) => `<button class="choice ${a === j ? 'on' : ''}" role="radio" aria-checked="${a === j}" data-action="ans" data-q="${i}" data-v="${j}"><span class="k">${q.type === 'tf' ? (j ? 'S' : 'B') : L[j]}</span><span>${o}</span></button>`).join('')}</div>`;
    if (q.type === 'multi') { const arr = a || []; return `<div class="stack"><span class="xs dim">Pilih satu atau lebih jawaban.</span>${q.opts.map((o, j) => `<button class="choice sq ${arr.includes(j) ? 'on' : ''}" role="checkbox" aria-checked="${arr.includes(j)}" data-action="ansMulti" data-q="${i}" data-v="${j}"><span class="k">${arr.includes(j) ? '✓' : L[j]}</span><span>${o}</span></button>`).join('')}</div>`; }
    if (q.type === 'blank' || q.type === 'short' || q.type === 'numeric') return `<div class="field" style="max-width:420px"><label class="label" for="ans-${i}">Jawaban</label><input id="ans-${i}" class="input ${q.type === 'numeric' ? 'num' : ''}" ${q.type === 'numeric' ? 'inputmode="decimal"' : ''} placeholder="${q.placeholder}" value="${esc(a || '')}" data-bind="ansText" data-q="${i}" autocomplete="off"></div>`;
    if (q.type === 'essay') { const w = (a || '').trim().split(/\s+/).filter(Boolean).length; return `<div class="field"><div class="rte-bar" aria-hidden="true"><button>B</button><button><i>I</i></button><button>•</button><button>1.</button></div><textarea id="ans-${i}" class="textarea" style="min-height:240px" placeholder="${q.placeholder}" data-bind="ansText" data-q="${i}">${esc(a || '')}</textarea><div class="row-between"><span class="hint">Dinilai penguji dengan rubrik · bobot ${q.pts} poin</span><span class="hint num" id="wc">${w} kata</span></div></div>`; }
    if (q.type === 'order') { const ord = a || q.items.map((_, j) => j); return `<div class="stack" style="gap:8px"><span class="xs dim">Gunakan tombol panah untuk mengubah urutan.</span>${ord.map((j, pos) => `<div class="order-item"><span class="pos">${pos + 1}</span><span class="grow">${q.items[j]}</span><button class="icon-btn" aria-label="Naik" data-action="ordMove" data-q="${i}" data-p="${pos}" data-d="-1" ${pos === 0 ? 'disabled' : ''}>${ic('up')}</button><button class="icon-btn" aria-label="Turun" data-action="ordMove" data-q="${i}" data-p="${pos}" data-d="1" ${pos === ord.length - 1 ? 'disabled' : ''}>${ic('down')}</button></div>`).join('')}</div>`; }
    if (q.type === 'match') { const m = a || {}; return `<div class="stack" style="gap:10px">${q.left.map((l, j) => `<div class="match-row"><div class="panel" style="padding:10px 14px;font-weight:600">${l}</div><select class="select" data-change="ansMatch" data-q="${i}" data-i="${j}" aria-label="Pasangan untuk ${l}"><option value="">Pilih pasangan…</option>${q.right.map((r, k) => `<option value="${k}" ${String(m[j]) === String(k) ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`).join('')}</div>`; }
    return '';
  };

  const autosaveHTML = () => {
    const s = S.exam.saved;
    const t = S.exam.savedAt ? S.exam.savedAt.toLocaleTimeString(App.locale()) : '';
    if (S.exam.offline) return `<span class="autosave offline" id="autosave"><span class="live"></span>Offline · disimpan di perangkat</span>`;
    return `<span class="autosave ${s === 'saving' ? 'saving' : ''}" id="autosave"><span class="live"></span>${s === 'saving' ? 'Menyimpan…' : t ? 'Tersimpan ' + t : 'Tersimpan otomatis'}</span>`;
  };

  const navigator = () => `
    <section class="card card-pad stack">
      <div class="row-between"><h4>Navigasi soal</h4><button class="icon-btn ews-mobile-nav" data-action="toggleNav" aria-label="Tutup">${ic('x')}</button></div>
      <div class="nav-grid">${Q().map((_, i) => `<button class="nav-q ${answered(i) ? 'ans' : ''} ${S.exam.flags[i] ? 'flag' : ''} ${S.exam.cur === i ? 'cur' : ''}" data-action="gotoQ" data-q="${i}" aria-label="Soal ${i + 1}${answered(i) ? ', terjawab' : ''}${S.exam.flags[i] ? ', ditandai' : ''}">${i + 1}</button>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--teal)"></i>Terjawab ${answeredCount()}</span><span><i style="background:var(--warning);border-radius:50%"></i>Ditandai ${Object.values(S.exam.flags).filter(Boolean).length}</span><span><i style="background:var(--surface-3);border:1px solid var(--border-strong)"></i>Belum ${Q().length - answeredCount()}</span></div>
    </section>
    <section class="card card-pad stack small">
      <div class="row-between"><span class="muted">Peserta</span><b>${esc(S.identity.name)}</b></div>
      <div class="row-between"><span class="muted">No. peserta</span><span class="mono">PAR-2026-00418</span></div>
      <div class="row-between"><span class="muted">Attempt</span><span>1 dari 3 · ATT-58213</span></div>
      <div class="row-between"><span class="muted">Koneksi</span>${S.exam.offline ? pill('Terputus', 'danger') : pill('Stabil', 'success')}</div>
      <p class="xs dim">Sisa waktu mengikuti jam server. Jika koneksi terputus, lanjutkan dari perangkat ini atau perangkat lain.</p>
    </section>
    <button class="btn btn-primary btn-block" data-action="submitExam">${ic('send')} Kirim jawaban</button>`;

  App.routes['p-exam'] = () => {
    if (!S.exam.started) { S.exam.started = true; }
    if (S.exam.submitted) return App.routes['p-result']();
    const i = S.exam.cur; const q = Q()[i];
    const low = S.exam.remaining <= 300;
    return `<div class="ews">
      <header class="ews-top">
        <div class="ews-top-inner">
          <div class="logo">TN</div>
          <div class="grow" style="min-width:0"><div style="font:650 var(--fs-md) var(--font-display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(D.exam.short)}</div><div class="xs dim hide-sm">${esc(S.identity.name)} · PAR-2026-00418</div></div>
          <span class="hide-sm">${autosaveHTML()}</span>
          ${App.langToggle('hide-sm')}
          <span class="timer ${low ? 'low' : ''}" id="timer" role="timer" aria-label="Sisa waktu">${ic('clock', 'ic-sm')}<span id="timer-v">${fmtTime(S.exam.remaining)}</span></span>
          <button class="btn btn-secondary btn-sm ews-mobile-nav" data-action="toggleNav">${ic('grid', 'ic-sm')} ${answeredCount()}/${Q().length}</button>
          <button class="btn btn-primary btn-sm hide-sm" data-action="submitExam">Kirim</button>
        </div>
        <div class="ews-progress"><span style="width:${(answeredCount() / Q().length) * 100}%"></span></div>
      </header>
      ${S.exam.tabSwitch ? `<div style="max-width:1320px;margin:12px auto 0;width:100%;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px))"><div class="callout callout-warning">${ic('alert')}<div class="small">Anda meninggalkan halaman ujian ${S.exam.tabSwitch}× . Ini dicatat sebagai sinyal integritas untuk peninjauan, bukan sebagai pelanggaran otomatis.</div></div></div>` : ''}
      ${S.exam.offline ? `<div style="max-width:1320px;margin:12px auto 0;width:100%;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px))"><div class="callout callout-danger">${ic('wifi')}<div class="small"><b>Koneksi terputus.</b> Jawaban disimpan sementara di perangkat dan akan dikirim otomatis saat koneksi pulih. Waktu tetap berjalan.</div></div></div>` : ''}
      <div class="ews-body">
        <div class="stack-lg">
          <section class="card q-card">
            <div class="row-between">
              <div class="row"><span class="eyebrow">Soal ${i + 1} dari ${Q().length}</span><span class="tag">${q.label}</span><span class="tag">${q.pts} poin</span></div>
              <button class="btn ${S.exam.flags[i] ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-action="flagQ" aria-pressed="${!!S.exam.flags[i]}" style="${S.exam.flags[i] ? 'color:var(--warning);border-color:var(--warning)' : ''}">${ic('flag', 'ic-sm')} ${S.exam.flags[i] ? 'Ditandai' : 'Tandai untuk ditinjau'}</button>
            </div>
            <div class="q-text">${q.text}</div>
            ${q.chart ? miniChart() : ''}
            ${answerUI(q, i)}
          </section>
          <div class="row-between">
            <button class="btn btn-secondary" data-action="prevQ" ${i === 0 ? 'disabled' : ''}>${ic('chevL')} Sebelumnya</button>
            ${i === Q().length - 1 ? `<button class="btn btn-primary" data-action="submitExam">Tinjau &amp; kirim ${ic('send')}</button>` : `<button class="btn btn-primary" data-action="nextQ">Berikutnya ${ic('chevR')}</button>`}
          </div>
          <span class="show-sm" style="justify-content:center">${autosaveHTML().replace('id="autosave"', '')}</span>
        </div>
        <aside class="ews-side ${S.navOpenExam ? 'open' : ''}">${navigator()}</aside>
      </div>
      ${S.navOpenExam ? '<div class="overlay" style="z-index:55;background:rgba(5,12,28,.35)" data-action="toggleNav"></div>' : ''}
      <div class="proto-fab" style="bottom:max(16px, env(safe-area-inset-bottom, 0px))"><button class="btn btn-secondary btn-sm" data-go="home">${ic('grid', 'ic-sm')} Peta</button><button class="btn btn-secondary btn-sm" data-action="simOffline">${ic('wifi', 'ic-sm')} ${S.exam.offline ? 'Pulihkan koneksi' : 'Simulasi offline'}</button><button class="btn btn-secondary btn-sm" data-action="simLow">${ic('clock', 'ic-sm')} 5 menit terakhir</button></div>
    </div>`;
  };

  const markSaved = () => {
    S.exam.saved = 'saving';
    const el = document.getElementById('autosave');
    if (el && !S.exam.offline) el.outerHTML = autosaveHTML();
    clearTimeout(App._saveT);
    App._saveT = setTimeout(() => { S.exam.saved = 'saved'; S.exam.savedAt = new Date(); const e2 = document.getElementById('autosave'); if (e2) e2.outerHTML = autosaveHTML(); }, 650);
  };
  App.actions.ans = (el) => { S.exam.answers[el.dataset.q] = +el.dataset.v; App.rerender(); markSaved(); };
  App.actions.ansMulti = (el) => { const q = el.dataset.q; const v = +el.dataset.v; const arr = S.exam.answers[q] || []; S.exam.answers[q] = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort(); App.rerender(); markSaved(); };
  App.binds.ansText = (el) => {
    const q = +el.dataset.q; const was = answered(q);
    S.exam.answers[q] = el.value;
    const wc = document.getElementById('wc'); if (wc) wc.textContent = el.value.trim().split(/\s+/).filter(Boolean).length + ' kata';
    if (was !== answered(q)) { const nb = document.querySelector(`.nav-q[data-q="${q}"]`); if (nb) nb.classList.toggle('ans', answered(q)); const p = document.querySelector('.ews-progress span'); if (p) p.style.width = (answeredCount() / Q().length) * 100 + '%'; }
    clearTimeout(App._debT); App._debT = setTimeout(markSaved, 500);
  };
  App.actions.ordMove = (el) => { const q = +el.dataset.q; const item = Q()[q]; const ord = (S.exam.answers[q] || item.items.map((_, j) => j)).slice(); const p = +el.dataset.p; const d = +el.dataset.d; [ord[p], ord[p + d]] = [ord[p + d], ord[p]]; S.exam.answers[q] = ord; App.rerender(); markSaved(); };
  App.changes.ansMatch = (el) => { const q = +el.dataset.q; const m = { ...(S.exam.answers[q] || {}) }; if (el.value === '') delete m[el.dataset.i]; else m[el.dataset.i] = +el.value; S.exam.answers[q] = m; App.rerender(); markSaved(); };
  App.actions.flagQ = () => { S.exam.flags[S.exam.cur] = !S.exam.flags[S.exam.cur]; App.rerender(); };
  App.actions.gotoQ = (el) => { S.exam.cur = +el.dataset.q; S.navOpenExam = false; App.render(); };
  App.actions.prevQ = () => { S.exam.cur = Math.max(0, S.exam.cur - 1); App.render(); };
  App.actions.nextQ = () => { S.exam.cur = Math.min(Q().length - 1, S.exam.cur + 1); App.render(); };
  App.actions.toggleNav = () => { S.navOpenExam = !S.navOpenExam; App.rerender(); };
  App.actions.simOffline = () => { S.exam.offline = !S.exam.offline; App.rerender(); if (!S.exam.offline) { App.toast('Koneksi pulih · 2 jawaban disinkronkan', 'wifi'); markSaved(); } };
  App.actions.simLow = () => { S.exam.remaining = 301; App.rerender(); };

  App.actions.submitExam = () => {
    const un = Q().map((_, i) => i).filter((i) => !answered(i));
    const fl = Object.keys(S.exam.flags).filter((k) => S.exam.flags[k]).map(Number);
    App.modal(`${App.modalHead('Kirim jawaban sekarang?', 'Setelah dikirim, jawaban tidak dapat diubah.')}
      <div class="modal-body">
        <div class="grid g3" style="gap:10px">
          <div class="panel"><div class="eyebrow">Terjawab</div><div style="font:700 1.5rem var(--font-display)" class="num">${answeredCount()}</div></div>
          <div class="panel"><div class="eyebrow">Belum</div><div style="font:700 1.5rem var(--font-display);color:${un.length ? 'var(--danger)' : 'inherit'}" class="num">${un.length}</div></div>
          <div class="panel"><div class="eyebrow">Ditandai</div><div style="font:700 1.5rem var(--font-display);color:${fl.length ? 'var(--warning)' : 'inherit'}" class="num">${fl.length}</div></div>
        </div>
        ${un.length ? `<div class="callout callout-warning">${ic('alert')}<div class="small">Soal belum dijawab: ${un.map((i) => `<button class="btn btn-ghost btn-sm" data-action="gotoQClose" data-q="${i}">${i + 1}</button>`).join(' ')}</div></div>` : ''}
        ${fl.length ? `<div class="small muted">Soal ditandai: ${fl.map((i) => `<button class="btn btn-ghost btn-sm" data-action="gotoQClose" data-q="${i}">${i + 1}</button>`).join(' ')}</div>` : ''}
        <p class="small muted">Sisa waktu <b class="num">${fmtTime(S.exam.remaining)}</b>. Anda masih dapat kembali dan memeriksa jawaban.</p>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Kembali ke soal</button><button class="btn btn-primary" data-action="confirmSubmit">${ic('send')} Kirim jawaban</button></div>`);
  };
  App.actions.gotoQClose = (el) => { App.closeModal(); App.actions.gotoQ(el); };
  App.actions.confirmSubmit = (auto) => {
    App.closeModal();
    S.exam.submitted = true; S.exam.submittedAt = new Date(); S.resultScenario = 'pending';
    App.go('p-result');
    App.toast(auto === true ? 'Waktu habis · jawaban terkirim otomatis' : 'Jawaban terkirim · ATT-58213', 'send');
  };

  /* Sinyal integritas: perpindahan tab */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && App.route() === 'p-exam' && S.exam.started && !S.exam.submitted) { S.exam.tabSwitch++; setTimeout(() => App.rerender(), 50); }
  });

  /* Jam global: timer ujian & cooldown OTP */
  setInterval(() => {
    const r = App.route();
    if (S.exam.started && !S.exam.submitted) {
      S.exam.remaining = Math.max(0, S.exam.remaining - 1);
      if (r === 'p-exam') {
        const v = document.getElementById('timer-v'); if (v) v.textContent = fmtTime(S.exam.remaining);
        const t = document.getElementById('timer'); if (t) t.classList.toggle('low', S.exam.remaining <= 300);
      }
      if (S.exam.remaining === 0) App.actions.confirmSubmit(true);
    }
    ['email', 'phone'].forEach((k) => {
      const o = S.otp[k];
      if (o.cooldown > 0) {
        o.cooldown--;
        if (r === 'p-otp') { const el = document.querySelector(`[data-cd="${k}"]`); if (el) { el.textContent = o.cooldown > 0 ? `Kirim ulang (${o.cooldown} d)` : 'Kirim ulang'; if (o.cooldown === 0) el.parentElement.disabled = false; } }
      }
    });
  }, 1000);

  /* ---------- 8. Hasil ---------- */
  const ring = (score, tone) => {
    const r = 54, c = 2 * Math.PI * r, pct = score == null ? 0 : score / 100;
    return `<svg class="score-ring" viewBox="0 0 132 132" role="img" aria-label="Nilai ${score == null ? 'belum tersedia' : score}">
      <circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="11"/>
      ${score == null ? '' : `<circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--${tone})" stroke-width="11" stroke-linecap="round" stroke-dasharray="${c * pct} ${c}" transform="rotate(-90 66 66)"/>`}
      <line x1="66" y1="6" x2="66" y2="18" stroke="var(--fg-3)" stroke-width="2" transform="rotate(${0.7 * 360} 66 66)"/>
      <text x="66" y="70" text-anchor="middle" font-size="32" font-weight="800" fill="var(--fg)">${score == null ? '—' : score}</text>
      <text x="66" y="90" text-anchor="middle" font-size="11" fill="var(--fg-3)">dari 100</text>
    </svg>`;
  };
  const comps = (vals) => `<div class="stack" style="gap:10px">${[['Statistik Deskriptif', vals[0]], ['SQL', vals[1]], ['Metodologi', vals[2]], ['Visualisasi', vals[3]], ['Problem Solving (essay)', vals[4]]].map(([n, v]) => `<div class="stack" style="gap:4px"><div class="row-between small"><span>${n}</span><span class="num ${v == null ? 'dim' : ''}">${v == null ? 'Menunggu penilaian' : v + '%'}</span></div><div class="progress"><span style="width:${v || 0}%;background:${v == null ? 'transparent' : v >= 70 ? 'var(--teal)' : 'var(--warning)'}"></span></div></div>`).join('')}</div>`;

  App.routes['p-result'] = () => {
    const sc = S.resultScenario;
    const seg = `<div class="row small"><span class="muted">Skenario prototipe:</span><div class="seg" role="group">${[['pending', 'Menunggu penilaian'], ['pass', 'Lulus'], ['fail', 'Tidak lulus']].map(([k, l]) => `<button class="${sc === k ? 'on' : ''}" data-action="scenario" data-v="${k}">${l}</button>`).join('')}</div></div>`;
    const tl = (steps) => `<div class="timeline">${steps.map(([t, d, cls]) => `<div class="tl-item"><span class="tl-dot ${cls}"></span><div><div class="small" style="font-weight:600">${t}</div><div class="xs dim">${d}</div></div></div>`).join('')}</div>`;
    let head, side, extra = '';
    if (sc === 'pending') {
      head = `<div class="row" style="gap:24px;align-items:center">${ring(null, 'warning')}<div class="stack" style="gap:8px">${status('Pending Review')}<h2>Jawaban terkirim, menunggu penilaian</h2><p class="muted small" style="max-width:52ch">Soal objektif sudah dinilai otomatis. Nilai akhir tampil setelah penguji menilai soal essay. Perkiraan 2 hari kerja.</p></div></div>`;
      side = tl([['Jawaban terkirim', '21 Nov 2026 · 10:31 WIB', 's'], ['Penilaian otomatis', '9 soal objektif · 17 dari 20 poin', 's'], ['Penilaian penguji', 'Soal 10 · essay (12 poin)', 'w'], ['Nilai akhir & kelulusan', 'Setelah penilaian penguji', ''], ['Sertifikat', 'Jika memenuhi syarat', '']]);
      extra = comps([100, 67, 100, 100, null]);
    } else if (sc === 'pass') {
      head = `<div class="row" style="gap:24px;align-items:center">${ring(84, 'success')}<div class="stack" style="gap:8px">${status('Lulus')}<h2>Selamat, Anda lulus</h2><p class="muted small">Nilai 84 · batas lulus 70 · attempt ke-1. Kebijakan nilai: Pass once.</p></div></div>`;
      side = tl([['Jawaban terkirim', '21 Nov 2026 · 10:31 WIB', 's'], ['Penilaian otomatis', '17 dari 20 poin', 's'], ['Penilaian penguji', 'Essay 9 dari 12 · Dewanti L.', 's'], ['Dinyatakan lulus', '22 Nov 2026 · 14:05', 's'], ['Sertifikat kompetensi', 'Menunggu persetujuan Certificate Admin', 'w']]);
      extra = comps([100, 67, 100, 100, 75]) + `<div class="callout callout-success" style="margin-top:16px">${ic('award')}<div class="small">Anda memenuhi syarat <b>Certificate of Competency</b>. Sertifikat diterbitkan setelah disetujui admin, lalu muncul di menu Sertifikat.</div></div>`;
    } else {
      head = `<div class="row" style="gap:24px;align-items:center">${ring(62, 'danger')}<div class="stack" style="gap:8px">${status('Tidak Lulus')}<h2>Belum mencapai nilai lulus</h2><p class="muted small">Nilai 62 · batas lulus 70 · attempt ke-1 dari 3.</p></div></div>`;
      side = S.retakeRequested
        ? tl([['Pengajuan retake terkirim', 'Hari ini · ' + new Date().toLocaleTimeString(App.locale(), { hour: '2-digit', minute: '2-digit' }), 's'], ['Persetujuan admin', 'Biasanya 1 hari kerja', 'w'], ['Masa tunggu berakhir', '22 Nov 2026 · 10:31 WIB', ''], ['Attempt ke-2 tersedia', 'Voucher yang sama · tanpa biaya tambahan', '']])
        : `<div class="stack"><h4>Ujian ulang (retake)</h4>
           <div class="gate">
             <div class="gate-row">${ic('checkCircle', 'ok')}<div>Retake diizinkan · sisa 2 attempt</div></div>
             <div class="gate-row">${ic('clock', 'wait')}<div><div>Masa tunggu 24 jam</div><div class="xs dim">Dapat dimulai setelah 22 Nov 2026 · 10:31 WIB</div></div></div>
             <div class="gate-row">${ic('shield', 'wait')}<div><div>Memerlukan persetujuan admin</div><div class="xs dim">Tidak perlu voucher tambahan</div></div></div>
           </div>
           <button class="btn btn-primary" data-action="requestRetake">${ic('repeat')} Ajukan retake</button>
           <p class="xs dim">Semua attempt tetap tersimpan di histori. Soal pada attempt berikutnya diacak ulang.</p></div>`;
      extra = comps([75, 33, 67, 50, 58]);
    }
    return shell('p-dashboard', `
      ${seg}
      <div class="stack" style="gap:4px"><span class="eyebrow">Hasil ujian · ATT-58213</span><h1 style="font-size:var(--fs-xl)">${esc(D.exam.title)}</h1></div>
      <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start" id="res-grid">
        <section class="card card-pad stack-lg">${head}<hr class="hr"><div class="stack"><h4>Capaian per kompetensi</h4>${extra}</div></section>
        <section class="card card-pad stack">${sc === 'fail' && !S.retakeRequested ? side : `<h4>Status proses</h4>${side}`}</section>
      </div>
      <div class="row"><button class="btn btn-secondary" data-go="p-history">${ic('clock')} Histori ujian</button>${sc === 'pass' ? `<button class="btn btn-secondary" data-go="p-certs">${ic('award')} Sertifikat saya</button>` : ''}<button class="btn btn-ghost" data-go="p-dashboard">Kembali ke beranda</button></div>
      <style>@media (max-width: 860px){ #res-grid{ grid-template-columns:minmax(0,1fr) !important; } }</style>`);
  };
  App.actions.scenario = (el) => { S.resultScenario = el.dataset.v; App.rerender(); };
  App.actions.requestRetake = () => App.confirm({ title: 'Ajukan ujian ulang?', body: 'Pengajuan dikirim ke admin. Attempt ke-2 dapat dimulai setelah disetujui dan masa tunggu 24 jam berakhir.', confirmText: 'Ajukan retake', onOk: () => { S.retakeRequested = true; App.rerender(); App.toast('Pengajuan retake terkirim'); } });

  /* ---------- 9. Histori ---------- */
  App.routes['p-history'] = () => {
    const rows = D.history.map((h, i) => {
      const live = i === 0 && S.exam.submitted && S.resultScenario !== 'pending';
      const score = live ? (S.resultScenario === 'pass' ? 84 : 62) : h.score;
      const grading = live ? 'Graded' : h.grading;
      const result = live ? (S.resultScenario === 'pass' ? 'Lulus' : 'Tidak Lulus') : h.result;
      return `<tr>
        <td><div class="cell-title">${h.date}</div><div class="cell-sub num">${h.time}</div></td>
        <td><div class="cell-title">${h.training}</div><div class="cell-sub">${h.exam}</div></td>
        <td class="num">${h.attempt}</td>
        <td class="num" style="font-weight:600">${score == null ? '<span class="dim">—</span>' : score}</td>
        <td>${status(grading)}</td>
        <td>${status(result)}</td>
        <td class="num">${h.dur}</td>
        <td>${h.cert ? `<button class="btn btn-ghost btn-sm" data-go="p-certs">${ic('award', 'ic-sm')} <span class="mono xs">${h.cert}</span></button>` : `<span class="xs dim">${result === 'Lulus' ? 'Diproses' : 'Belum tersedia'}</span>`}</td>
      </tr>`;
    }).join('');
    return shell('p-history', `
      <div class="page-head"><div><h1>Histori ujian</h1><p>Semua attempt, termasuk ujian ulang, tersusun dari yang terbaru. Essay yang belum dinilai tampil sebagai Pending Review, bukan nilai 0.</p></div></div>
      <section class="card"><div class="table-wrap"><table class="table">
        <thead><tr><th>Tanggal</th><th>Pelatihan &amp; ujian</th><th>Attempt</th><th>Nilai</th><th>Penilaian</th><th>Hasil</th><th>Durasi</th><th>Sertifikat</th></tr></thead>
        <tbody>${rows}</tbody></table></div></section>`);
  };

  App.routes['p-certs'] = () => {
    const pass = S.exam.submitted && S.resultScenario === 'pass';
    return shell('p-certs', `
      <div class="page-head"><div><h1>Sertifikat saya</h1><p>Unduh sertifikat yang menjadi hak Anda. Setiap sertifikat dapat diverifikasi publik melalui QR Code.</p></div></div>
      <div class="grid g2">
        <section class="card card-pad stack">
          ${App.certHTML({ name: S.identity.name, title: 'Certificate of Attendance', training: 'Cyber Security Awareness', no: 'LSPTN/CS/2026/00488', date: '29 Oktober 2026' })}
          <div class="row-between"><div><div class="cell-title">Cyber Security Awareness</div><div class="xs dim mono">LSPTN/CS/2026/00488 · tanpa masa berlaku</div></div>${status('VALID', 'Berlaku')}</div>
          <div class="row"><button class="btn btn-primary btn-sm" data-action="dlCert">${ic('download', 'ic-sm')} Unduh PDF</button><button class="btn btn-secondary btn-sm" data-go="verify">${ic('shield', 'ic-sm')} Halaman verifikasi</button><button class="btn btn-ghost btn-sm" data-action="copyLink">${ic('globe', 'ic-sm')} Salin tautan</button></div>
        </section>
        <section class="card card-pad stack">
          ${App.certHTML({ name: S.identity.name, title: 'Certificate of Attendance', training: 'K3 Perkantoran Dasar', no: 'LSPTN/K3/2026/00211', date: '14 Agustus 2026' })}
          <div class="row-between"><div><div class="cell-title">K3 Perkantoran Dasar</div><div class="xs dim mono">LSPTN/K3/2026/00211 · berlaku s/d 14 Agu 2029</div></div>${status('VALID', 'Berlaku')}</div>
          <div class="row"><button class="btn btn-primary btn-sm" data-action="dlCert">${ic('download', 'ic-sm')} Unduh PDF</button><button class="btn btn-secondary btn-sm" data-go="verify">${ic('shield', 'ic-sm')} Halaman verifikasi</button></div>
        </section>
      </div>
      <section class="card card-pad row" style="flex-wrap:nowrap;align-items:flex-start">
        <div style="width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--warning-soft);color:var(--warning);flex:none">${ic('clock')}</div>
        <div class="grow stack" style="gap:4px"><div class="row-between"><h4>Data Analyst Associate · Certificate of Competency</h4>${pass ? status('PENDING_APPROVAL', 'Menunggu persetujuan') : pill('Belum tersedia', 'muted')}</div>
        <p class="small muted">${pass ? 'Anda lulus ujian teori. Sertifikat sedang ditinjau Certificate Admin dan akan muncul di sini setelah diterbitkan.' : 'Sertifikat tersedia setelah ujian teori dan praktik dinyatakan lulus.'}</p></div>
      </section>`);
  };
  App.actions.dlCert = () => App.toast('Prototipe: unduhan PDF sertifikat', 'download');
  App.actions.copyLink = (el) => {
    const link = 'https://verify.lsptn.id/c/v_8Kq2Zr41mX';
    try { navigator.clipboard.writeText(link).then(() => App.toast('Tautan verifikasi disalin'), () => App.toast(link, 'globe')); } catch (e) { App.toast(link, 'globe'); }
  };

  /* ---------- 10. Profil ---------- */
  App.routes['p-profile'] = () => shell('p-profile', `
    <div class="page-head"><div><h1>Profil &amp; kontak</h1><p>Perubahan email atau nomor telepon wajib diverifikasi ulang dengan OTP.</p></div></div>
    <div class="grid g2" style="align-items:start">
      <section class="card card-pad stack-lg">
        <div class="row"><div class="avatar" style="width:52px;height:52px;font-size:16px">${App.initials(S.identity.name)}</div><div><h3>${esc(S.identity.name)}</h3><div class="small muted mono">PAR-2026-00418</div></div></div>
        <dl class="dl"><dt>Institusi</dt><dd>Universitas Padjadjaran</dd><dt>Terdaftar</dt><dd>3 Nov 2026</dd><dt>Bahasa</dt><dd>Bahasa Indonesia</dd><dt>Zona waktu</dt><dd>${D.org.tz}</dd></dl>
        <p class="xs dim">Nama pada sertifikat hanya dapat diubah melalui admin dengan dokumen pendukung.</p>
      </section>
      <section class="card">
        <div class="card-head"><h3>Kontak</h3><button class="btn btn-secondary btn-sm" data-action="addContact">${ic('plus', 'ic-sm')} Tambah</button></div>
        <div class="card-body stack">
          ${[['mail', S.identity.email, 'Email utama', true], ['phone', S.identity.phone, 'Telepon utama · WhatsApp', true], ['mail', 'nadia.pa@unpad.ac.id', 'Email kampus', false]].map(([i, v, l, ok]) => `<div class="row" style="flex-wrap:nowrap">${ic(i)}<div class="grow"><div class="cell-title" style="overflow-wrap:anywhere">${esc(v)}</div><div class="xs dim">${l}</div></div>${ok ? pill('Terverifikasi', 'success') : `<button class="btn btn-secondary btn-sm" data-action="addContact">Verifikasi</button>`}</div>`).join('<hr class="hr">')}
        </div>
      </section>
    </div>`);
  App.actions.addContact = () => App.modal(`${App.modalHead('Verifikasi kontak baru', 'Kode dikirim ke kontak yang ingin ditambahkan.')}
    <div class="modal-body"><div class="field"><label class="label" for="nc">Email atau nomor telepon</label><input id="nc" class="input" value="nadia.pa@unpad.ac.id"></div>
    <div class="field"><span class="label">Kode OTP</span><div class="otp">${[0, 1, 2, 3, 4, 5].map((i) => `<input inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}">`).join('')}</div><span class="hint">Berlaku 5 menit · kirim ulang setelah 60 detik</span></div></div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="contactOk">Verifikasi</button></div>`);
  App.actions.contactOk = () => { App.closeModal(); App.toast('Kontak terverifikasi'); };
})();
