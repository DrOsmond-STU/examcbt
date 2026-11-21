/* TACMS — Aktivasi voucher peserta & portal peserta yang tersambung ke enrollment (versi ter-deploy).
   Alur: voucher → identitas → OTP email & telepon → ikat voucher → dashboard ujian asli.
   Semua keputusan dibuat server (api/activation.php, api/participant.php). */
(function () {
  const SES = window.SESSION;
  if (!SES) return;
  const isGuest = !SES.user;
  const isP = SES.user && SES.user.role === 'participant';
  if (!isGuest && !isP) return;
  const S = App.state;
  const { ic, esc, pill } = App;

  const blankOtp = () => ({ code: '', verified: false, err: '', left: 5, resendAt: 0 });
  const A = (S.act = { code: '', err: '', busy: false, voucher: null, until: 0, targets: null, channel: 'WhatsApp', demo: null, sent: null,
    otp: { email: blankOtp(), phone: blankOtp() }, id: { name: '', email: '', phone: '' }, restored: false,
    login: { email: '', sent: false, demo: null, code: '', err: '', target: '' }, me: null, meLoading: false, meErr: '' });

  const ERR = {
    invalid: 'Kode voucher tidak dapat digunakan. Periksa kembali penulisan atau hubungi penyelenggara pelatihan Anda.',
    bound: 'Voucher ini sudah diaktifkan. Jika ini voucher Anda, masuk dengan OTP.',
    unpaid: 'Voucher ini belum dapat digunakan karena pembayaran order belum terverifikasi. Hubungi penyelenggara pelatihan.',
    expired: 'Masa berlaku voucher ini sudah habis.',
    reserved: 'Voucher ini sedang dalam proses aktivasi di perangkat lain. Coba lagi dalam 15 menit.',
    other: 'Voucher ini dialokasikan untuk peserta lain.',
    expired_reservation: 'Waktu reservasi voucher habis. Masukkan kode voucher lagi.',
    name: 'Nama lengkap 2–80 karakter.', email: 'Format email tidak valid.', phone: 'Nomor telepon tidak valid.',
    mismatch: 'Email tidak cocok dengan data enrollment untuk voucher ini. Gunakan email yang didaftarkan penyelenggara pelatihan.',
    otp_expired: 'Kode sudah kedaluwarsa. Kirim ulang kode.', otp_locked: 'Batas percobaan tercapai. Kirim ulang kode.', otp_none: 'Minta kode terlebih dahulu.',
    not_verified: 'Verifikasi email dan nomor telepon terlebih dahulu.', no_otp: 'Minta kode terlebih dahulu.',
    csrf: 'Sesi halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.', network: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
  };
  const errText = (j) => {
    if (j.error === 'locked') return `Terlalu banyak percobaan. Coba lagi dalam ${j.minutes} menit.`;
    if (j.error === 'otp_wrong') return j.triesLeft > 0 ? `Kode salah. Sisa ${j.triesLeft} percobaan.` : 'Kode salah.';
    if (j.error === 'cooldown') return `Tunggu ${j.seconds} detik sebelum mengirim ulang.`;
    return ERR[j.error] || 'Terjadi kesalahan di server. Coba lagi.';
  };
  const ensureCsrf = async () => {
    if (SES.csrf) return;
    try { const j = await (await fetch('api/csrf.php', { credentials: 'same-origin', cache: 'no-store' })).json(); SES.csrf = j.csrf; } catch (e) {}
  };
  const post = async (body) => {
    await ensureCsrf();
    let j = await App.api('api/activation.php', body);
    if (j.error === 'csrf') { SES.csrf = null; await ensureCsrf(); j = await App.api('api/activation.php', body); }
    return j;
  };
  const reloadAt = (route) => { history.replaceState(null, '', location.pathname + location.search + '#' + route); location.reload(); };
  const fmtSched = (v) => {
    if (!v || !v.start) return '';
    const o = { timeZone: v.tz };
    const tz = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' }[v.tz] || '';
    const d = (x, long) => new Date(x).toLocaleDateString(App.locale(), { ...o, ...(long ? { weekday: 'long' } : {}), day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' });
    const t = (x) => new Date(x).toLocaleTimeString(App.locale(), { ...o, hour: '2-digit', minute: '2-digit' });
    if (d(v.start) !== d(v.end)) return `${d(v.start)} ${t(v.start)} – ${d(v.end)} ${t(v.end)} ${tz}`;   // jendela beberapa hari
    return `${d(v.start, true)} · ${t(v.start)}–${t(v.end)} ${tz}`;
  };
  App.fmtSched = fmtSched;
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const left = (t) => Math.max(0, Math.round(t - Date.now() / 1000));
  const page = (body, step) => (isGuest ? App.pPreShell(body, step) : App.pShell('p-dashboard', `<div class="pp-narrow stack-lg">${step != null ? stepsLine(step) : ''}${body}</div>`));
  const stepsLine = (cur) => `<nav class="steps-line" aria-label="Tahapan aktivasi">${['Voucher', 'Identitas', 'Verifikasi OTP', 'Selesai'].map((l, i) => `<span class="${i < cur ? 'done' : i === cur ? 'on' : ''}"><span class="dot">${i < cur ? '✓' : i + 1}</span>${l}</span>`).join('<span class="sep"></span>')}</nav>`;
  const errBox = (m) => (m ? `<div class="callout callout-danger" role="alert">${ic('alert')}<div class="small">${esc(m)}</div></div>` : '');
  const demoBox = (code) => (SES.otpDemo && code ? `<div class="callout callout-warning">${ic('info')}<div class="small"><b>Mode demo.</b> Penyedia email/WhatsApp belum dipasang, jadi kode ditampilkan di sini: <code class="mono" style="font-weight:700;font-size:1rem" data-noi18n>${esc(code)}</code></div></div>` : '');

  // Pulihkan proses aktivasi setelah halaman dimuat ulang
  const restore = async () => {
    if (A.restored) return;
    A.restored = true;
    if (!SES.csrf && isGuest) return;
    const j = await App.api('api/activation.php');
    if (j.ok && j.voucher) {
      A.voucher = j.voucher; A.until = j.reservedUntil;
      if (j.otp) { ['email', 'phone'].forEach((k) => { A.otp[k].verified = j.otp[k].verified; A.otp[k].left = j.otp[k].triesLeft; A.otp[k].resendAt = Date.now() / 1000 + j.otp[k].resendIn; }); A.targets = { email: j.otp.email.target, phone: j.otp.phone.target }; A.demo = j.demo; }
      App.rerender();
    }
  };

  /* ================= 1. Masukkan voucher ================= */
  App.routes['p-start'] = () => page(`
    <div class="stack" style="gap:6px"><h1>Aktivasi voucher ujian</h1><p class="muted">Masukkan kode voucher yang Anda terima dari penyelenggara pelatihan. Kode terdiri dari 12 karakter.</p></div>
    <section class="card card-pad stack-lg">
      ${errBox(A.err)}
      <div class="field"><label class="label" for="vc">Kode voucher</label>
        <input id="vc" class="input input-mono" style="height:50px;font-size:1.125rem" placeholder="TACMS-XXXX-XXXX" maxlength="15" value="${esc(A.code)}" data-bind="actCode" autocomplete="off" spellcheck="false">
        <span class="hint">Huruf besar/kecil tidak berpengaruh. Tanda hubung otomatis ditambahkan.</span></div>
      <button class="btn btn-primary btn-lg btn-block" data-action="actCheck" ${A.busy ? 'disabled' : ''}>${A.busy ? 'Memeriksa…' : 'Periksa voucher'} ${ic('arrowR')}</button>
      <div class="callout callout-info">${ic('info')}<div class="small">Voucher hanya dapat diikat ke <b>peserta yang didaftarkan</b> oleh penyelenggara. Setelah diperiksa, voucher dicadangkan selama 15 menit selagi Anda memverifikasi email dan nomor telepon.</div></div>
    </section>
    ${isGuest ? `<div class="row-between small"><span class="muted">Sudah pernah aktivasi?</span><button class="btn btn-secondary btn-sm" data-go="p-login">Masuk dengan OTP</button></div>
    <div class="row-between small"><span class="muted">Admin atau penguji?</span><button class="btn btn-ghost btn-sm" data-go="login">Masuk dengan akun</button></div>` : ''}`, isGuest ? 0 : null);
  App.after['p-start'] = () => { const el = document.getElementById('vc'); if (el) { el.focus(); el.addEventListener('keydown', (e) => { if (e.key === 'Enter') App.actions.actCheck(); }); } };
  App.binds.actCode = (el) => {
    const v = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
    const f = [v.slice(0, 5), v.slice(5, 9), v.slice(9, 13)].filter(Boolean).join('-');
    if (f !== el.value) el.value = f;
    A.code = f;
  };
  App.actions.actCheck = async () => {
    if (A.busy) return;
    if (A.code.replace(/-/g, '').length !== 13) { A.err = 'Kode voucher wajib diisi lengkap (12 karakter setelah TACMS).'; return App.rerender(); }
    A.busy = true; A.err = ''; App.rerender();
    const j = await post({ action: 'check', code: A.code });
    A.busy = false;
    if (!j.ok) { A.err = errText(j); return App.rerender(); }
    if (j.bound) { App.toast('Voucher diikat ke akun Anda'); A.me = null; A.code = ''; return App.go('p-dashboard'); }
    A.voucher = j.voucher; A.until = j.reservedUntil; A.err = '';
    App.go('p-identity');
  };

  /* ================= 2. Identitas ================= */
  const ticket = () => `<div class="voucher-ticket">
    <div style="width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--g-info);color:#fff;flex:none">${ic('ticket')}</div>
    <div class="grow" style="min-width:0"><div class="mono" style="font-weight:700">${esc(A.voucher.masked)}</div><div class="small muted">${esc(A.voucher.training)} · ${esc(A.voucher.exam)}</div><div class="xs dim">${esc(fmtSched(A.voucher))}</div></div>
    ${pill(`Dicadangkan ${mmss(left(A.until))}`, 'info', 'act-reserve')}
  </div>`;
  App.routes['p-identity'] = () => {
    if (!A.voucher) { setTimeout(restore); return page(`<p class="muted small">Memuat…</p><button class="btn btn-secondary" data-go="p-start">Masukkan voucher</button>`, 1); }
    return page(`
      <div class="stack" style="gap:6px"><h1>Lengkapi identitas</h1><p class="muted">Gunakan email yang didaftarkan penyelenggara pelatihan. Voucher ini dialokasikan untuk <b data-noi18n>${esc(A.voucher.emailHint)}</b>.</p></div>
      ${ticket()}
      <section class="card card-pad stack-lg">
        ${errBox(A.err)}
        <div class="field"><label class="label" for="ai-name">Nama lengkap</label><input id="ai-name" class="input" value="${esc(A.id.name)}" data-bind="actId" data-k="name" autocomplete="name"><span class="hint">Nama ini tercetak di sertifikat.</span></div>
        <div class="field"><label class="label" for="ai-email">Email</label><input id="ai-email" type="email" class="input" value="${esc(A.id.email)}" data-bind="actId" data-k="email" autocomplete="email"></div>
        <div class="field"><label class="label" for="ai-phone">Nomor telepon</label><input id="ai-phone" type="tel" class="input" value="${esc(A.id.phone)}" data-bind="actId" data-k="phone" autocomplete="tel" placeholder="08xx atau +62">
          <div class="row small" style="margin-top:4px"><span class="muted">Kirim OTP telepon melalui</span><div class="seg" role="group">${['WhatsApp', 'SMS'].map((c) => `<button class="${A.channel === c ? 'on' : ''}" data-action="actChannel" data-v="${c}">${c}</button>`).join('')}</div></div></div>
        <label class="check"><input type="checkbox" id="ai-consent" ${A.consent ? 'checked' : ''} data-change="actConsent"><span class="small">Saya menyetujui pemrosesan data pribadi untuk keperluan ujian dan sertifikasi sesuai kebijakan privasi.</span></label>
        <div class="row"><button class="btn btn-secondary" data-action="actRestart">${ic('arrowL')} Ganti voucher</button><button class="btn btn-primary grow" data-action="actIdentity" ${A.busy || !A.consent ? 'disabled' : ''}>${A.busy ? 'Mengirim…' : 'Kirim kode OTP'} ${ic('send')}</button></div>
      </section>`, 1);
  };
  App.binds.actId = (el) => { A.id[el.dataset.k] = el.value; };
  App.changes.actConsent = (el) => { A.consent = el.checked; App.rerender(); };
  App.actions.actChannel = (el) => { A.channel = el.dataset.v; App.rerender(); };
  App.actions.actRestart = () => { A.voucher = null; A.code = ''; A.err = ''; App.go('p-start'); };
  App.actions.actIdentity = async () => {
    if (A.busy) return;
    A.busy = true; A.err = ''; App.rerender();
    const j = await post({ action: 'identity', ...A.id, channel: A.channel });
    A.busy = false;
    if (!j.ok) { A.err = errText(j); if (j.error === 'expired_reservation') { A.voucher = null; App.go('p-start'); return; } return App.rerender(); }
    A.targets = j.targets; A.demo = j.demo; A.sent = j.sent;
    A.otp = { email: blankOtp(), phone: blankOtp() };
    const now = Date.now() / 1000; A.otp.email.resendAt = now + 60; A.otp.phone.resendAt = now + 60;
    App.go('p-otp');
  };

  /* ================= 3. OTP ================= */
  const otpCard = (k) => {
    const o = A.otp[k];
    const title = k === 'email' ? 'Email' : 'Nomor telepon';
    if (o.verified) return `<section class="card card-pad row" style="flex-wrap:nowrap"><div style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--g-success);color:#fff;flex:none">${ic('check')}</div><div class="grow"><h4>${title} terverifikasi</h4><div class="small muted" data-noi18n>${esc(A.targets[k])}</div></div>${pill('Terverifikasi', 'success')}</section>`;
    const cd = left(o.resendAt);
    return `<section class="card card-pad stack">
      <div class="row-between"><div class="row">${ic(k === 'email' ? 'mail' : 'phone')}<h4>${title}</h4></div>${pill(o.left <= 0 ? 'Terkunci' : 'Menunggu kode', o.left <= 0 ? 'danger' : 'warning')}</div>
      <p class="small muted">Kode 6 digit untuk <b data-noi18n>${esc(A.targets[k])}</b>${k === 'phone' ? ` melalui ${esc(A.channel)}` : ''}. Berlaku 5 menit.</p>
      ${demoBox(A.demo && A.demo[k])}
      <div class="row" style="flex-wrap:nowrap"><input id="otp-${k}" class="input input-mono" style="height:48px;font-size:1.25rem;letter-spacing:.3em;max-width:220px" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" value="${esc(o.code)}" data-bind="actOtp" data-k="${k}" aria-label="Kode OTP ${title}">
        <button class="btn btn-primary" data-action="actVerify" data-k="${k}" ${o.left <= 0 ? 'disabled' : ''}>Verifikasi</button></div>
      ${o.err ? `<span class="err" role="alert">${esc(o.err)}</span>` : ''}
      <div class="row-between"><span class="xs dim">Sisa ${o.left} dari 5 percobaan</span><button class="btn btn-ghost btn-sm act-resend" data-action="actResend" data-k="${k}" ${cd > 0 ? 'disabled' : ''}>${ic('refresh', 'ic-sm')} <span>${cd > 0 ? `Kirim ulang (${cd} d)` : 'Kirim ulang'}</span></button></div>
    </section>`;
  };
  App.routes['p-otp'] = () => {
    if (!A.voucher || !A.targets) { setTimeout(restore); return page(`<p class="muted small">Memuat…</p><button class="btn btn-secondary" data-go="p-start">Masukkan voucher</button>`, 2); }
    const both = A.otp.email.verified && A.otp.phone.verified;
    return page(`
      <div class="stack" style="gap:6px"><h1>Verifikasi kontak</h1><p class="muted">Email dan nomor telepon wajib diverifikasi sebelum voucher diikat ke identitas Anda.</p></div>
      ${ticket()}
      ${otpCard('email')}${otpCard('phone')}
      ${errBox(A.err)}
      ${both ? `<div class="callout callout-success">${ic('checkCircle')}<div class="small">Kedua kontak terverifikasi. Voucher siap diikat ke identitas Anda.</div></div>` : ''}
      <button class="btn btn-primary btn-lg btn-block" data-action="actBind" ${both && !A.busy ? '' : 'disabled'}>${A.busy ? 'Memproses…' : 'Ikat voucher & lanjutkan'} ${ic('arrowR')}</button>`, 2);
  };
  App.binds.actOtp = (el) => { el.value = el.value.replace(/\D/g, '').slice(0, 6); A.otp[el.dataset.k].code = el.value; if (el.value.length === 6) App.actions.actVerify({ dataset: { k: el.dataset.k } }); };
  App.actions.actVerify = async (el) => {
    const k = el.dataset.k; const o = A.otp[k];
    if (o.code.length !== 6) { o.err = 'Masukkan 6 digit kode.'; return App.rerender(); }
    const j = await post({ action: 'verify', channel: k, code: o.code });
    if (j.ok) { o.verified = true; o.err = ''; App.toast(`${k === 'email' ? 'Email' : 'Nomor telepon'} terverifikasi`); }
    else { o.err = errText(j); o.code = ''; if (typeof j.triesLeft === 'number') o.left = j.triesLeft; }
    App.rerender();
    const next = document.querySelector('[id^="otp-"]'); if (next) next.focus();
  };
  App.actions.actResend = async (el) => {
    const k = el.dataset.k;
    const j = await post({ action: 'resend', channel: k });
    if (!j.ok) { A.otp[k].err = errText(j); return App.rerender(); }
    A.otp[k] = { ...blankOtp(), resendAt: Date.now() / 1000 + 60 };
    A.demo = { ...(A.demo || {}), [k]: j.demo };
    App.rerender();
    App.toast('Kode baru dibuat. Kode sebelumnya tidak berlaku.', 'send');
  };
  App.actions.actBind = async () => {
    if (A.busy) return;
    A.busy = true; A.err = ''; App.rerender();
    const j = await post({ action: 'bind' });
    A.busy = false;
    if (!j.ok) { A.err = errText(j); return App.rerender(); }
    reloadAt('p-bound');
  };

  /* Hitung mundur reservasi & tombol kirim ulang */
  setInterval(() => {
    const r = App.route();
    if (!['p-identity', 'p-otp'].includes(r)) return;
    const rs = document.querySelector('.act-reserve');
    if (rs && A.until) rs.textContent = App.t(`Dicadangkan ${mmss(left(A.until))}`);
    document.querySelectorAll('.act-resend').forEach((b) => { const s = left(A.otp[b.dataset.k].resendAt); const sp = b.querySelector('span'); if (sp) sp.textContent = App.t(s > 0 ? `Kirim ulang (${s} d)` : 'Kirim ulang'); b.disabled = s > 0; });
  }, 1000);

  /* ================= Masuk dengan OTP ================= */
  App.routes['p-login'] = () => {
    if (!isGuest) { setTimeout(() => App.go('p-dashboard')); return ''; }
    const L = A.login;
    return page(`
      <div class="stack" style="gap:6px"><h1>Masuk peserta</h1><p class="muted">Untuk peserta yang sudah mengaktifkan voucher. Kode masuk dikirim ke email yang sudah terverifikasi.</p></div>
      <section class="card card-pad stack-lg">
        ${errBox(L.err)}
        ${!L.sent ? `<div class="field"><label class="label" for="pl-email">Email</label><input id="pl-email" type="email" class="input" value="${esc(L.email)}" data-bind="plEmail" autocomplete="email"></div>
          <button class="btn btn-primary btn-lg btn-block" data-action="plStart">Kirim kode masuk ${ic('send')}</button>`
        : `<p class="small muted">Jika email <b data-noi18n>${esc(L.target)}</b> terdaftar dan sudah terverifikasi, kode 6 digit telah dibuat. Berlaku 5 menit.</p>
          ${demoBox(L.demo)}
          <div class="field"><label class="label" for="pl-code">Kode masuk</label><input id="pl-code" class="input input-mono" style="height:48px;font-size:1.25rem;letter-spacing:.3em;max-width:220px" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" data-bind="plCode"></div>
          <div class="row"><button class="btn btn-secondary" data-action="plBack">${ic('arrowL')} Ganti email</button><button class="btn btn-primary grow" data-action="plVerify">Masuk</button></div>`}
      </section>
      <div class="row-between small"><span class="muted">Belum aktivasi voucher?</span><button class="btn btn-secondary btn-sm" data-go="p-start">Aktivasi voucher</button></div>`, null);
  };
  App.binds.plEmail = (el) => { A.login.email = el.value; };
  App.binds.plCode = (el) => { el.value = el.value.replace(/\D/g, '').slice(0, 6); A.login.code = el.value; };
  App.actions.plBack = () => { Object.assign(A.login, { sent: false, demo: null, code: '', err: '' }); App.rerender(); };
  App.actions.plStart = async () => {
    const j = await post({ action: 'login_start', email: A.login.email.trim() });
    if (!j.ok) { A.login.err = errText(j); return App.rerender(); }
    Object.assign(A.login, { sent: true, demo: j.demo, target: j.target, err: '' });
    App.rerender();
  };
  App.actions.plVerify = async () => {
    const j = await post({ action: 'login_verify', code: A.login.code });
    if (!j.ok) { A.login.err = errText(j); A.login.code = ''; return App.rerender(); }
    reloadAt('p-dashboard');
  };

  if (isGuest) return; // halaman di bawah hanya untuk peserta yang sudah masuk

  /* ================= Data peserta ================= */
  const loadMe = async () => {
    A.meLoading = true;
    const j = await App.api('api/participant.php');
    A.meLoading = false;
    if (j.ok) { A.me = j; A.meErr = ''; } else A.meErr = errText(j);
    if (['p-dashboard', 'p-bound'].includes(App.route())) App.rerender();
  };
  const GATE = { identity: 'Identitas & kontak terverifikasi', enrollment: 'Enrollment aktif & sesuai ujian', schedule: 'Dalam jadwal yang diizinkan', voucher: 'Voucher terikat ke akun Anda', payment: 'Pembelian terkonfirmasi', entitlement: 'Hak attempt tersedia' };
  const gateRow = (g) => `<div class="gate-row">${g.ok === true ? ic('checkCircle', 'ok') : g.ok === 'wait' ? ic('clock', 'wait') : ic('xCircle', 'no')}<div>${g.key === 'schedule' && g.ok === 'wait' ? 'Menunggu jadwal dibuka' : GATE[g.key]}</div></div>`;

  /* ================= 4. Voucher terikat ================= */
  App.routes['p-bound'] = () => {
    if (!A.me && !A.meLoading) setTimeout(loadMe);
    const p = A.me && A.me.participant;
    const last = A.me && A.me.enrollments.filter((e) => e.boundAt).sort((a, b) => (b.boundAt || '').localeCompare(a.boundAt || ''))[0];
    return App.pShell('p-dashboard', `<div class="pp-narrow stack-lg">${stepsLine(3)}
      <section class="card card-pad stack-lg" style="text-align:center;align-items:center">
        <div style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--g-success);color:#fff;box-shadow:var(--shadow-md)">${ic('checkCircle', 'ic-lg')}</div>
        <div class="stack" style="gap:6px"><h1>Voucher berhasil diaktifkan</h1><p class="muted">Voucher kini terikat ke identitas Anda dan hak ujian telah dibuat.</p></div>
        ${p ? `<dl class="dl" style="text-align:left;width:100%">
          <dt>Peserta</dt><dd>${esc(p.name)} · <span class="mono">${esc(p.no)}</span></dd>
          ${last ? `<dt>Voucher</dt><dd class="mono">${esc(last.voucher)} ${App.status('BOUND')}</dd><dt>Pelatihan</dt><dd>${esc(last.trainingName)}</dd><dt>Ujian</dt><dd>${esc(last.examName)}</dd><dt>Jadwal</dt><dd>${esc(fmtSched(last))}</dd>` : ''}
          <dt>Email</dt><dd data-noi18n>${esc(p.email)} ${pill('Terverifikasi', 'success')}</dd>
        </dl>` : '<p class="muted small">Memuat…</p>'}
        <button class="btn btn-primary btn-lg btn-block" data-go="p-dashboard">Lihat ujian saya ${ic('arrowR')}</button>
      </section></div>`);
  };

  /* ================= 5. Dashboard ujian ================= */
  App.routes['p-dashboard'] = () => {
    if (!A.me && !A.meLoading && !A.meErr) setTimeout(loadMe);
    const me = A.me;
    const name = (me && me.participant.name) || SES.user.name;
    const head = `<div class="row-between"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(new Date().toLocaleDateString(App.locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</span><h1>Halo, ${esc(name.split(' ')[0])}</h1></div>
      <button class="btn btn-secondary" data-go="p-start">${ic('ticket')} Masukkan voucher</button></div>`;
    let body;
    if (A.meErr) body = errBox(A.meErr);
    else if (!me) body = '<p class="muted small">Memuat ujian Anda…</p>';
    else if (!me.enrollments.length) body = `<section class="card card-pad stack" style="align-items:flex-start"><h3>Belum ada ujian yang ditugaskan</h3><p class="small muted">Ujian muncul di sini setelah penyelenggara mendaftarkan Anda. Jika Anda sudah menerima kode voucher, masukkan kodenya.</p><button class="btn btn-primary" data-go="p-start">${ic('ticket')} Masukkan voucher</button></section>`;
    else body = me.enrollments.map((e, i) => {
      const sched = fmtSched(e);
      const rs = e.retake || { state: 'none' };
      const lastAtt = e.attempts && e.attempts.length ? e.attempts[e.attempts.length - 1] : null;
      const RS = { in_progress: ['Sedang berlangsung', 'teal'], passed: ['Lulus', 'success'], pending_review: ['Menunggu penilaian', 'warning'], exhausted: ['Kesempatan habis', 'danger'],
        needs_request: ['Tidak lulus · ajukan ujian ulang', 'danger'], requested: ['Retake menunggu persetujuan', 'info'], rejected: ['Retake ditolak', 'danger'], wait: ['Tidak lulus · masa tunggu', 'warning'], available: ['Ujian ulang tersedia', 'success'] };
      const statusPill = RS[rs.state] && !(rs.state === 'available' && e.canStart) ? pill(RS[rs.state][0], RS[rs.state][1]) : e.canStart ? pill(rs.state === 'available' ? 'Ujian ulang tersedia' : 'Siap dimulai', 'success') : e.voucherState !== 'bound' ? pill(e.voucherState === 'allocated' ? 'Voucher belum diaktifkan' : 'Voucher belum ada', 'warning') : e.scheduleState === 'upcoming' ? pill('Belum dibuka', 'muted') : e.scheduleState === 'closed' ? pill('Jadwal berakhir', 'outline') : pill('Belum memenuhi syarat', 'warning');
      const resultBtn = lastAtt && lastAtt.status !== 'IN_PROGRESS' ? `<button class="btn btn-secondary" data-action="openResult" data-id="${esc(lastAtt.id)}">${ic('file')} Lihat hasil${e.finalScore != null ? ' · ' + e.finalScore : ''}</button>` : '';
      const action = rs.state === 'in_progress' ? `<button class="btn btn-primary" data-action="resumeExam" data-id="${esc(rs.attempt)}">${ic('play')} Lanjutkan ujian</button>`
        : e.canStart ? `<button class="btn btn-primary" data-action="openExam" data-id="${esc(e.id)}">${ic('play')} ${rs.used ? 'Buka ujian ulang' : 'Buka ujian'}</button>${resultBtn}`
        : lastAtt ? resultBtn
        : e.voucherState !== 'bound' ? `<button class="btn btn-primary" data-go="p-start">${ic('ticket')} ${e.voucherState === 'allocated' ? 'Aktivasi voucher' : 'Masukkan voucher'}</button>`
        : `<button class="btn btn-secondary" data-action="openExam" data-id="${esc(e.id)}">${ic('clock')} ${e.scheduleState === 'upcoming' ? 'Ujian belum dibuka · lihat syarat' : 'Lihat syarat akses'}</button>`;
      return `<section class="card"><div class="exam-card">
        <div class="row-between"><span class="eyebrow">${e.status === 'COMPLETED' ? 'Ujian selesai' : 'Ujian ditugaskan'}</span>${statusPill}</div>
        <div class="stack" style="gap:4px"><h2>${esc(e.trainingName)} — ${esc(e.examName)}</h2><p class="small muted"><span class="mono">${esc(e.id)}</span>${e.voucher ? ` · voucher <span class="mono">${esc(e.voucher)}</span>` : ''}</p></div>
        <div class="exam-meta"><span>${ic('calendar', 'ic-sm')} ${esc(sched)}</span></div>
        <div class="grid g2" style="gap:16px;align-items:start"><div class="gate">${e.gates.map(gateRow).join('')}</div>
          <div class="stack small muted" style="gap:6px"><span>${ic('info', 'ic-sm')} Server memeriksa ulang semua syarat saat Anda menekan Mulai. Enrollment saja tidak membuka akses.</span>${e.attempts && e.attempts.length ? `<span class="xs dim">Attempt terpakai ${rs.used} dari ${rs.max}${e.finalScore != null ? ` · nilai akhir ${e.finalScore} (lulus ≥ ${e.passing})` : ''}.</span>` : ''}</div></div>
        <div class="row">${action}</div>
      </div></section>`;
    }).join('');
    const p = me && me.participant;
    const profile = p ? `<section class="card card-pad stack"><h3>Data peserta</h3><dl class="dl"><dt>No. peserta</dt><dd class="mono">${esc(p.no || '—')}</dd><dt>Email</dt><dd data-noi18n>${esc(p.email)} ${p.emailVerifiedAt ? pill('Terverifikasi', 'success') : pill('Belum', 'warning')}</dd><dt>Telepon</dt><dd data-noi18n>${esc(p.phone || '—')} ${p.phoneVerifiedAt ? pill('Terverifikasi', 'success') : pill('Belum', 'warning')}</dd></dl></section>` : '';
    return App.pShell('p-dashboard', `${head}${body}${profile}`);
  };

})();
