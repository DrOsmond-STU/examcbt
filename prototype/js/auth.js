/* TACMS — login & RBAC di sisi antarmuka.
   Aktif hanya bila server menyisipkan window.SESSION (versi ter-deploy). Server tetap
   menjadi penentu: modul yang bukan hak role tidak dikirim, dan API memeriksa session.
   Lapisan ini mengatur menu, halaman, dan tombol agar sesuai hak akses. */
(function () {
  const SES = window.SESSION;
  if (!SES) return;
  const App = window.App;
  const S = App.state;
  const D = window.DATA;
  const { ic, esc, pill } = App;
  const PUBLIC = ['login', 'a-login', 'verify'];
  /* Muat ulang halaman pada route tertentu (session berubah → server mengirim modul yang sesuai role) */
  const reloadAt = (route) => { history.replaceState(null, '', location.pathname + location.search + '#' + route); location.reload(); };

  /* ---------- Hak akses ---------- */
  App.session = SES;
  App.can = (perm) => !perm || SES.perms.includes('*') || SES.perms.includes(perm);
  App.canRoute = (r) => {
    if (PUBLIC.includes(r)) return true;
    if (!SES.user) return false;
    if (r === 'home' || r === 'account') return true;
    return SES.routes.includes('*') || SES.routes.includes(r);
  };

  /* Aksi yang mengubah data → permission yang dibutuhkan */
  const ACTION_PERMS = {
    newTraining: 'training.write', trainingSaved: 'training.write', archiveTraining: 'training.write',
    addParticipant: 'participant.write', importParticipants: 'participant.write', importOk: 'participant.write',
    newEnrollment: 'enrollment.write', enrollOk: 'enrollment.write', reschedule: 'enrollment.write', visibility: 'enrollment.write',
    newBatch: 'voucher.write', batchOk: 'voucher.write', distribute: 'voucher.write', distOk: 'voucher.write', revokeV: 'voucher.write',
    unlockV: 'voucher.write', allocate: 'voucher.write', newOrder: 'voucher.write',
    verifyPay: 'payment.verify', payOk: 'payment.verify',
    saveQ: 'question.write', importQ: 'question.write', qType: 'question.write',
    saveDraft: 'exam.write', sendReview: 'exam.write', publishExam: 'exam.publish',
    extendTime: 'monitoring.write',
    rubric: 'grade.write', gradeDraft: 'grade.write', gradeFinal: 'grade.write',
    retakeYes: 'retake.decide', retakeNo: 'retake.decide',
    genOk: 'cert.write', certReturn: 'cert.approve', certApprove: 'cert.approve', certRevoke: 'cert.write',
    export: 'report.export', exportOk: 'report.export',
    inviteUser: 'user.write', sessions: 'user.write',
    userCreate: 'user.write', userCreateOk: 'user.write', userEdit: 'user.write', userEditOk: 'user.write', userReset: 'user.write', userToggle: 'user.write',
  };
  const permLabel = (p) => (SES.permLabels && SES.permLabels[p]) || p;
  const denied = (p) => App.toast(`Akses ditolak: ${esc(SES.user ? SES.user.roleLabel : 'Tamu')} tidak punya izin “${esc(permLabel(p))}”.`, 'lock');

  /* Bungkus aksi: diperiksa saat diklik */
  const wrapActions = () => {
    Object.entries(ACTION_PERMS).forEach(([name, perm]) => {
      const fn = App.actions[name];
      if (!fn || fn.__guarded) return;
      const g = (el, e) => (App.can(perm) ? fn(el, e) : denied(perm));
      g.__guarded = true;
      App.actions[name] = g;
    });
  };

  /* Tandai tombol & tautan yang tidak diizinkan */
  const mark = (root = document) => {
    root.querySelectorAll('[data-action]').forEach((el) => {
      const p = ACTION_PERMS[el.dataset.action];
      if (p && !App.can(p)) {
        el.classList.add('is-denied');
        el.setAttribute('aria-disabled', 'true');
        el.title = `Perlu izin: ${permLabel(p)}`;
      }
    });
    root.querySelectorAll('[data-go]').forEach((el) => {
      if (!App.canRoute(el.dataset.go)) {
        el.classList.add('is-denied');
        el.setAttribute('aria-disabled', 'true');
        el.title = 'Tidak termasuk hak akses role Anda';
      }
    });
    // Sidebar admin: sembunyikan menu di luar hak akses, lalu judul grup yang kosong
    root.querySelectorAll('.sb-link.is-denied').forEach((el) => { el.hidden = true; });
    root.querySelectorAll('.sb-section').forEach((sec) => {
      let n = sec.nextElementSibling, any = false;
      while (n && n.classList.contains('sb-link')) { if (!n.hidden) any = true; n = n.nextElementSibling; }
      sec.hidden = !any;
    });
    // Nav peserta & peta prototipe
    root.querySelectorAll('.pp-nav .is-denied, .pp-tabbar .is-denied, .portal li:has(.is-denied)').forEach((el) => { el.hidden = true; });
    root.querySelectorAll('.portal').forEach((card) => { if (!card.querySelector('li:not([hidden])')) card.hidden = true; });
  };

  /* ---------- Halaman login ---------- */
  const loginErr = () => S.loginError ? `<div class="callout callout-danger" role="alert">${ic('alert')}<div class="small">${S.loginError}</div></div>` : '';
  App.routes.login = () => {
    if (SES.user) {
      return `<div class="verify" style="justify-content:center">
        <section class="card verify-card card-pad stack-lg" style="max-width:420px">
          <div class="row-between" style="flex-wrap:nowrap"><div class="row" style="flex-wrap:nowrap"><div class="logo">TA</div><b style="font:700 16px var(--font-display)">TACMS</b></div>${App.langToggle()}</div>
          <div class="stack" style="gap:6px"><h2>Anda sudah masuk</h2><p class="small muted">${esc(SES.user.name)} · ${esc(SES.user.roleLabel)}</p></div>
          <div class="row"><button class="btn btn-primary" data-go="${SES.home}">Lanjutkan</button><button class="btn btn-secondary" data-action="logout">${ic('logout')} Keluar</button></div>
        </section></div>`;
    }
    return `<div class="verify" style="justify-content:center">
      <section class="card verify-card card-pad stack-lg" style="max-width:420px">
        <div class="row-between" style="flex-wrap:nowrap"><div class="row" style="flex-wrap:nowrap"><div class="logo">TA</div><div><b style="font:700 16px var(--font-display)">TACMS</b><div class="xs dim">${esc(D.org.name)}</div></div></div>${App.langToggle()}</div>
        <div class="stack" style="gap:4px"><h2>Masuk</h2><p class="small muted">Masuk dengan akun yang diberikan administrator. Menu yang tampil mengikuti role Anda.</p></div>
        ${loginErr()}
        <form class="stack" id="login-form" novalidate>
          <div class="field"><label class="label" for="lg-u">Nama pengguna</label><input id="lg-u" class="input" autocomplete="username" autocapitalize="none" spellcheck="false" required value="${esc(S.loginUser || '')}"></div>
          <div class="field"><label class="label" for="lg-pw">Kata sandi</label><input id="lg-pw" type="password" class="input" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" id="lg-btn">Masuk</button>
        </form>
        <p class="xs dim">Setelah 5 kali gagal, akun dikunci sementara selama 15 menit. Semua upaya masuk tercatat di audit log.</p>
        <hr class="hr">
        <button class="btn btn-ghost btn-sm" style="align-self:flex-start" data-go="verify">${ic('shield', 'ic-sm')} Verifikasi sertifikat</button>
      </section>
    </div>`;
  };
  App.routes['a-login'] = App.routes.login;
  App.after.login = App.after['a-login'] = () => {
    const f = document.getElementById('login-form');
    if (!f) return;
    (S.loginUser ? document.getElementById('lg-pw') : document.getElementById('lg-u')).focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('lg-u').value.trim();
      const pw = document.getElementById('lg-pw').value;
      S.loginUser = u;
      if (!u || !pw) { S.loginError = 'Nama pengguna dan kata sandi wajib diisi.'; return App.rerender(); }
      const btn = document.getElementById('lg-btn'); btn.disabled = true; btn.textContent = App.t('Memeriksa…');
      try {
        const t = await (await fetch('api/csrf.php', { credentials: 'same-origin', cache: 'no-store' })).json();
        const r = await fetch('api/login.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t.csrf }, body: JSON.stringify({ username: u, password: pw }) });
        const j = await r.json().catch(() => ({}));
        if (j.ok) { reloadAt(j.home); return; }
        S.loginError = j.error === 'locked' ? `Terlalu banyak percobaan. Coba lagi dalam ${j.minutes} menit.`
          : j.error === 'csrf' ? 'Sesi halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.'
          : j.error === 'credentials' ? `Nama pengguna atau kata sandi salah. Sisa ${j.left} percobaan.`
          : 'Nama pengguna atau kata sandi salah.';
      } catch (err) {
        S.loginError = 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.';
      }
      App.rerender();
    });
  };

  App.actions.logout = async () => {
    try { await fetch('api/logout.php', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': SES.csrf } }); } catch (e) {}
    reloadAt('login');
  };

  /* ---------- Helper API (session + CSRF) ---------- */
  App.api = async (path, body) => {
    const opt = { credentials: 'same-origin', cache: 'no-store', headers: {} };
    if (body) { opt.method = 'POST'; opt.headers['Content-Type'] = 'application/json'; opt.headers['X-CSRF-Token'] = SES.csrf; opt.body = JSON.stringify(body); }
    let r;
    try { r = await fetch(path, opt); } catch (e) { return { ok: false, error: 'network' }; }
    const j = await r.json().catch(() => ({ ok: false, error: 'server' }));
    if (r.status === 401) reloadAt('login');
    else if (j.error === 'must_change') reloadAt('account');
    return j;
  };
  App.fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString(App.locale(), { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  /* ---------- Akun saya: ganti kata sandi ---------- */
  const PW_ERR = {
    pw_short: () => `Kata sandi baru minimal ${SES.passwordMin} karakter.`,
    pw_long: () => 'Kata sandi baru terlalu panjang (maksimal 200 karakter).',
    pw_mix: () => 'Kata sandi baru harus berisi huruf dan angka.',
    pw_username: () => 'Kata sandi baru tidak boleh memuat nama pengguna.',
    pw_common: () => 'Kata sandi baru terlalu mudah ditebak. Hindari kata umum seperti password atau admin.',
    pw_same: () => 'Kata sandi baru harus berbeda dari kata sandi saat ini.',
    csrf: () => 'Sesi halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.',
    network: () => 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
  };
  const pwRules = (pw, confirm) => [
    [pw.length >= SES.passwordMin, `Minimal ${SES.passwordMin} karakter`],
    [/[A-Za-z]/.test(pw) && /\d/.test(pw), 'Berisi huruf dan angka'],
    [!!pw && !pw.toLowerCase().includes(SES.user.username.toLowerCase()), 'Tidak memuat nama pengguna'],
    [!!pw && pw === confirm, 'Konfirmasi sama dengan kata sandi baru'],
  ];
  const rulesHTML = (pw, confirm) => pwRules(pw, confirm).map(([ok, t]) => `<li class="row" style="gap:8px;flex-wrap:nowrap;color:${ok ? 'var(--success)' : 'var(--fg-3)'}">${ic(ok ? 'checkCircle' : 'clock', 'ic-sm')}<span>${t}</span></li>`).join('');

  App.routes.account = () => {
    const u = SES.user;
    const forced = SES.mustChange;
    return `<div class="verify" style="justify-content:center">
      <section class="card verify-card card-pad stack-lg" style="max-width:480px">
        <div class="row-between" style="flex-wrap:nowrap"><div class="row" style="flex-wrap:nowrap"><div class="logo">TA</div><b style="font:700 16px var(--font-display)">TACMS</b></div>${App.langToggle()}</div>
        ${forced ? `<div class="callout callout-warning">${ic('lock')}<div class="small"><b>Ganti kata sandi sebelum melanjutkan.</b> Kata sandi Anda saat ini bersifat sementara.</div></div>` : `<button class="btn btn-ghost btn-sm" style="align-self:flex-start" data-go="${SES.home}">${ic('arrowL', 'ic-sm')} Kembali</button>`}
        <div class="stack" style="gap:4px"><h2>Akun saya</h2><p class="small muted">${esc(u.name)} · ${esc(u.roleLabel)}</p></div>
        <dl class="dl"><dt>Nama pengguna</dt><dd class="mono">${esc(u.username)}</dd><dt>Email</dt><dd>${esc(u.email)}</dd><dt>Role</dt><dd>${esc(u.roleLabel)}</dd><dt>Login sebelumnya</dt><dd>${App.fmtDateTime(u.lastLogin)}</dd></dl>
        <hr class="hr">
        <h3>Ganti kata sandi</h3>
        ${S.pwError ? `<div class="callout callout-danger" role="alert">${ic('alert')}<div class="small">${S.pwError}</div></div>` : ''}
        <form class="stack" id="pw-form" novalidate>
          <input type="text" autocomplete="username" value="${esc(u.username)}" hidden>
          <div class="field"><label class="label" for="pw-cur">Kata sandi saat ini</label><input id="pw-cur" type="password" class="input" autocomplete="current-password" required></div>
          <div class="field"><label class="label" for="pw-new">Kata sandi baru</label><input id="pw-new" type="password" class="input" autocomplete="new-password" required aria-describedby="pw-rules"></div>
          <div class="field"><label class="label" for="pw-conf">Ulangi kata sandi baru</label><input id="pw-conf" type="password" class="input" autocomplete="new-password" required></div>
          <ul id="pw-rules" class="stack small" style="list-style:none;margin:0;padding:0;gap:4px">${rulesHTML('', '')}</ul>
          <label class="check"><input type="checkbox" id="pw-show"><span class="small">Tampilkan kata sandi</span></label>
          <button class="btn btn-primary btn-lg btn-block" type="submit" id="pw-btn">Simpan kata sandi baru</button>
        </form>
        <p class="xs dim">Setelah kata sandi diganti, semua sesi lain untuk akun ini otomatis keluar.</p>
        <button class="btn btn-ghost btn-sm" style="align-self:flex-start" data-action="logout">${ic('logout', 'ic-sm')} Keluar</button>
      </section></div>`;
  };
  App.after.account = () => {
    const f = document.getElementById('pw-form');
    if (!f) return;
    const cur = document.getElementById('pw-cur'), nw = document.getElementById('pw-new'), cf = document.getElementById('pw-conf');
    const upd = () => { document.getElementById('pw-rules').innerHTML = rulesHTML(nw.value, cf.value); };
    nw.addEventListener('input', upd); cf.addEventListener('input', upd);
    document.getElementById('pw-show').addEventListener('change', (e) => { [cur, nw, cf].forEach((i) => { i.type = e.target.checked ? 'text' : 'password'; }); });
    cur.focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!cur.value) { S.pwError = 'Masukkan kata sandi saat ini.'; return App.rerender(); }
      if (pwRules(nw.value, cf.value).some(([ok]) => !ok)) { S.pwError = 'Kata sandi baru belum memenuhi semua syarat di bawah.'; return App.rerender(); }
      const btn = document.getElementById('pw-btn'); btn.disabled = true; btn.textContent = App.t('Menyimpan…');
      const j = await App.api('api/account.php', { current: cur.value, new: nw.value });
      if (j.ok) {
        S.pwError = '';
        SES.csrf = j.csrf;
        if (SES.mustChange) { reloadAt(j.home); return; }
        App.rerender();
        App.toast('Kata sandi berhasil diganti');
        return;
      }
      S.pwError = j.error === 'current' ? `Kata sandi saat ini salah. Sisa ${j.left} percobaan.`
        : j.error === 'locked' ? `Terlalu banyak percobaan. Coba lagi dalam ${j.minutes} menit.`
        : (PW_ERR[j.error] || (() => 'Terjadi kesalahan di server. Coba lagi.'))();
      App.rerender();
    });
  };

  /* ---------- Halaman akses ditolak ---------- */
  const forbidden = (r) => `<div class="verify" style="justify-content:center">
    <section class="card verify-card card-pad stack-lg" style="max-width:520px">
      <div style="width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--danger-soft);color:var(--danger)">${ic('lock', 'ic-lg')}</div>
      <div class="stack" style="gap:6px"><h2>Akses ditolak</h2><p class="muted">Halaman ini tidak termasuk hak akses role <b>${esc(SES.user.roleLabel)}</b>.</p><p class="xs dim mono">${esc(r)}</p></div>
      <div class="row"><button class="btn btn-primary" data-go="${SES.home}">${ic('home')} Ke halaman utama saya</button><button class="btn btn-secondary" data-action="myAccess">${ic('key')} Hak akses saya</button></div>
    </section></div>`;

  /* ---------- Hak akses saya ---------- */
  const ROUTE_NAMES = {
    'a-dashboard': 'Dashboard', 'a-trainings': 'Pelatihan', 'a-participants': 'Peserta', 'a-enrollments': 'Enrollment & Jadwal', 'a-vouchers': 'Voucher & Order',
    'a-questions': 'Bank Soal', 'a-exam-builder': 'Exam Builder', 'a-monitoring': 'Monitoring', 'a-grading': 'Penilaian', 'a-retake': 'Retake',
    'a-certificates': 'Sertifikat', 'a-reports': 'Laporan', 'a-audit': 'Audit Log', 'a-users': 'Pengguna & Role', 'p-dashboard': 'Portal Peserta',
  };
  App.actions.myAccess = () => {
    const all = SES.routes.includes('*');
    const routes = all ? Object.keys(ROUTE_NAMES) : SES.routes.filter((r) => ROUTE_NAMES[r]);
    const perms = Object.keys(SES.permLabels || {});
    App.modal(`${App.modalHead('Hak akses saya', `${esc(SES.user.name)} · ${esc(SES.user.roleLabel)}`)}
      <div class="modal-body">
        <div class="stack" style="gap:8px"><span class="label">Halaman yang dapat dibuka</span><div class="row" style="gap:6px">${routes.map((r) => `<span class="tag">${ROUTE_NAMES[r]}</span>`).join('')}</div></div>
        <div class="stack" style="gap:8px"><span class="label">Izin aksi</span>
          <div class="table-wrap"><table class="table"><tbody>${perms.map((p) => `<tr><td class="small">${esc(permLabel(p))}</td><td class="t-right">${App.can(p) ? pill('Diizinkan', 'success') : pill('Baca saja', 'muted')}</td></tr>`).join('')}</tbody></table></div>
        </div>
        <p class="xs dim">Hak akses diatur oleh server berdasarkan role. Hubungi Organization Admin untuk perubahan role.</p>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" data-action="logout">${ic('logout')} Keluar</button><button class="btn btn-secondary" data-go="account">${ic('key')} Akun saya &amp; kata sandi</button><button class="btn btn-primary" data-action="closeModal">Tutup</button></div>`);
  };

  /* ---------- Bilah sesi ---------- */
  const sessionChip = () => `<button class="btn btn-secondary btn-sm session-chip" data-action="myAccess" title="Hak akses saya">${ic('user', 'ic-sm')}<span class="session-name">${esc(SES.user.name.split(' ')[0])}</span><span class="tag">${esc(SES.user.roleLabel)}</span></button>`;
  const decorate = (r) => {
    const app = document.getElementById('app');
    if (!SES.user) return;
    // Admin: identitas & tombol keluar di sidebar, chip role di topbar
    const sbOut = app.querySelector('.sb-foot [data-go="a-login"]');
    if (sbOut) { sbOut.removeAttribute('data-go'); sbOut.dataset.action = 'logout'; sbOut.classList.remove('is-denied'); sbOut.removeAttribute('aria-disabled'); sbOut.title = 'Keluar'; }
    const topAvatar = app.querySelector('.topbar > .avatar');
    if (topAvatar) topAvatar.outerHTML = sessionChip();
    // Peserta: chip & keluar
    const ppAvatar = app.querySelector('.pp-top-inner > .avatar');
    if (ppAvatar) ppAvatar.outerHTML = sessionChip();
    // Peta prototipe: bilah sesi
    if (r === 'home') {
      const inner = app.querySelector('.hub-hero .hub-inner');
      if (inner && !inner.querySelector('.hub-session')) inner.insertAdjacentHTML('beforeend', `<div class="hub-session row"><span>Masuk sebagai <b>${esc(SES.user.name)}</b> · ${esc(SES.user.roleLabel)}</span><button class="btn btn-secondary btn-sm" data-action="myAccess">${ic('key', 'ic-sm')} Hak akses saya</button><button class="btn btn-secondary btn-sm" data-action="logout">${ic('logout', 'ic-sm')} Keluar</button></div>`);
    }
    mark(app);
    App.translate && App.translate(app);
  };

  /* ---------- Integrasi dengan router ---------- */
  if (SES.user && SES.user.role === 'participant') {
    S.identity.name = SES.user.name;
    S.identity.email = SES.user.email;
  }
  if (SES.user && SES.user.role !== 'participant') {
    D.admin = { name: SES.user.name, role: SES.user.roleLabel, email: SES.user.email };
  }

  const baseRender = App.render;
  App.render = (keepScroll) => {
    let r = App.route();
    if (!SES.user && !PUBLIC.includes(r)) { if (location.hash !== '#login') { history.replaceState(null, '', '#login'); } r = 'login'; }
    if (SES.user && (!location.hash || location.hash === '#')) { history.replaceState(null, '', '#' + SES.home); r = SES.home; }
    if (SES.user && SES.mustChange && r !== 'account') { history.replaceState(null, '', '#account'); r = 'account'; }
    if (!App.canRoute(r) || !App.routes[r]) {
      App.closeModal();
      document.getElementById('app').innerHTML = forbidden(r);
      decorate(r);
      return;
    }
    baseRender(keepScroll);
    decorate(r);
  };
  const baseModal = App.modal;
  App.modal = (html, opts) => { baseModal(html, opts); const o = document.querySelector('.overlay'); if (o) mark(o); };

  // Peserta login: halaman aktivasi voucher memakai identitas akun
  wrapActions();

  // Keluar otomatis saat sesi menganggur (server juga menghapus session setelah batas ini)
  let idleT;
  let lastPing = Date.now();
  const resetIdle = () => {
    clearTimeout(idleT);
    if (!SES.user) return;
    idleT = setTimeout(() => { reloadAt('login'); }, (SES.idle + 5) * 1000);
    if (Date.now() - lastPing > 4 * 60 * 1000) {
      lastPing = Date.now();
      fetch('api/ping.php', { credentials: 'same-origin' }).then((r) => r.json()).then((j) => { if (!j.ok) { reloadAt('login'); } }).catch(() => {});
    }
  };
  ['click', 'keydown'].forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();
})();
