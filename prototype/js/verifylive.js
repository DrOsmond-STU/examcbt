/* TACMS — verifikasi sertifikat publik yang tersambung ke server (api/verify.php).
   Mendukung tautan QR: /?v=TOKEN#verify. Hanya menampilkan data minimum, tanpa email/telepon/nilai. */
(function () {
  if (!window.SESSION) return;
  const S = App.state;
  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(App.locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '—');
  const TYPES = { Competency: 'Competency', Completion: 'Completion', Attendance: 'Attendance' };
  const lookup = async (params, label) => {
    S.verifyResult = { state: 'LOADING' };
    let j;
    try { j = await (await fetch('api/verify.php?' + params, { credentials: 'same-origin', cache: 'no-store' })).json(); } catch (e) { j = { ok: false, error: 'network' }; }
    if (!j.ok) {
      S.verifyResult = { state: 'NOT_FOUND', q: label };
      App.rerender();
      App.toast(j.error === 'locked' ? `Terlalu banyak pencarian gagal. Coba lagi dalam ${j.minutes} menit.` : j.error === 'empty' ? 'Masukkan nomor sertifikat.' : 'Tidak dapat menghubungi server.', 'alert');
      return;
    }
    S.verifyResult = j.state === 'NOT_FOUND' ? { state: 'NOT_FOUND', q: label }
      : { state: j.state, c: { p: j.name, no: j.no, type: TYPES[j.type] || j.type, training: j.training, issued: fmt(j.issuedAt), exp: j.expiresAt ? fmt(j.expiresAt) : '—' } };
    if (j.no) S.verifyInput = j.no;
    App.rerender();
  };
  const orig = App.routes.verify;
  // Contoh nomor dari data dummy (berlaku, dicabut, kedaluwarsa)
  const samples = (h) => h
      .replace('data-v="LSPTN/DA/2026/00731">00731', 'data-v="LSPTN/CS/2026/00704">Berlaku')
      .replace('data-v="LSPTN/CS/2026/00512">00512', 'data-v="LSPTN/CS/2026/00708">Dicabut')
      .replace('data-v="LSPTN/K3/2023/00105">00105', 'data-v="LSPTN/K3/2023/00701">Kedaluwarsa')
      .replace('>acak</button>', '>Tidak ada</button>')
      .replace(/<button class="btn btn-secondary" data-action="verifyQr">[\s\S]*?<\/button>/, '');
  App.routes.verify = () => {
    if (S.verifyResult && S.verifyResult.state === 'LOADING') { const r = S.verifyResult; S.verifyResult = null; const h = orig(); S.verifyResult = r; return samples(h).replace('</form>', '</form><p class="small muted" aria-live="polite">Memeriksa…</p>'); }
    return samples(orig());
  };
  App.actions.verify = () => { const q = (S.verifyInput || '').trim(); if (!q) return App.toast('Masukkan nomor sertifikat.', 'info'); lookup('no=' + encodeURIComponent(q), q); };
  App.actions.verifyTry = (el) => { S.verifyInput = el.dataset.v; lookup('no=' + encodeURIComponent(el.dataset.v), el.dataset.v); };
  // Tautan dari QR Code
  const tok = new URLSearchParams(location.search).get('v');
  if (tok && /^v_[A-Za-z0-9_-]{8,40}$/.test(tok)) {
    if (App.route() !== 'verify') history.replaceState(null, '', location.pathname + location.search + '#verify');
    setTimeout(() => lookup('token=' + encodeURIComponent(tok), '(QR)'), 0);
  }
})();
