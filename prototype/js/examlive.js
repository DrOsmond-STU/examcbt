/* TACMS — ruang ujian peserta yang tersambung ke server (api/exam.php).
   Flowchart: Start Exam → Answer → Auto Save → Submit / Time Expired → Calculate Score → Passed?
   → Retake (Wait / Request Approval) atau Certificate Eligibility → Download Certificate.
   Waktu, nilai, dan semua syarat ditentukan server; kunci jawaban tidak pernah dikirim ke browser. */
(function () {
  const SES = window.SESSION;
  if (!SES || !SES.user || SES.user.role !== 'participant') return;
  const S = App.state;
  const { ic, esc, pill } = App;
  const shell = (r, body) => App.pShell(r, body);

  const ss = {
    get: (k) => { try { return sessionStorage.getItem('tacms.' + k); } catch (e) { return null; } },
    set: (k, v) => { try { v == null ? sessionStorage.removeItem('tacms.' + k) : sessionStorage.setItem('tacms.' + k, v); } catch (e) {} },
  };
  const ls = {
    get: (k) => { try { return JSON.parse(localStorage.getItem('tacms.' + k) || 'null'); } catch (e) { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem('tacms.' + k) : localStorage.setItem('tacms.' + k, JSON.stringify(v)); } catch (e) {} },
  };

  const L = (S.live = {
    enr: ss.get('enr'), att: ss.get('att'), res: ss.get('res'),
    info: null, infoFor: null, infoErr: '', agree: false, starting: false,
    exam: null, examFor: null, examErr: '', cur: 0, answers: {}, flags: {}, dirty: {}, dirtyFlags: {},
    saved: 'saved', savedAt: null, offline: false, tabs: 0, deadlineAt: 0, submitting: false, navOpen: false,
    result: null, resultFor: null, resultErr: '', reqReason: '', reqBusy: false,
    me: null, meBusy: false,
  });

  const ERR = {
    gate: 'Belum semua syarat akses terpenuhi. Periksa daftar syarat di bawah.',
    late_blocked: 'Anda terlambat lebih dari 30 menit. Kebijakan ujian ini tidak mengizinkan peserta terlambat untuk mulai.',
    other_active: 'Anda masih memiliki ujian lain yang sedang berjalan. Selesaikan ujian tersebut terlebih dahulu.',
    not_found: 'Data ujian tidak ditemukan.', not_allowed: 'Permintaan tidak dapat diajukan pada status ini.',
    csrf: 'Sesi halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.', network: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
  };
  const errText = (j) => ERR[j.error] || 'Terjadi kesalahan di server. Coba lagi.';
  const errBox = (m) => (m ? `<div class="callout callout-danger" role="alert">${ic('alert')}<div class="small">${esc(m)}</div></div>` : '');
  const ensureCsrf = async () => {
    if (SES.csrf) return;
    try { const j = await (await fetch('api/csrf.php', { credentials: 'same-origin', cache: 'no-store' })).json(); SES.csrf = j.csrf; } catch (e) {}
  };
  const post = async (body) => {
    await ensureCsrf();
    let j = await App.api('api/exam.php', body);
    if (j.error === 'csrf') { SES.csrf = null; await ensureCsrf(); j = await App.api('api/exam.php', body); }
    return j;
  };
  const dt = (iso) => App.fmtDateTime(iso);
  const loadMe = async () => {
    if (L.meBusy) return;
    L.meBusy = true;
    const j = await App.api('api/participant.php');
    L.meBusy = false;
    if (j.ok) { L.me = j; if (S.act) S.act.me = j; }
    App.rerender();
  };
  App.examLive = { reset: () => { L.me = null; if (S.act) S.act.me = null; } };

  const POLICY = { PASS_ONCE: 'Lulus sekali (pass once)', HIGHEST_SCORE: 'Nilai tertinggi', LATEST_SCORE: 'Nilai terakhir', FIRST_ATTEMPT: 'Attempt pertama', AVERAGE_SCORE: 'Rata-rata' };
  const policyText = (r) => `Kebijakan nilai: <b>${POLICY[r.scoring] || r.scoring}</b>. Maksimal ${r.max} attempt${r.max > 1 ? (r.approval ? `; ujian ulang memerlukan persetujuan admin${r.wait_hours ? ` dengan masa tunggu ${r.wait_hours} jam` : ''}` : r.wait_hours ? `; masa tunggu ${r.wait_hours} jam sebelum ujian ulang` : '; ujian ulang dapat langsung dilakukan') : ''}.`;

  /* ===================== Buka ujian dari dashboard ===================== */
  App.actions.openExam = (el) => { L.enr = el.dataset.id; ss.set('enr', L.enr); L.info = null; L.agree = false; App.go('p-instructions'); };
  App.actions.openResult = (el) => { L.res = el.dataset.id; ss.set('res', L.res); L.result = null; App.go('p-result'); };
  App.actions.resumeExam = (el) => { L.att = el.dataset.id; ss.set('att', L.att); L.exam = null; App.go('p-exam'); };

  /* ===================== Instruksi & pemeriksaan akses ===================== */
  const loadInfo = async () => {
    const id = L.enr;
    L.infoFor = id; L.infoErr = '';
    const j = await App.api('api/exam.php?enrollment=' + encodeURIComponent(id));
    if (j.ok) L.info = j; else L.infoErr = errText(j);
    App.rerender();
  };
  const GATE = { identity: 'Identitas & kontak terverifikasi', enrollment: 'Enrollment aktif & sesuai ujian', schedule: 'Dalam jadwal yang diizinkan', voucher: 'Voucher terikat ke akun Anda', payment: 'Pembelian terkonfirmasi', entitlement: 'Hak attempt tersedia' };
  const gateRow = (g) => `<div class="gate-row">${g.ok === true ? ic('checkCircle', 'ok') : g.ok === 'wait' ? ic('clock', 'wait') : ic('xCircle', 'no')}<div>${g.key === 'schedule' && g.ok === 'wait' ? 'Menunggu jadwal dibuka' : GATE[g.key]}</div></div>`;

  App.routes['p-instructions'] = () => {
    if (!L.enr) return shell('p-dashboard', `<section class="card card-pad stack" style="align-items:flex-start"><h3>Pilih ujian dari beranda</h3><p class="small muted">Buka ujian melalui kartu ujian di beranda.</p><button class="btn btn-primary" data-go="p-dashboard">${ic('arrowL')} Beranda</button></section>`);
    if (L.infoFor !== L.enr) setTimeout(loadInfo);
    const back = `<button class="btn btn-ghost btn-sm" data-go="p-dashboard" style="align-self:flex-start">${ic('arrowL', 'ic-sm')} Beranda</button>`;
    if (L.infoErr) return shell('p-dashboard', back + errBox(L.infoErr));
    if (!L.info || L.infoFor !== L.enr) return shell('p-dashboard', back + '<p class="muted small">Memuat instruksi ujian…</p>');
    const e = L.info.enrollment, r = L.info.rules, rs = e.retake;
    const resume = rs.state === 'in_progress';
    const attemptNo = resume ? rs.used : rs.used + 1;
    const allOk = e.canStart;
    return shell('p-dashboard', `${back}
      <div class="stack" style="gap:6px"><span class="eyebrow">Instruksi ujian</span><h1>${esc(e.trainingName)} — ${esc(e.examName)}</h1><p class="small muted"><span class="mono">${esc(e.id)}</span> · ${esc(App.fmtSched(e))}</p></div>
      <div class="grid g4">
        ${[['Durasi', r.duration + ' menit'], ['Jumlah soal', r.questions + ' soal'], ['Nilai lulus', '≥ ' + r.passing], ['Attempt', `${Math.max(1, attemptNo)} dari ${rs.allowed}`]].map(([k, v]) => `<div class="card kpi"><span class="eyebrow">${k}</span><span class="v" style="font-size:1.4rem">${v}</span></div>`).join('')}
      </div>
      <div class="grid g2" style="align-items:start">
        <section class="card card-pad stack">
          <h3>Ketentuan</h3>
          <ol class="stack small" style="padding-left:18px;margin:0;gap:8px">
            <li>Waktu dihitung oleh server sejak Anda menekan <b>Mulai</b> dan tidak berhenti saat koneksi terputus.</li>
            <li>Jawaban tersimpan otomatis setiap kali Anda mengubahnya. Status penyimpanan terlihat di bagian atas layar.</li>
            <li>Anda bebas berpindah soal dan menandai soal untuk ditinjau kembali. Urutan soal diacak untuk setiap attempt.</li>
            <li>Ujian terkirim otomatis saat waktu habis. Setelah dikirim, jawaban tidak dapat diubah.</li>
            <li>Perpindahan tab atau jendela dicatat sebagai sinyal integritas untuk ditinjau penguji.</li>
            <li>Soal essay dinilai penguji dengan rubrik. Hasil akhir tampil setelah penilaian selesai.</li>
            <li>${policyText(r.retake)}</li>
            ${r.late === 'BLOCK' ? '<li>Peserta yang terlambat lebih dari 30 menit dari jadwal tidak dapat memulai.</li>' : ''}
          </ol>
        </section>
        <section class="card card-pad stack">
          <div class="row-between"><h3>Pemeriksaan akses</h3>${allOk ? pill('Semua syarat terpenuhi', 'success') : pill('Belum terpenuhi', 'warning')}</div>
          <div class="gate">${e.gates.map(gateRow).join('')}</div>
          <p class="xs dim">Diperiksa ulang oleh server saat Anda menekan Mulai.</p>
        </section>
      </div>
      ${L.startErr ? errBox(L.startErr) : ''}
      <section class="card card-pad stack">
        ${resume ? `<div class="callout callout-info">${ic('info')}<div class="small">Attempt <span class="mono">${esc(rs.attempt)}</span> sedang berjalan. Waktu terus berjalan sejak dimulai.</div></div>
          <div class="row"><button class="btn btn-primary btn-lg" data-action="resumeExam" data-id="${esc(rs.attempt)}">${ic('play')} Lanjutkan ujian</button></div>`
        : `<label class="check"><input type="checkbox" id="agree" data-change="liveAgree" ${L.agree ? 'checked' : ''} ${allOk ? '' : 'disabled'}><span>Saya telah membaca ketentuan dan siap memulai. Saya memahami bahwa attempt ke-${attemptNo} akan tercatat begitu ujian dimulai.</span></label>
          <div class="row"><button class="btn btn-primary btn-lg" data-action="liveStart" ${L.agree && allOk && !L.starting ? '' : 'disabled'}>${ic('play')} ${L.starting ? 'Memulai…' : 'Mulai ujian'}</button><span class="small muted">Waktu mulai berjalan setelah tombol ditekan.</span></div>`}
      </section>`);
  };
  App.changes.liveAgree = (el) => { L.agree = el.checked; App.rerender(); };
  App.actions.liveStart = async () => {
    if (L.starting) return;
    L.starting = true; L.startErr = ''; App.rerender();
    const j = await post({ action: 'start', enrollment: L.enr });
    L.starting = false;
    if (!j.ok) { L.startErr = errText(j); L.infoFor = null; App.rerender(); return; }
    L.att = j.attempt; ss.set('att', L.att); L.exam = null; L.examFor = null; L.agree = false;
    App.examLive.reset();
    App.go('p-exam');
    if (!j.resumed) App.toast('Ujian dimulai · ' + j.attempt, 'play');
  };

  /* ===================== Ruang ujian ===================== */
  const loadExam = async () => {
    const id = L.att;
    L.examFor = id; L.examErr = '';
    const j = await App.api('api/exam.php?attempt=' + encodeURIComponent(id));
    if (!j.ok) { L.examErr = errText(j); App.rerender(); return; }
    const a = j.attempt;
    if (a.status !== 'IN_PROGRESS') { goResult(a.id); return; }
    L.exam = a;
    L.answers = Object.assign({}, a.answers || {});
    L.flags = Object.assign({}, a.flags || {});
    L.tabs = a.tabSwitches || 0;
    // jawaban yang belum terkirim (mis. koneksi putus lalu halaman dimuat ulang)
    const pending = ls.get('pend.' + a.id);
    if (pending) { Object.assign(L.answers, pending.answers || {}); Object.assign(L.dirty, pending.answers || {}); Object.assign(L.flags, pending.flags || {}); Object.assign(L.dirtyFlags, pending.flags || {}); L.tabs = Math.max(L.tabs, pending.tabs || 0); queueSave(200); }
    L.deadlineAt = Date.now() + a.remaining * 1000;
    L.cur = Math.min(L.cur, a.questions.length - 1);
    L.savedAt = a.lastSave ? new Date(a.lastSave) : null;
    App.render();
  };
  const Q = () => (L.exam ? L.exam.questions : []);
  const answered = (qid) => {
    const a = L.answers[qid];
    if (a == null) return false;
    if (Array.isArray(a)) return a.length > 0;
    if (typeof a === 'object') return Object.keys(a).length > 0;
    return String(a).trim() !== '';
  };
  const answeredCount = () => Q().filter((q) => answered(q.id)).length;
  const remaining = () => Math.max(0, Math.round((L.deadlineAt - Date.now()) / 1000));
  const fmtTime = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const TYPE = { single: 'Pilihan ganda', multi: 'Pilihan ganda kompleks', tf: 'Benar / Salah', blank: 'Isian', short: 'Jawaban singkat', numeric: 'Numerik', order: 'Urutan', match: 'Menjodohkan', essay: 'Essay' };

  const chart = (vals) => {
    const max = Math.max(...vals) * 1.15;
    return `<svg viewBox="0 0 320 150" class="chart" style="width:100%;max-width:420px;background:var(--surface-2);border-radius:8px" role="img" aria-label="Grafik batang ${vals.length} kuartal">
      ${[30, 60, 90, 120].map((y) => `<line class="grid-line" x1="40" x2="305" y1="${y}" y2="${y}"/>`).join('')}
      ${vals.map((v, i) => { const h = (v / max) * 110; return `<rect x="${62 + i * 62}" y="${120 - h}" width="30" height="${h}" rx="3" fill="var(--brand)" opacity=".85"/><text x="${77 + i * 62}" y="138" text-anchor="middle">Q${i + 1}</text><text x="${77 + i * 62}" y="${114 - h}" text-anchor="middle">${v}</text>`; }).join('')}
    </svg>`;
  };

  const answerUI = (q) => {
    const a = L.answers[q.id];
    const K = 'ABCDEFGH';
    const qa = `data-q="${esc(q.id)}"`;
    if (q.type === 'single' || q.type === 'tf') return `<div class="stack" role="radiogroup">${q.options.map((o, j) => `<button class="choice ${a === j ? 'on' : ''}" role="radio" aria-checked="${a === j}" data-action="lAns" ${qa} data-v="${j}"><span class="k">${q.type === 'tf' ? (j ? 'S' : 'B') : K[j]}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
    if (q.type === 'multi') { const arr = Array.isArray(a) ? a : []; return `<div class="stack"><span class="xs dim">Pilih satu atau lebih jawaban. Pilihan yang salah mengurangi nilai soal ini.</span>${q.options.map((o, j) => `<button class="choice sq ${arr.includes(j) ? 'on' : ''}" role="checkbox" aria-checked="${arr.includes(j)}" data-action="lMulti" ${qa} data-v="${j}"><span class="k">${arr.includes(j) ? '✓' : K[j]}</span><span>${esc(o)}</span></button>`).join('')}</div>`; }
    if (q.type === 'blank' || q.type === 'short' || q.type === 'numeric') return `<div class="field" style="max-width:420px"><label class="label" for="ans-${esc(q.id)}">Jawaban</label><input id="ans-${esc(q.id)}" class="input ${q.type === 'numeric' ? 'num' : ''}" ${q.type === 'numeric' ? 'inputmode="decimal" placeholder="Contoh: 12,5"' : 'placeholder="Ketik jawaban"'} value="${esc(a == null ? '' : a)}" data-bind="lText" ${qa} autocomplete="off" maxlength="200"></div>`;
    if (q.type === 'essay') { const w = String(a || '').trim().split(/\s+/).filter(Boolean).length; return `<div class="field"><label class="label" for="ans-${esc(q.id)}">Jawaban essay</label><textarea id="ans-${esc(q.id)}" class="textarea" style="min-height:260px" placeholder="Tulis jawaban Anda…" data-bind="lText" ${qa} maxlength="10000">${esc(a || '')}</textarea><div class="row-between"><span class="hint">Dinilai penguji dengan rubrik · bobot ${q.points} poin</span><span class="hint num" id="wc">${w} kata</span></div></div>`; }
    if (q.type === 'order') { const ord = Array.isArray(a) && a.length === q.items.length ? a : q.items.map((_, j) => j); return `<div class="stack" style="gap:8px"><span class="xs dim">Gunakan tombol panah untuk mengubah urutan. Urutan awal belum dihitung sebagai jawaban sampai Anda mengubahnya.</span>${ord.map((j, pos) => `<div class="order-item"><span class="pos">${pos + 1}</span><span class="grow">${esc(q.items[j])}</span><button class="icon-btn" aria-label="Naik" data-action="lOrd" ${qa} data-p="${pos}" data-d="-1" ${pos === 0 ? 'disabled' : ''}>${ic('up')}</button><button class="icon-btn" aria-label="Turun" data-action="lOrd" ${qa} data-p="${pos}" data-d="1" ${pos === ord.length - 1 ? 'disabled' : ''}>${ic('down')}</button></div>`).join('')}</div>`; }
    if (q.type === 'match') { const m = Array.isArray(a) ? a : []; return `<div class="stack" style="gap:10px">${q.left.map((l, j) => `<div class="match-row"><div class="panel" style="padding:10px 14px;font-weight:600">${esc(l)}</div><select class="select" data-change="lMatch" ${qa} data-i="${j}" aria-label="Pasangan untuk ${esc(l)}"><option value="">Pilih pasangan…</option>${q.right.map((r, k) => `<option value="${k}" ${m[j] === k ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>`).join('')}</div>`; }
    return '';
  };

  const autosaveHTML = () => {
    if (L.offline) return `<span class="autosave offline" id="autosave"><span class="live"></span>Offline · disimpan di perangkat</span>`;
    const t = L.savedAt ? L.savedAt.toLocaleTimeString(App.locale()) : '';
    return `<span class="autosave ${L.saved === 'saving' ? 'saving' : ''}" id="autosave"><span class="live"></span>${L.saved === 'saving' ? 'Menyimpan…' : t ? 'Tersimpan ' + t : 'Tersimpan otomatis'}</span>`;
  };
  const paintSave = () => document.querySelectorAll('#autosave').forEach((el) => { el.outerHTML = autosaveHTML(); });

  const navigator = () => {
    const pname = (L.me && L.me.participant.name) || SES.user.name;
    return `<section class="card card-pad stack">
      <div class="row-between"><h4>Navigasi soal</h4><button class="icon-btn ews-mobile-nav" data-action="lNav" aria-label="Tutup">${ic('x')}</button></div>
      <div class="nav-grid">${Q().map((q, i) => `<button class="nav-q ${answered(q.id) ? 'ans' : ''} ${L.flags[q.id] ? 'flag' : ''} ${L.cur === i ? 'cur' : ''}" data-action="lGoto" data-i="${i}" aria-label="Soal ${i + 1}${answered(q.id) ? ', terjawab' : ''}${L.flags[q.id] ? ', ditandai' : ''}">${i + 1}</button>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--teal)"></i>Terjawab ${answeredCount()}</span><span><i style="background:var(--warning);border-radius:50%"></i>Ditandai ${Q().filter((q) => L.flags[q.id]).length}</span><span><i style="background:var(--surface-3);border:1px solid var(--border-strong)"></i>Belum ${Q().length - answeredCount()}</span></div>
    </section>
    <section class="card card-pad stack small">
      <div class="row-between"><span class="muted">Peserta</span><b>${esc(pname)}</b></div>
      <div class="row-between"><span class="muted">Attempt</span><span><span class="mono">${esc(L.exam.id)}</span> · ke-${L.exam.no}</span></div>
      <div class="row-between"><span class="muted">Batas waktu</span><span>${esc(new Date(L.exam.deadline).toLocaleTimeString(App.locale(), { hour: '2-digit', minute: '2-digit' }))}</span></div>
      <div class="row-between"><span class="muted">Koneksi</span>${L.offline ? pill('Terputus', 'danger') : pill('Stabil', 'success')}</div>
      <p class="xs dim">Sisa waktu mengikuti jam server. Jika koneksi terputus, jawaban disimpan di perangkat ini dan dikirim saat koneksi pulih.</p>
    </section>
    <button class="btn btn-primary btn-block" data-action="lSubmit">${ic('send')} Kirim jawaban</button>`;
  };

  const gutter = 'max-width:1320px;margin:12px auto 0;width:100%;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px))';
  App.routes['p-exam'] = () => {
    if (!L.att) {
      const live = L.me && L.me.attempts.find((a) => a.status === 'IN_PROGRESS');
      if (live) { L.att = live.id; ss.set('att', live.id); }
      else if (!L.me) { setTimeout(loadMe); return shell('p-dashboard', '<p class="muted small">Memuat…</p>'); }
      else return shell('p-dashboard', `<section class="card card-pad stack" style="align-items:flex-start"><h3>Tidak ada ujian yang sedang berjalan</h3><button class="btn btn-primary" data-go="p-dashboard">${ic('arrowL')} Beranda</button></section>`);
    }
    if (L.examFor !== L.att) { setTimeout(loadExam); return shell('p-dashboard', '<p class="muted small">Menyiapkan ruang ujian…</p>'); }
    if (L.examErr) return shell('p-dashboard', errBox(L.examErr) + `<button class="btn btn-secondary" data-go="p-dashboard">${ic('arrowL')} Beranda</button>`);
    if (!L.exam) return shell('p-dashboard', '<p class="muted small">Menyiapkan ruang ujian…</p>');
    const i = L.cur, q = Q()[i], rem = remaining();
    return `<div class="ews">
      <header class="ews-top">
        <div class="ews-top-inner">
          <div class="logo">TN</div>
          <div class="grow" style="min-width:0"><div style="font:650 var(--fs-md) var(--font-display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(L.exam.trainingName)} — ${esc(L.exam.examName)}</div><div class="xs dim hide-sm"><span class="mono">${esc(L.exam.id)}</span> · nilai lulus ≥ ${L.exam.passing}</div></div>
          <span class="hide-sm">${autosaveHTML()}</span>
          ${App.langToggle('hide-sm')}
          <span class="timer ${rem <= 300 ? 'low' : ''}" id="timer" role="timer" aria-label="Sisa waktu">${ic('clock', 'ic-sm')}<span id="timer-v">${fmtTime(rem)}</span></span>
          <button class="btn btn-secondary btn-sm ews-mobile-nav" data-action="lNav">${ic('grid', 'ic-sm')} ${answeredCount()}/${Q().length}</button>
          <button class="btn btn-primary btn-sm hide-sm" data-action="lSubmit">Kirim</button>
        </div>
        <div class="ews-progress"><span style="width:${(answeredCount() / Q().length) * 100}%"></span></div>
      </header>
      ${L.tabs ? `<div style="${gutter}"><div class="callout callout-warning">${ic('alert')}<div class="small">Anda meninggalkan halaman ujian ${L.tabs}×. Ini dicatat sebagai sinyal integritas untuk peninjauan, bukan sebagai pelanggaran otomatis.</div></div></div>` : ''}
      ${L.offline ? `<div style="${gutter}"><div class="callout callout-danger">${ic('wifi')}<div class="small"><b>Koneksi terputus.</b> Jawaban disimpan sementara di perangkat dan dikirim otomatis saat koneksi pulih. Waktu tetap berjalan.</div></div></div>` : ''}
      <div class="ews-body">
        <div class="stack-lg">
          <section class="card q-card">
            <div class="row-between">
              <div class="row"><span class="eyebrow">Soal ${i + 1} dari ${Q().length}</span><span class="tag">${TYPE[q.type] || q.type}</span><span class="tag">${q.points} poin</span></div>
              <button class="btn ${L.flags[q.id] ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-action="lFlag" aria-pressed="${!!L.flags[q.id]}" style="${L.flags[q.id] ? 'color:var(--warning);border-color:var(--warning)' : ''}">${ic('flag', 'ic-sm')} ${L.flags[q.id] ? 'Ditandai' : 'Tandai untuk ditinjau'}</button>
            </div>
            <div class="q-text">${esc(q.text)}</div>
            ${q.chart ? chart(q.chart) : ''}
            ${answerUI(q)}
          </section>
          <div class="row-between">
            <button class="btn btn-secondary" data-action="lPrev" ${i === 0 ? 'disabled' : ''}>${ic('chevL')} Sebelumnya</button>
            ${i === Q().length - 1 ? `<button class="btn btn-primary" data-action="lSubmit">Tinjau &amp; kirim ${ic('send')}</button>` : `<button class="btn btn-primary" data-action="lNext">Berikutnya ${ic('chevR')}</button>`}
          </div>
          <span class="show-sm" style="justify-content:center">${autosaveHTML().replace('id="autosave"', 'data-as')}</span>
        </div>
        <aside class="ews-side ${L.navOpen ? 'open' : ''}">${navigator()}</aside>
      </div>
      ${L.navOpen ? '<div class="overlay" style="z-index:55;background:rgba(5,12,28,.35)" data-action="lNav"></div>' : ''}
    </div>`;
  };

  /* ---- Autosave (idempotent, hanya bagian yang berubah) ---- */
  let saveT = null, saving = false;
  const queueSave = (ms = 700) => { clearTimeout(saveT); saveT = setTimeout(flush, ms); };
  const keepLocal = () => ls.set('pend.' + L.att, { answers: L.dirty, flags: L.dirtyFlags, tabs: L.tabs });
  const flush = async () => {
    if (!L.exam || saving) return;
    const answers = L.dirty, flags = L.dirtyFlags;
    if (!Object.keys(answers).length && !Object.keys(flags).length && L.tabs <= (L.exam.tabSwitches || 0)) return;
    saving = true; L.dirty = {}; L.dirtyFlags = {};
    L.saved = 'saving'; paintSave();
    const j = await post({ action: 'save', attempt: L.exam.id, answers, flags, tabSwitches: L.tabs });
    saving = false;
    if (j.ok) {
      L.exam.tabSwitches = L.tabs;
      L.saved = 'saved'; L.savedAt = new Date(j.savedAt);
      L.deadlineAt = Date.now() + j.remaining * 1000;   // sinkron ulang jam server (mis. setelah perpanjangan waktu)
      const was = L.offline; L.offline = false;
      if (Object.keys(L.dirty).length || Object.keys(L.dirtyFlags).length) { keepLocal(); queueSave(300); } else ls.set('pend.' + L.exam.id, null);
      if (was) { App.rerender(); App.toast('Koneksi pulih · jawaban disinkronkan', 'wifi'); } else paintSave();
      return;
    }
    if (j.error === 'time_up' || j.error === 'closed') { ls.set('pend.' + L.exam.id, null); finished(L.exam.id, true); return; }
    // gagal (offline/server): kembalikan ke antrean & coba lagi
    L.dirty = Object.assign({}, answers, L.dirty); L.dirtyFlags = Object.assign({}, flags, L.dirtyFlags);
    keepLocal();
    if (!L.offline) { L.offline = true; App.rerender(); }
    queueSave(5000);
  };
  const setAns = (qid, v, full) => {
    L.answers[qid] = v; L.dirty[qid] = v;
    keepLocal();
    if (full) App.rerender();
    queueSave();
  };
  App.actions.lAns = (el) => setAns(el.dataset.q, +el.dataset.v, true);
  App.actions.lMulti = (el) => {
    const q = el.dataset.q, v = +el.dataset.v, arr = Array.isArray(L.answers[q]) ? L.answers[q] : [];
    setAns(q, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort((a, b) => a - b), true);
  };
  App.binds.lText = (el) => {
    const q = el.dataset.q, was = answered(q);
    L.answers[q] = el.value; L.dirty[q] = el.value; keepLocal();
    const wc = document.getElementById('wc'); if (wc) wc.textContent = el.value.trim().split(/\s+/).filter(Boolean).length + ' kata';
    if (was !== answered(q)) {
      const i = Q().findIndex((x) => x.id === q);
      const nb = document.querySelector(`.nav-q[data-i="${i}"]`); if (nb) nb.classList.toggle('ans', answered(q));
      const p = document.querySelector('.ews-progress span'); if (p) p.style.width = (answeredCount() / Q().length) * 100 + '%';
    }
    queueSave(1200);
  };
  App.actions.lOrd = (el) => {
    const q = Q().find((x) => x.id === el.dataset.q);
    const cur = L.answers[q.id];
    const ord = (Array.isArray(cur) && cur.length === q.items.length ? cur : q.items.map((_, j) => j)).slice();
    const p = +el.dataset.p, d = +el.dataset.d;
    [ord[p], ord[p + d]] = [ord[p + d], ord[p]];
    setAns(q.id, ord, true);
  };
  App.changes.lMatch = (el) => {
    const q = Q().find((x) => x.id === el.dataset.q);
    const m = Array.isArray(L.answers[q.id]) ? L.answers[q.id].slice() : q.left.map(() => null);
    m[+el.dataset.i] = el.value === '' ? null : +el.value;
    setAns(q.id, m.every((x) => x == null) ? [] : m, true);
  };
  App.actions.lFlag = () => { const q = Q()[L.cur]; L.flags[q.id] = !L.flags[q.id]; L.dirtyFlags[q.id] = L.flags[q.id]; App.rerender(); queueSave(); };
  App.actions.lGoto = (el) => { L.cur = +el.dataset.i; L.navOpen = false; App.render(); };
  App.actions.lPrev = () => { L.cur = Math.max(0, L.cur - 1); App.render(); };
  App.actions.lNext = () => { L.cur = Math.min(Q().length - 1, L.cur + 1); App.render(); };
  App.actions.lNav = () => { L.navOpen = !L.navOpen; App.rerender(); };

  App.actions.lSubmit = () => {
    const un = Q().map((q, i) => [q, i]).filter(([q]) => !answered(q.id)).map(([, i]) => i);
    const fl = Q().map((q, i) => [q, i]).filter(([q]) => L.flags[q.id]).map(([, i]) => i);
    App.modal(`${App.modalHead('Kirim jawaban sekarang?', 'Setelah dikirim, jawaban tidak dapat diubah.')}
      <div class="modal-body">
        <div class="grid g3" style="gap:10px">
          <div class="panel"><div class="eyebrow">Terjawab</div><div style="font:700 1.5rem var(--font-display)" class="num">${answeredCount()}</div></div>
          <div class="panel"><div class="eyebrow">Belum</div><div style="font:700 1.5rem var(--font-display);color:${un.length ? 'var(--danger)' : 'inherit'}" class="num">${un.length}</div></div>
          <div class="panel"><div class="eyebrow">Ditandai</div><div style="font:700 1.5rem var(--font-display);color:${fl.length ? 'var(--warning)' : 'inherit'}" class="num">${fl.length}</div></div>
        </div>
        ${un.length ? `<div class="callout callout-warning">${ic('alert')}<div class="small">Soal belum dijawab: ${un.map((i) => `<button class="btn btn-ghost btn-sm" data-action="lGotoClose" data-i="${i}">${i + 1}</button>`).join(' ')}</div></div>` : ''}
        ${fl.length ? `<div class="small muted">Soal ditandai: ${fl.map((i) => `<button class="btn btn-ghost btn-sm" data-action="lGotoClose" data-i="${i}">${i + 1}</button>`).join(' ')}</div>` : ''}
        <p class="small muted">Sisa waktu <b class="num">${fmtTime(remaining())}</b>. Anda masih dapat kembali dan memeriksa jawaban.</p>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" data-action="closeModal">Kembali ke soal</button><button class="btn btn-primary" data-action="lConfirm">${ic('send')} Kirim jawaban</button></div>`);
  };
  App.actions.lGotoClose = (el) => { App.closeModal(); App.actions.lGoto(el); };
  App.actions.lConfirm = async (auto) => {
    if (L.submitting || !L.exam) return;
    L.submitting = true;
    App.closeModal();
    clearTimeout(saveT);
    const id = L.exam.id;
    // kirim sisa jawaban dulu (bila waktu masih ada)
    if (auto !== true && (Object.keys(L.dirty).length || Object.keys(L.dirtyFlags).length)) {
      const s = await post({ action: 'save', attempt: id, answers: L.dirty, flags: L.dirtyFlags, tabSwitches: L.tabs });
      if (s.ok) { L.dirty = {}; L.dirtyFlags = {}; }
      else if (s.error === 'network') { L.submitting = false; L.offline = true; App.rerender(); App.toast('Tidak dapat terhubung. Jawaban belum terkirim — coba lagi.', 'wifi'); return; }
    }
    const j = await post({ action: 'submit', attempt: id });
    L.submitting = false;
    if (!j.ok) { if (j.error === 'network') { L.offline = true; App.rerender(); App.toast('Tidak dapat terhubung. Coba kirim lagi.', 'wifi'); } return; }
    ls.set('pend.' + id, null);
    finished(id, j.auto);
  };
  const finished = (id, auto) => {
    L.exam = null; L.att = null; ss.set('att', null); L.dirty = {}; L.dirtyFlags = {}; L.cur = 0; L.tabs = 0;
    App.examLive.reset();
    goResult(id);
    App.toast(auto ? 'Waktu habis · jawaban terkirim otomatis' : 'Jawaban terkirim · ' + id, 'send');
  };
  const goResult = (id) => { L.res = id; ss.set('res', id); L.result = null; L.resultFor = null; App.go('p-result'); };

  /* Sinyal integritas: perpindahan tab / jendela */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && App.route() === 'p-exam' && L.exam) { L.tabs++; keepLocal(); queueSave(100); setTimeout(() => App.rerender(), 50); }
  });
  window.addEventListener('online', () => { if (L.exam && L.offline) queueSave(100); });

  /* Jam ujian (dari batas waktu server) */
  setInterval(() => {
    if (!L.exam || App.route() !== 'p-exam') return;
    const rem = remaining();
    const v = document.getElementById('timer-v'); if (v) v.textContent = fmtTime(rem);
    const t = document.getElementById('timer'); if (t) t.classList.toggle('low', rem <= 300);
    if (rem === 0 && !L.submitting) App.actions.lConfirm(true);
  }, 1000);

  /* ===================== Hasil ===================== */
  const ring = (score, tone, passing) => {
    const r = 54, c = 2 * Math.PI * r, pct = score == null ? 0 : score / 100;
    return `<svg class="score-ring" viewBox="0 0 132 132" role="img" aria-label="Nilai ${score == null ? 'belum tersedia' : score}">
      <circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="11"/>
      ${score == null ? '' : `<circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--${tone})" stroke-width="11" stroke-linecap="round" stroke-dasharray="${c * pct} ${c}" transform="rotate(-90 66 66)"/>`}
      <line x1="66" y1="6" x2="66" y2="18" stroke="var(--fg-3)" stroke-width="2" transform="rotate(${(passing / 100) * 360} 66 66)"/>
      <text x="66" y="70" text-anchor="middle" font-size="30" font-weight="800" fill="var(--fg)">${score == null ? '—' : Math.round(score * 10) / 10}</text>
      <text x="66" y="90" text-anchor="middle" font-size="11" fill="var(--fg-3)">dari 100</text>
    </svg>`;
  };
  const loadResult = async () => {
    const id = L.res;
    L.resultFor = id; L.resultErr = '';
    const j = await App.api('api/exam.php?attempt=' + encodeURIComponent(id));
    if (j.ok) {
      if (j.attempt.status === 'IN_PROGRESS') { L.att = id; ss.set('att', id); L.examFor = null; App.go('p-exam'); return; }
      L.result = j.attempt;
    } else L.resultErr = errText(j);
    App.rerender();
  };
  const certBlock = (c, a) => {
    if (a.enrollmentResult !== 'PASSED') return '';
    if (!c) return `<section class="card card-pad stack"><div class="row-between"><h3>Sertifikat</h3>${pill('Belum memenuhi syarat', 'muted')}</div><p class="small muted">Sertifikat kompetensi diterbitkan setelah semua ujian pada pelatihan ini lulus (mis. ujian teori dan praktik).</p></section>`;
    if (c.status === 'PENDING_APPROVAL') return `<section class="card card-pad stack"><div class="row-between"><h3>Sertifikat</h3>${pill('Menunggu persetujuan', 'warning')}</div><p class="small muted">Anda memenuhi syarat sertifikat ${esc(c.type)}. Sertifikat sedang menunggu persetujuan admin sertifikat sebelum diterbitkan.</p></section>`;
    return `<section class="card card-pad stack"><div class="row-between"><h3>Sertifikat</h3>${c.state === 'VALID' ? pill('Terbit', 'success') : c.state === 'REVOKED' ? pill('Dicabut', 'danger') : pill('Kedaluwarsa', 'warning')}</div>
      <dl class="dl"><dt>Nomor</dt><dd class="mono" data-noi18n>${esc(c.no)}</dd><dt>Jenis</dt><dd>${esc(c.type)}</dd><dt>Terbit</dt><dd>${dt(c.issuedAt)}</dd><dt>Berlaku sampai</dt><dd>${c.expiresAt ? dt(c.expiresAt) : 'Tanpa batas'}</dd></dl>
      <div class="row">${c.state !== 'REVOKED' ? `<a class="btn btn-primary" href="api/certificate.php?id=${encodeURIComponent(c.id)}" target="_blank" rel="noopener">${ic('download')} Unduh sertifikat</a>` : ''}<a class="btn btn-secondary" href="?v=${encodeURIComponent(c.token)}#verify" target="_blank" rel="noopener">${ic('shield')} Halaman verifikasi</a></div></section>`;
  };
  const retakeBlock = (a) => {
    const rs = a.retake;
    if (!rs || ['passed', 'none', 'in_progress', 'pending_review'].includes(rs.state)) return '';
    const head = (tone, label) => `<div class="row-between"><h3>Ujian ulang</h3>${pill(label, tone)}</div><p class="small muted">Attempt terpakai ${rs.used} dari ${rs.max}. ${policyText(rs.policy)}</p>`;
    let body = '';
    if (rs.state === 'exhausted') body = head('danger', 'Kesempatan habis') + '<p class="small">Seluruh kesempatan ujian sudah digunakan. Hubungi penyelenggara pelatihan untuk informasi lebih lanjut.</p>';
    else if (rs.state === 'needs_request') body = head('warning', 'Perlu persetujuan') + `
      <div class="field"><label class="label" for="rq">Alasan pengajuan (opsional)</label><textarea id="rq" class="textarea" style="min-height:90px" maxlength="300" data-bind="lReason" placeholder="Contoh: saya ingin memperbaiki pemahaman materi SQL.">${esc(L.reqReason)}</textarea></div>
      <div class="row"><button class="btn btn-primary" data-action="lRetakeReq" ${L.reqBusy ? 'disabled' : ''}>${ic('repeat')} Ajukan ujian ulang</button>${rs.availableFrom && new Date(rs.availableFrom) > new Date() ? `<span class="small muted">Jika disetujui, ujian ulang dapat dimulai mulai ${dt(rs.availableFrom)}.</span>` : ''}</div>`;
    else if (rs.state === 'requested') body = head('info', 'Menunggu persetujuan') + `<p class="small">Permintaan <span class="mono">${esc(rs.request.id)}</span> sedang ditinjau admin. Anda akan melihat statusnya di sini.</p>`;
    else if (rs.state === 'rejected') body = head('danger', 'Ditolak') + `<p class="small">Permintaan ujian ulang ditolak${rs.request.note ? `: “${esc(rs.request.note)}”` : '.'}</p>`;
    else if (rs.state === 'wait') body = head('warning', 'Masa tunggu') + `<p class="small">Ujian ulang dapat dimulai mulai <b>${dt(rs.availableFrom)}</b>.</p>`;
    else if (rs.state === 'available') body = head('success', 'Tersedia') + `<div class="row">${a.canStart ? `<button class="btn btn-primary" data-action="openExam" data-id="${esc(a.enrollment)}">${ic('play')} Mulai ujian ulang</button>` : '<span class="small muted">Ujian ulang hanya dapat dimulai di dalam jadwal ujian.</span>'}</div>`;
    return `<section class="card card-pad stack">${body}</section>`;
  };
  App.binds.lReason = (el) => { L.reqReason = el.value; };
  App.actions.lRetakeReq = async () => {
    if (L.reqBusy || !L.result) return;
    L.reqBusy = true; App.rerender();
    const j = await post({ action: 'retake_request', enrollment: L.result.enrollment, reason: L.reqReason });
    L.reqBusy = false;
    if (!j.ok) { App.toast(errText(j), 'alert'); return; }
    L.reqReason = ''; L.resultFor = null; App.examLive.reset();
    App.toast('Permintaan ujian ulang terkirim · ' + j.id, 'repeat');
    App.rerender();
  };

  App.routes['p-result'] = () => {
    if (!L.res) {
      const last = L.me && L.me.attempts.find((a) => a.status !== 'IN_PROGRESS');
      if (last) { L.res = last.id; ss.set('res', last.id); }
      else if (!L.me) { setTimeout(loadMe); return shell('p-history', '<p class="muted small">Memuat…</p>'); }
      else return shell('p-history', `<section class="card card-pad stack" style="align-items:flex-start"><h3>Belum ada hasil ujian</h3><button class="btn btn-primary" data-go="p-dashboard">${ic('arrowL')} Beranda</button></section>`);
    }
    if (L.resultFor !== L.res) setTimeout(loadResult);
    if (L.resultErr) return shell('p-history', errBox(L.resultErr));
    const a = L.result;
    if (!a || L.resultFor !== L.res) return shell('p-history', '<p class="muted small">Memuat hasil…</p>');
    const pending = a.status === 'PENDING_REVIEW';
    const passed = a.result === 'PASSED';
    const tone = pending ? 'warning' : passed ? 'success' : 'danger';
    const headline = pending ? 'Menunggu penilaian essay' : passed ? 'Selamat, Anda lulus' : 'Belum lulus';
    const sub = pending ? `Soal objektif sudah dinilai otomatis (${a.points} poin). Nilai akhir tampil setelah penguji menilai soal essay.` : passed ? `Nilai ${a.score} memenuhi batas lulus ${a.passing}.` : `Nilai ${a.score} di bawah batas lulus ${a.passing}.`;
    const final = a.enrollmentResult && a.enrollmentResult !== 'PENDING_REVIEW' && a.finalScore != null && (a.finalScore !== a.score || a.enrollmentResult !== a.result)
      ? `<div class="callout callout-info">${ic('info')}<div class="small">Hasil akhir ujian menurut kebijakan <b>${POLICY[a.scoring] || a.scoring}</b>: ${a.enrollmentResult === 'PASSED' ? 'Lulus' : 'Tidak lulus'} · nilai ${a.finalScore}.</div></div>` : '';
    return shell('p-history', `
      <button class="btn btn-ghost btn-sm" data-go="p-history" style="align-self:flex-start">${ic('arrowL', 'ic-sm')} Histori</button>
      <div class="stack" style="gap:6px"><span class="eyebrow">Hasil ujian · <span class="mono">${esc(a.id)}</span> · attempt ke-${a.no}</span><h1>${esc(a.trainingName)} — ${esc(a.examName)}</h1></div>
      <section class="card card-pad"><div class="row" style="gap:28px;align-items:center;flex-wrap:wrap">
        ${ring(a.score, tone, a.passing)}
        <div class="stack grow" style="gap:8px;min-width:220px">
          <div class="row">${pending ? pill('Menunggu penilaian', 'warning') : passed ? pill('Lulus', 'success') : pill('Tidak lulus', 'danger')}${a.autoSubmit ? pill('Terkirim otomatis (waktu habis)', 'muted') : ''}</div>
          <h2>${headline}</h2><p class="small muted">${esc(sub)}</p>
          <div class="row small muted" style="gap:18px"><span>Dikirim ${dt(a.submittedAt)}</span><span>Terjawab ${a.answered}/${a.total}</span>${a.points != null ? `<span>${a.points} / ${a.max} poin</span>` : ''}</div>
        </div></div></section>
      ${final}
      <section class="card card-pad stack"><h3>Capaian per kompetensi</h3>
        <div class="stack" style="gap:10px">${(a.breakdown || []).map((b) => `<div class="stack" style="gap:4px"><div class="row-between small"><span>${esc(b.comp)}</span><span class="num ${b.pct == null ? 'dim' : ''}">${b.pct == null ? 'Menunggu penilaian' : b.pct + '%'}</span></div><div class="bar"><span style="width:${b.pct || 0}%;background:var(--${b.pct == null ? 'surface-3' : b.pct >= a.passing ? 'success' : 'warning'})"></span></div></div>`).join('')}</div>
        <p class="xs dim">Kunci jawaban tidak ditampilkan untuk menjaga kerahasiaan bank soal.</p></section>
      ${retakeBlock(a)}
      ${certBlock(a.certificate, a)}`);
  };

  /* ===================== Histori & sertifikat ===================== */
  const attPill = (a) => (a.status === 'IN_PROGRESS' ? pill('Berlangsung', 'teal') : a.status === 'PENDING_REVIEW' ? pill('Menunggu penilaian', 'warning') : a.result === 'PASSED' ? pill('Lulus', 'success') : pill('Tidak lulus', 'danger'));
  App.routes['p-history'] = () => {
    if (!L.me && !L.meBusy) setTimeout(loadMe);
    if (!L.me) return shell('p-history', '<p class="muted small">Memuat histori…</p>');
    const list = L.me.attempts;
    return shell('p-history', `<div class="stack" style="gap:6px"><span class="eyebrow">Histori</span><h1>Riwayat ujian</h1></div>
      ${list.length ? `<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Ujian</th><th>Attempt</th><th>Waktu</th><th class="num">Nilai</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.map((a) => `<tr><td><div class="cell-title">${esc(a.trainingName)}</div><div class="xs dim">${esc(a.examName)}</div></td><td><span class="mono">${esc(a.id)}</span><div class="xs dim">ke-${a.no}</div></td><td class="small">${dt(a.submittedAt || a.startedAt)}</td><td class="num">${a.score != null ? a.score : '—'}</td><td>${attPill(a)}</td>
          <td>${a.status === 'IN_PROGRESS' ? `<button class="btn btn-primary btn-sm" data-action="resumeExam" data-id="${esc(a.id)}">Lanjutkan</button>` : `<button class="btn btn-secondary btn-sm" data-action="openResult" data-id="${esc(a.id)}">Detail</button>`}</td></tr>`).join('')}
      </tbody></table></div></section>` : `<section class="card card-pad"><p class="small muted">Belum ada ujian yang dikerjakan.</p></section>`}`);
  };
  App.routes['p-certs'] = () => {
    if (!L.me && !L.meBusy) setTimeout(loadMe);
    if (!L.me) return shell('p-certs', '<p class="muted small">Memuat sertifikat…</p>');
    const list = L.me.certificates;
    const st = (c) => (c.status === 'PENDING_APPROVAL' ? pill('Menunggu persetujuan', 'warning') : c.state === 'VALID' ? pill('Berlaku', 'success') : c.state === 'REVOKED' ? pill('Dicabut', 'danger') : pill('Kedaluwarsa', 'warning'));
    return shell('p-certs', `<div class="stack" style="gap:6px"><span class="eyebrow">Sertifikat</span><h1>Sertifikat saya</h1></div>
      ${list.length ? `<div class="grid g2">${list.map((c) => `<section class="card card-pad stack">
        <div class="row-between"><span class="eyebrow">${esc(c.type)}</span>${st(c)}</div>
        <h3>${esc(c.trainingName)}</h3>
        <dl class="dl"><dt>Nomor</dt><dd class="mono" data-noi18n>${esc(c.no || '—')}</dd><dt>Terbit</dt><dd>${c.issuedAt ? dt(c.issuedAt) : '—'}</dd><dt>Berlaku sampai</dt><dd>${c.status === 'ISSUED' || c.status === 'REVOKED' ? (c.expiresAt ? dt(c.expiresAt) : 'Tanpa batas') : '—'}</dd>${c.revokedReason ? `<dt>Alasan dicabut</dt><dd>${esc(c.revokedReason)}</dd>` : ''}</dl>
        ${c.no ? `<div class="row">${c.state !== 'REVOKED' ? `<a class="btn btn-primary btn-sm" href="api/certificate.php?id=${encodeURIComponent(c.id)}" target="_blank" rel="noopener">${ic('download', 'ic-sm')} Unduh</a>` : ''}<a class="btn btn-secondary btn-sm" href="?v=${encodeURIComponent(c.token)}#verify" target="_blank" rel="noopener">${ic('shield', 'ic-sm')} Verifikasi</a></div>` : '<p class="xs dim">Nomor sertifikat dibuat saat admin menyetujui penerbitan.</p>'}
      </section>`).join('')}</div>` : `<section class="card card-pad"><p class="small muted">Belum ada sertifikat. Sertifikat muncul setelah Anda lulus dan memenuhi syarat penerbitan.</p></section>`}`);
  };
})();
