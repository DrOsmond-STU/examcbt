/* TACMS prototype — lapisan bahasa (ID ⇄ EN).
   Layar tetap dirender dalam Bahasa Indonesia; saat EN aktif, teks yang tampil
   diterjemahkan memakai kamus di i18n-en.js (termasuk modal, toast, dan teks dinamis). */
(function () {
  const App = window.App;
  const EN = window.I18N_EN;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const dict = new Map(Object.entries(EN.dict).map(([k, v]) => [norm(k), v]));

  /* Konteks khusus: kata yang sama bermakna lain sebagai judul kolom atau label form */
  const TH = new Map(Object.entries({ Peserta: 'Participant', Ujian: 'Exam', Pelatihan: 'Training', Sertifikat: 'Certificate', Order: 'Order', Hasil: 'Result', Pengguna: 'User', Batch: 'Batch', Voucher: 'Voucher', Soal: 'Question', Template: 'Template' }));
  const LABEL = new Map(Object.entries({ Selesai: 'End', Mulai: 'Start', Peserta: 'Participant', Ujian: 'Exam', Pelatihan: 'Training', Template: 'Template', Soal: 'Question' }));

  let lang = 'id';
  try { lang = localStorage.getItem('tacms-lang') || 'id'; } catch (e) {}
  App.lang = () => lang;
  App.locale = () => (lang === 'en' ? 'en-GB' : 'id-ID');

  const SEPS = [' · ', ' — ', ': ', ' → ', ' / ', ', '];
  const seg = (s) => {
    if (dict.has(s)) return dict.get(s);
    for (const [re, rep] of EN.rules) if (re.test(s)) return s.replace(re, rep);
    for (const sep of SEPS) {
      if (!s.includes(sep)) continue;
      const parts = s.split(sep);
      const out = parts.map(seg);
      if (out.some((x, i) => x !== parts[i])) return out.join(sep);
    }
    return s;
  };
  window.__i18nSeg = seg;

  const MONTHS = [['Januari', 'January'], ['Februari', 'February'], ['Maret', 'March'], ['Mei', 'May'], ['Juni', 'June'], ['Juli', 'July'], ['Agustus', 'August'], ['Oktober', 'October'], ['Desember', 'December'], ['Agu', 'Aug'], ['Okt', 'Oct'], ['Des', 'Dec']];
  const post = (s) => {
    for (const [a, b] of MONTHS) s = s.replace(new RegExp(`(\\d\\s|–)${a}\\b|\\b${a}(?=\\s\\d)`, 'g'), (m) => m.replace(a, b));
    s = s.replace(/\bRp (?=\d)/g, 'IDR ');
    s = s.replace(/(?<![\d,.])(\d+),(\d{1,2})(?![\d,])/g, '$1.$2');
    s = s.replace(/(?<![\d.])\d{1,3}(?:\.\d{3})+(?![\d.])/g, (m) => m.replace(/\./g, ','));
    return s;
  };

  const translate = (raw, ctx) => {
    const n = norm(raw);
    if (!n || !/[A-Za-z]/.test(n)) return raw;
    let t = (ctx && ctx.has(n)) ? ctx.get(n) : seg(n);
    t = post(t);
    if (t === n) return raw;
    return raw.match(/^\s*/)[0] + t + raw.match(/\s*$/)[0];
  };
  App.t = (s) => (lang === 'en' ? translate(s) : s);

  const SKIP = 'script,style,textarea[data-bind],[data-noi18n]';
  const doNode = (node) => {
    const p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    const ctx = p.closest('th') ? TH : p.closest('label.label, label.check') ? LABEL : null;
    const v = translate(node.nodeValue, ctx);
    if (v !== node.nodeValue) node.nodeValue = v;
  };
  const doAttrs = (el) => {
    for (const a of ['placeholder', 'aria-label', 'title']) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) { const t = translate(v); if (t !== v) el.setAttribute(a, t); }
    }
    if (el.tagName === 'INPUT' && !el.dataset.bind && el.type !== 'checkbox' && el.type !== 'radio' && el.value) {
      const n = norm(el.value);
      if (dict.has(n)) el.value = dict.get(n);
    }
    if (el.tagName === 'TEXTAREA' && !el.dataset.bind) {
      const n = norm(el.value);
      if (dict.has(n)) el.value = dict.get(n);
    }
  };
  const walk = (root) => {
    if (lang !== 'en' || !root) return;
    if (root.nodeType === 3) return doNode(root);
    if (root.nodeType !== 1) return;
    if (root.closest && root.closest(SKIP) && root.tagName !== 'TEXTAREA') return;
    doAttrs(root);
    root.querySelectorAll('[placeholder],[aria-label],[title],input,textarea').forEach(doAttrs);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) doNode(n);
  };
  App.translate = walk;

  const mo = new MutationObserver((muts) => {
    if (lang !== 'en') return;
    for (const m of muts) {
      if (m.type === 'characterData') doNode(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  const start = () => mo.observe(document.body, { childList: true, subtree: true, characterData: true });

  App.langToggle = (extra = '') => `<div class="seg lang-seg ${extra}" role="group" aria-label="Bahasa">${['id', 'en'].map((l) => `<button class="${lang === l ? 'on' : ''}" data-action="setLang" data-v="${l}" aria-pressed="${lang === l}" lang="${l}">${l.toUpperCase()}</button>`).join('')}</div>`;
  App.actions.setLang = (el) => {
    lang = el.dataset.v;
    try { localStorage.setItem('tacms-lang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    App.rerender();
    if (lang === 'en') walk(document.body);
  };

  document.documentElement.lang = lang;
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
