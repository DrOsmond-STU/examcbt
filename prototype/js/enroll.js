/* TACMS — Enrollment voucher massal dari menu Pelatihan (versi ter-deploy, Addendum v1.1).
   Data asli dari api/enrollments.php. Server memvalidasi ulang semua baris, jadwal, dan kuota voucher. */
(function () {
  const SES = window.SESSION;
  if (!SES || !SES.user || !App.adminShell) return;
  const S = App.state;
  const { ic, esc, pill } = App;
  const can = (p) => SES.perms.includes('*') || SES.perms.includes(p);
  const canRoute = (r) => SES.routes.includes('*') || SES.routes.includes(r);
  if (!canRoute('a-training-enroll') && !canRoute('a-enrollments')) return;
  const canWrite = can('enrollment.write');

  const ERR = {
    training: 'Pelatihan tidak ditemukan.',
    training_closed: 'Pelatihan ini sudah selesai atau diarsipkan, sehingga tidak menerima enrollment baru.',
    exam: 'Pilih ujian dari pelatihan ini.',
    tz: 'Zona waktu tidak dikenal.', late: 'Pilih kebijakan keterlambatan.',
    schedule: 'Lengkapi tanggal, jam mulai, dan jam selesai.',
    schedule_order: 'Jam selesai harus setelah jam mulai.',
    schedule_past: 'Tanggal ujian tidak boleh di masa lalu.',
    empty: 'Masukkan minimal satu peserta.',
    too_many: 'Maksimal 500 peserta per proses.',
    batch_scope: 'Batch voucher ini tidak berlaku untuk ujian yang dipilih.',
    batch_unpaid: 'Pembayaran order batch ini belum terverifikasi.',
    batch_expired: 'Batch voucher ini sudah kedaluwarsa.',
    batch_quota: 'Sisa kuota voucher tidak cukup untuk semua peserta.',
    nothing: 'Tidak ada peserta yang bisa didaftarkan. Periksa status setiap baris.',
    reason: 'Alasan wajib diisi.',
    already_cancelled: 'Enrollment ini sudah dibatalkan.',
    not_cancellable: 'Enrollment yang sedang berlangsung atau selesai tidak dapat dibatalkan.',
    not_found: 'Enrollment tidak ditemukan. Muat ulang halaman.',
    forbidden: 'Anda tidak punya izin untuk tindakan ini.',
    csrf: 'Sesi halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.',
    network: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
    copy: 'Tidak dapat menyalin otomatis. Gunakan Unduh CSV.',
  };
  const errText = (c) => ERR[c] || 'Terjadi kesalahan di server. Coba lagi.';
  const ROW = {
    new: ['Peserta baru', 'info'], existing: ['Peserta terdaftar', 'teal'], invalid_email: ['Email tidak valid', 'danger'],
    invalid_name: ['Nama tidak valid', 'danger'], duplicate: ['Duplikat di daftar', 'warning'], already: ['Sudah ter-enroll', 'warning'], clash: ['Jadwal bentrok', 'warning'],
  };
  const LATE = { ALLOW_WITH_REMAINING_TIME: 'Boleh masuk dengan sisa waktu', BLOCK: 'Tidak boleh masuk', EXTEND_WITH_APPROVAL: 'Perpanjangan dengan persetujuan' };
  const TZL = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' };
  const ST = { SCHEDULED: ['Terjadwal', 'info'], IN_PROGRESS: ['Berlangsung', 'teal'], COMPLETED: ['Selesai', 'success'], CANCELLED: ['Dibatalkan', 'outline'] };
  const OPEN = ['Aktif', 'Terjadwal'];

  const fmtSched = (e) => {
    const o = { timeZone: e.tz };
    const d = new Date(e.start).toLocaleDateString(App.locale(), { ...o, day: '2-digit', month: 'short', year: 'numeric' });
    const t = (x) => new Date(x).toLocaleTimeString(App.locale(), { ...o, hour: '2-digit', minute: '2-digit' });
    return `${d} · ${t(e.start)}–${t(e.end)} ${TZL[e.tz] || ''}`;
  };
  const tomorrow = () => { const d = new Date(Date.now() + 86400000); return d.toISOString().slice(0, 10); };
  const addMin = (hhmm, m) => { const [h, mi] = hhmm.split(':').map(Number); const t = Math.min(23 * 60 + 59, h * 60 + mi + m); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const remember = (code) => { try { sessionStorage.setItem('tacms-enroll-training', code || ''); } catch (e) {} };
  const recalled = () => { try { return sessionStorage.getItem('tacms-enroll-training') || ''; } catch (e) { return ''; } };

  const en = (S.en = { training: recalled(), data: null, loading: false, error: '', all: null, allLoading: false, f: { q: '', training: '', status: '' }, wiz: null });

  const load = async () => {
    en.loading = true;
    const j = await App.api('api/enrollments.php' + (en.training ? '?training=' + encodeURIComponent(en.training) : ''));
    en.loading = false;
    if (j.ok) { en.data = j; en.error = ''; } else { en.error = errText(j.error); if (j.error === 'training') { en.training = ''; remember(''); } }
    if (['a-training-enroll', 'a-trainings'].includes(App.route())) App.rerender();
  };
  const loadAll = async () => {
    en.allLoading = true;
    const j = await App.api('api/enrollments.php');
    en.allLoading = false;
    if (j.ok) { en.all = j; en.error = ''; } else en.error = errText(j.error);
    if (App.route() === 'a-enrollments') App.rerender();
  };

  /* ================= Menu Pelatihan: tombol & jumlah enrollment ================= */
  const prevTrainAfter = App.after['a-trainings'];
  App.after['a-trainings'] = async () => {
    if (prevTrainAfter) prevTrainAfter();
    const inject = (counts) => {
      document.querySelectorAll('.content [data-action="trainingDetail"][data-code]').forEach((btn) => {
        const code = btn.dataset.code;
        const row = btn.closest('tr');
        if (!row || row.querySelector('[data-action="enrollOpen"]')) return;
        const status = counts && counts[code] ? counts[code].status : '';
        const writable = canWrite && OPEN.includes(status);
        const holder = btn.closest('.row') || btn;
        holder.insertAdjacentHTML('beforebegin', `<button style="margin:0 0 6px auto;display:flex" class="btn ${writable ? 'btn-primary' : 'btn-secondary'} btn-sm" data-action="enrollOpen" data-code="${esc(code)}" title="${writable ? 'Enroll peserta' : 'Lihat enrollment'}">${ic('users', 'ic-sm')} ${writable ? 'Enroll' : 'Lihat'}</button>`);
        const title = row.querySelector('.cell-title');
        if (title && counts && counts[code] && !title.querySelector('.enr-count')) title.insertAdjacentHTML('beforeend', `<div class="cell-sub enr-count">${counts[code].enrolled} enrollment aktif</div>`);
      });
      App.translate && App.translate(document.querySelector('.content'));
    };
    if (!en.all && !en.allLoading) await loadAll();
    const counts = en.all ? Object.fromEntries(en.all.trainings.map((t) => [t.code, t])) : null;
    inject(counts);
  };
  App.actions.enrollOpen = (el) => {
    en.training = el.dataset.code; remember(en.training);
    en.data = null; en.wiz = null; en.error = '';
    App.go('a-training-enroll');
  };

  /* ================= Halaman enrollment per pelatihan ================= */
  const kpi = (label, v, icn, g) => `<div class="card kpi has-ic"><div class="kpi-ic" ${g ? `style="background:var(${g})"` : ''}>${ic(icn)}</div><span class="eyebrow">${label}</span><span class="v num">${v}</span></div>`;

  const pickerView = () => {
    const ts = en.data ? en.data.trainings : [];
    return `${App.pageHead('Enrollment peserta', 'Pilih pelatihan untuk mendaftarkan peserta ke ujiannya. Enrollment tidak membuka akses ujian; peserta tetap memerlukan voucher dari order yang sudah dibayar.')}
      <div class="grid g3">${ts.map((t) => `<section class="card card-pad stack" style="gap:10px">
        <div class="row-between"><span class="mono xs dim">${esc(t.code)}</span>${App.status(t.status)}</div>
        <h3>${esc(t.name)}</h3>
        <p class="small muted">${t.exams.map((x) => esc(x.name)).join(' · ')} · ${t.enrolled} enrollment aktif</p>
        <button class="btn ${canWrite && OPEN.includes(t.status) ? 'btn-primary' : 'btn-secondary'} btn-sm" style="align-self:flex-start" data-action="enrollOpen" data-code="${esc(t.code)}">${canWrite && OPEN.includes(t.status) ? 'Enroll peserta' : 'Lihat enrollment'}</button>
      </section>`).join('')}</div>`;
  };

  const enrolledTable = (list, showTraining) => {
    if (!list.length) return `<div class="card-body"><p class="muted small">Belum ada peserta yang ter-enroll.</p></div>`;
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th>${showTraining ? '<th>Pelatihan</th>' : ''}<th>Ujian</th><th>Jadwal</th><th>Voucher</th><th>Status</th><th>Dibuat</th><th></th></tr></thead><tbody>
      ${list.map((e) => { const [sl, stn] = ST[e.status] || [e.status, 'muted']; return `<tr>
        <td><div class="cell-title">${esc(e.name)}</div><div class="cell-sub"><span class="mono">${esc(e.participant)}</span> · ${esc(e.email)}</div></td>
        ${showTraining ? `<td class="small">${esc(e.trainingName)}<div class="cell-sub mono">${esc(e.training)}</div></td>` : ''}
        <td class="small">${esc(e.examName)}<div class="cell-sub mono">${esc(e.id)}</div></td>
        <td class="small num" style="white-space:nowrap">${esc(fmtSched(e))}<div class="cell-sub">${esc(LATE[e.late] || e.late)}</div></td>
        <td>${e.voucher ? `<div class="mono small" style="white-space:nowrap">${esc(e.voucher)}</div>${e.voucherStatus === 'REVOKED' ? pill('Dicabut', 'danger') : pill('Dialokasikan', 'teal')}` : '<span class="xs dim">Peserta memasukkan sendiri</span>'}</td>
        <td>${pill(sl, stn)}${e.cancelReason ? `<div class="cell-sub" data-noi18n>${esc(e.cancelReason)}</div>` : ''}</td>
        <td class="small">${esc(App.fmtDateTime(e.createdAt))}<div class="cell-sub mono">${esc(e.createdBy)}</div></td>
        <td>${e.status === 'SCHEDULED' ? `<button class="btn btn-danger-ghost btn-sm" data-action="enrollCancel" data-id="${esc(e.id)}" data-name="${esc(e.name)}">Batalkan</button>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  };

  App.routes['a-training-enroll'] = () => {
    if (!en.data && !en.loading && !en.error) setTimeout(load);
    let body;
    if (en.error) body = `<div class="callout callout-danger">${ic('alert')}<div class="small">${esc(en.error)} <button class="btn btn-ghost btn-sm" data-action="enrollReload">Coba lagi</button></div></div>`;
    else if (!en.data) body = `<p class="muted small">Memuat data enrollment…</p>`;
    else if (!en.training) body = pickerView();
    else {
      const d = en.data;
      const t = d.trainings.find((x) => x.code === en.training);
      const open = OPEN.includes(t.status);
      const list = d.enrollments;
      const active = list.filter((e) => e.status !== 'CANCELLED');
      body = `
        <div><button class="btn btn-ghost btn-sm" data-action="enrollBack">${ic('arrowL', 'ic-sm')} Semua pelatihan</button></div>
        ${App.pageHead(`Enrollment · ${esc(t.name)}`, `<span class="mono">${esc(t.code)}</span> · ${t.exams.map((x) => esc(x.name)).join(' · ')}`,
          canWrite && open && !en.wiz ? `<button class="btn btn-primary" data-action="enrollWizard">${ic('plus')} Tambah peserta</button>` : '')}
        ${!open ? `<div class="callout callout-warning">${ic('lock')}<div class="small">Pelatihan berstatus <b>${esc(t.status)}</b> tidak menerima enrollment baru. Daftar di bawah tetap dapat dilihat.</div></div>`
          : !canWrite ? `<div class="callout callout-info">${ic('info')}<div class="small">Anda dapat melihat enrollment, tetapi tidak dapat menambah atau membatalkannya.</div></div>` : ''}
        <div class="grid g4">
          ${kpi('Enrollment aktif', active.length, 'users')}
          ${kpi('Dengan voucher', active.filter((e) => e.voucher).length, 'ticket', '--g-info')}
          ${kpi('Tanpa voucher', active.filter((e) => !e.voucher).length, 'clock', '--g-warning')}
          ${kpi('Dibatalkan', list.length - active.length, 'xCircle', '--g-secondary')}
        </div>
        ${en.wiz ? wizardView() : ''}
        <section class="card">
          <div class="card-head"><h3>Peserta ter-enroll</h3><button class="btn btn-secondary btn-sm" data-action="enrollReload">${ic('refresh', 'ic-sm')} Muat ulang</button></div>
          ${enrolledTable(list, false)}
        </section>
        ${quotaView(d)}`;
    }
    return App.adminShell('a-trainings', body);
  };

  const quotaView = (d) => !d.batches || !d.batches.length ? '' : `<section class="card">
    <div class="card-head"><div><h3>Kuota voucher pelatihan ini</h3><p class="xs dim">Voucher hanya dapat dialokasikan dari order yang sudah dibayar dan belum kedaluwarsa.</p></div></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Batch</th><th>Berlaku untuk</th><th>Order</th><th>Sisa kuota</th><th>Berlaku s/d</th></tr></thead><tbody>
    ${d.batches.map((b) => `<tr><td class="mono small">${esc(b.code)}</td><td class="small">${b.exam ? esc(examName(b.exam)) : 'Semua ujian'}</td>
      <td><div class="mono xs">${esc(b.order)}</div>${App.status(b.orderStatus, b.orderStatus === 'PROOF_SUBMITTED' ? 'Menunggu verifikasi' : b.orderStatus)}</td>
      <td class="num small"><b>${b.remaining}</b> / ${b.qty}</td><td class="num small">${esc(b.validUntil)}</td></tr>`).join('')}
    </tbody></table></div></section>`;
  const examName = (code) => { const t = en.data.trainings.find((x) => x.code === en.training); const x = t && t.exams.find((y) => y.code === code); return x ? x.name : code; };

  /* ================= Wizard tambah peserta massal ================= */
  const STEPS = ['Peserta', 'Ujian & jadwal', 'Voucher', 'Tinjau'];
  App.actions.enrollWizard = () => {
    const t = en.data.trainings.find((x) => x.code === en.training);
    const ex = t.exams[0];
    en.wiz = { step: 0, text: '', picked: {}, pickQ: '', exam: ex.code, date: tomorrow(), start: '09:00', end: addMin('09:00', ex.duration + 30), tz: 'Asia/Jakarta', late: 'ALLOW_WITH_REMAINING_TIME', vmode: 'none', batch: '', preview: null, result: null, busy: false, err: '' };
    const b = usableBatches()[0];
    if (b) { en.wiz.vmode = 'allocate'; en.wiz.batch = b.code; }
    App.rerender();
  };
  App.actions.enrollWizClose = () => { en.wiz = null; App.rerender(); };

  const parseText = (txt) => {
    const rows = [];
    txt.split(/\r?\n/).forEach((line) => {
      const l = line.trim();
      if (!l) return;
      const parts = l.split(/[,;\t]/).map((x) => x.trim().replace(/^"|"$/g, ''));
      if (/^(nama|name)$/i.test(parts[0]) && parts.some((p) => /^e-?mail$/i.test(p))) return; // baris judul
      let name = '', email = '', phone = '';
      parts.forEach((p) => { if (!email && /@/.test(p)) email = p; else if (!phone && /^[+\d][\d\s\-()]{6,}$/.test(p)) phone = p; else if (!name) name = p; });
      rows.push({ name, email, phone });
    });
    return rows;
  };
  const collect = () => {
    const w = en.wiz;
    const fromText = parseText(w.text);
    const fromPick = Object.values(w.picked).map((p) => ({ name: p.name, email: p.email, phone: p.phone }));
    return fromText.concat(fromPick);
  };
  const usableBatches = () => {
    const w = en.wiz;
    return (en.data.batches || []).filter((b) => !batchProblem(b, w ? w.exam : null, 0));
  };
  const batchProblem = (b, exam, need) => {
    if (b.exam && exam && b.exam !== exam) return 'Tidak berlaku untuk ujian ini';
    if (!['PAID', 'CONFIRMED'].includes(b.orderStatus)) return 'Menunggu verifikasi pembayaran';
    if (b.validUntil < new Date().toISOString().slice(0, 10)) return 'Kedaluwarsa';
    if (b.remaining < Math.max(1, need)) return `Sisa ${b.remaining}, perlu ${need}`;
    return '';
  };

  const wizardView = () => {
    const w = en.wiz;
    const t = en.data.trainings.find((x) => x.code === en.training);
    const n = collect().length;
    const stepper = `<div class="row" style="gap:6px">${STEPS.map((s, i) => `<span class="row small" style="gap:6px;flex-wrap:nowrap;${i === w.step ? 'color:var(--fg);font-weight:700' : 'color:var(--fg-3)'}"><span class="step-dot ${i < w.step ? 'done' : i === w.step ? 'on' : ''}">${i < w.step ? '✓' : i + 1}</span>${s}</span>${i < STEPS.length - 1 ? '<span style="width:20px;height:1px;background:var(--border-strong)"></span>' : ''}`).join('')}</div>`;
    let body = '';
    if (w.result) return resultView();
    if (w.step === 0) {
      const q = w.pickQ.toLowerCase();
      const reg = (en.data.registry || []).filter((p) => !q || [p.name, p.email, p.no, p.inst].join(' ').toLowerCase().includes(q)).slice(0, 50);
      body = `<div class="grid g2" style="align-items:start">
        <div class="stack">
          <div class="field"><label class="label" for="wz-text">Tempel daftar peserta</label>
            <textarea id="wz-text" class="textarea mono" style="min-height:220px;font-size:.8125rem" data-bind="wzText" data-noi18n placeholder="Nama Lengkap, email@contoh.id, 0812xxxxxxx">${esc(w.text)}</textarea>
            <span class="hint">Satu peserta per baris: nama, email, telepon (opsional). Pemisah koma, titik koma, atau tab. Bisa disalin langsung dari Excel.</span></div>
          <div class="row"><label class="btn btn-secondary btn-sm" style="cursor:pointer">${ic('upload', 'ic-sm')} Unggah CSV<input type="file" accept=".csv,.txt,text/csv" id="wz-file" hidden></label><button class="btn btn-ghost btn-sm" data-action="enrollTemplate">${ic('download', 'ic-sm')} Unduh template CSV</button></div>
        </div>
        <div class="stack">
          <div class="row-between"><span class="label">Atau pilih dari data peserta</span><span class="xs dim">${Object.keys(w.picked).length} dipilih</span></div>
          <label class="input-group" style="max-width:none">${ic('search', 'ic-sm')}<input id="wz-q" placeholder="Cari nama, email, atau nomor peserta" value="${esc(w.pickQ)}" data-bind="wzQ"></label>
          <div class="panel" style="padding:4px 8px;max-height:260px;overflow-y:auto">${reg.map((p) => `<label class="check" style="padding:6px 4px"><input type="checkbox" data-change="wzPick" data-no="${esc(p.no)}" ${w.picked[p.no] ? 'checked' : ''}><span class="small"><b>${esc(p.name)}</b><br><span class="dim">${esc(p.no)} · ${esc(p.email)}</span></span></label>`).join('') || '<p class="small muted" style="padding:8px">Tidak ada yang cocok.</p>'}</div>
        </div></div>`;
    } else if (w.step === 1) {
      body = `<div class="grid g3">
        <div class="field span2"><label class="label" for="wz-exam">Ujian</label><select id="wz-exam" class="select" data-change="wzField" data-k="exam">${t.exams.map((x) => `<option value="${x.code}" ${w.exam === x.code ? 'selected' : ''}>${esc(x.name)} · ${x.duration} menit</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="wz-tz">Zona waktu</label><select id="wz-tz" class="select" data-change="wzField" data-k="tz">${Object.entries(TZL).map(([k, v]) => `<option value="${k}" ${w.tz === k ? 'selected' : ''}>${v} · ${k}</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="wz-date">Tanggal</label><input id="wz-date" type="date" class="input" value="${esc(w.date)}" data-change="wzField" data-k="date"></div>
        <div class="field"><label class="label" for="wz-start">Mulai</label><input id="wz-start" type="time" class="input" value="${esc(w.start)}" data-change="wzField" data-k="start"></div>
        <div class="field"><label class="label" for="wz-end">Selesai</label><input id="wz-end" type="time" class="input" value="${esc(w.end)}" data-change="wzField" data-k="end"></div>
        <div class="field span2"><label class="label" for="wz-late">Kebijakan keterlambatan</label><select id="wz-late" class="select" data-change="wzField" data-k="late">${Object.entries(LATE).map(([k, v]) => `<option value="${k}" ${w.late === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      </div>
      <p class="xs dim">Jadwal yang sama berlaku untuk semua peserta dalam proses ini. Peserta dengan jadwal bentrok akan ditandai dan dilewati.</p>`;
    } else if (w.step === 2) {
      const bs = (en.data.batches || []);
      body = `<div class="stack">
        ${bs.map((b) => { const prob = batchProblem(b, w.exam, n); return `<label class="check panel" style="padding:12px 14px;${prob ? 'opacity:.6' : ''}"><input type="radio" name="wz-v" data-change="wzVoucher" data-v="${esc(b.code)}" ${w.vmode === 'allocate' && w.batch === b.code ? 'checked' : ''} ${prob ? 'disabled' : ''}>
          <span class="grow"><span class="row-between"><b class="mono small">${esc(b.code)}</b>${prob ? pill(prob, 'outline') : pill(`Sisa ${b.remaining}`, 'success')}</span>
          <span class="small muted">${b.exam ? esc(examName(b.exam)) : 'Semua ujian'} · order <span class="mono">${esc(b.order)}</span> · ${esc(b.type)} · berlaku s/d ${esc(b.validUntil)}</span></span></label>`; }).join('')}
        <label class="check panel" style="padding:12px 14px"><input type="radio" name="wz-v" data-change="wzVoucher" data-v="" ${w.vmode === 'none' ? 'checked' : ''}><span><b class="small">Tanpa alokasi voucher</b><br><span class="small muted">Peserta memasukkan voucher sendiri saat aktivasi (misalnya pembelian individual).</span></span></label>
        <div class="callout callout-info">${ic('info')}<div class="small">Satu kode voucher unik dibuat untuk setiap peserta dan dikurangkan dari kuota batch. Kode lengkap hanya ditampilkan sekali setelah enrollment disimpan.</div></div>
      </div>`;
    } else {
      const p = w.preview;
      if (!p) body = `<p class="muted small">Memvalidasi daftar di server…</p>`;
      else {
        const ok = p.rows.filter((r) => ['new', 'existing'].includes(r.status));
        const cnt = (s) => p.rows.filter((r) => r.status === s).length;
        body = `<div class="stack">
          ${p.error ? `<div class="callout callout-danger">${ic('alert')}<div class="small">${esc(errText(p.error))}</div></div>` : ''}
          <div class="row" style="gap:8px">${pill(`${ok.length} siap didaftarkan`, 'success')}${cnt('new') ? pill(`${cnt('new')} peserta baru`, 'info') : ''}${cnt('existing') ? pill(`${cnt('existing')} peserta terdaftar`, 'teal') : ''}${p.rows.length - ok.length ? pill(`${p.rows.length - ok.length} dilewati`, 'warning') : ''}</div>
          <div class="panel small"><b>${esc(examName(w.exam))}</b> · ${esc(fmtSched({ start: localISO(w.date, w.start, w.tz), end: localISO(w.date, w.end, w.tz), tz: w.tz }))} · ${esc(LATE[w.late])}<br>${w.vmode === 'allocate' ? `Voucher dari batch <span class="mono">${esc(w.batch)}</span> (${ok.length} kode)` : 'Tanpa alokasi voucher'}</div>
          <div class="table-wrap" style="max-height:320px;overflow:auto"><table class="table"><thead><tr><th>#</th><th>Nama</th><th>Email</th><th>Telepon</th><th>Status</th></tr></thead><tbody>
            ${p.rows.map((r) => { const [l, tn] = ROW[r.status] || [r.status, 'muted']; const note = r.note === 'name_differs' ? 'Nama mengikuti data peserta' : r.status === 'duplicate' ? `Sama dengan baris ${r.note}` : r.note ? r.note : ''; return `<tr><td class="num small">${r.row}</td><td class="small">${esc(r.name || '—')}${r.participant ? `<div class="cell-sub mono">${esc(r.participant)}</div>` : ''}</td><td class="small" data-noi18n>${esc(r.email || '—')}</td><td class="small mono">${esc(r.phone || '—')}</td><td>${pill(l, tn)}${note ? `<div class="cell-sub">${esc(note)}</div>` : ''}</td></tr>`; }).join('')}
          </tbody></table></div>
        </div>`;
      }
    }
    const nextLabel = w.step === 3 ? `Daftarkan ${w.preview ? w.preview.rows.filter((r) => ['new', 'existing'].includes(r.status)).length : 0} peserta` : 'Lanjut';
    const nextDisabled = w.busy || (w.step === 0 && !n) || (w.step === 3 && (!w.preview || w.preview.error || !w.preview.rows.some((r) => ['new', 'existing'].includes(r.status))));
    return `<section class="card">
      <div class="card-head"><div class="stack" style="gap:8px"><h3>Tambah peserta ke ${esc(t.name)}</h3>${stepper}</div><button class="icon-btn" data-action="enrollWizClose" aria-label="Tutup">${ic('x')}</button></div>
      <div class="card-body stack-lg">
        ${w.err ? `<div class="callout callout-danger" role="alert">${ic('alert')}<div class="small">${esc(w.err)}</div></div>` : ''}
        ${body}
        <div class="row-between"><span class="small muted">${n} peserta dalam daftar</span><div class="row">
          ${w.step > 0 ? `<button class="btn btn-secondary" data-action="wzPrev">${ic('chevL')} Kembali</button>` : `<button class="btn btn-secondary" data-action="enrollWizClose">Batal</button>`}
          <button class="btn btn-primary" data-action="${w.step === 3 ? 'enrollSubmit' : 'wzNext'}" ${nextDisabled ? 'disabled' : ''}>${w.busy ? 'Memproses…' : nextLabel} ${w.step < 3 ? ic('chevR') : ''}</button>
        </div></div>
      </div></section>`;
  };
  const localISO = (date, time, tz) => {
    // waktu lokal di zona terpilih → ISO (hanya untuk tampilan pratinjau)
    const off = { 'Asia/Jakarta': '+07:00', 'Asia/Makassar': '+08:00', 'Asia/Jayapura': '+09:00' }[tz] || '+07:00';
    return `${date}T${time}:00${off}`;
  };

  const payload = () => {
    const w = en.wiz;
    return { training: en.training, exam: w.exam, participants: collect(), schedule: { date: w.date, start: w.start, end: w.end, tz: w.tz, late: w.late }, voucher: w.vmode === 'allocate' ? { mode: 'allocate', batch: w.batch } : { mode: 'none' } };
  };
  const SCHED_ERR = ['tz', 'late', 'schedule', 'schedule_order', 'schedule_past', 'exam'];

  App.binds.wzText = (el) => { en.wiz.text = el.value; const c = document.querySelector('.card-body .row-between > .small.muted'); if (c) c.textContent = App.t(`${collect().length} peserta dalam daftar`); const nb = document.querySelector('[data-action="wzNext"]'); if (nb) nb.disabled = !collect().length; };
  App.binds.wzQ = (el) => { en.wiz.pickQ = el.value; App.rerender(); const n = document.getElementById('wz-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
  App.changes.wzPick = (el) => { const p = (en.data.registry || []).find((x) => x.no === el.dataset.no); if (!p) return; if (el.checked) en.wiz.picked[p.no] = p; else delete en.wiz.picked[p.no]; App.rerender(); };
  App.changes.wzField = (el) => {
    const w = en.wiz; w[el.dataset.k] = el.value;
    if (el.dataset.k === 'exam') { const t = en.data.trainings.find((x) => x.code === en.training); const ex = t.exams.find((x) => x.code === w.exam); w.end = addMin(w.start, ex.duration + 30); const b = usableBatches()[0]; if (w.vmode === 'allocate' && !usableBatches().some((x) => x.code === w.batch)) { w.batch = b ? b.code : ''; if (!b) w.vmode = 'none'; } }
    if (el.dataset.k === 'start') { const t = en.data.trainings.find((x) => x.code === en.training); const ex = t.exams.find((x) => x.code === w.exam); w.end = addMin(w.start, ex.duration + 30); }
    w.err = ''; App.rerender();
  };
  App.changes.wzVoucher = (el) => { const w = en.wiz; if (el.dataset.v) { w.vmode = 'allocate'; w.batch = el.dataset.v; } else { w.vmode = 'none'; w.batch = ''; } App.rerender(); };
  App.actions.wzPrev = () => { const w = en.wiz; w.step = Math.max(0, w.step - 1); w.err = ''; App.rerender(); };
  App.actions.wzNext = async () => {
    const w = en.wiz; w.err = '';
    if (w.step === 0) { const n = collect().length; if (!n) { w.err = errText('empty'); return App.rerender(); } if (n > (en.data.maxRows || 500)) { w.err = errText('too_many'); return App.rerender(); } }
    if (w.step === 1) { if (!w.date || !w.start || !w.end) { w.err = errText('schedule'); return App.rerender(); } if (w.end <= w.start) { w.err = errText('schedule_order'); return App.rerender(); } }
    if (w.step === 2 && w.vmode === 'allocate') { const b = (en.data.batches || []).find((x) => x.code === w.batch); const prob = b && batchProblem(b, w.exam, collect().length); if (!b || prob) { w.err = prob || errText('batch_scope'); return App.rerender(); } }
    w.step++;
    if (w.step === 3) { w.preview = null; App.rerender(); await runPreview(); return; }
    App.rerender();
  };
  const runPreview = async () => {
    const w = en.wiz;
    const j = await App.api('api/enrollments.php', { action: 'preview', ...payload() });
    if (!j.rows && j.error) { w.preview = null; w.err = errText(j.error); if (SCHED_ERR.includes(j.error)) w.step = 1; App.rerender(); return; }
    w.preview = { rows: j.rows || [], error: j.ok ? null : j.error };
    App.rerender();
  };
  App.actions.enrollSubmit = async () => {
    const w = en.wiz;
    if (w.busy) return;
    w.busy = true; App.rerender();
    const j = await App.api('api/enrollments.php', { action: 'enroll', ...payload() });
    w.busy = false;
    if (!j.ok) { w.err = errText(j.error); if (j.rows) w.preview = { rows: j.rows, error: j.error }; App.rerender(); return; }
    w.result = j;
    en.all = null;
    const fresh = await App.api('api/enrollments.php?training=' + encodeURIComponent(en.training));
    if (fresh.ok) en.data = fresh;
    App.rerender();
    App.toast(`${j.created.length} peserta ter-enroll`);
  };

  /* Hasil: kode voucher ditampilkan sekali */
  const resultView = () => {
    const r = en.wiz.result;
    const withCode = r.created.some((c) => c.voucherCode);
    return `<section class="card">
      <div class="card-head"><div><h3>Enrollment tersimpan</h3><p class="xs dim">${r.created.length} peserta ter-enroll${r.skipped.length ? ` · ${r.skipped.length} dilewati` : ''}${r.batch ? ` · sisa kuota ${esc(r.batch)}: ${r.remaining}` : ''}</p></div><button class="icon-btn" data-action="enrollWizClose" aria-label="Tutup">${ic('x')}</button></div>
      <div class="card-body stack">
        ${withCode ? `<div class="callout callout-warning">${ic('alert')}<div class="small"><b>Kode voucher hanya ditampilkan sekali.</b> Unduh atau salin sekarang, lalu kirimkan ke peserta lewat saluran yang aman. Server hanya menyimpan versi tersamar.</div></div>` : `<div class="callout callout-info">${ic('info')}<div class="small">Tanpa alokasi voucher. Peserta memasukkan voucher sendiri saat aktivasi.</div></div>`}
        <div class="table-wrap" style="max-height:360px;overflow:auto"><table class="table"><thead><tr><th>Peserta</th><th>Email</th><th>Enrollment</th>${withCode ? '<th>Kode voucher</th>' : ''}</tr></thead><tbody>
          ${r.created.map((c) => `<tr><td class="small"><b>${esc(c.name)}</b>${c.isNew ? ` ${pill('Baru', 'info')}` : ''}<div class="cell-sub mono">${esc(c.participant)}</div></td><td class="small" data-noi18n>${esc(c.email)}</td><td class="mono xs">${esc(c.id)}</td>${withCode ? `<td><code class="mono" style="font-weight:700;user-select:all" data-noi18n>${esc(c.voucherCode)}</code></td>` : ''}</tr>`).join('')}
        </tbody></table></div>
        <div class="row" style="justify-content:flex-end">${withCode ? `<button class="btn btn-secondary" data-action="enrollCopy">${ic('clipboard')} Salin semua</button><button class="btn btn-primary" data-action="enrollCsv">${ic('download')} Unduh CSV</button>` : ''}<button class="btn btn-secondary" data-action="enrollWizClose">Selesai</button></div>
      </div></section>`;
  };
  const csvOf = (rows, cols) => '﻿' + [cols.map((c) => c[0]).join(',')].concat(rows.map((r) => cols.map((c) => { let v = String(c[1](r) ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(','))).join('\n');
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
  App.actions.enrollCsv = () => {
    const r = en.wiz.result;
    download(`voucher-${en.training}-${new Date().toISOString().slice(0, 10)}.csv`, csvOf(r.created, [['nama', (x) => x.name], ['email', (x) => x.email], ['telepon', (x) => x.phone], ['no_peserta', (x) => x.participant], ['enrollment', (x) => x.id], ['kode_voucher', (x) => x.voucherCode]]));
  };
  App.actions.enrollCopy = () => {
    const r = en.wiz.result;
    const txt = r.created.map((c) => `${c.name}\t${c.email}\t${c.voucherCode}`).join('\n');
    try { navigator.clipboard.writeText(txt).then(() => App.toast('Daftar kode voucher disalin', 'clipboard'), () => App.toast(errText('copy'), 'alert')); } catch (e) { App.toast(errText('copy'), 'alert'); }
  };
  App.actions.enrollTemplate = () => download('template-enrollment.csv', '﻿nama,email,telepon\nNama Peserta,peserta@contoh.id,081234567890\n');

  App.actions.enrollCancel = (el) => App.confirm({
    title: 'Batalkan enrollment?',
    body: `Enrollment <b>${esc(el.dataset.name)}</b> (<span class="mono">${esc(el.dataset.id)}</span>) dibatalkan. Voucher yang dialokasikan untuk enrollment ini ikut dicabut dan tidak bisa dipakai.`,
    confirmText: 'Batalkan enrollment', danger: true, reason: true,
    onOk: async (reason) => {
      const j = await App.api('api/enrollments.php', { action: 'cancel', id: el.dataset.id, reason });
      if (!j.ok) return App.toast(errText(j.error), 'alert');
      App.toast('Enrollment dibatalkan');
      en.all = null; en.data = null;
      if (App.route() === 'a-enrollments') loadAll(); else load();
    },
  });
  App.actions.enrollBack = () => { en.training = ''; remember(''); en.data = null; en.wiz = null; load(); App.rerender(); };
  App.actions.enrollReload = () => { en.error = ''; en.data = null; en.all = null; if (App.route() === 'a-enrollments') loadAll(); else load(); App.rerender(); };

  // Unggah CSV
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'wz-file' || !e.target.files[0]) return;
    const f = e.target.files[0];
    if (f.size > 1024 * 1024) { en.wiz.err = 'Berkas terlalu besar (maksimal 1 MB).'; App.rerender(); return; }
    const rd = new FileReader();
    rd.onload = () => { const txt = String(rd.result).replace(/^﻿/, ''); en.wiz.text = (en.wiz.text ? en.wiz.text.trim() + '\n' : '') + txt.trim(); App.rerender(); App.toast(`${parseText(txt).length} baris dibaca dari ${f.name}`, 'upload'); };
    rd.readAsText(f);
  });

  /* ================= Menu Enrollment & Jadwal: data asli ================= */
  if (canRoute('a-enrollments')) {
    App.routes['a-enrollments'] = () => {
      if (!en.all && !en.allLoading && !en.error) setTimeout(loadAll);
      const f = en.f;
      let body = '';
      if (en.error) body = `<div class="card-body"><div class="callout callout-danger">${ic('alert')}<div class="small">${esc(en.error)} <button class="btn btn-ghost btn-sm" data-action="enrollReload">Coba lagi</button></div></div></div>`;
      else if (!en.all) body = `<div class="card-body"><p class="muted small">Memuat data enrollment…</p></div>`;
      else {
        const q = f.q.toLowerCase();
        const list = en.all.enrollments.filter((e) => (!f.training || e.training === f.training) && (!f.status || e.status === f.status) && (!q || [e.name, e.email, e.participant, e.id, e.voucher || ''].join(' ').toLowerCase().includes(q)));
        body = `${enrolledTable(list, true)}<div class="pager"><span>Menampilkan ${list.length} dari ${en.all.enrollments.length}</span></div>`;
      }
      const ts = en.all ? en.all.trainings : [];
      return App.adminShell('a-enrollments', `
        ${App.pageHead('Enrollment & jadwal', 'Penugasan peserta ke ujian beserta jadwalnya. Tambahkan peserta secara massal dari menu Pelatihan.', canRoute('a-training-enroll') ? `<button class="btn btn-primary" data-action="enrollPick">${ic('plus')} ${canWrite ? 'Tambah enrollment' : 'Per pelatihan'}</button>` : '')}
        <div class="callout callout-info">${ic('lock')}<div class="small"><b>Enrollment tidak membuka akses ujian.</b> Peserta tetap harus memasukkan voucher dari order yang sudah dibayar. Server memeriksa seluruh gate akses saat peserta menekan Mulai.</div></div>
        <section class="card">
          <div class="toolbar">
            <label class="input-group">${ic('search', 'ic-sm')}<input id="ef-q" placeholder="Cari peserta, email, kode enrollment, atau voucher" value="${esc(f.q)}" data-bind="efQ"></label>
            <select class="select" aria-label="Pelatihan" data-change="efF" data-k="training"><option value="">Pelatihan: Semua</option>${ts.map((t) => `<option value="${t.code}" ${f.training === t.code ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
            <select class="select" aria-label="Status" data-change="efF" data-k="status"><option value="">Status: Semua</option>${Object.entries(ST).map(([k, [l]]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <div class="grow"></div><button class="btn btn-secondary btn-sm" data-action="enrollReload">${ic('refresh', 'ic-sm')} Muat ulang</button>
          </div>
          ${body}
        </section>`);
    };
    App.binds.efQ = (el) => { en.f.q = el.value; App.rerender(); const n = document.getElementById('ef-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
    App.changes.efF = (el) => { en.f[el.dataset.k] = el.value; App.rerender(); };
    App.actions.enrollPick = () => { en.training = en.f.training || ''; remember(en.training); en.data = null; en.wiz = null; App.go('a-training-enroll'); };
  }
})();
