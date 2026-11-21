/* TACMS — halaman Pengguna & Role (versi ter-deploy).
   Mengganti layar contoh dengan data akun asli dari api/users.php.
   Hanya dimuat untuk role admin; aksi tulis diperiksa ulang oleh server. */
(function () {
  const SES = window.SESSION;
  if (!SES || !SES.user || !App.adminShell) return;
  const S = App.state;
  const { ic, esc, pill } = App;
  const me = SES.user;
  const canWrite = SES.perms.includes('*') || SES.perms.includes('user.write');
  const um = (S.um = { loaded: false, loading: false, users: [], assignable: [], q: '', role: '', status: '', error: '' });

  const ERR = {
    username: 'Nama pengguna 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.',
    name: 'Nama lengkap 2–80 karakter.',
    email: 'Format email tidak valid.',
    role: 'Role tidak dikenal.',
    role_forbidden: 'Anda tidak berwenang memberikan role ini.',
    username_taken: 'Nama pengguna sudah dipakai.',
    email_taken: 'Email sudah dipakai akun lain.',
    target_forbidden: 'Hanya Super Admin yang dapat mengubah akun Super Admin.',
    self_role: 'Anda tidak dapat mengubah role akun sendiri.',
    self_deactivate: 'Anda tidak dapat menonaktifkan akun sendiri.',
    self_reset: 'Gunakan halaman Akun saya untuk mengganti kata sandi sendiri.',
    last_super: 'Harus ada minimal satu Super Admin aktif.',
    not_found: 'Akun tidak ditemukan. Muat ulang daftar.',
    forbidden: 'Anda tidak punya izin untuk tindakan ini.',
    csrf: 'Sesi halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.',
    network: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
  };
  const errText = (code) => ERR[code] || 'Terjadi kesalahan di server. Coba lagi.';
  const roleLabel = (r) => (SES.roles && SES.roles[r]) || r;

  const load = async () => {
    um.loading = true;
    const j = await App.api('api/users.php');
    um.loading = false;
    if (j.ok) { um.users = j.users; um.assignable = j.assignable; um.loaded = true; um.error = ''; }
    else um.error = errText(j.error);
    if (App.route() === 'a-users') App.rerender();
  };
  const upsert = (u) => { const i = um.users.findIndex((x) => x.username === u.username); if (i >= 0) um.users[i] = u; else um.users.push(u); um.users.sort((a, b) => a.username.localeCompare(b.username)); };

  /* Pengguna ini boleh mengubah akun target? (alasan bila tidak) */
  const blockReason = (u) => {
    if (!canWrite) return 'Perlu izin: Kelola pengguna & role';
    if (u.role === 'super_admin' && me.role !== 'super_admin') return 'Hanya Super Admin yang dapat mengubah akun Super Admin.';
    return '';
  };

  const matrix = () => {
    const M = SES.roleMatrix;
    if (!M) return '';
    const roles = Object.keys(M);
    const perms = Object.keys(SES.permLabels || {});
    return `<section class="card">
      <div class="card-head"><div><h3>Matriks hak akses</h3><p class="xs dim">Diambil langsung dari konfigurasi server (app/rbac.php) · ✓ diizinkan · — baca saja / tidak ada</p></div></div>
      <div class="table-wrap"><table class="table matrix"><thead><tr><th>Izin</th>${roles.map((r) => `<th>${esc(M[r].label)}</th>`).join('')}</tr></thead>
      <tbody>
        <tr><td class="cell-title small">Jumlah halaman</td>${roles.map((r) => `<td class="num small">${M[r].routes}</td>`).join('')}</tr>
        ${perms.map((p) => `<tr><td class="cell-title small">${esc(SES.permLabels[p])}</td>${roles.map((r) => (M[r].perms.includes(p) ? '<td class="yes small">✓</td>' : '<td class="no small">—</td>')).join('')}</tr>`).join('')}
      </tbody></table></div>
    </section>`;
  };

  App.routes['a-users'] = () => {
    if (!um.loaded && !um.loading && !um.error) setTimeout(load);
    const q = um.q.toLowerCase();
    const list = um.users.filter((u) => (!q || [u.username, u.name, u.email].join(' ').toLowerCase().includes(q))
      && (!um.role || u.role === um.role)
      && (!um.status || (um.status === 'active' ? u.active : um.status === 'inactive' ? !u.active : u.mustChange)));
    const count = (f) => um.users.filter(f).length;
    const rows = list.map((u) => {
      const block = blockReason(u);
      const self = u.username === me.username;
      const dis = (extra) => (block || extra ? `disabled title="${esc(block || extra)}"` : '');
      return `<tr>
        <td><div class="row" style="flex-wrap:nowrap"><div class="avatar avatar-sm">${App.initials(u.name)}</div><div style="min-width:0"><div class="cell-title">${esc(u.name)} ${self ? '<span class="tag">Anda</span>' : ''}</div><div class="cell-sub"><span class="mono">${esc(u.username)}</span> · ${esc(u.email)}</div></div></div></td>
        <td class="small">${esc(roleLabel(u.role))}</td>
        <td><div class="row" style="gap:4px">${u.active ? pill('Aktif', 'success') : pill('Nonaktif', 'outline')}${u.mustChange ? pill('Wajib ganti kata sandi', 'warning') : ''}</div></td>
        <td class="num small">${App.fmtDateTime(u.lastLogin)}</td>
        <td><div class="row" style="flex-wrap:nowrap;gap:2px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" data-action="userEdit" data-u="${esc(u.username)}" ${dis()}>${ic('edit', 'ic-sm')} Ubah</button>
          <button class="btn btn-ghost btn-sm" data-action="userReset" data-u="${esc(u.username)}" ${dis(self ? 'Gunakan halaman Akun saya untuk mengganti kata sandi sendiri.' : '')}>${ic('key', 'ic-sm')} Reset kata sandi</button>
          ${u.active
            ? `<button class="btn btn-danger-ghost btn-sm" data-action="userToggle" data-u="${esc(u.username)}" data-v="0" ${dis(self ? 'Anda tidak dapat menonaktifkan akun sendiri.' : '')}>Nonaktifkan</button>`
            : `<button class="btn btn-secondary btn-sm" data-action="userToggle" data-u="${esc(u.username)}" data-v="1" ${dis()}>Aktifkan</button>`}
        </div></td></tr>`;
    }).join('');
    const body = um.error ? `<div class="card-body"><div class="callout callout-danger">${ic('alert')}<div class="small">${esc(um.error)} <button class="btn btn-ghost btn-sm" data-action="userReload">Coba lagi</button></div></div></div>`
      : !um.loaded ? `<div class="card-body"><p class="muted small">Memuat daftar pengguna…</p></div>`
      : `<div class="table-wrap"><table class="table"><thead><tr><th>Pengguna</th><th>Role</th><th>Status</th><th>Login terakhir</th><th></th></tr></thead>
         <tbody>${rows || `<tr><td colspan="5" class="muted" style="text-align:center;padding:40px">Tidak ada pengguna yang cocok dengan filter.</td></tr>`}</tbody></table></div>
         <div class="pager"><span>Menampilkan ${list.length} dari ${um.users.length}</span></div>`;
    return App.adminShell('a-users', `
      ${App.pageHead('Pengguna & role', 'Kelola akun yang dapat masuk ke TACMS. Semua perubahan tercatat di audit log.', canWrite ? `<button class="btn btn-primary" data-action="userCreate">${ic('plus')} Tambah pengguna</button>` : '')}
      ${!canWrite ? `<div class="callout callout-info">${ic('info')}<div class="small">Anda dapat melihat daftar pengguna, tetapi tidak dapat mengubahnya.</div></div>` : ''}
      <div class="grid g4">
        <div class="card kpi"><span class="eyebrow">Total akun</span><span class="v">${um.users.length}</span></div>
        <div class="card kpi"><span class="eyebrow">Aktif</span><span class="v" style="color:var(--success)">${count((u) => u.active)}</span></div>
        <div class="card kpi"><span class="eyebrow">Nonaktif</span><span class="v">${count((u) => !u.active)}</span></div>
        <div class="card kpi"><span class="eyebrow">Wajib ganti kata sandi</span><span class="v" style="color:var(--warning)">${count((u) => u.mustChange)}</span></div>
      </div>
      <section class="card">
        <div class="toolbar">
          <label class="input-group">${ic('search', 'ic-sm')}<input id="um-q" placeholder="Cari nama, nama pengguna, atau email" value="${esc(um.q)}" data-bind="umQ"></label>
          <select class="select" aria-label="Filter role" data-change="umRole"><option value="">Role: Semua</option>${Object.keys(SES.roles || {}).map((r) => `<option value="${r}" ${um.role === r ? 'selected' : ''}>${esc(roleLabel(r))}</option>`).join('')}</select>
          <select class="select" aria-label="Filter status" data-change="umStatus"><option value="">Status: Semua</option><option value="active" ${um.status === 'active' ? 'selected' : ''}>Aktif</option><option value="inactive" ${um.status === 'inactive' ? 'selected' : ''}>Nonaktif</option><option value="must" ${um.status === 'must' ? 'selected' : ''}>Wajib ganti kata sandi</option></select>
          <div class="grow"></div>
          <button class="btn btn-secondary btn-sm" data-action="userReload">${ic('refresh', 'ic-sm')} Muat ulang</button>
        </div>
        ${body}
      </section>
      ${matrix()}`);
  };

  App.binds.umQ = (el) => { um.q = el.value; App.rerender(); const n = document.getElementById('um-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
  App.changes.umRole = (el) => { um.role = el.value; App.rerender(); };
  App.changes.umStatus = (el) => { um.status = el.value; App.rerender(); };
  App.actions.userReload = () => { um.loaded = false; um.error = ''; load(); App.rerender(); };

  /* ---------- Form tambah / ubah ---------- */
  const roleOptions = (current, lockedRole) => {
    const opts = lockedRole ? [current] : um.assignable;
    return opts.map((r) => `<option value="${r}" ${r === current ? 'selected' : ''}>${esc(roleLabel(r))}</option>`).join('');
  };
  const formErr = (msg) => { const e = document.getElementById('um-err'); if (e) { e.textContent = App.t(msg); e.hidden = false; } };
  const busy = (el, on) => { if (!el) return; el.disabled = on; };

  App.actions.userCreate = () => App.modal(`${App.modalHead('Tambah pengguna', 'Sistem membuat kata sandi sementara yang wajib diganti saat login pertama.')}
    <div class="modal-body">
      <div class="callout callout-danger" id="um-err" role="alert" hidden></div>
      <div class="field"><label class="label" for="um-u">Nama pengguna</label><input id="um-u" class="input mono" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="contoh: dewi.examiner"><span class="hint">3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung. Tidak dapat diubah.</span></div>
      <div class="field"><label class="label" for="um-n">Nama lengkap</label><input id="um-n" class="input" autocomplete="off"></div>
      <div class="field"><label class="label" for="um-e">Email</label><input id="um-e" type="email" class="input" autocomplete="off"></div>
      <div class="field"><label class="label" for="um-r">Role</label><select id="um-r" class="select">${roleOptions('examiner')}</select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="userCreateOk" id="um-ok">Buat akun</button></div>`, { drawer: true });

  App.actions.userCreateOk = async (el) => {
    const v = (id) => document.getElementById(id).value.trim();
    busy(el, true);
    const j = await App.api('api/users.php', { action: 'create', username: v('um-u').toLowerCase(), name: v('um-n'), email: v('um-e'), role: v('um-r') });
    busy(el, false);
    if (!j.ok) return formErr(errText(j.error));
    upsert(j.user);
    App.closeModal();
    App.rerender();
    showTemp(j.user, j.tempPassword, 'Akun dibuat');
  };

  App.actions.userEdit = (el) => {
    const u = um.users.find((x) => x.username === el.dataset.u);
    if (!u) return;
    const self = u.username === me.username;
    App.modal(`${App.modalHead('Ubah pengguna', `<span class="mono">${esc(u.username)}</span>`)}
      <div class="modal-body">
        <div class="callout callout-danger" id="um-err" role="alert" hidden></div>
        <div class="field"><label class="label" for="um-n">Nama lengkap</label><input id="um-n" class="input" value="${esc(u.name)}"></div>
        <div class="field"><label class="label" for="um-e">Email</label><input id="um-e" type="email" class="input" value="${esc(u.email)}"></div>
        <div class="field"><label class="label" for="um-r">Role</label><select id="um-r" class="select" ${self ? 'disabled' : ''}>${roleOptions(u.role, self || !um.assignable.includes(u.role))}</select>${self ? '<span class="hint">Anda tidak dapat mengubah role akun sendiri.</span>' : '<span class="hint">Perubahan role berlaku saat pengguna memuat halaman berikutnya.</span>'}</div>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Batal</button><button class="btn btn-primary" data-action="userEditOk" data-u="${esc(u.username)}">Simpan perubahan</button></div>`, { drawer: true });
  };

  App.actions.userEditOk = async (el) => {
    const v = (id) => document.getElementById(id).value.trim();
    busy(el, true);
    const j = await App.api('api/users.php', { action: 'update', username: el.dataset.u, name: v('um-n'), email: v('um-e'), role: v('um-r') });
    busy(el, false);
    if (!j.ok) return formErr(errText(j.error));
    upsert(j.user);
    App.closeModal();
    App.rerender();
    App.toast('Perubahan pengguna disimpan');
  };

  App.actions.userReset = (el) => {
    const u = um.users.find((x) => x.username === el.dataset.u);
    if (!u) return;
    App.confirm({
      title: 'Reset kata sandi?',
      body: `Kata sandi <b>${esc(u.name)}</b> (<span class="mono">${esc(u.username)}</span>) langsung tidak berlaku dan semua sesinya keluar. Sistem membuat kata sandi sementara yang wajib diganti saat login berikutnya.`,
      confirmText: 'Reset kata sandi', danger: true,
      onOk: async () => {
        const j = await App.api('api/users.php', { action: 'reset_password', username: u.username });
        if (!j.ok) return App.toast(errText(j.error), 'alert');
        upsert(j.user);
        App.rerender();
        showTemp(j.user, j.tempPassword, 'Kata sandi direset');
      },
    });
  };

  App.actions.userToggle = (el) => {
    const u = um.users.find((x) => x.username === el.dataset.u);
    if (!u) return;
    const activate = el.dataset.v === '1';
    App.confirm({
      title: activate ? 'Aktifkan akun?' : 'Nonaktifkan akun?',
      body: activate
        ? `<b>${esc(u.name)}</b> dapat masuk kembali dengan kata sandi yang sama.`
        : `<b>${esc(u.name)}</b> tidak dapat masuk lagi dan sesi yang sedang berjalan langsung berakhir. Riwayat akun tetap tersimpan.`,
      confirmText: activate ? 'Aktifkan' : 'Nonaktifkan', danger: !activate, reason: !activate,
      onOk: async (reason) => {
        const j = await App.api('api/users.php', { action: 'set_active', username: u.username, active: activate, reason });
        if (!j.ok) return App.toast(errText(j.error), 'alert');
        upsert(j.user);
        App.rerender();
        App.toast(activate ? 'Akun diaktifkan' : 'Akun dinonaktifkan');
      },
    });
  };

  /* Kata sandi sementara: ditampilkan sekali */
  const showTemp = (u, pw, title) => {
    App.modal(`${App.modalHead(title, `${esc(u.name)} · ${esc(roleLabel(u.role))}`)}
      <div class="modal-body">
        <div class="callout callout-warning">${ic('alert')}<div class="small">Kata sandi sementara ini <b>hanya ditampilkan sekali</b>. Sampaikan lewat saluran yang aman. Pengguna wajib menggantinya saat login pertama.</div></div>
        <dl class="dl"><dt>Nama pengguna</dt><dd class="mono">${esc(u.username)}</dd><dt>Kata sandi sementara</dt><dd><code id="temp-pw" class="mono" style="font-size:1.125rem;user-select:all" data-noi18n>${esc(pw)}</code></dd></dl>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" data-action="copyTemp">${ic('clipboard')} Salin</button><button class="btn btn-primary" data-action="closeModal">Selesai</button></div>`);
  };
  App.actions.copyTemp = () => {
    const el = document.getElementById('temp-pw');
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); App.toast('Teks dipilih. Tekan Ctrl+C untuk menyalin.', 'clipboard'); };
    try { navigator.clipboard.writeText(el.textContent).then(() => App.toast('Kata sandi sementara disalin', 'clipboard'), fallback); } catch (e) { fallback(); }
  };
})();
