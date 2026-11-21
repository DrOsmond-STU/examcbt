/* TACMS — Audit log dari data asli server (versi ter-deploy).
   Mengganti layar contoh dengan isi app/storage/audit.log lewat api/audit.php.
   Hanya dimuat untuk role admin; server memeriksa ulang hak akses setiap permintaan. */
(function () {
  const SES = window.SESSION;
  if (!SES || !SES.user || !App.adminShell) return;
  const S = App.state;
  const { ic, esc, pill } = App;
  const canRoute = (r) => SES.routes.includes('*') || SES.routes.includes(r);
  if (!canRoute('a-audit')) return;

  /* Label aksi (kode tetap ditampilkan agar bisa dicocokkan dengan file log) */
  const ACTIONS = {
    'auth.login': ['Berhasil masuk', 'success'],
    'auth.logout': ['Keluar dari sistem', 'muted'],
    'auth.fail': ['Gagal masuk', 'danger'],
    'auth.locked': ['Login dikunci sementara', 'danger'],
    'auth.timeout': ['Sesi berakhir (tidak aktif)', 'muted'],
    'user.create': ['Membuat pengguna', 'info'],
    'user.update': ['Mengubah pengguna', 'info'],
    'user.activate': ['Mengaktifkan pengguna', 'success'],
    'user.deactivate': ['Menonaktifkan pengguna', 'warning'],
    'user.reset_password': ['Mereset kata sandi', 'warning'],
    'account.change_password': ['Mengganti kata sandi', 'teal'],
    'account.change_password_fail': ['Gagal mengganti kata sandi', 'danger'],
    'audit.export': ['Mengekspor audit log', 'muted'],
    'enrollment.bulk_create': ['Enrollment massal', 'info'],
    'enrollment.cancel': ['Membatalkan enrollment', 'warning'],
  };
  const actionPill = (a) => { const [l, t] = ACTIONS[a] || [a, 'outline']; return pill(l, t); };
  const fmt = (iso) => new Date(iso).toLocaleString(App.locale(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ago = (iso) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'Baru saja';
    if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
    if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
    return new Date(iso).toLocaleDateString(App.locale(), { day: '2-digit', month: 'short' });
  };

  const st = (S.audit = { loading: false, loaded: false, error: '', data: null, f: { q: '', cat: '', actor: '', from: '', to: '', page: 1, per: 25 } });
  const query = (extra = {}) => {
    const p = new URLSearchParams();
    Object.entries({ ...st.f, ...extra }).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
    return p.toString();
  };
  const load = async () => {
    st.loading = true;
    const j = await App.api('api/audit.php?' + query());
    st.loading = false;
    if (j.ok) { st.data = j; st.loaded = true; st.error = ''; st.f.page = j.page; }
    else st.error = j.error === 'forbidden' ? 'Anda tidak punya akses ke audit log.' : j.error === 'network' ? 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.' : 'Terjadi kesalahan di server. Coba lagi.';
    if (App.route() === 'a-audit') App.rerender();
  };

  App.routes['a-audit'] = () => {
    if (!st.loaded && !st.loading && !st.error) setTimeout(load);
    const d = st.data;
    const s = d ? d.stats : null;
    const f = st.f;
    const kpi = (label, v, icn, tone) => `<div class="card kpi has-ic"><div class="kpi-ic" ${tone ? `style="background:var(${tone})"` : ''}>${ic(icn)}</div><span class="eyebrow">${label}</span><span class="v num">${v == null ? '—' : App.fmt(v)}</span></div>`;
    const rows = d ? d.entries.map((e) => `<tr>
      <td class="num small" style="white-space:nowrap">${esc(fmt(e.t))}</td>
      <td><div class="cell-title small">${esc(e.actorName || e.actor || '—')}</div><div class="cell-sub"><span class="mono">${esc(e.actor)}</span>${e.roleLabel ? ' · ' + esc(e.roleLabel) : ''}</div></td>
      <td><div class="stack" style="gap:4px;align-items:flex-start">${actionPill(e.action)}<code class="xs dim" data-noi18n>${esc(e.action)}</code></div></td>
      <td class="small" style="max-width:360px;overflow-wrap:anywhere" data-noi18n>${esc(e.detail) || '<span class="dim">—</span>'}</td>
      <td class="mono xs">${esc(e.ip)}</td></tr>`).join('') : '';
    const pages = d ? d.pages : 1;
    const pageBtns = () => {
      const nums = [];
      for (let i = Math.max(1, f.page - 2); i <= Math.min(pages, f.page + 2); i++) nums.push(i);
      return `<button aria-label="Sebelumnya" data-action="auditPage" data-p="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''}>‹</button>${nums.map((n) => `<button class="${n === f.page ? 'on' : ''}" data-action="auditPage" data-p="${n}">${n}</button>`).join('')}<button aria-label="Berikutnya" data-action="auditPage" data-p="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''}>›</button>`;
    };
    const exportBtn = d && d.canExport
      ? `<a class="btn btn-secondary" href="api/audit.php?${esc(query({ format: 'csv', page: '', per: '' }))}" download>${ic('download')} Ekspor CSV</a>` : '';
    const body = st.error ? `<div class="card-body"><div class="callout callout-danger">${ic('alert')}<div class="small">${esc(st.error)} <button class="btn btn-ghost btn-sm" data-action="auditReload">Coba lagi</button></div></div></div>`
      : !d ? `<div class="card-body"><p class="muted small">Memuat audit log…</p></div>`
      : `<div class="table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Detail</th><th>IP</th></tr></thead>
         <tbody>${rows || `<tr><td colspan="5" class="muted" style="text-align:center;padding:40px">Tidak ada catatan yang cocok dengan filter.</td></tr>`}</tbody></table></div>
         <div class="pager"><span>${d.total ? `Menampilkan ${(f.page - 1) * d.per + 1}–${Math.min(f.page * d.per, d.total)} dari ${App.fmt(d.total)}` : 'Menampilkan 0 dari 0'}</span><div class="pages">${pageBtns()}</div></div>`;
    return App.adminShell('a-audit', `
      ${App.pageHead('Audit log', 'Catatan asli dari server, terbaru di atas. Catatan hanya ditambahkan dan tidak dapat diubah dari aplikasi. Tidak memuat kata sandi, OTP, atau kode voucher penuh.', `${exportBtn}<button class="btn btn-secondary" data-action="auditReload">${ic('refresh')} Muat ulang</button>`)}
      <div class="grid g4">
        ${kpi('Total catatan', s && s.total, 'log')}
        ${kpi('Login berhasil · 24 jam', s && s.login24h, 'checkCircle', '--g-success')}
        ${kpi('Gagal masuk & terkunci · 24 jam', s && s.fail24h, 'alert', '--g-danger')}
        ${kpi('Perubahan akun · 7 hari', s && s.userChanges7d, 'users', '--g-info')}
      </div>
      <section class="card">
        <div class="toolbar">
          <label class="input-group">${ic('search', 'ic-sm')}<input id="au-q" placeholder="Cari aktor, aksi, detail, atau IP" value="${esc(f.q)}" data-bind="auditQ"></label>
          <select class="select" aria-label="Kategori" data-change="auditF" data-k="cat">
            ${[['', 'Kategori: Semua'], ['auth', 'Autentikasi'], ['user', 'Pengelolaan pengguna'], ['account', 'Akun & kata sandi'], ['enrollment', 'Enrollment'], ['audit', 'Ekspor audit']].map(([v, l]) => `<option value="${v}" ${f.cat === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <select class="select" aria-label="Aktor" data-change="auditF" data-k="actor"><option value="">Aktor: Semua</option>${d ? d.actors.map((a) => `<option value="${esc(a.username)}" ${f.actor === a.username ? 'selected' : ''}>${esc(a.name ? `${a.name} (${a.username})` : a.username)}</option>`).join('') : ''}</select>
          <label class="row small" style="gap:6px;flex-wrap:nowrap"><span class="muted">Dari</span><input type="date" class="input" style="width:auto;height:38px" value="${esc(f.from)}" data-change="auditF" data-k="from" aria-label="Dari tanggal"></label>
          <label class="row small" style="gap:6px;flex-wrap:nowrap"><span class="muted">Sampai</span><input type="date" class="input" style="width:auto;height:38px" value="${esc(f.to)}" data-change="auditF" data-k="to" aria-label="Sampai tanggal"></label>
          ${f.q || f.cat || f.actor || f.from || f.to ? `<button class="btn btn-ghost btn-sm" data-action="auditClear">${ic('x', 'ic-sm')} Hapus filter</button>` : ''}
        </div>
        ${body}
      </section>
      <p class="xs dim">Waktu ditampilkan dalam zona waktu perangkat Anda. Filter tanggal memakai WIB. Ekspor CSV ikut tercatat di audit log.</p>`);
  };

  let qT;
  App.binds.auditQ = (el) => {
    st.f.q = el.value; st.f.page = 1;
    clearTimeout(qT);
    qT = setTimeout(async () => { await load(); const n = document.getElementById('au-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 350);
  };
  App.changes.auditF = (el) => { st.f[el.dataset.k] = el.value; st.f.page = 1; load(); };
  App.actions.auditPage = (el) => { const p = +el.dataset.p; if (p >= 1 && p <= (st.data ? st.data.pages : 1)) { st.f.page = p; load(); } };
  App.actions.auditReload = () => { st.error = ''; load(); };
  App.actions.auditClear = () => { Object.assign(st.f, { q: '', cat: '', actor: '', from: '', to: '', page: 1 }); load(); };

  /* Dashboard: kartu "Aktivitas terbaru" memakai data asli */
  const prevAfter = App.after['a-dashboard'];
  App.after['a-dashboard'] = async () => {
    if (prevAfter) prevAfter();
    const box = document.getElementById('recent-feed');
    if (!box) return;
    const j = await App.api('api/audit.php?per=5');
    const el = document.getElementById('recent-feed');
    if (!el || !j.ok) return;
    el.innerHTML = j.entries.length ? j.entries.map((e) => `<div class="feed-item"><div class="avatar avatar-sm">${App.initials(e.actorName || e.actor || '?')}</div><div><div class="small"><b>${esc(e.actorName || e.actor)}</b> · ${actionPill(e.action)}</div><div class="xs dim" style="overflow-wrap:anywhere" data-noi18n>${esc(e.detail || e.action)}</div></div><span class="xs dim num" style="white-space:nowrap">${esc(ago(e.t))}</span></div>`).join('')
      : '<p class="small muted">Belum ada aktivitas tercatat.</p>';
    const tag = document.getElementById('recent-feed-tag');
    if (tag) tag.hidden = false;
  };
})();
