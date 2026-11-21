/* TACMS — halaman operasional staf yang tersambung ke data asli (api/ops.php):
   Monitoring ujian, Penilaian essay (rubrik, identitas disamarkan), Retake, Sertifikat, Peserta, KPI dashboard.
   Hak akses diperiksa ulang oleh server untuk setiap permintaan. */
(function () {
  const SES = window.SESSION;
  if (!SES || !SES.user || !App.adminShell) return;
  const S = App.state;
  const { ic, esc, pill } = App;
  const shell = (r, b) => App.adminShell(r, b);
  const head = (...a) => App.pageHead(...a);
  const dt = (iso) => App.fmtDateTime(iso);
  const O = (S.ops = { mon: null, grad: null, gi: 0, gAll: false, rub: {}, fb: '', ret: null, cert: null, certTab: 'approval', parts: null, pq: '', err: {}, busy: false });

  const ensureCsrf = async () => {
    if (SES.csrf) return;
    try { const j = await (await fetch('api/csrf.php', { credentials: 'same-origin', cache: 'no-store' })).json(); SES.csrf = j.csrf; } catch (e) {}
  };
  const post = async (body) => { await ensureCsrf(); return App.api('api/ops.php', body); };
  const get = async (key, q) => {
    const j = await App.api('api/ops.php?' + q);
    if (j.ok) { O[key] = j; O.err[key] = ''; } else O.err[key] = j.error === 'forbidden' ? 'Role Anda tidak memiliki akses ke data ini.' : 'Gagal memuat data dari server.';
    App.rerender();
    return j;
  };
  const ERR = { reason: 'Alasan wajib diisi.', rubric: 'Isi semua kriteria rubrik.', decided: 'Permintaan sudah diputuskan oleh admin lain.', state: 'Status sertifikat sudah berubah. Muat ulang.', forbidden: 'Akses ditolak oleh server.', network: 'Tidak dapat terhubung ke server.' };
  const fail = (j) => App.toast(ERR[j.error] || 'Gagal menyimpan. Coba lagi.', 'alert');
  const loading = (r, title) => shell(r, head(title, 'Memuat data…') + '<section class="card card-pad"><p class="small muted">Memuat…</p></section>');
  const errView = (r, title, m) => shell(r, head(title, '') + `<div class="callout callout-danger">${ic('alert')}<div class="small">${esc(m)}</div></div>`);
  const liveTag = '<span class="tag" title="Diambil dari server">Data asli</span>';
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ===================== Monitoring ===================== */
  let monT = null;
  const monLoop = () => { clearInterval(monT); monT = setInterval(() => { if (App.route() === 'a-monitoring' && !document.querySelector('.overlay')) get('mon', 'view=monitoring'); else if (App.route() !== 'a-monitoring') clearInterval(monT); }, 15000); };
  App.routes['a-monitoring'] = () => {
    if (!O.mon && !O.err.mon) { setTimeout(() => get('mon', 'view=monitoring')); monLoop(); return loading('a-monitoring', 'Monitoring ujian'); }
    if (O.err.mon) return errView('a-monitoring', 'Monitoring ujian', O.err.mon);
    const m = O.mon;
    return shell('a-monitoring', `
      ${head('Monitoring ujian', `Diperbarui otomatis setiap 15 detik · terakhir ${new Date().toLocaleTimeString(App.locale())}`, `${liveTag}<button class="btn btn-secondary btn-sm" data-action="monReload">${ic('repeat', 'ic-sm')} Muat ulang</button>`)}
      <div class="grid g4">
        <div class="card kpi"><span class="eyebrow">Sedang mengerjakan</span><span class="v">${m.stats.live}</span><span class="d">attempt berjalan saat ini</span></div>
        <div class="card kpi"><span class="eyebrow">Selesai hari ini</span><span class="v">${m.stats.today}</span><span class="d">${m.stats.auto} terkirim otomatis karena waktu habis</span></div>
        <div class="card kpi"><span class="eyebrow">Sinyal integritas</span><span class="v" style="color:${m.stats.signals ? 'var(--warning)' : 'inherit'}">${m.stats.signals}</span><span class="d">Pindah tab &gt; 3× · perlu ditinjau, bukan bukti</span></div>
        <div class="card kpi"><span class="eyebrow">Perpanjangan waktu</span><span class="v" style="font-size:1.2rem">${m.canExtend ? 'Diizinkan' : 'Tidak'}</span><span class="d">Wajib alasan · tercatat di audit log</span></div>
      </div>
      <section class="card">
        <div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>Ujian</th><th>Mulai</th><th>Progres</th><th>Sisa waktu</th><th>Tersimpan</th><th>Pindah tab</th><th></th></tr></thead>
        <tbody>${m.live.length ? m.live.map((a) => `<tr><td><div class="cell-title">${esc(a.name)}</div><div class="xs dim mono">${esc(a.participant)} · ${esc(a.id)}</div></td><td class="small">${esc(a.trainingName)}<div class="xs dim">${esc(a.examName)} · attempt ke-${a.no}</div></td>
          <td class="num small">${esc(new Date(a.startedAt).toLocaleTimeString(App.locale(), { hour: '2-digit', minute: '2-digit' }))}</td>
          <td style="min-width:140px"><div class="row" style="flex-wrap:nowrap"><div class="progress grow"><span style="width:${(a.answered / a.total) * 100}%"></span></div><span class="xs num">${a.answered}/${a.total}</span></div></td>
          <td class="num"><b style="color:${a.remaining <= 300 ? 'var(--danger)' : 'inherit'}">${mmss(a.remaining)}</b></td>
          <td class="small">${a.lastSave ? esc(new Date(a.lastSave).toLocaleTimeString(App.locale(), { hour: '2-digit', minute: '2-digit' })) : '—'}</td>
          <td class="num">${a.tabSwitches ? `<span style="color:${a.tabSwitches > 3 ? 'var(--warning)' : 'inherit'};font-weight:600">${a.tabSwitches}×</span>` : '<span class="dim">0</span>'}</td>
          <td>${m.canExtend ? `<button class="btn btn-ghost btn-sm" data-action="opsExtend" data-id="${esc(a.id)}" data-n="${esc(a.name)}">+ 10 menit</button>` : ''}</td></tr>`).join('')
          : `<tr><td colspan="8"><p class="small muted" style="padding:12px 0">Tidak ada peserta yang sedang mengerjakan ujian.</p></td></tr>`}</tbody></table></div>
      </section>`);
  };
  App.actions.monReload = () => get('mon', 'view=monitoring');
  App.actions.opsExtend = (el) => App.confirm({ title: 'Perpanjang waktu 10 menit?', body: `Attempt <b class="mono">${esc(el.dataset.id)}</b> · ${esc(el.dataset.n)}. Gunakan hanya untuk gangguan teknis yang terverifikasi.`, confirmText: 'Tambah 10 menit', reason: true,
    onOk: async (reason) => { const j = await post({ action: 'extend', attempt: el.dataset.id, minutes: 10, reason }); if (!j.ok) return fail(j); App.toast('Waktu diperpanjang 10 menit · tercatat di audit log', 'clock'); get('mon', 'view=monitoring'); } });

  /* ===================== Penilaian ===================== */
  const loadGrad = () => get('grad', 'view=grading' + (O.gAll ? '&all=1' : ''));
  App.routes['a-grading'] = () => {
    if (!O.grad && !O.err.grad) { setTimeout(loadGrad); return loading('a-grading', 'Penilaian'); }
    if (O.err.grad) return errView('a-grading', 'Penilaian', O.err.grad);
    const items = O.grad.items;
    const waiting = items.filter((x) => !x.graded).length;
    const filter = `<label class="check small" style="white-space:nowrap"><input type="checkbox" data-change="gAll" ${O.gAll ? 'checked' : ''}><span>Tampilkan yang sudah dinilai</span></label>`;
    if (!items.length) return shell('a-grading', `${head('Penilaian', 'Jawaban essay yang memerlukan penilaian penguji. Identitas peserta disamarkan selama penilaian.', liveTag + filter)}
      <section class="card card-pad stack" style="align-items:flex-start">${ic('checkCircle', 'ic-lg')}<h3>Semua jawaban sudah dinilai</h3><p class="small muted">${O.grad.gradedCount} jawaban essay telah dinilai.</p></section>`);
    O.gi = Math.min(O.gi, items.length - 1);
    const g = items[O.gi];
    const key = g.attempt + '/' + g.question;
    const sel = O.rub[key] || (g.graded ? g.graded.rubric.slice() : g.rubric.map(() => null));
    O.rub[key] = sel;
    const total = sel.reduce((a, v) => a + (v || 0), 0), maxR = g.rubric.reduce((a, r) => a + r.max, 0);
    const pts = Math.round((total / maxR) * g.max * 100) / 100;
    const filled = sel.every((v) => v != null);
    const can = O.grad.canGrade;
    return shell('a-grading', `
      ${head('Penilaian', 'Jawaban essay yang memerlukan penilaian penguji. Identitas peserta disamarkan selama penilaian.', liveTag + filter)}
      <div class="split">
        <section class="card">
          <div class="card-head"><h3>Antrean</h3>${pill(waiting + ' menunggu', waiting ? 'warning' : 'success')}</div>
          ${items.map((x, i) => `<button class="list-item ${i === O.gi ? 'on' : ''}" data-action="gPick" data-i="${i}"><div class="row-between" style="flex-wrap:nowrap"><b class="small">${esc(x.participant)}</b><span class="xs dim num">${esc(new Date(x.submittedAt).toLocaleString(App.locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</span></div><div class="xs dim">${esc(x.examName)}</div><div class="row" style="gap:6px;margin-top:4px"><span class="tag mono">${esc(x.attempt)}</span>${x.graded ? pill(x.graded.points + ' / ' + x.max, 'success') : pill('Essay · ' + x.max + ' poin', 'warning')}</div></button>`).join('')}
        </section>
        <section class="card">
          <div class="card-head"><div><span class="eyebrow">${esc(g.attempt)} · ${esc(g.participant)} · ${esc(g.question)}</span><h3>${esc(g.examName)}</h3></div>${g.graded ? App.status('GRADED', 'Sudah dinilai') : App.status('PENDING_REVIEW', 'Pending Review')}</div>
          <div class="card-body stack-lg">
            <div class="stack" style="gap:6px"><span class="label">Pertanyaan</span><p class="small" style="max-width:75ch">${esc(g.text)}</p></div>
            <div class="stack" style="gap:6px"><span class="label">Jawaban peserta</span><div class="answer-box">${g.answer ? esc(g.answer).replace(/\n/g, '<br>') : '<span class="dim">(tidak dijawab)</span>'}</div><span class="xs dim">${g.answer.trim().split(/\s+/).filter(Boolean).length} kata · dikirim ${dt(g.submittedAt)}</span></div>
            <div class="stack" style="gap:0"><div class="row-between"><span class="label">Rubrik penilaian</span><span class="small">Rubrik <b class="num">${total}</b> / ${maxR} → <b class="num" style="font-size:1.125rem">${pts}</b> / ${g.max} poin</span></div>
              ${g.rubric.map((r, k) => `<div class="rubric"><div><div class="small" style="font-weight:600">${esc(r.name)}</div><div class="xs dim">${esc(r.desc)}</div></div><div class="score-btns" role="group" aria-label="${esc(r.name)}">${Array.from({ length: r.max + 1 }, (_, v) => `<button class="${sel[k] === v ? 'on' : ''}" data-action="gRub" data-k="${k}" data-v="${v}" aria-pressed="${sel[k] === v}" ${can ? '' : 'disabled'}>${v}</button>`).join('')}</div></div>`).join('')}
            </div>
            <div class="field"><label class="label" for="gr-f">Umpan balik untuk peserta</label><textarea id="gr-f" class="textarea" style="min-height:80px" data-bind="gFb" maxlength="1000" ${can ? '' : 'disabled'}>${esc(O.fb || (g.graded && g.graded.feedback) || '')}</textarea></div>
            <div class="row-between"><span class="xs dim">${g.graded ? `Dinilai ${esc(g.graded.grader)} · ${dt(g.graded.graded_at)} · perubahan nilai tercatat di audit log` : 'Nilai dan perubahannya tercatat di audit log'}</span>
              <button class="btn btn-primary" data-action="gSave" ${filled && can && !O.busy ? '' : 'disabled'}>${ic('checkCircle', 'ic-sm')} ${g.graded ? 'Simpan perubahan' : 'Finalisasi nilai'}</button></div>
          </div>
        </section>
      </div>`);
  };
  App.changes.gAll = (el) => { O.gAll = el.checked; O.gi = 0; loadGrad(); };
  App.actions.gPick = (el) => { O.gi = +el.dataset.i; O.fb = ''; App.rerender(); };
  App.actions.gRub = (el) => { const g = O.grad.items[O.gi]; O.rub[g.attempt + '/' + g.question][+el.dataset.k] = +el.dataset.v; App.rerender(); };
  App.binds.gFb = (el) => { O.fb = el.value; };
  App.actions.gSave = () => {
    const g = O.grad.items[O.gi];
    App.confirm({ title: g.graded ? 'Ubah nilai?' : 'Finalisasi nilai?', body: 'Nilai attempt dihitung ulang. Bila semua soal sudah dinilai, hasil lulus/tidak lulus tampil ke peserta dan sertifikat diproses bila memenuhi syarat.', confirmText: g.graded ? 'Simpan' : 'Finalisasi',
      onOk: async () => {
        O.busy = true;
        const j = await post({ action: 'grade', attempt: g.attempt, question: g.question, rubric: O.rub[g.attempt + '/' + g.question], feedback: O.fb || (g.graded && g.graded.feedback) || '' });
        O.busy = false;
        if (!j.ok) { App.rerender(); return fail(j); }
        App.toast(`${g.attempt}: ${j.points} poin${j.score != null ? ` · nilai akhir ${j.score} (${j.result === 'PASSED' ? 'Lulus' : 'Tidak lulus'})` : ' · menunggu soal lain'}`, 'checkCircle');
        O.fb = ''; delete O.rub[g.attempt + '/' + g.question];
        loadGrad();
      } });
  };

  /* ===================== Retake ===================== */
  const POL = { PASS_ONCE: 'PASS_ONCE', HIGHEST_SCORE: 'HIGHEST_SCORE', LATEST_SCORE: 'LATEST_SCORE' };
  App.routes['a-retake'] = () => {
    if (!O.ret && !O.err.ret) { setTimeout(() => get('ret', 'view=retake')); return loading('a-retake', 'Manajemen retake'); }
    if (O.err.ret) return errView('a-retake', 'Manajemen retake', O.err.ret);
    const r = O.ret;
    const st = (s) => (s === 'PENDING' ? pill('Menunggu', 'warning') : s === 'APPROVED' ? pill('Disetujui', 'success') : pill('Ditolak', 'danger'));
    return shell('a-retake', `
      ${head('Manajemen retake', 'Pengajuan ujian ulang dan hak attempt tambahan. Semua attempt sebelumnya tetap tersimpan.', liveTag)}
      <div class="grid g3">${r.policies.filter((p) => p.max > 1).map((p) => `<div class="card card-pad stack" style="gap:4px"><b class="small">${esc(p.name)}</b><span class="xs dim">${p.max} attempt · ${p.wait_hours ? p.wait_hours + ' jam tunggu' : 'tanpa jeda'} · ${p.approval ? 'persetujuan admin' : 'otomatis'} · ${POL[p.scoring] || esc(p.scoring)} · lulus ≥ ${p.passing}</span></div>`).join('')}</div>
      <section class="card">
        <div class="card-head"><h3>Pengajuan</h3>${pill(r.requests.filter((x) => x.status === 'PENDING').length + ' menunggu', 'warning')}</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>Ujian</th><th>Attempt terakhir</th><th>Nilai</th><th>Tersedia mulai</th><th>Alasan peserta</th><th>Status</th><th></th></tr></thead>
        <tbody>${r.requests.length ? r.requests.map((x) => `<tr><td><div class="cell-title">${esc(x.name)}</div><div class="xs dim mono">${esc(x.participant)} · ${esc(x.id)}</div></td><td class="small">${esc(x.examName)}</td><td class="num">ke-${x.attemptNo} <span class="dim">/ ${x.max}</span></td>
          <td class="num"><b style="color:var(--danger)">${x.lastScore ?? '—'}</b> <span class="dim">/ ${x.passing}</span></td><td class="small">${dt(x.availableFrom)}</td><td class="small" style="max-width:240px">${esc(x.reason || '—')}${x.note ? `<div class="xs dim">Catatan admin: ${esc(x.note)}</div>` : ''}</td><td>${st(x.status)}${x.decided_by ? `<div class="xs dim">${esc(x.decided_by)}</div>` : ''}</td>
          <td>${x.status === 'PENDING' && r.canDecide ? `<div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn btn-danger-ghost btn-sm" data-action="rtNo" data-id="${esc(x.id)}">Tolak</button><button class="btn btn-primary btn-sm" data-action="rtYes" data-id="${esc(x.id)}" data-n="${esc(x.name)}">Setujui</button></div>` : ''}</td></tr>`).join('')
          : '<tr><td colspan="8"><p class="small muted" style="padding:12px 0">Belum ada pengajuan.</p></td></tr>'}</tbody></table></div>
      </section>`);
  };
  const decide = async (id, decision, note) => { const j = await post({ action: 'retake_decide', id, decision, note }); if (!j.ok) return fail(j); App.toast(decision === 'approve' ? 'Retake disetujui · peserta mendapat 1 attempt tambahan' : 'Pengajuan ditolak', 'repeat'); get('ret', 'view=retake'); };
  App.actions.rtYes = (el) => App.confirm({ title: 'Setujui retake?', body: `${esc(el.dataset.n)} mendapat hak 1 attempt tambahan setelah masa tunggu berakhir.`, confirmText: 'Setujui', onOk: () => decide(el.dataset.id, 'approve', '') });
  App.actions.rtNo = (el) => App.confirm({ title: 'Tolak pengajuan retake?', body: 'Alasan penolakan ditampilkan kepada peserta.', confirmText: 'Tolak', danger: true, reason: true, onOk: (note) => decide(el.dataset.id, 'reject', note) });

  /* ===================== Sertifikat ===================== */
  const origCert = App.routes['a-certificates'];
  App.routes['a-certificates'] = () => {
    if (!O.cert && !O.err.cert) { setTimeout(() => get('cert', 'view=certificates')); return loading('a-certificates', 'Sertifikat'); }
    if (O.err.cert) return errView('a-certificates', 'Sertifikat', O.err.cert);
    const all = O.cert.certificates;
    const pend = all.filter((c) => c.status === 'PENDING_APPROVAL'), iss = all.filter((c) => c.state === 'VALID'), bad = all.filter((c) => ['REVOKED', 'EXPIRED'].includes(c.state));
    const tab = O.certTab;
    const tabs = `<div class="tabs" role="tablist">${[['approval', 'Persetujuan', pend.length], ['issued', 'Terbit', iss.length], ['revoked', 'Dicabut / kedaluwarsa', bad.length], ['templates', 'Template'], ['generate', 'Generator otomatis'], ['upload', 'Upload admin']].map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-action="ocTab" data-v="${k}">${l}${n != null ? ` <span class="tag">${n}</span>` : ''}</button>`).join('')}</div>`;
    if (['templates', 'generate', 'upload'].includes(tab)) {
      S.certTab = tab;
      return origCert().replace(/<div class="tabs" role="tablist">[\s\S]*?<\/div>/, tabs + `<div class="callout callout-info" style="margin:16px 16px 0">${App.ic('info')}<div class="small">Bagian ini masih berupa purwarupa (belum tersambung ke server). Sertifikat asli dibuat otomatis oleh sistem saat peserta memenuhi syarat dan tampil di tab Persetujuan.</div></div>`);
    }
    const list = tab === 'approval' ? pend : tab === 'issued' ? iss : bad;
    const stp = (c) => (c.status === 'PENDING_APPROVAL' ? pill('Menunggu', 'warning') : c.state === 'VALID' ? pill('Berlaku', 'success') : c.state === 'REVOKED' ? pill('Dicabut', 'danger') : pill('Kedaluwarsa', 'warning'));
    const act = (c) => {
      if (c.status === 'PENDING_APPROVAL') return O.cert.canApprove ? `<button class="btn btn-primary btn-sm" data-action="ocApprove" data-id="${esc(c.id)}" data-n="${esc(c.name)}">Setujui &amp; terbitkan</button>` : '';
      return `<div class="row" style="flex-wrap:nowrap;gap:4px"><a class="btn btn-ghost btn-sm" href="api/certificate.php?id=${encodeURIComponent(c.id)}" target="_blank" rel="noopener">Lihat</a><a class="btn btn-ghost btn-sm" href="?v=${encodeURIComponent(c.token)}#verify" target="_blank" rel="noopener">Cek publik</a>${c.state === 'VALID' && O.cert.canRevoke ? `<button class="btn btn-danger-ghost btn-sm" data-action="ocRevoke" data-id="${esc(c.id)}" data-no="${esc(c.no)}">Cabut</button>` : ''}</div>`;
    };
    return shell('a-certificates', `
      ${head('Sertifikat', 'Sertifikat dibuat otomatis saat peserta memenuhi syarat (eligibility), lalu terbit setelah disetujui. Nomor & QR verifikasi diberikan saat terbit.', liveTag)}
      <section class="card">${tabs}
        <div class="table-wrap"><table class="table"><thead><tr><th>Nomor</th><th>Peserta</th><th>Jenis</th><th>Pelatihan</th><th class="num">Nilai</th><th>${tab === 'approval' ? 'Memenuhi syarat' : 'Terbit'}</th><th>Berlaku s/d</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.length ? list.map((c) => `<tr><td class="mono small" data-noi18n>${esc(c.no || '—')}</td><td><div class="cell-title">${esc(c.name)}</div><div class="xs dim mono">${esc(c.participant)}</div></td><td><span class="tag">${esc(c.type)}</span></td><td class="small">${esc(c.trainingName)}</td><td class="num">${c.score ?? '—'}</td>
          <td class="small">${dt(tab === 'approval' ? c.createdAt : c.issuedAt)}</td><td class="small">${c.no ? (c.expiresAt ? dt(c.expiresAt) : 'Tanpa batas') : '—'}</td><td>${stp(c)}${c.revokedReason ? `<div class="xs dim">${esc(c.revokedReason)}</div>` : ''}</td><td>${act(c)}</td></tr>`).join('')
          : `<tr><td colspan="9"><p class="small muted" style="padding:12px 0">${tab === 'approval' ? 'Tidak ada sertifikat yang menunggu persetujuan.' : 'Tidak ada data.'}</p></td></tr>`}</tbody></table></div>
      </section>`);
  };
  App.actions.ocTab = (el) => { O.certTab = el.dataset.v; App.rerender(); };
  App.actions.ocApprove = (el) => App.confirm({ title: 'Setujui & terbitkan?', body: `Sertifikat untuk <b>${esc(el.dataset.n)}</b> diterbitkan dengan nomor resmi dan QR verifikasi. Peserta dapat langsung mengunduhnya.`, confirmText: 'Terbitkan',
    onOk: async () => { const j = await post({ action: 'cert_approve', id: el.dataset.id }); if (!j.ok) return fail(j); App.toast('Sertifikat terbit · ' + j.certificate.no, 'award'); get('cert', 'view=certificates'); } });
  App.actions.ocRevoke = (el) => App.confirm({ title: 'Cabut sertifikat?', body: `Sertifikat <b class="mono">${esc(el.dataset.no)}</b> akan tampil sebagai DICABUT di halaman verifikasi publik. Tindakan ini tercatat permanen.`, confirmText: 'Cabut sertifikat', danger: true, reason: true,
    onOk: async (reason) => { const j = await post({ action: 'cert_revoke', id: el.dataset.id, reason }); if (!j.ok) return fail(j); App.toast('Sertifikat dicabut', 'xCircle'); get('cert', 'view=certificates'); } });

  /* ===================== Peserta ===================== */
  App.routes['a-participants'] = () => {
    if (!O.parts && !O.err.parts) { setTimeout(() => get('parts', 'view=participants')); return loading('a-participants', 'Peserta'); }
    if (O.err.parts) return errView('a-participants', 'Peserta', O.err.parts);
    const q = O.pq.toLowerCase();
    const list = O.parts.participants.filter((p) => !q || [p.no, p.name, p.email, p.phone, p.inst].join(' ').toLowerCase().includes(q));
    const v = (ok, val) => `<div class="row" style="gap:6px;flex-wrap:nowrap">${ok ? `<span title="Terverifikasi" style="color:var(--success)">${ic('checkCircle', 'ic-sm')}</span>` : `<span title="Belum terverifikasi" class="dim">${ic('clock', 'ic-sm')}</span>`}<span class="small" style="overflow-wrap:anywhere" data-noi18n>${esc(val || '—')}</span></div>`;
    return shell('a-participants', `
      ${head('Peserta', 'Satu ID peserta mewakili satu individu. Peserta baru dibuat lewat Pelatihan → Enroll peserta.', liveTag)}
      <section class="card">
        <div class="toolbar"><label class="input-group">${ic('search', 'ic-sm')}<input placeholder="Cari nama, email, telepon, atau ID" value="${esc(O.pq)}" data-bind="opq" id="opq"></label><div class="grow"></div><span class="small muted">${list.length} dari ${O.parts.participants.length} peserta</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>No. peserta</th><th>Nama</th><th>Email</th><th>Telepon</th><th>Institusi</th><th class="t-right">Pelatihan</th><th class="t-right">Sertifikat</th><th></th></tr></thead>
        <tbody>${list.map((p) => `<tr><td class="mono small">${esc(p.no)}</td><td class="cell-title">${esc(p.name)}</td><td>${v(p.emailVerified, p.email)}</td><td>${v(p.phoneVerified, p.phone)}</td><td class="small">${esc(p.inst || '—')}</td><td class="t-right num">${p.trainings}</td><td class="t-right num">${p.certificates}</td><td><button class="icon-btn" data-action="opProfile" data-no="${esc(p.no)}" aria-label="Profil ${esc(p.name)}">${ic('eye')}</button></td></tr>`).join('')}</tbody></table></div>
      </section>`);
  };
  App.binds.opq = (el) => { O.pq = el.value; App.rerender(); const n = document.getElementById('opq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
  App.actions.opProfile = async (el) => {
    const j = await App.api('api/ops.php?view=participant&no=' + encodeURIComponent(el.dataset.no));
    if (!j.ok) return fail(j);
    const p = j.participant;
    const ev = [];
    j.enrollments.forEach((e) => ev.push([e.createdAt, e.status === 'CANCELLED' ? 'd' : 's', `${e.trainingName} — ${e.examName}`, `Enrollment ${e.id} · ${e.status}${e.voucher ? ' · voucher ' + e.voucher : ''}${e.result ? ' · hasil ' + e.result + (e.finalScore != null ? ' (' + e.finalScore + ')' : '') : ''}`]));
    j.attempts.forEach((a) => ev.push([a.submittedAt || a.startedAt, a.status === 'PENDING_REVIEW' || a.status === 'IN_PROGRESS' ? 'w' : a.result === 'PASSED' ? 's' : 'd', `${a.examName} · attempt ke-${a.no}`, `${a.id} · ${a.status}${a.score != null ? ' · nilai ' + a.score : ''}${a.tabSwitches ? ' · pindah tab ' + a.tabSwitches + '×' : ''}`]));
    j.certificates.forEach((c) => ev.push([c.issuedAt || c.createdAt, c.state === 'VALID' ? 's' : c.status === 'PENDING_APPROVAL' ? 'w' : 'd', `Sertifikat ${c.type} · ${c.trainingName}`, `${c.no || 'menunggu persetujuan'} · ${c.status === 'PENDING_APPROVAL' ? 'PENDING' : c.state}`]));
    ev.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
    App.modal(`${App.modalHead(esc(p.name), `<span class="mono">${esc(p.no)}</span> · ${esc(p.inst || '—')}`)}
      <div class="modal-body">
        <dl class="dl"><dt>Email</dt><dd data-noi18n>${esc(p.email)} ${p.emailVerifiedAt ? pill('Terverifikasi', 'success') : pill('Belum', 'warning')}</dd><dt>Telepon</dt><dd data-noi18n>${esc(p.phone || '—')} ${p.phoneVerifiedAt ? pill('Terverifikasi', 'success') : pill('Belum', 'warning')}</dd></dl>
        <hr class="hr"><h4>Riwayat</h4>
        ${ev.length ? `<div class="timeline">${ev.map(([t, k, a, b]) => `<div class="tl-item"><span class="tl-dot ${k}"></span><div><div class="small" style="font-weight:600">${esc(a)}</div><div class="xs dim">${dt(t)} · ${esc(b)}</div></div></div>`).join('')}</div>` : '<p class="small muted">Belum ada riwayat.</p>'}
      </div>
      <div class="modal-foot"><button class="btn btn-primary" data-action="closeModal">Tutup</button></div>`, { drawer: true });
  };

  /* ===================== Dashboard: KPI dari data asli ===================== */
  const prevDash = App.after['a-dashboard'];
  App.after['a-dashboard'] = async () => {
    if (prevDash) prevDash();
    const j = await App.api('api/ops.php?view=dashboard');
    const kpis = document.querySelectorAll('#app .grid.g4 .kpi');
    if (!j.ok || kpis.length < 4) return;
    const k = j.kpi;
    const set = (el, v, d) => { el.querySelector('.v').textContent = v; el.querySelector('.d').innerHTML = d; };
    set(kpis[0], k.participants, `${k.enrollments} enrollment aktif`);
    set(kpis[1], k.trainingsTotal, `${k.trainings} aktif / terjadwal`);
    set(kpis[2], k.live, `${pill('Live', 'teal')} ${k.attempts} attempt dinilai · lulus ${k.passRate ?? '—'}%`);
    set(kpis[3], k.certificates, `${k.certPending} menunggu persetujuan`);
    const tasks = document.querySelector('#app .task');
    if (tasks) {
      const box = tasks.parentElement;
      box.innerHTML = [['edit', 'var(--warning-soft)', 'var(--warning)', `${k.pendingEssay} jawaban essay belum dinilai`, 'Penilaian', 'a-grading'],
        ['repeat', 'var(--teal-soft)', 'var(--teal)', `${k.retakePending} pengajuan retake menunggu`, 'Manajemen retake', 'a-retake'],
        ['award', 'var(--info-soft)', 'var(--info)', `${k.certPending} sertifikat menunggu persetujuan`, 'Sertifikat', 'a-certificates']]
        .filter((x) => App.canRoute(x[5]))
        .map(([i, bg, c, t, d, r]) => `<div class="task"><div class="ti" style="background:${bg};color:${c}">${ic(i)}</div><div class="grow"><div class="small" style="font-weight:600">${t}</div><div class="xs dim">${d}</div></div><button class="icon-btn" data-go="${r}" aria-label="Buka">${ic('chevR')}</button></div>`).join('') || '<p class="small muted">Tidak ada tindakan.</p>';
    }
    document.querySelectorAll('#app .grid.g4 .kpi').forEach((el) => el.setAttribute('title', 'Data asli dari server'));
  };

  // Data dimuat ulang setiap kali halaman dibuka dari menu
  const prevGo = App.go;
  App.go = (r) => { if (r === 'a-monitoring') O.mon = null; if (r === 'a-grading') O.grad = null; if (r === 'a-retake') O.ret = null; if (r === 'a-certificates') O.cert = null; if (r === 'a-participants') O.parts = null; O.err = {}; return prevGo(r); };
})();
