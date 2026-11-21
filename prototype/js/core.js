/* TACMS prototype — inti: state, ikon, router, modal, toast */
(function () {
  const App = (window.App = {});

  /* ---------- Ikon garis (24×24) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M14 5v2M14 11v2M14 17v2"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    file: '<path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5z"/><path d="M14 2.5v6h6M8 13h8M8 17h5"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z"/><path d="m9 12 2 2 4-4"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v-3M11 15V8M15 15v-5M19 15V6"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    log: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M11 18h2"/>',
    refresh: '<path d="M20 11A8 8 0 0 0 6 6.3L4 8M4 4v4h4M4 13a8 8 0 0 0 14 4.7l2-1.7M20 20v-4h-4"/>',
    wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    filter: '<path d="M3 5h18l-7 8.5V20l-4-2v-4.5z"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M17 20h4v-3M14 20h.01"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  };
  App.ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

  /* ---------- Util ---------- */
  App.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  App.fmt = (n) => Number(n).toLocaleString(App.locale ? App.locale() : 'id-ID');
  App.initials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  App.pill = (text, tone = 'muted', extra = '') => `<span class="pill pill-${tone} ${extra}">${App.esc(text)}</span>`;

  /* Peta status → nada warna (selalu disertai teks) */
  const TONES = {
    // voucher
    CREATED: 'muted', RESERVED: 'info', BOUND: 'teal', REDEEMED: 'success', EXPIRED: 'warning', REVOKED: 'danger', LOCKED: 'danger',
    // exam
    Draft: 'muted', Review: 'info', Published: 'teal', Active: 'success', Closed: 'muted', Archived: 'outline',
    // training
    Aktif: 'success', Terjadwal: 'info', Selesai: 'muted', Diarsipkan: 'outline',
    // order
    PENDING_PAYMENT: 'warning', PAID: 'success', CONFIRMED: 'success', CANCELLED: 'muted', PROOF_SUBMITTED: 'info',
    // result
    Lulus: 'success', 'Tidak Lulus': 'danger', 'Pending Review': 'warning', Menunggu: 'warning', Graded: 'success', Berlangsung: 'info',
    // cert
    ISSUED: 'success', PENDING_APPROVAL: 'warning', DRAFT: 'muted', VALID: 'success',
    // enrollment
    SCHEDULED: 'info', IN_PROGRESS: 'teal', COMPLETED: 'success', RESCHEDULED: 'warning',
    // retake
    PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger',
  };
  App.status = (s, label) => App.pill(label || s, TONES[s] || 'muted');

  /* ---------- State ---------- */
  App.state = {
    // participant flow
    voucherInput: '',
    voucherError: '',
    identity: { name: 'Nadia Putri Anggraini', email: 'nadia.anggraini@mail.id', phone: '+62 812-3456-7890' },
    otp: { email: { sent: true, verified: false, code: '', error: '', attempts: 0, cooldown: 0 }, phone: { sent: true, verified: false, code: '', error: '', attempts: 0, cooldown: 0, channel: 'WhatsApp' } },
    bound: false,
    // exam
    exam: { started: false, cur: 0, answers: {}, flags: {}, remaining: 89 * 60 + 12, saved: 'saved', submitted: false, tabSwitch: 0 },
    resultScenario: 'pending', // pending | pass | fail
    retakeRequested: false,
    // admin
    navOpen: false,
    voucherTab: 'batches',
    certTab: 'templates',
    examStep: 0,
    qType: 'single',
    gradingIdx: 0,
    rubric: {},
    participantsQuery: '',
    verifyInput: '',
    verifyResult: null,
  };

  /* ---------- Router ---------- */
  App.routes = {};
  App.after = {};
  App.route = () => (location.hash || '#home').slice(1) || 'home';
  App.go = (r) => {
    if (App.route() === r) App.render(); else location.hash = r;
  };
  App.render = (keepScroll) => {
    const r = App.route();
    const fn = App.routes[r] || App.routes.home;
    const y = window.scrollY;
    if (!keepScroll) App.closeModal();
    document.getElementById('app').innerHTML = fn();
    document.title = 'Purwarupa TACMS';
    if (App.after[r]) App.after[r]();
    if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  };
  App.rerender = () => App.render(true);

  /* ---------- Aksi (delegasi event) ---------- */
  App.actions = {};
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); App.state.navOpen = false; App.closeModal(); App.go(go.dataset.go); return; }
    const a = e.target.closest('[data-action]');
    if (a && App.actions[a.dataset.action]) { e.preventDefault(); App.actions[a.dataset.action](a, e); }
  });
  document.addEventListener('input', (e) => {
    const b = e.target.closest('[data-bind]');
    if (b && App.binds[b.dataset.bind]) App.binds[b.dataset.bind](b, e);
  });
  document.addEventListener('change', (e) => {
    const b = e.target.closest('[data-change]');
    if (b && App.changes[b.dataset.change]) App.changes[b.dataset.change](b, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.querySelector('.overlay')) App.closeModal();
  });
  App.binds = {};
  // Semua form ditangani lewat script; jangan pernah kirim ke URL lain
  document.addEventListener('submit', (e) => e.preventDefault());
  App.changes = {};

  /* ---------- Modal / drawer ---------- */
  App.modal = (html, opts = {}) => {
    App.closeModal();
    const o = document.createElement('div');
    o.className = 'overlay' + (opts.drawer ? ' drawer-overlay' : '');
    o.innerHTML = `<div class="${opts.drawer ? 'drawer' : 'modal' + (opts.wide ? ' modal-wide' : '')}" role="dialog" aria-modal="true">${html}</div>`;
    o.addEventListener('click', (e) => { if (e.target === o) App.closeModal(); });
    document.body.appendChild(o);
    const f = o.querySelector('input, textarea, select, button.btn-primary');
    if (f) setTimeout(() => f.focus(), 30);
  };
  App.closeModal = () => document.querySelectorAll('.overlay').forEach((n) => n.remove());
  App.actions.closeModal = () => App.closeModal();
  App.modalHead = (title, sub) => `<div class="modal-head"><div class="stack" style="gap:4px"><h3>${title}</h3>${sub ? `<p class="small muted">${sub}</p>` : ''}</div><button class="icon-btn" data-action="closeModal" aria-label="Tutup">${App.ic('x')}</button></div>`;

  /* Konfirmasi aksi destruktif (SRS 9.1) — dibangun di halaman, bukan confirm() */
  App.confirm = ({ title, body, confirmText = 'Konfirmasi', danger = false, reason = false, onOk }) => {
    App._confirmOk = onOk;
    App.modal(`${App.modalHead(title)}
      <div class="modal-body"><p class="muted">${body}</p>
      ${reason ? `<div class="field"><label class="label" for="cf-reason">Alasan <span class="dim">(wajib, tercatat di audit log)</span></label><textarea id="cf-reason" class="textarea" style="min-height:80px" placeholder="Tuliskan alasan…"></textarea><span class="err" id="cf-err" hidden>Alasan wajib diisi.</span></div>` : ''}
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirmOk" data-reason="${reason ? 1 : 0}">${confirmText}</button></div>`);
  };
  App.actions.confirmOk = (el) => {
    let v = '';
    if (el.dataset.reason === '1') {
      v = document.getElementById('cf-reason').value.trim();
      if (!v) { document.getElementById('cf-err').hidden = false; return; }
    }
    App.closeModal();
    if (App._confirmOk) App._confirmOk(v);
  };

  /* ---------- Toast ---------- */
  App.toast = (msg, icon = 'checkCircle') => {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${App.ic(icon)}<span>${msg}</span>`;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  };

  /* ---------- Tema ---------- */
  App.actions.theme = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('tacms-theme', root.dataset.theme); } catch (e) {}
    App.rerender();
  };
  App.isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  };
  App.themeBtn = () => `<button class="icon-btn" data-action="theme" aria-label="Ganti tema" title="Ganti tema">${App.ic(App.isDark() ? 'sun' : 'moon')}</button>`;

  /* Tombol & pemilih skenario prototipe */
  App.protoFab = (extra = '') => `<div class="proto-fab"><button class="btn btn-secondary btn-sm" data-go="home">${App.ic('grid', 'ic-sm')} Peta Prototipe</button>${extra}</div>`;

  /* Pseudo-QR deterministik (dekoratif) */
  App.qr = (seed = 'TACMS', size = 21) => {
    let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296);
    let cells = '';
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#1b2a44"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#1b2a44"/>`;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const inF = (x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9);
      if (!inF && rnd() > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="#1b2a44"/>`;
    }
    return `<svg class="qr" viewBox="-1 -1 ${size + 2} ${size + 2}" shape-rendering="crispEdges" role="img" aria-label="QR verifikasi"><rect x="-1" y="-1" width="${size + 2}" height="${size + 2}" fill="#fff"/>${cells}${finder(0, 0)}${finder(size - 7, 0)}${finder(0, size - 7)}</svg>`;
  };

  App.start = () => {
    try { const t = localStorage.getItem('tacms-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
    window.addEventListener('hashchange', () => App.render());
    App.render();
  };
})();
