// MedLearn – Frontend (ohne Build-Schritt)
const $app = document.getElementById('app');


// ---------- Icons (einheitliche Linien-Icons, 24er Raster) ----------
const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  book: '<path d="M5 4.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14H6.5A1.5 1.5 0 0 1 5 18.5z"/><path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H18"/><path d="M9 8h5"/>',
  flag: '<path d="M6 21V4.5"/><path d="M6 4.5h10.5l-2 3.75 2 3.75H6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  chat: '<path d="M5 5.5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8.5L6 20v-3.5H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/>',
  settings: '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>',
  theme: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  file: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5A.5.5 0 0 1 6.5 20V4A.5.5 0 0 1 7 3.5z"/><path d="M14 3.5V8h4"/>',
  trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7M9.5 7V4.5h5V7"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  left: '<path d="M14.5 6 8.5 12l6 6"/>',
  right: '<path d="m9.5 6 6 6-6 6"/>',
  rotate: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  edit: '<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="m13 7 4 4"/>',
  hide: '<path d="M3.5 3.5l17 17"/><path d="M10.4 6.1A9 9 0 0 1 12 6c4.6 0 7.8 3.6 9 6a12.6 12.6 0 0 1-2.4 3.2M6.6 7.6C4.8 8.8 3.6 10.5 3 12c1.2 2.4 4.4 6 9 6a8.8 8.8 0 0 0 4-1"/><path d="M10 10a3 3 0 0 0 4 4"/>',
  external: '<path d="M14 4.5h5.5V10"/><path d="m19.5 4.5-8 8"/><path d="M17.5 14v5.5h-13v-13H10"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
  upload: '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v4.5h15V15"/>',
  archive: '<path d="M4 5h16v4H4z"/><path d="M5.5 9v10h13V9M10 13h4"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13"/>',
  timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.2 1.6M10 3.5h4M18.5 6.5l1.2-1.2"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  share: '<path d="M12 15V4.5M8 8l4-4 4 4"/><path d="M6 11.5H5a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6.5a1 1 0 0 0-1-1h-1"/>',
  flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.1 2.2-4.9 3.4-7.3.5 1.7 1.4 2.7 2.4 3.2-.1-3 1.2-5.9 3.7-7.8-.3 2.6.7 4.7 1.9 6.5 1 1.5 1.6 3 1.6 4.9 0 3.6-2.6 6.1-7 6.1z"/>',
  folder: '<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17z"/>',
  folderPlus: '<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17z"/><path d="M12 10.5v5M9.5 13h5"/>',
  move: '<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17z"/><path d="M9 13h6M12.5 10.5 15 13l-2.5 2.5"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
document.querySelectorAll('[data-ic]').forEach((el) => { el.outerHTML = icon(el.dataset.ic); });
const KI_LABEL = `<span class="ai-label">${icon('info', 's')} KI-Ergänzung</span>`;

// ---------- Hilfsfunktionen ----------
async function api(path, opts = {}) {
  const o = { ...opts };
  if (o.body && !(o.body instanceof FormData)) { o.headers = { 'content-type': 'application/json' }; o.body = JSON.stringify(o.body); }
  const res = await fetch('/api' + path, o);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Fehler ${res.status}`);
  return j;
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(msg, ms = 3500) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
function modal(html) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) bg.remove(); });
  document.body.appendChild(bg);
  return bg;
}
function linkify(l) {
  // Markdown-Links [Text](URL) und nackte URLs anklickbar machen (Text ist bereits escaped)
  const links = [];
  l = l.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) => { links.push(`<a href="${u}" target="_blank" rel="noopener">${t}</a>`); return `\u0000${links.length - 1}\u0000`; });
  l = l.replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, (_, pre, u) => { links.push(`<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}</a>`); return `${pre}\u0000${links.length - 1}\u0000`; });
  return l.replace(/\u0000(\d+)\u0000/g, (_, i) => links[i]);
}
function md(text) {
  // Minimal-Markdown: fett, kursiv, Listen, Absätze, KI-Ergänzungs-Markierung
  const lines = esc(text).split('\n');
  let html = '', inList = false; // inList: false | 'ul' | 'ol'
  for (let l of lines) {
    l = linkify(l);
    l = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>').replace(/`(.+?)`/g, '<code>$1</code>');
    const li = l.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)/);
    if (li) {
      const type = /^\s*\d+\./.test(l) ? 'ol' : 'ul';
      if (inList !== type) { if (inList) html += `</${inList}>`; html += `<${type}>`; inList = type; }
      html += `<li>${li[1]}</li>`; continue;
    }
    if (inList) { html += `</${inList}>`; inList = false; }
    if (/^#{1,4}\s/.test(l)) { html += `<p><b>${l.replace(/^#+\s/, '')}</b></p>`; continue; }
    if (l.includes('🧠')) { html += `<span class="ai-mark">${l.replace(/🧠\s*KI-Ergänzung:?/u, KI_LABEL + ':').replace('🧠', KI_LABEL)}</span>`; continue; }
    if (l.trim()) html += `<p>${l}</p>`;
  }
  if (inList) html += `</${inList}>`;
  return html;
}
const KIND_LABEL = { flashcard: 'Karteikarte', cloze: 'Lückentext', mc: 'Multiple Choice', case: 'Klinischer Fall', match: 'Zuordnung', open: 'Freitext' };
function shuffleIdx(n) { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pagesLabel = (p) => (p && p.length ? `S. ${p.join(', ')}` : 'S. ?');
function parseHash() {
  const [p, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { parts: p.split('/').filter(Boolean), params: new URLSearchParams(qs || '') };
}
let cleanup = null;
function setView(html, keepScroll = false) {
  if (cleanup) { cleanup(); cleanup = null; }
  const y = window.scrollY;
  $app.innerHTML = html;
  window.scrollTo(0, keepScroll ? y : 0);
}
// Nutzer tippt gerade in ein Feld (dann keine automatische Aktualisierung)
const isTyping = (root = document) => { const a = document.activeElement; return !!a && root.contains(a) && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName); };
// Auf-/Zugeklappt-Zustand der Bibliothek merken
let openState = {}; try { openState = JSON.parse(localStorage.getItem('libOpen') || '{}'); } catch {}
const isOpen = (key, def) => (key in openState ? openState[key] : def);
function trackDetails(root) {
  root.querySelectorAll('details[data-k]').forEach((el) => el.addEventListener('toggle', () => {
    openState[el.dataset.k] = el.open;
    try { localStorage.setItem('libOpen', JSON.stringify(openState)); } catch {}
  }));
}

// ---------- Router ----------
// Ist KI verfügbar? (ohne Claude-Abo: Lernen geht, Skript-Verarbeitung/Tutor/Kompakt-Export nicht)
let AI_ON = true;
const loadAi = () => api('/settings').then((s) => { AI_ON = s.provider !== 'offline'; }).catch(() => {});
const noAiBox = (what) => `<div class="noai">${icon('info', 's')}<span><b>${what} braucht ein Claude-Abo.</b> Ohne Abo kannst du alle importierten Lernpakete ganz normal lernen.
  Hast du inzwischen ein Abo? Dann den Installer nochmal starten und bei der Frage nach dem Claude-Abo „j“ wählen.</span></div>`;

async function route() {
  document.querySelectorAll('.modal-bg').forEach((m) => m.remove());
  const { parts, params } = parseHash();
  const name = parts[0] || '';
  document.querySelectorAll('nav.side a[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
  try {
    if (name === '') await viewDashboard();
    else if (name === 'bibliothek') await viewLibrary();
    else if (name === 'thema') await viewTopic(parts[1]);
    else if (name === 'lernen') await viewLearn(params);
    else if (name === 'suche') await viewSearch(params.get('q') || '');
    else if (name === 'tutor') await viewTutor(params);
    else if (name === 'fehler') await viewMistakes();
    else if (name === 'einstellungen') await viewSettings();
    else setView('<div class="empty">Seite nicht gefunden</div>');
  } catch (e) {
    setView(`<div class="card"><b>Fehler:</b> ${esc(e.message)}</div>`);
  }
}
window.addEventListener('hashchange', route);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { const m = [...document.querySelectorAll('.modal-bg')].pop(); if (m) { m.remove(); e.stopImmediatePropagation(); } }
}, true);
document.getElementById('themeToggle').addEventListener('click', (e) => {
  e.preventDefault();
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
});

// Kleine Konfetti-Belohnung am Ende einer guten Session (respektiert „Bewegung reduzieren“)
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti';
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const x = c.getContext('2d'); x.scale(devicePixelRatio, devicePixelRatio);
  const cols = [...SUBJ_COLORS, '#f2b632'];
  const P = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 160, y: innerHeight * .38, vx: (Math.random() - .5) * 13, vy: -Math.random() * 13 - 5,
    w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .35, c: cols[(Math.random() * cols.length) | 0],
  }));
  const t0 = performance.now();
  (function frame(t) {
    x.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of P) {
      p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore();
    }
    if (t - t0 < 2600) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

// ---------- Schwachstellen: gezieltes Mini-Training ----------
function weakCard(list = []) {
  if (!list.length) return '';
  return `<div class="card weak-card" style="margin-bottom:16px">
    <div class="row between"><h3 style="margin:0">Gezielt üben</h3><span class="muted small">Unterpunkte, die du zuletzt mehrfach falsch hattest</span></div>
    <ul class="weak-list">${list.map((w, k) => `
      <li style="--sc:${subjColor(w.subject)}">
        <div class="weak-body">
          <div class="weak-title">${esc(w.drill?.title || w.topic)}</div>
          <div class="muted small">${esc(w.subject)} › ${esc(w.topic)} · ${w.wrong}× falsch${w.topicAccuracy != null && w.topicAccuracy >= 50 ? ` – im übrigen Thema ${w.topicAccuracy} % sicher` : ''}</div>
          ${w.drill?.summary ? `<div class="weak-sum">${esc(w.drill.summary)}</div>`
            : `<ul class="weak-units">${w.units.slice(0, 3).map((u) => `<li>${esc(u.content.length > 140 ? u.content.slice(0, 140) + ' …' : u.content)}</li>`).join('')}</ul>`}
        </div>
        <button class="${k === 0 ? 'primary' : ''}" data-weak="${k}">${w.drill ? `${icon('play', 's')} Mini-Training (${w.drill.items})` : `${icon('play', 's')} Mini-Training erstellen`}</button>
      </li>`).join('')}</ul></div>`;
}
let weakCache = [];
function bindWeak() {
  $app.querySelectorAll('[data-weak]').forEach((b) => b.onclick = async () => {
    const w = weakCache[Number(b.dataset.weak)]; if (!w) return;
    if (w.drill) { location.hash = `#/lernen?scope=drill:${w.drill.id}`; return; }
    b.disabled = true; b.innerHTML = '<span class="spinner"></span> Wird erstellt … (ca. 30 s)';
    try {
      const r = await api('/weak/drill', { method: 'POST', body: { topicId: w.topicId, unitIds: w.unitIds } });
      location.hash = `#/lernen?scope=drill:${r.id}`;
    } catch (err) { toast(err.message); b.disabled = false; b.innerHTML = `${icon('play', 's')} Mini-Training erstellen`; }
  });
}

// ---------- Tageskarte (Begrüßung, Tagesziel, Serie) ----------
function streakDays(activity = []) {
  const days = new Set(activity.filter((a) => a.n > 0).map((a) => a.d));
  const key = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const d = new Date(); d.setHours(12, 0, 0, 0);
  if (!days.has(key(d))) d.setDate(d.getDate() - 1);   // heute noch nichts gelernt → Serie von gestern zählt noch
  let n = 0;
  while (days.has(key(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function heroCard(d) {
  const h = new Date().getHours();
  const hello = h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : 'Guten Abend';
  const name = d.profile?.name ? `, ${esc(d.profile.name)}` : '';
  const goal = Math.max(5, Number(d.profile?.goal) || 50);
  const done = d.today.reviews || 0;
  const pct = Math.min(1, done / goal);
  const streak = streakDays(d.activity);
  const due = d.due.cards + d.due.mc + d.due.match;
  const fresh = d.fresh.cards + d.fresh.mc + d.fresh.match;
  const R = 46, C = 2 * Math.PI * R;
  const msg = !d.subjects.length ? 'Lade ein Skript hoch, dann geht es los.'
    : done >= goal ? `Tagesziel geschafft – ${done} Antworten${d.today.reviews ? `, ${Math.round(100 * d.today.correct / d.today.reviews)} % richtig` : ''}.`
      : done ? `Noch ${goal - done} Antworten bis zu deinem Tagesziel.` : due ? `${due} Wiederholungen warten auf dich.` : 'Starte mit ein paar neuen Inhalten.';
  return `<section class="hero">
    <svg class="hero-ecg" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120 H330 l18 -8 l14 8 h40 l12 -70 l16 120 l14 -78 l10 28 h70 l22 -14 l20 14 H760 l18 -8 l14 8 h40 l12 -70 l16 120 l14 -78 l10 28 h70 l22 -14 l20 14 H1200"/></svg>
    <div class="hero-main">
      <div class="hero-date">${new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>${hello}${name}</h1>
      <p class="hero-msg">${msg}</p>
      <div class="hero-chips">
        <span class="chip ${streak ? 'fire' : ''}" title="Tage in Folge mit mindestens einer Antwort">${icon('flame', 's')} ${streak ? `${streak} ${streak === 1 ? 'Tag' : 'Tage'} in Folge` : 'Serie starten'}</span>
        <span class="chip">${due} fällig</span><span class="chip">${fresh} neu</span>
        ${d.openMistakes ? `<a class="chip" href="#/fehler">${d.openMistakes} offene Fehler</a>` : ''}
      </div>
      ${d.subjects.length ? `<a class="btn big hero-cta" href="#/lernen">${icon('play')} Jetzt lernen</a>` : `<a class="btn big hero-cta" href="#/bibliothek">${icon('upload')} Skript hochladen</a>`}
    </div>
    <div class="hero-goal" title="Tagesziel: ${goal} Antworten (änderbar in den Einstellungen)">
      <svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="${R}" class="g-track"/>
        <circle cx="55" cy="55" r="${R}" class="g-fill" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 55 55)"/></svg>
      <div class="g-num">${done}<small>von ${goal}</small></div>
      <div class="g-lbl">${done >= goal ? 'Ziel erreicht' : 'Tagesziel'}</div>
    </div>
  </section>`;
}

// ---------- Dashboard ----------
async function viewDashboard(soft = false) {
  const [d, saved, weak] = await Promise.all([api('/dashboard'), api('/saved-sessions').catch(() => []), api('/weak?limit=4').catch(() => [])]);
  const totalNew = d.fresh.cards + d.fresh.mc + d.fresh.match;
  const hasContent = d.subjects.length > 0;
  setView(`
  ${heroCard(d)}
  ${d.processing.map((p) => `
    <div class="card" style="margin-bottom:16px">
      <div class="row between"><b class="row" style="gap:8px">${icon('file')} ${esc(p.title)}</b>
        ${p.status === 'fehler' ? `<button class="small" data-resume="${p.id}">Fortsetzen</button>` : '<span class="spinner"></span>'}</div>
      <div class="bar" style="margin:10px 0 6px"><div style="width:${Math.round(p.progress * 100)}%"></div></div>
      <div class="small ${p.status === 'fehler' ? '' : 'muted'}" style="${p.status === 'fehler' ? 'color:var(--bad)' : ''}">${esc(p.status === 'fehler' ? p.error : p.message)}</div>
    </div>`).join('')}
  ${!hasContent ? `
    <div class="card empty">
      <h2>Willkommen bei MedLearn</h2>
      <p>Lade dein erstes Skript hoch – daraus entstehen automatisch Wissensbasis, Karteikarten, Lückentexte, MC-Fragen, Fälle und Zuordnungsaufgaben.
        Oder importiere ein Lernpaket, das dir jemand geschickt hat.</p>
      <a class="btn primary" href="#/bibliothek">Zur Bibliothek</a>
    </div>` : `
  ${saved.length ? `<div class="card" style="margin-bottom:16px"><h3>Weitermachen</h3>
    <ul class="list">${saved.slice(0, 3).map((x) => `<li class="row between"><span>${esc(x.label || 'Session')}
      <span class="muted small" style="margin-left:6px">${x.done} von ${x.total} beantwortet</span></span>
      <a class="btn small" href="${sessionHref(x.key)}">Fortsetzen</a></li>`).join('')}</ul>
    ${saved.length > 3 ? `<div class="muted small" style="margin-top:6px">und ${saved.length - 3} weitere angefangene Sessions</div>` : ''}</div>` : ''}

  ${weakCard((weakCache = weak))}
  ${progressCard(d, saved)}
  <div class="grid cols-2" style="margin-bottom:16px">
    ${examCard(d)}
    ${activityCard(d.activity)}
  </div>
  <div class="grid cols-2">
      <div class="card"><h3>Schwache Themen</h3>
        ${d.weak.length ? `<ul class="list">${d.weak.map((w) => `
          <li class="row between"><span><a href="#/thema/${w.id}">${esc(w.title)}</a><br><span class="muted small">${esc(w.subject)} · ${Math.round(100 * w.wrong / w.reviews)} % falsch</span></span>
          <a class="btn small" href="#/lernen?scope=topic:${w.id}">Üben</a></li>`).join('')}</ul>`
          : '<div class="muted small">Noch keine – wird nach den ersten Lerneinheiten berechnet.</div>'}
      </div>
      <div class="card"><h3>Zuletzt gelernt</h3>
        ${d.recent.length ? `<ul class="list">${d.recent.map((r) => `
          <li class="row between"><span><a href="#/thema/${r.id}">${esc(r.title)}</a><br><span class="muted small">${esc(r.subject)} › ${esc(r.chapter)}</span></span>
          <a class="btn small" href="#/lernen?scope=topic:${r.id}">Weiter</a></li>`).join('')}</ul>`
          : '<div class="muted small">Noch nichts gelernt.</div>'}
      </div>
  </div>`}`, soft);
  $app.querySelectorAll('[data-resume]').forEach((b) => b.onclick = async () => { await api(`/documents/${b.dataset.resume}/resume`, { method: 'POST' }); route(); });
  bindWeak();
  bindExamForms();
  if (d.processing.some((p) => p.status !== 'fehler')) {
    let t = null;
    const tick = () => {
      t = setTimeout(() => {
        if (parseHash().parts[0] !== undefined) return;
        if (isTyping($app) || document.querySelector('.modal-bg')) return tick(); // gerade Eingabe → später erneut
        viewDashboard(true).catch(() => {});
      }, 4000);
    };
    tick();
    cleanup = () => clearTimeout(t);
  }
}

// ---------- Bibliothek ----------
// Kopf + Upload bleiben stehen; nur der Stapel-Bereich (#libtree) wird während der Verarbeitung aktualisiert –
// ohne Sprung nach oben und mit gemerktem Auf-/Zugeklappt-Zustand.
// Ordner (z. B. pro Prüfung) fassen Skripte zusammen; Skripte ohne Ordner stehen wie bisher nach Fach sortiert darunter.
async function viewLibrary() {
  const [lib, folders] = await Promise.all([api('/library'), api('/folders'), loadAi()]);
  setView(`
  <div class="row between"><h1>Bibliothek</h1>
    <span class="row" style="gap:8px"><button id="importPkg" title="Ein Lernpaket von Freunden importieren (.medlearn)">${icon('upload', 's')} Lernpaket importieren</button>
      <button id="newFolder">${icon('folderPlus', 's')} Neuer Ordner</button></span></div>
  <div class="card" style="margin-bottom:20px">
    <h2>Skript hochladen</h2>
    ${AI_ON ? '' : noAiBox('Das Verarbeiten eigener Skripte')}
    <form id="up" class="grid up-form ${AI_ON ? '' : 'disabled'}">
      <div><label>PDF-Datei</label><input type="file" name="file" accept="application/pdf,.pdf" required></div>
      <div><label>Fach</label><input name="subject" list="subjects" placeholder="z. B. Kardiologie" required></div>
      <div><label>Ordner</label><select name="folder_id" id="upFolder">${folderOptions(folders, '')}</select></div>
      <div><label>Titel (optional)</label><input name="title" placeholder="Dateiname"></div>
      <button class="primary" type="submit">Hochladen & analysieren</button>
      <datalist id="subjects">${lib.map((s) => `<option value="${esc(s.name)}">`).join('')}</datalist>
    </form>
    <div class="muted small" style="margin-top:8px">Die Analyse läuft im Hintergrund über Claude (dein Abo). Dauer: ca. 1–2 Minuten pro 5 Seiten.</div>
  </div>
  <div id="libtree"></div>`);
  let timer = null;
  let current = { lib, folders };
  cleanup = () => clearTimeout(timer);
  const refresh = async () => {
    if (parseHash().parts[0] !== 'bibliothek' || !document.getElementById('libtree')) return;
    try {
      const [l, f] = await Promise.all([api('/library'), api('/folders')]);
      const sel = document.getElementById('upFolder');
      if (sel && JSON.stringify(f) !== JSON.stringify(current.folders)) { const v = sel.value; sel.innerHTML = folderOptions(f, v); }
      renderTree(l, f);
    } catch {}
  };
  const saveDoc = async (id, body, msg) => {
    try { await api(`/documents/${id}`, { method: 'PUT', body }); if (msg) toast(msg); refresh(); } catch (err) { toast(err.message); }
  };
  function renderTree(data, flds) {
    current = { lib: data, folders: flds };
    const tree = document.getElementById('libtree');
    if (!tree) return;
    const anyRunning = data.some((s) => s.documents.some((d) => d.running));
    tree.innerHTML = libTreeHtml(data, flds);
    trackDetails(tree);
    bindExamForms();
    tree.querySelectorAll('[data-resume]').forEach((b) => b.onclick = async (e) => { e.preventDefault(); await api(`/documents/${b.dataset.resume}/resume`, { method: 'POST' }); refresh(); });
    tree.querySelectorAll('[data-del]').forEach((b) => b.onclick = async (e) => {
      e.preventDefault();
      if (!confirm('Dokument inkl. aller Lerninhalte und Lernfortschritte löschen?')) return;
      try { await api(`/documents/${b.dataset.del}`, { method: 'DELETE' }); refresh(); } catch (err) { toast(err.message); }
    });
    tree.querySelectorAll('[data-share]').forEach((b) => b.onclick = (e) => { e.preventDefault(); shareDialog(b.dataset.share, b.dataset.shareName); });
    // Skript umbenennen
    tree.querySelectorAll('[data-rename]').forEach((b) => b.onclick = (e) => {
      e.preventDefault();
      const doc = findDoc(current.lib, Number(b.dataset.rename));
      if (doc) askName('Skript umbenennen', doc.title, 'Umbenennen', (title) => saveDoc(doc.id, { title }, 'Umbenannt'));
    });
    // Skript in Ordner verschieben
    tree.querySelectorAll('[data-move]').forEach((b) => b.onclick = (e) => {
      e.preventDefault();
      const doc = findDoc(current.lib, Number(b.dataset.move));
      if (doc) moveDialog(doc, current.folders, (fid, name) => saveDoc(doc.id, { folder_id: fid }, fid ? `Verschoben nach „${name}“` : 'Aus dem Ordner genommen'), refresh);
    });
    // Ordner umbenennen / löschen
    tree.querySelectorAll('[data-frename]').forEach((b) => b.onclick = (e) => {
      e.preventDefault();
      const f = current.folders.find((x) => x.id === Number(b.dataset.frename));
      if (f) askName('Ordner umbenennen', f.name, 'Umbenennen', async (name) => {
        try { await api(`/folders/${f.id}`, { method: 'PUT', body: { name } }); toast('Umbenannt'); refresh(); } catch (err) { toast(err.message); }
      });
    });
    tree.querySelectorAll('[data-fdel]').forEach((b) => b.onclick = async (e) => {
      e.preventDefault();
      if (!confirm('Ordner löschen? Die Skripte darin bleiben erhalten und stehen danach wieder unter „Ohne Ordner“.')) return;
      try { await api(`/folders/${b.dataset.fdel}`, { method: 'DELETE' }); refresh(); } catch (err) { toast(err.message); }
    });
    // Drag & Drop: Skript auf einen Ordner (oder „Ohne Ordner“) ziehen
    tree.querySelectorAll('[data-drag]').forEach((el) => el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/medlearn-doc', el.dataset.drag); e.dataTransfer.effectAllowed = 'move';
      tree.classList.add('dragging');
    }));
    tree.ondragend = () => { tree.classList.remove('dragging'); tree.querySelectorAll('.drop-over').forEach((x) => x.classList.remove('drop-over')); };
    tree.querySelectorAll('[data-drop]').forEach((el) => {
      el.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/medlearn-doc')) { e.preventDefault(); el.classList.add('drop-over'); } });
      el.addEventListener('dragleave', () => el.classList.remove('drop-over'));
      el.addEventListener('drop', (e) => {
        e.preventDefault(); el.classList.remove('drop-over'); tree.classList.remove('dragging');
        const id = Number(e.dataTransfer.getData('text/medlearn-doc'));
        const fid = el.dataset.drop ? Number(el.dataset.drop) : null;
        const doc = findDoc(current.lib, id);
        if (!doc || (doc.folder_id || null) === fid) return;
        const f = current.folders.find((x) => x.id === fid);
        saveDoc(id, { folder_id: fid }, fid ? `Verschoben nach „${f?.name}“` : 'Aus dem Ordner genommen');
      });
    });
    tree.querySelectorAll('summary a, summary button').forEach((el) => el.addEventListener('click', (e) => e.stopPropagation()));
    clearTimeout(timer);
    if (anyRunning) {
      const tick = () => { timer = setTimeout(() => (isTyping(tree) || document.querySelector('.modal-bg') ? tick() : refresh()), 4000); };
      tick();
    }
  }
  renderTree(lib, folders);
  document.getElementById('newFolder').onclick = () => askName('Neuer Ordner', '', 'Erstellen', async (name) => {
    try {
      const r = await api('/folders', { method: 'POST', body: { name } });
      openState[`f${r.id}`] = true;
      toast(`Ordner „${name}“ erstellt`);
      refresh();
    } catch (err) { toast(err.message); }
  }, 'z. B. KMP 6a – Sommer 2027');
  document.getElementById('importPkg').onclick = () => importDialog(current.folders, refresh);
  if (!AI_ON) document.querySelectorAll('#up input, #up select, #up button').forEach((el) => { el.disabled = true; });
  document.getElementById('up').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Lädt hoch …';
    const keepFolder = e.target.folder_id.value;
    try {
      await api('/upload', { method: 'POST', body: fd });
      toast('Hochgeladen – Analyse läuft im Hintergrund.');
      e.target.reset(); e.target.folder_id.value = keepFolder; btn.disabled = false; btn.textContent = 'Hochladen & analysieren';
      refresh();
    } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Hochladen & analysieren'; }
  };
}

// ---------- Lernpakete teilen / importieren ----------
function shareDialog(scope, name) {
  const m = modal(`<div class="row between"><h2>Als Lernpaket teilen</h2><button class="ghost" data-close title="Schließen">${icon('x')}</button></div>
    <p class="muted small" style="margin-top:0">${esc(name)} – erzeugt eine <b>.medlearn</b>-Datei. Deine Freunde importieren sie in ihrer MedLearn-App
      (Bibliothek › „Lernpaket importieren“) und können sofort lernen, ohne das Skript selbst verarbeiten zu lassen.</p>
    <ul class="list small" style="margin:0 0 12px">
      <li>Enthalten: Kapitel, Themen, Wissenseinheiten, alle Lerninhalte und Abbildungen</li>
      <li>Nicht enthalten: dein Lernfortschritt und deine Fehler</li></ul>
    <label class="chk"><input type="checkbox" id="withPdf" checked> PDF mitgeben (für „Quelle im Skript“ und den PDF-Knopf)</label>
    <div class="muted small" style="margin-top:6px">Teile Skripte nur mit Leuten, mit denen du sie auch sonst teilen darfst (z. B. dein Jahrgang).</div>
    <div class="row" style="margin-top:16px"><button class="primary" id="pkgGo">${icon('share', 's')} Paket erstellen</button><span id="pkgRes" class="small muted"></span></div>`);
  m.querySelector('#pkgGo').onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    const res = m.querySelector('#pkgRes'); res.innerHTML = '<span class="spinner"></span> Wird gepackt …';
    try {
      const r = await fetch(`/api/export/package?scope=${encodeURIComponent(scope)}&pdf=${m.querySelector('#withPdf').checked ? 1 : 0}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Fehler ${r.status}`);
      const blob = await r.blob();
      const fn = decodeURIComponent((r.headers.get('content-disposition') || '').match(/filename\*=UTF-8''([^;]+)/)?.[1] || 'lernpaket.medlearn');
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      res.innerHTML = `Fertig: ${r.headers.get('x-package-docs')} Skript(e), ${r.headers.get('x-package-items')} Lerninhalte · ${(blob.size / 1048576).toFixed(1)} MB – liegt in deinen Downloads.`;
    } catch (err) { res.textContent = err.message; }
    btn.disabled = false;
  };
}

function importDialog(folders, done) {
  const m = modal(`<div class="row between"><h2>Lernpaket importieren</h2><button class="ghost" data-close title="Schließen">${icon('x')}</button></div>
    <p class="muted small" style="margin-top:0">Wähle eine <b>.medlearn</b>-Datei, die dir jemand geschickt hat. Die Skripte erscheinen danach in deiner Bibliothek – mit allen Lerninhalten, aber mit frischem Lernfortschritt.</p>
    <form id="impForm" class="stack">
      <div><label>Datei</label><input type="file" name="file" accept=".medlearn" required></div>
      <div><label>Ordner</label><select name="folder_id"><option value="">Wie im Paket (Ordner wird ggf. angelegt)</option>${folders.map((f) => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select></div>
      <div class="row"><button class="primary">${icon('upload', 's')} Importieren</button><span id="impRes" class="small muted"></span></div>
    </form>`);
  m.querySelector('#impForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button.primary'); btn.disabled = true;
    const res = m.querySelector('#impRes'); res.innerHTML = '<span class="spinner"></span> Wird importiert …';
    try {
      const r = await api('/import/package', { method: 'POST', body: new FormData(e.target) });
      m.remove();
      toast(`Importiert: ${r.documents.map((d) => d.title).join(', ')} (${r.documents.reduce((a, d) => a + d.items, 0)} Lerninhalte)`, 5000);
      done();
    } catch (err) { res.textContent = err.message; btn.disabled = false; }
  };
}

const findDoc = (lib, id) => lib.flatMap((s) => s.documents).find((d) => d.id === id);
const folderOptions = (folders, sel) => `<option value="">Ohne Ordner</option>${folders.map((f) => `<option value="${f.id}" ${String(f.id) === String(sel) ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}`;

// Kleiner Dialog mit einem Namensfeld (Ordner anlegen/umbenennen, Skript umbenennen)
function askName(title, value, action, onOk, placeholder = '') {
  const m = modal(`<div class="row between"><h2>${esc(title)}</h2><button class="ghost" data-close title="Schließen">${icon('x')}</button></div>
    <form id="nameForm"><input name="n" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="200" required autocomplete="off">
    <div class="row" style="margin-top:14px;justify-content:flex-end"><button type="button" data-close>Abbrechen</button><button class="primary">${esc(action)}</button></div></form>`);
  const f = m.querySelector('#nameForm');
  f.n.focus(); f.n.select();
  f.onsubmit = (e) => {
    e.preventDefault();
    const v = f.n.value.trim();
    if (!v) return;
    m.remove();
    if (v !== value) onOk(v);
  };
}

// Ordner für ein Skript wählen (inkl. „neuen Ordner anlegen“)
function moveDialog(doc, folders, onPick, refresh) {
  const cur = doc.folder_id || null;
  const m = modal(`<div class="row between"><h2>Verschieben</h2><button class="ghost" data-close title="Schließen">${icon('x')}</button></div>
    <p class="muted small" style="margin-top:0">${esc(doc.title)}</p>
    <div class="pick-list">
      ${folders.map((f) => `<button class="pick ${f.id === cur ? 'on' : ''}" data-fid="${f.id}">${icon('folder', 's')} ${esc(f.name)}${f.id === cur ? '<span class="muted small">aktuell</span>' : ''}</button>`).join('')}
      <button class="pick ${cur == null ? 'on' : ''}" data-fid="">${icon('book', 's')} Ohne Ordner${cur == null ? '<span class="muted small">aktuell</span>' : ''}</button>
    </div>
    <form id="mvNew" class="row" style="margin-top:14px"><input name="n" placeholder="Neuer Ordner …" style="flex:1" autocomplete="off"><button class="small">${icon('folderPlus', 's')} Anlegen & verschieben</button></form>`);
  m.querySelectorAll('[data-fid]').forEach((b) => b.onclick = () => {
    const fid = b.dataset.fid ? Number(b.dataset.fid) : null;
    m.remove();
    if (fid !== cur) onPick(fid, folders.find((f) => f.id === fid)?.name);
  });
  m.querySelector('#mvNew').onsubmit = async (e) => {
    e.preventDefault();
    const name = e.target.n.value.trim(); if (!name) return;
    try {
      const r = await api('/folders', { method: 'POST', body: { name } });
      openState[`f${r.id}`] = true;
      m.remove(); onPick(r.id, name);
    } catch (err) { toast(err.message); }
  };
}

function libTreeHtml(lib, folders = []) {
  const pct = (k, n) => (n ? Math.round(100 * k / n) : 0);
  if (!lib.length && !folders.length) return '<div class="empty">Noch keine Skripte.</div>';
  const examTag = (s) => (s.exam ? `<span class="exam-days">${icon('calendar', 's')} Prüfung ${new Date(s.exam + 'T00:00:00').toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>` : '');

  const docHtml = (d, many) => `
        <details class="sub" data-k="d${d.id}" ${isOpen(`d${d.id}`, !many) ? 'open' : ''}>
          <summary draggable="true" data-drag="${d.id}" title="Zum Verschieben auf einen Ordner ziehen"><span class="row"><span class="chev"></span>${d.status === 'fertig' ? ring({ ...sumStats([d]), name: d.title }, 22, false) : ''}<b>${esc(d.title)}</b>
            <span class="muted small">${d.pages} S.</span>
            ${d.status === 'fertig' ? '' : d.status === 'fehler' ? '<span class="tag bad">Fehler</span>' : `<span class="tag warn">${esc(d.message || d.status)}</span>`}</span>
            <span class="row">
              ${d.status === 'fehler' && !d.running ? `<button class="small" data-resume="${d.id}">Fortsetzen</button>` : ''}
              ${d.has_pdf ? `<a class="btn small" href="/api/pdf/${d.id}" target="_blank">PDF</a>` : ''}
              ${d.status === 'fertig' ? `<button class="small" data-anki="document:${d.id}" data-anki-name="${esc(d.title)}" title="Als Anki-Stapel exportieren">${icon('archive', 's')} Anki</button>` : ''}
              <a class="btn small" href="#/lernen?scope=document:${d.id}">Lernen</a>
              ${d.status === 'fertig' ? `<button class="small ghost" data-share="document:${d.id}" data-share-name="${esc(d.title)}" title="Als Lernpaket mit Freunden teilen">${icon('share', 's')}</button>` : ''}
              <button class="small ghost" data-rename="${d.id}" title="Umbenennen">${icon('edit', 's')}</button>
              <button class="small ghost" data-move="${d.id}" title="In Ordner verschieben">${icon('move', 's')}</button>
              <button class="small ghost danger" data-del="${d.id}" title="Skript löschen">${icon('trash')}</button>
            </span></summary>
          ${d.status === 'fehler' ? `<div class="small" style="color:var(--bad);margin:4px 0 8px">${esc(d.error)}</div>` : ''}
          ${d.status !== 'fertig' && d.status !== 'fehler' ? `<div class="bar" style="margin:6px 0 10px"><div style="width:${Math.round(d.progress * 100)}%"></div></div>` : ''}
          ${d.chapters.map((c) => `
            <details class="sub" data-k="c${c.id}" ${isOpen(`c${c.id}`, true) ? 'open' : ''}>
              <summary><span class="row"><span class="chev"></span><b>${esc(c.title)}</b></span>
                <a class="btn small" href="#/lernen?scope=chapter:${c.id}">Kapitel lernen</a></summary>
              ${c.topics.map((t) => `
                <div class="topic">
                  <span><a href="#/thema/${t.id}">${esc(t.title)}</a>
                    <span class="muted small"> · S. ${t.page_from}${t.page_to !== t.page_from ? '–' + t.page_to : ''} · ${t.units} Fakten · ${t.items} Lerninhalte</span>
                    ${t.gen_status === 'fehler' ? '<span class="tag bad">Fehler</span>' : ''}
                    ${t.due ? `<span class="tag accent">${t.due} fällig</span>` : ''}
                    ${t.mistakes ? `<span class="tag bad">${t.mistakes} Fehler</span>` : ''}</span>
                  <span class="row" style="flex-wrap:nowrap"><span class="muted small">${pct(t.known, t.items)} %</span>
                    <a class="btn small" href="#/lernen?scope=topic:${t.id}">Nur dieses Thema</a></span>
                </div>`).join('')}
            </details>`).join('')}
        </details>`;

  // Fach-Block außerhalb von Ordnern (wie bisher)
  const subjectHtml = (s, docs) => `
    <details class="tree subj" style="--sc:${subjColor(s.name)}" data-k="s${s.id}" ${isOpen(`s${s.id}`, true) ? 'open' : ''}>
      <summary><span class="row"><span class="chev"></span>${ring({ ...sumStats(docs), name: s.name }, 40)}<b style="font-size:1.05rem">${esc(s.name)}</b></span>
        <span class="row" style="gap:12px">${examTag(s)}
          <button class="small ghost" data-share="subject:${s.id}" data-share-name="${esc(s.name)}" title="Ganzes Fach als Lernpaket teilen">${icon('share', 's')}</button>
          <button class="small" data-anki="subject:${s.id}" data-anki-name="${esc(s.name)}" title="Ganzes Fach als Anki-Stapel exportieren">${icon('archive', 's')} Anki</button>
          <a class="btn small primary" href="#/lernen?scope=subject:${s.id}">Alles aus diesem Fach lernen</a></span></summary>
      <div class="inner">
        ${examForm(s.id, s.exam)}
        ${docs.map((d) => docHtml(d, docs.length >= 3)).join('')}
      </div>
    </details>`;

  // Fach-Gruppe innerhalb eines Ordners
  const subjectInFolder = (f, s, docs) => `
    <details class="sub fsub" style="--sc:${subjColor(s.name)}" data-k="f${f.id}s${s.id}" ${isOpen(`f${f.id}s${s.id}`, true) ? 'open' : ''}>
      <summary><span class="row"><span class="chev"></span>${ring({ ...sumStats(docs), name: s.name }, 28, false)}<b>${esc(s.name)}</b><span class="muted small">${docs.length} Skript${docs.length === 1 ? '' : 'e'}</span>${examTag(s)}</span></summary>
      ${examForm(s.id, s.exam)}
      ${docs.map((d) => docHtml(d, docs.length >= 3)).join('')}
    </details>`;

  const folderHtml = (f) => {
    const groups = lib.map((s) => ({ s, docs: s.documents.filter((d) => d.folder_id === f.id) })).filter((g) => g.docs.length);
    const n = groups.reduce((a, g) => a + g.docs.length, 0);
    const ready = groups.some((g) => g.docs.some((d) => d.status === 'fertig'));
    return `
    <details class="tree folder" data-k="f${f.id}" ${isOpen(`f${f.id}`, true) ? 'open' : ''}>
      <summary data-drop="${f.id}"><span class="row"><span class="chev"></span>${n ? ring({ ...sumStats(groups.flatMap((g) => g.docs)), name: f.name }, 40) : icon('folder', 'fold-ic')}${n ? icon('folder', 'fold-ic') : ''}<b style="font-size:1.05rem">${esc(f.name)}</b>
          <span class="muted small">${n} Skript${n === 1 ? '' : 'e'}</span></span>
        <span class="row" style="gap:8px">
          <button class="small ghost" data-frename="${f.id}" title="Ordner umbenennen">${icon('edit', 's')}</button>
          <button class="small ghost danger" data-fdel="${f.id}" title="Ordner löschen (Skripte bleiben erhalten)">${icon('trash')}</button>
          ${ready ? `<button class="small ghost" data-share="folder:${f.id}" data-share-name="${esc(f.name)}" title="Ganzen Ordner als Lernpaket teilen">${icon('share', 's')}</button>
          <button class="small" data-anki="folder:${f.id}" data-anki-name="${esc(f.name)}" title="Ganzen Ordner als Anki-Stapel exportieren">${icon('archive', 's')} Anki</button>
          <a class="btn small primary" href="#/lernen?scope=folder:${f.id}">Ordner lernen</a>` : ''}</span></summary>
      <div class="inner">
        ${groups.length ? groups.map((g) => subjectInFolder(f, g.s, g.docs)).join('')
          : `<div class="drop-hint" data-drop="${f.id}">Noch leer. Zieh ein Skript hierher oder nutze ${icon('move', 's')} „Verschieben“ beim Skript. Beim Hochladen kannst du den Ordner auch direkt auswählen.</div>`}
      </div>
    </details>`;
  };

  const loose = lib.map((s) => ({ s, docs: s.documents.filter((d) => !d.folder_id) })).filter((g) => g.docs.length);
  return `
    ${folders.map(folderHtml).join('')}
    ${folders.length && loose.length ? `<div class="lib-sep" data-drop="">${icon('book', 's')} Ohne Ordner</div>` : ''}
    ${loose.map((g) => subjectHtml(g.s, g.docs)).join('')}
    ${folders.length && !loose.length ? `<div class="lib-sep drop-only" data-drop="">Hierher ziehen, um ein Skript aus dem Ordner zu nehmen</div>` : ''}`;
}

// ---------- Thema (Wissensbasis) ----------
async function viewTopic(id) {
  const t = await api(`/topics/${id}`);
  const counts = Object.fromEntries(t.counts.map((c) => [c.kind, c.n]));
  setView(`
  <div class="muted small"><a href="#/bibliothek">Bibliothek</a> › ${esc(t.doc)} › ${esc(t.chapter)}</div>
  <h1>${esc(t.title)}</h1>
  <div class="row" style="margin-bottom:16px">
    <a class="btn primary" href="#/lernen?scope=topic:${t.id}">${icon('play')} Thema lernen</a>
    <a class="btn" href="#/lernen?scope=topic:${t.id}&mode=flashcards">Nur Karten</a>
    <a class="btn" href="#/lernen?scope=topic:${t.id}&mode=mc">Nur MC</a>
    <a class="btn" href="#/lernen?scope=topic:${t.id}&mode=match">Nur Zuordnung</a>
    <a class="btn" href="#/tutor?topic=${t.id}">${icon('chat')} Tutor fragen</a>
    <a class="btn" href="/api/pdf/${t.doc_id}#page=${t.page_from}" target="_blank">${icon('external')} PDF, Seite ${t.page_from}</a>
  </div>
  <div class="grid stats" style="margin-bottom:16px">
    ${['flashcard', 'cloze', 'mc', 'case', 'match'].map((k) => `<div class="card stat"><div class="num">${counts[k] || 0}</div><div class="lbl">${KIND_LABEL[k]}</div></div>`).join('')}
  </div>
  ${t.suspended ? `<div class="card row between" style="margin-bottom:16px"><span class="muted">${t.suspended} ausgeblendete${t.suspended === 1 ? 'r' : ''} Lerninhalt${t.suspended === 1 ? '' : 'e'}</span><button class="small" id="unsusp">Wieder einblenden</button></div>` : ''}
  ${t.mistakes.length ? `<div class="card" style="margin-bottom:16px"><h3>Offene Fehler</h3><ul class="list">${t.mistakes.map((m) => `<li>${esc(m.description)}</li>`).join('')}</ul></div>` : ''}
  ${t.figures?.length ? `<div class="card" style="margin-bottom:16px">
    <div class="row between"><h2>Abbildungen (${t.figures.filter((f) => f.relevant).length} lernrelevant)</h2>
      ${t.figures.some((f) => !f.relevant) ? `<button class="small ghost" id="figall">Alle ${t.figures.length} anzeigen</button>` : ''}</div>
    <div class="fig-grid">${t.figures.map((f) => `<figure class="${f.relevant ? '' : 'irrelevant'}">${figImg(f.id)}
      <figcaption><b>${esc(f.title || f.caption || 'Abbildung')}</b> <span class="muted">S. ${f.page}${f.relevant ? ` · ${f.cards} Bildkarte${f.cards === 1 ? '' : 'n'}` : f.status === 'fertig' ? ' · nicht lernrelevant' : ' · wird ausgewertet'}</span>
        ${f.description ? `<div class="muted small" style="margin-top:4px">${esc(f.description)}</div>` : ''}
        ${f.status === 'fertig' ? `<button class="small ghost" data-figrel="${f.id}" data-v="${f.relevant ? 0 : 1}">${f.relevant ? 'Nicht abfragen' : 'Doch lernrelevant'}</button>` : ''}</figcaption></figure>`).join('')}</div></div>` : ''}
  <div class="card">
    <div class="row between"><h2>Wissensbasis (${t.units.length} Einheiten aus dem Skript)</h2>
      <button class="small" id="regen">Lernmaterial neu erstellen</button></div>
    ${t.units.map((u) => `<div class="unit"><span class="muted small">S. ${u.page}</span><span>${esc(u.content)} <span class="tag">${esc(u.kind)}</span></span></div>`).join('') || '<div class="muted">Keine Einheiten.</div>'}
  </div>`);
  const fa = document.getElementById('figall'); if (fa) fa.onclick = () => { $app.querySelectorAll('figure.irrelevant').forEach((f) => f.classList.add('show')); fa.remove(); };
  $app.querySelectorAll('[data-figrel]').forEach((b) => b.onclick = async () => {
    await api(`/figures/${b.dataset.figrel}/relevant`, { method: 'POST', body: { relevant: b.dataset.v === '1' } });
    toast(b.dataset.v === '1' ? 'Abbildung wird abgefragt' : 'Abbildung wird nicht mehr abgefragt'); route();
  });
  const us = document.getElementById('unsusp');
  if (us) us.onclick = async () => { const r = await api(`/topics/${id}/unsuspend`, { method: 'POST' }); toast(`${r.restored} wieder eingeblendet`); route(); };
  document.getElementById('regen').onclick = async (e) => {
    if (!confirm('Lernmaterial dieses Themas neu erstellen? Bisheriger Lernfortschritt für dieses Thema geht verloren.')) return;
    e.target.disabled = true; e.target.innerHTML = '<span class="spinner"></span> Wird erstellt …';
    try { const r = await api(`/topics/${id}/regenerate`, { method: 'POST' }); toast(`${r.items} Lerninhalte erstellt`); route(); }
    catch (err) { toast(err.message); e.target.disabled = false; }
  };
}

// ---------- Quelle anzeigen ----------
async function showSource(itemId) {
  const s = await api(`/items/${itemId}/source`);
  const terms = s.units.flatMap((u) => u.content.split(/[^\p{L}\p{N},.%≤≥<>-]+/u)).filter((w) => w.length > 5).slice(0, 40);
  const hl = (text) => {
    let h = esc(text);
    for (const w of [...new Set(terms)]) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'gu');
      h = h.replace(re, (m) => `<mark>${m}</mark>`);
    }
    return h;
  };
  modal(`
    <div class="row between"><h2>Quelle im Skript</h2><button class="ghost" data-close title="Schließen">${icon('x')}</button></div>
    <div class="small" style="margin-bottom:12px"><b>${esc(s.doc)}</b> · ${pagesLabel(s.pages)}<br>Kapitel: ${esc(s.chapter)} › ${esc(s.topic)}</div>
    <h3>Zugrundeliegende Wissenseinheiten</h3>
    ${s.units.map((u) => `<div class="unit"><span class="muted small">S. ${u.page}</span><span>${esc(u.content)}</span></div>`).join('') || '<div class="muted small">Keine direkte Zuordnung.</div>'}
    <div class="row" style="margin:14px 0">${(s.pages.length ? s.pages : [1]).map((p) => `<a class="btn small primary" target="_blank" href="/api/pdf/${s.docId}#page=${p}">PDF öffnen – Seite ${p}</a>`).join('')}</div>
    ${s.figures?.length ? `<h3>Abbildungen auf ${s.figures.length > 1 ? 'diesen Seiten' : 'dieser Seite'}</h3><div class="fig-grid">${s.figures.map((f) => `<figure>${figImg(f.id)}<figcaption>${esc(f.title || f.caption || '')} <span class="muted">S. ${f.page}</span></figcaption></figure>`).join('')}</div>` : ''}
    ${s.pageTexts.map((p) => `<h3>Seite ${p.page} (Textauszug)</h3><div class="pagetext">${hl(p.text)}</div>`).join('<br>')}`);
}

// ---------- Lernen ----------
// Eine Session bleibt (serverseitig gespeichert) erhalten, bis sie abgeschlossen wird –
// auch beim Wechsel in andere Bereiche oder nach einem Neustart der App.
const SCOPE_LABEL = { drill: 'Mini-Training', folder: 'Ordner', subject: 'Fach', document: 'Skript', chapter: 'Kapitel', topic: 'Thema' };
const MODE_LABEL = { mixed: 'Gemischt', flashcards: 'Karteikarten', mc: 'MC-Fragen', match: 'Zuordnung', mistakes: 'Fehler wiederholen' };
const sessionKey = (type, id, mode) => `${type}:${type === 'all' ? '' : id}:${mode}`;
function sessionHref(key) {
  const [type, id, mode] = key.split(':');
  return `#/lernen?scope=${type === 'all' ? 'all' : `${type}:${id}`}&mode=${mode}`;
}

async function viewLearn(params) {
  const [type, id] = (params.get('scope') || 'all').split(':');
  const mode = params.get('mode') || 'mixed';
  const key = sessionKey(type, id, mode);
  setView('<div class="empty"><span class="spinner"></span> Session wird geladen …</div>');

  let S = await api(`/saved-session?key=${encodeURIComponent(key)}`).catch(() => null);
  // alte 20er-Portion für ein ganzes Fach/Ordner, noch nichts beantwortet → durch die große Abfrage ersetzen
  if (S && (type === 'subject' || type === 'folder') && !S.full && !Object.keys(S.done || {}).length) S = null;
  const resumed = !!S;
  if (!S) {
    const items = await api('/session', { method: 'POST', body: { scope: { type, id }, mode } });
    if (!items.length) {
      setView(`<div class="card empty"><h2>Alles erledigt</h2><p>Hier ist gerade nichts fällig und es gibt keine neuen Lerninhalte${type !== 'all' ? ' in dieser Auswahl' : ''}.</p>
        <div class="row" style="justify-content:center"><a class="btn" href="#/">Zur Übersicht</a><a class="btn" href="#/bibliothek">Bibliothek</a>
        ${type !== 'all' ? `<a class="btn" href="#/lernen?scope=${type}:${id}&mode=mistakes">Fehler wiederholen</a>` : ''}</div></div>`);
      return;
    }
    const src = items[0].source;
    const drill = type === 'drill' ? await api(`/drills/${id}`).catch(() => null) : null;
    const name = { folder: src.folder, subject: src.subject, document: src.doc, chapter: src.chapter, topic: src.topic, drill: drill?.title || src.topic }[type];
    S = { items, i: 0, done: {}, pending: {}, full: type === 'subject' || type === 'folder', label: type === 'drill' ? `Mini-Training: ${name}` : `${(type === 'subject' || type === 'folder') && mode === 'mixed' ? 'Gesamtabfrage' : MODE_LABEL[mode]}${type !== 'all' ? `, ${SCOPE_LABEL[type]}: ${name}` : ''}`,
      ...(drill?.summary ? { brief: drill.summary } : {}) };
  }
  S.done = S.done || {}; S.pending = S.pending || {};
  const N = S.items.length;

  // Speichern (Reihenfolge der Schreibvorgänge bleibt erhalten)
  let saveChain = Promise.resolve();
  const save = () => {
    const data = { items: S.items, i: S.i, done: S.done, pending: S.pending, label: S.label, full: S.full, brief: S.brief };
    saveChain = saveChain.then(() => api('/saved-session', { method: 'PUT', body: { key, label: S.label, data } })).catch(() => {});
  };
  const discard = () => api(`/saved-session?key=${encodeURIComponent(key)}`, { method: 'DELETE' }).catch(() => {});
  if (!resumed) save();

  setView(`<div class="learn-wrap">
    <div class="progress-top"><a href="#/" class="btn small ghost" title="Pausieren – Fortschritt bleibt gespeichert">${icon('pause', 's')} Pause</a>
      <div class="bar"><div id="pbar" style="width:0%"></div></div><span id="pcount" class="muted small"></span></div>
    <div class="row between" style="margin:-8px 0 10px">
      <span class="muted small">${esc(S.label)}</span>
      <button class="small ghost" id="restart" title="Diese Session verwerfen und neu zusammenstellen">${icon('rotate', 's')} Neu starten</button></div>
    ${S.brief ? `<div class="drill-brief">${icon('flag', 's')}<div><b>Darum geht es</b><div>${esc(S.brief)}</div></div></div>` : ''}
    <div class="dots" id="dots"></div>
    <div id="stage"></div>
    <div class="learn-nav" id="nav">
      <button id="prev">${icon('left', 's')} Zurück</button>
      <span class="muted small" id="navinfo"></span>
      <button id="fwd">Weiter ${icon('right', 's')}</button></div></div>`);
  if (resumed) {
    const n = Object.keys(S.done).length;
    toast(`Angefangene Session fortgesetzt – ${n} von ${N} beantwortet`);
  }

  let keyHandler = null;
  let tok = 0; // verhindert, dass verspätete Antworten in eine neue Ansicht schreiben
  const onKey = (e) => {
    if (document.querySelector('.modal-bg') || ['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); return go(S.i - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); return go(S.i + 1); }
    if (keyHandler) keyHandler(e);
  };
  document.addEventListener('keydown', onKey);
  cleanup = () => document.removeEventListener('keydown', onKey);

  const stage = () => document.getElementById('stage');
  const answeredCount = () => S.items.filter((it) => S.done[it.id]).length;
  const firstOpen = (from = 0) => {
    for (let k = from; k < N; k++) if (!S.done[S.items[k].id]) return k;
    for (let k = 0; k < from; k++) if (!S.done[S.items[k].id]) return k;
    return -1;
  };
  function go(i) {
    if (S.finished) return;
    S.i = Math.max(0, Math.min(N, i));
    delete S.reviewAll;
    save(); render();
  }

  document.getElementById('prev').onclick = () => go(S.i - 1);
  document.getElementById('fwd').onclick = () => go(S.i + 1);
  document.getElementById('restart').onclick = async () => {
    if (!confirm('Diese Session verwerfen und eine neue zusammenstellen? (Bereits beantwortete Fragen bleiben im Lernfortschritt gespeichert.)')) return;
    await saveChain; await discard(); route();
  };

  // Antwort speichern → Spaced Repetition + Fehler + Session-Fortschritt
  async function answer(item, rating, extra = {}, v = {}) {
    keyHandler = null;
    try {
      await api('/review', { method: 'POST', body: { itemId: item.id, rating, ...extra } });
    } catch (e) { toast(e.message); return; }
    S.done[item.id] = { rating, correct: extra.correct ?? rating >= 3, v };
    delete S.pending[item.id];
    const idx = S.items.indexOf(item);
    // weiter zur nächsten noch offenen Frage (oder zum Abschluss)
    let nxt = idx + 1;
    while (nxt < N && S.done[S.items[nxt].id]) nxt++;
    go(nxt);
  }
  const setPending = (item, v) => { S.pending[item.id] = v; save(); };

  function sourceRow(item) {
    const s = item.source;
    const editable = ['flashcard', 'cloze', 'mc'].includes(item.kind) && !S.done[item.id];
    return `<div class="source-chip">${icon('file', 's')} ${esc(s.doc)}, ${pagesLabel(s.pages)} – ${esc(s.topic)}
      <button data-src>Quelle öffnen</button><button data-tutor>${icon('chat', 's')} Tutor</button>
      <span class="spacer"></span>
      ${editable ? `<button data-edit title="Inhalt korrigieren">${icon('edit', 's')} Bearbeiten</button>` : ''}
      ${S.done[item.id] ? '' : `<button data-susp title="Diesen Inhalt nicht mehr abfragen (in der Themenansicht wiederherstellbar)">${icon('hide', 's')} Ausblenden</button>`}</div>
      ${item.data.edited ? '<div class="muted small" style="margin-top:6px">Von dir bearbeitet</div>' : ''}`;
  }
  function bindCommon(item) {
    stage().querySelectorAll('[data-src]').forEach((b) => b.onclick = () => showSource(item.id));
    stage().querySelectorAll('[data-tutor]').forEach((b) => b.onclick = () => window.open(`#/tutor?item=${item.id}`, '_blank'));
    stage().querySelectorAll('[data-susp]').forEach((b) => b.onclick = async () => {
      if (!confirm('Diesen Lerninhalt ausblenden? Er wird nicht mehr abgefragt. (Wiederherstellen in der Themenansicht.)')) return;
      try { await api(`/items/${item.id}/suspend`, { method: 'POST', body: { suspended: true } }); } catch (e) { return toast(e.message); }
      S.done[item.id] = { suspended: true, correct: true, rating: 0 };
      delete S.pending[item.id];
      toast('Ausgeblendet');
      let nxt = S.items.indexOf(item) + 1;
      while (nxt < N && S.done[S.items[nxt].id]) nxt++;
      go(nxt);
    });
    stage().querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => editItem(item));
  }
  function editItem(item) {
    const dd = item.data;
    const fields = item.kind === 'flashcard'
      ? `<label>Frage</label><textarea id="e1" style="min-height:70px">${esc(dd.q)}</textarea><label style="margin-top:10px">Antwort</label><textarea id="e2">${esc(dd.a)}</textarea>`
      : item.kind === 'cloze'
        ? `<label>Text – Lücken mit {{doppelten geschweiften Klammern}} markieren</label><textarea id="e1">${esc(dd.text)}</textarea>`
        : `<label>Erklärung zur richtigen Antwort</label><textarea id="e1">${esc(dd.explanation || '')}</textarea>`;
    const m = modal(`<div class="row between"><h2>Lerninhalt bearbeiten</h2><button class="ghost" data-close title="Schließen">${icon('x')}</button></div>
      <div class="stack">${fields}</div>
      <div class="row" style="margin-top:14px"><button class="primary" id="esave">Speichern</button><button data-close>Abbrechen</button></div>`);
    m.querySelector('#esave').onclick = async () => {
      const v1 = m.querySelector('#e1').value, v2 = m.querySelector('#e2')?.value;
      const body = item.kind === 'flashcard' ? { q: v1, a: v2 } : item.kind === 'cloze' ? { text: v1 } : { explanation: v1 };
      try {
        const r = await api(`/items/${item.id}`, { method: 'PUT', body });
        item.data = r.data; m.remove(); save(); toast('Gespeichert'); render();
      } catch (e) { toast(e.message); }
    };
  }
  function renderSuspended(item) {
    stage().innerHTML = `<div class="qcard" style="--sc:${subjColor(item.source.subject)}">${head(item)}<div class="qtext muted">${esc(item.data.q || item.data.stem || item.data.title || item.data.text || '')}</div>
      <div class="done-note">Ausgeblendet – wird nicht mehr abgefragt.</div>
      <div class="row" style="margin-top:12px"><button id="unsus">Wieder einblenden</button></div></div>`;
    document.getElementById('unsus').onclick = async () => {
      await api(`/items/${item.id}/suspend`, { method: 'POST', body: { suspended: false } });
      delete S.done[item.id]; save(); render();
    };
  }
  const RATE_LBL = ['Nochmal', 'Schwer', 'Gut', 'Einfach'];
  async function rateButtons(item, { suggested } = {}) {
    let iv = ['', '', '', ''];
    try { iv = await api(`/items/${item.id}/intervals`); } catch {}
    return `<div class="rate">${RATE_LBL.map((l, k) => `<button class="r${k + 1}" data-rate="${k + 1}" ${suggested === k + 1 ? 'style="outline:2px solid currentColor"' : ''}>
      ${l}<small>${iv[k]} · <span class="kbd">${k + 1}</span></small></button>`).join('')}</div>`;
  }
  function bindRate(item, extraFn = () => ({}), v = {}) {
    const goRate = (r) => answer(item, r, extraFn(r), v);
    stage().querySelectorAll('[data-rate]').forEach((b) => b.onclick = () => goRate(Number(b.dataset.rate)));
    keyHandler = (e) => { if (['1', '2', '3', '4'].includes(e.key)) goRate(Number(e.key)); };
  }
  const doneNote = (d) => `<div class="done-note ${d.correct ? 'good' : 'bad'}">${icon(d.correct ? 'check' : 'x', 's')} Beantwortet – Bewertung: <b>${RATE_LBL[d.rating - 1]}</b>
    <span class="muted small">(zählt für die Wiederholung; zum Ändern die Frage später erneut lernen)</span></div>`;
  const head = (item) => `<div class="kind"><span class="subj-pill">${esc(item.source.subject)}</span>${item.data.fig ? 'Bildkarte' : KIND_LABEL[item.kind]} ${item.isNew ? '<span class="tag accent">neu</span>' : ''}
    ${item.lapses || item.wrong ? `<span class="tag bad">${item.wrong || item.lapses}× falsch</span>` : ''}
    ${item.data.type === 'klinisch' ? '<span class="tag">klinisch</span>' : ''}</div>`;
  const kiBox = (t) => (t ? `<div class="ai-box">${KI_LABEL} <span class="muted small">– nicht aus deinem Skript</span><div style="margin-top:4px">${esc(t)}</div></div>` : '');

  function renderChrome() {
    const n = answeredCount();
    document.getElementById('pbar').style.width = `${Math.round(100 * n / N)}%`;
    document.getElementById('pcount').textContent = `${n} / ${N} beantwortet`;
    const dot = (k) => {
      const it = S.items[k], d = S.done[it.id];
      const cls = d ? (d.suspended ? 'susp' : d.correct ? 'ok' : 'bad') : S.pending[it.id] ? 'pend' : '';
      return `<button class="dot ${cls} ${k === S.i ? 'cur' : ''}" data-go="${k}" title="Frage ${k + 1}${d ? ' (beantwortet)' : ''}">${k + 1}</button>`;
    };
    if (N <= 60) {
      document.getElementById('dots').innerHTML = S.items.map((_, k) => dot(k)).join('');
    } else {
      // große Abfrage: Ausschnitt um die aktuelle Frage + Zwischenstand + Sprung zu einer Nummer
      const cur = Math.min(S.i, N - 1), from = Math.max(0, Math.min(cur - 12, N - 25)), to = Math.min(N, from + 25);
      const vals = S.items.map((it) => S.done[it.id]).filter((d) => d && !d.suspended);
      const ok = vals.filter((d) => d.correct).length, bad = vals.length - ok;
      document.getElementById('dots').innerHTML = `
        <div class="big-tally">${ring({ total: N, known: ok, wrong: bad, name: 'Diese Abfrage' }, 40)}
          <span><span class="lg-dot ok"></span>${ok} richtig</span><span><span class="lg-dot bad"></span>${bad} falsch</span><span><span class="lg-dot open"></span>${N - vals.length} offen</span>
          <span class="grow"></span>
          ${firstOpen(0) >= 0 ? '<button class="small ghost" id="toFirstOpen">Zur nächsten offenen</button>' : ''}
          <form id="jump" class="row" style="gap:4px"><input name="n" type="number" min="1" max="${N}" placeholder="Nr." style="width:72px"><button class="small">Springen</button></form></div>
        <div class="dots-win">${from > 0 ? `${dot(0)}<span class="dots-gap">…</span>` : ''}${Array.from({ length: to - from }, (_, j) => dot(from + j)).join('')}${to < N ? `<span class="dots-gap">…</span>${dot(N - 1)}` : ''}</div>`;
      const jf = document.getElementById('jump');
      jf.onsubmit = (e) => { e.preventDefault(); const n = parseInt(jf.n.value); if (n >= 1 && n <= N) go(n - 1); };
      const fo = document.getElementById('toFirstOpen'); if (fo) fo.onclick = () => go(firstOpen(Math.min(S.i + 1, N - 1)));
    }
    document.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(Number(b.dataset.go)));
    const atEnd = S.i >= N;
    document.getElementById('nav').style.display = atEnd ? 'none' : '';
    document.getElementById('prev').disabled = S.i <= 0;
    document.getElementById('fwd').innerHTML = (S.i >= N - 1 ? 'Zum Abschluss ' : 'Weiter ') + icon('right', 's');
    document.getElementById('navinfo').textContent = atEnd ? '' : `Frage ${S.i + 1} von ${N}`;
  }

  function render() {
    tok++;
    keyHandler = null;
    renderChrome();
    if (S.i >= N) return finish();
    const item = S.items[S.i];
    const d = S.done[item.id] || null;
    const p = d ? null : S.pending[item.id] || null;
    if (d?.suspended) return renderSuspended(item, d);
    ({ flashcard: renderFlash, cloze: renderCloze, mc: renderMc, case: renderCase, match: renderMatch }[item.kind] || renderFlash)(item, d, p);
    window.scrollTo(0, 0);
  }

  function renderFlash(item, d) {
    stage().innerHTML = `<div class="qcard" style="--sc:${subjColor(item.source.subject)}">${head(item)}${item.data.fig ? figFront(item.data.fig) : ''}<div class="qtext">${esc(item.data.q)}</div>
      <div id="ans"></div>
      <div id="act" style="margin-top:20px"><button class="primary" id="show">Antwort zeigen <span class="kbd">Leertaste</span></button></div>
      ${sourceRow(item)}</div>`;
    bindCommon(item);
    const t = tok;
    const reveal = async () => {
      document.getElementById('ans').innerHTML = `<div class="answer">${esc(item.data.a)}</div>${item.data.fig ? figNote(item.data.fig) : ''}${figStrip(item)}`;
      if (d) { document.getElementById('act').innerHTML = doneNote(d); return; }
      const html = await rateButtons(item); if (t !== tok) return;
      document.getElementById('act').innerHTML = html;
      bindRate(item, (r) => ({ correct: r >= 2 }));
    };
    if (d) return reveal();
    document.getElementById('show').onclick = reveal;
    keyHandler = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); } };
  }

  function renderCloze(item, d) {
    const parts = item.data.text.split(/(\{\{.+?\}\})/);
    const show = (open) => parts.map((p) => /^\{\{.+\}\}$/.test(p)
      ? (open ? `<span class="cloze-gap">${esc(p.slice(2, -2))}</span>` : '<span class="cloze-hidden">…</span>') : esc(p)).join('');
    stage().innerHTML = `<div class="qcard" style="--sc:${subjColor(item.source.subject)}">${head(item)}<div class="qtext" id="cl">${show(false)}</div>
      <div id="act" style="margin-top:20px"><button class="primary" id="show">Lösung zeigen <span class="kbd">Leertaste</span></button></div>
      ${sourceRow(item)}</div>`;
    bindCommon(item);
    const t = tok;
    const reveal = async () => {
      document.getElementById('cl').innerHTML = show(true);
      document.getElementById('cl').insertAdjacentHTML('afterend', figStrip(item));
      if (d) { document.getElementById('act').innerHTML = doneNote(d); return; }
      const html = await rateButtons(item); if (t !== tok) return;
      document.getElementById('act').innerHTML = html;
      bindRate(item, (r) => ({ correct: r >= 2 }));
    };
    if (d) return reveal();
    document.getElementById('show').onclick = reveal;
    keyHandler = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); } };
  }

  function renderMc(item, d, p) {
    const q = item.data;
    const letters = 'ABCDEFG';
    stage().innerHTML = `<div class="qcard" style="--sc:${subjColor(item.source.subject)}">${head(item)}<div class="qtext">${esc(q.stem)}</div>
      <div class="options">${q.options.map((o, k) => `<button class="option" data-opt="${k}"><span class="key">${letters[k]}</span><span class="option-body">${esc(o)}<span class="why"></span></span></button>`).join('')}</div>
      <div id="res"></div>${sourceRow(item)}</div>`;
    bindCommon(item);
    const choose = (k) => {
      keyHandler = null;
      const ok = k === q.correct;
      stage().querySelectorAll('[data-opt]').forEach((b) => {
        const j = Number(b.dataset.opt);
        b.disabled = true; b.style.opacity = 1;
        if (j === q.correct) b.classList.add('correct');
        if (j === k && !ok) b.classList.add('wrong');
        const why = q.why_wrong?.[j];
        if (why && j !== q.correct) b.querySelector('.why').textContent = why;
      });
      const res = document.getElementById('res');
      res.innerHTML = `<div class="verdict ${ok ? 'good' : 'bad'}">${ok ? icon('check') + ' Richtig' : `${icon('x')} Falsch – richtig ist ${letters[q.correct]}`}</div>
        ${q.explanation ? `<div class="explain"><b>Erklärung:</b> ${esc(q.explanation)}</div>` : ''}${kiBox(q.ki)}${figStrip(item)}
        <div class="row" style="margin-top:18px" id="mcact">${d ? doneNote(d) : ok
          ? `<span class="muted small">Wie sicher warst du?</span>
             <button data-r="2">Geraten/unsicher <span class="kbd">1</span></button>
             <button class="primary" data-r="3">Sicher <span class="kbd">2</span></button>
             <button data-r="4">Sehr leicht <span class="kbd">3</span></button>`
          : `<button class="primary" data-r="1">Weiter <span class="kbd">Enter</span></button>`}</div>`;
      if (d) return;
      if (!p) setPending(item, { k });
      const mistake = ok ? null : `${q.stem.slice(0, 140)}${q.stem.length > 140 ? '…' : ''} — gewählt: „${q.options[k]}“, richtig: „${q.options[q.correct]}“`;
      const goR = (r) => answer(item, r, { correct: ok, answer: q.options[k], mistake }, { k });
      res.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => goR(Number(b.dataset.r)));
      keyHandler = (e) => {
        if (!ok && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goR(1); }
        if (ok && ['1', '2', '3'].includes(e.key)) goR(Number(e.key) + 1);
      };
    };
    const prev = d?.v?.k ?? p?.k;
    if (prev != null) return choose(prev);
    if (d) { // alte Daten ohne gespeicherte Wahl: nur Lösung zeigen
      stage().querySelectorAll('[data-opt]').forEach((b) => { b.disabled = true; if (Number(b.dataset.opt) === q.correct) b.classList.add('correct'); });
      document.getElementById('res').innerHTML = doneNote(d);
      return;
    }
    stage().querySelectorAll('[data-opt]').forEach((b) => b.onclick = () => choose(Number(b.dataset.opt)));
    keyHandler = (e) => {
      const k = letters.indexOf(e.key.toUpperCase());
      const n = ['1', '2', '3', '4', '5'].indexOf(e.key);
      const idx = k >= 0 && k < q.options.length ? k : n >= 0 && n < q.options.length ? n : -1;
      if (idx >= 0) choose(idx);
    };
  }

  function renderCase(item, d, p) {
    const q = item.data;
    const prevUa = d?.v?.ua ?? p?.ua ?? '';
    stage().innerHTML = `<div class="qcard" style="--sc:${subjColor(item.source.subject)}">${head(item)}<div class="qtext" style="font-size:1.05rem;font-weight:400">${esc(q.vignette)}</div>
      <div class="qtext" style="margin-top:14px">${esc(q.q)}</div>
      <div style="margin-top:14px"><textarea id="ua" placeholder="Deine Antwort (optional) …" style="min-height:80px">${esc(prevUa)}</textarea></div>
      <div id="act" style="margin-top:14px"><button class="primary" id="show">Lösung zeigen</button></div>${sourceRow(item)}</div>`;
    bindCommon(item);
    const uaEl = document.getElementById('ua');
    if (!d) uaEl.addEventListener('change', () => setPending(item, { ...(S.pending[item.id] || {}), ua: uaEl.value }));
    const t = tok;
    const reveal = async () => {
      const ua = uaEl.value;
      const sol = `<div class="answer"><b>Lösung:</b> ${esc(q.answer)}</div>${figStrip(item)}
        ${q.explanation ? `<div class="explain">${esc(q.explanation)}</div>` : ''}${kiBox(q.ki)}`;
      if (d) { uaEl.readOnly = true; document.getElementById('act').innerHTML = sol + doneNote(d); return; }
      setPending(item, { ua, shown: true });
      const html = await rateButtons(item); if (t !== tok) return;
      document.getElementById('act').innerHTML = `${sol}<div class="muted small" style="margin-top:14px">Selbsteinschätzung:</div>${html}`;
      bindRate(item, (r) => ({ correct: r >= 2, answer: ua, mistake: r === 1 ? `Fall nicht gelöst (richtig: ${q.answer})${ua ? ` – eigene Antwort: ${ua}` : ''}` : null }), { ua });
    };
    if (d || p?.shown) return reveal();
    document.getElementById('show').onclick = reveal;
  }

  // Zuordnung (Drag & Drop): Begriffe rechts auf passende Felder links ziehen – alternativ antippen & ablegen
  function renderMatch(item, d, p) {
    const q = item.data;
    const n = q.pairs.length;
    const st = d?.v || p || {};
    // Reihenfolge der Begriffe im Ablagestapel einmal mischen und merken
    const order = Array.isArray(st.order) && st.order.length === n ? st.order : shuffleIdx(n);
    const place = Array.isArray(st.place) && st.place.length === n ? [...st.place] : Array(n).fill(null); // Feld i → Begriff j
    let checked = !!d || !!st.checked;
    let selected = null; // angetippter Begriff (Alternative zu Drag & Drop)

    stage().innerHTML = `<div class="qcard" style="--sc:${subjColor(item.source.subject)}">${head(item)}<div class="qtext">${esc(q.title)}</div>
      <div class="muted small" id="mhint" style="margin-top:4px">Ziehe jeden Begriff auf das passende Feld – oder tippe erst den Begriff, dann das Feld an.</div>
      <div class="match">
        <div class="match-rows" id="mrows"></div>
        <div class="mpool" id="mpool" data-pool></div>
      </div>
      <div id="act" style="margin-top:16px"></div>${sourceRow(item)}</div>`;
    bindCommon(item);

    const chip = (j, where) => `<div class="chip${selected === j ? ' sel' : ''}" ${checked ? '' : 'draggable="true"'} data-chip="${j}" data-from="${where}">${esc(q.pairs[j].r)}</div>`;
    const persist = () => { if (!d) setPending(item, { order, place, checked }); };

    function draw() {
      document.getElementById('mrows').innerHTML = q.pairs.map((pr, i) => {
        const j = place[i];
        const cls = checked ? (j === i ? 'ok' : 'bad') : j != null ? 'filled' : '';
        return `<div class="mrow"><div class="mleft">${esc(pr.l)}</div>
          <div class="mslot ${cls}" data-slot="${i}">${j != null ? chip(j, i) : '<span class="muted small">hierher ziehen</span>'}
          ${checked && j !== i ? `<div class="mfix">richtig: ${esc(pr.r)}</div>` : ''}</div></div>`;
      }).join('');
      const free = order.filter((j) => !place.includes(j));
      document.getElementById('mpool').innerHTML = checked ? '' : free.map((j) => chip(j, 'pool')).join('') || '<span class="muted small">Alle Begriffe zugeordnet</span>';
      document.getElementById('mpool').style.display = checked ? 'none' : '';
      document.getElementById('mhint').style.display = checked ? 'none' : '';
      if (!checked) bindDnD();
      drawAct();
    }

    // Begriff j auf Feld i legen (i = null → zurück in den Stapel); ein dort liegender Begriff tauscht den Platz
    function put(j, i) {
      const from = place.indexOf(j);
      if (i == null) { if (from >= 0) place[from] = null; }
      else {
        const prev = place[i];
        if (from >= 0) place[from] = prev ?? null; // Tausch zwischen zwei Feldern
        place[i] = j;
      }
      selected = null; persist(); draw();
    }

    function bindDnD() {
      const root = stage();
      root.querySelectorAll('[data-chip]').forEach((el) => {
        el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', el.dataset.chip); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));
        el.addEventListener('click', (e) => { e.stopPropagation(); const j = Number(el.dataset.chip); selected = selected === j ? null : j; draw(); });
      });
      root.querySelectorAll('[data-slot], [data-pool]').forEach((zone) => {
        const target = zone.dataset.slot != null ? Number(zone.dataset.slot) : null;
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('over'));
        zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); const j = Number(e.dataTransfer.getData('text/plain')); if (!Number.isNaN(j)) put(j, target); });
        zone.addEventListener('click', () => { if (selected != null) put(selected, target); });
      });
    }

    async function drawAct() {
      const act = document.getElementById('act');
      if (!checked) {
        const full = place.every((x) => x != null);
        act.innerHTML = `<div class="row"><button class="primary" id="mcheck" ${full ? '' : 'disabled'}>Prüfen <span class="kbd">Enter</span></button>
          <button class="ghost small" id="mreset">Zurücksetzen</button></div>`;
        document.getElementById('mcheck').onclick = check;
        document.getElementById('mreset').onclick = () => { place.fill(null); selected = null; persist(); draw(); };
        keyHandler = (e) => { if (e.key === 'Enter' && full) check(); };
        return;
      }
      const wrong = q.pairs.map((_, i) => i).filter((i) => place[i] !== i);
      const verdict = `<div class="verdict ${wrong.length ? 'bad' : 'good'}">${wrong.length ? `${icon('x')} ${n - wrong.length} von ${n} richtig zugeordnet` : `${icon('check')} Alle ${n} richtig zugeordnet`}</div>${figStrip(item)}`;
      if (d) { act.innerHTML = verdict + doneNote(d); return; }
      const mistake = wrong.length ? `${q.title}: ` + wrong.map((i) => `${q.pairs[i].l} → „${place[i] != null ? q.pairs[place[i]].r : '–'}“ (richtig: „${q.pairs[i].r}“)`).join('; ') : null;
      const v = { order, place };
      const goR = (r) => answer(item, r, { correct: r >= 2, answer: JSON.stringify(place), mistake: r >= 2 ? null : mistake }, v);
      // Bewertung: alles richtig → Sicherheit wählen; 1 Fehler bei ≥4 Paaren → „Schwer“; sonst „Nochmal“
      const auto = wrong.length === 0 ? null : wrong.length === 1 && n >= 4 ? 2 : 1;
      act.innerHTML = `${verdict}<div class="row" style="margin-top:14px">${auto == null
        ? `<span class="muted small">Wie sicher warst du?</span>
           <button data-r="2">Geraten/unsicher <span class="kbd">1</span></button>
           <button class="primary" data-r="3">Sicher <span class="kbd">2</span></button>
           <button data-r="4">Sehr leicht <span class="kbd">3</span></button>`
        : `<button class="primary" data-r="${auto}">Weiter <span class="kbd">Enter</span></button>`}</div>`;
      act.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => goR(Number(b.dataset.r)));
      keyHandler = (e) => {
        if (auto != null && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goR(auto); }
        if (auto == null && ['1', '2', '3'].includes(e.key)) goR(Number(e.key) + 1);
      };
    }

    function check() { if (!place.every((x) => x != null)) return; checked = true; selected = null; persist(); draw(); }
    draw();
  }

  function finish() {
    keyHandler = null;
    const open = S.items.filter((it) => !S.done[it.id]).length;
    if (open && !S.reviewAll) {
      stage().innerHTML = `<div class="qcard" style="text-align:center">
        <h2>Noch ${open} ${open === 1 ? 'Frage' : 'Fragen'} offen</h2>
        <p class="muted">Du hast ${N - open} von ${N} beantwortet. Die Session bleibt gespeichert, bis du sie abschließt.</p>
        <div class="row" style="justify-content:center;margin-top:16px">
          <button class="primary" id="toOpen">Zur ersten offenen Frage</button>
          <button id="endNow">Session jetzt beenden</button></div></div>`;
      document.getElementById('toOpen').onclick = () => go(firstOpen(0));
      document.getElementById('endNow').onclick = () => { S.reviewAll = true; render(); };
      keyHandler = (e) => { if (e.key === 'Enter') go(firstOpen(0)); };
      return;
    }
    // Abschluss: gespeicherte Session löschen
    S.finished = true;
    { const r = S.items.filter((it) => S.done[it.id] && !S.done[it.id].suspended); const okN = r.filter((it) => S.done[it.id].correct).length;
      if (r.length >= 5 && okN / r.length >= 0.6) setTimeout(confetti, 150); }
    saveChain.then(discard);
    const res = S.items.filter((it) => S.done[it.id] && !S.done[it.id].suspended).map((it) => ({ item: it, ...S.done[it.id] }));
    const n = res.length, ok = res.filter((r) => r.correct).length;
    const wrong = res.filter((r) => !r.correct);
    document.getElementById('dots').innerHTML = '';
    stage().innerHTML = `<div class="qcard" style="text-align:center">
      <h2>Session abgeschlossen</h2>
      <div class="grid stats" style="margin:18px 0">
        <div class="card stat"><div class="num">${n}</div><div class="lbl">bearbeitet</div></div>
        <div class="card stat"><div class="num">${n ? Math.round(100 * ok / n) : 0} %</div><div class="lbl">richtig</div></div>
        <div class="card stat"><div class="num">${wrong.length}</div><div class="lbl">Fehler gespeichert</div></div>
      </div>
      ${wrong.length ? `<div style="text-align:left"><h3>Falsch beantwortet</h3><ul class="list">${wrong.slice(0, 60).map((r) => `<li>${esc(r.item.data.q || r.item.data.stem || r.item.data.text || '').slice(0, 160)} <span class="muted small">· ${esc(r.item.source.topic)}</span></li>`).join('')}</ul>${wrong.length > 60 ? `<div class="muted small">… und ${wrong.length - 60} weitere – alle unter „Fehler“.</div>` : ''}</div>` : ''}
      <div class="row" style="justify-content:center;margin-top:16px">
        <a class="btn primary" href="#" id="again">Neue Session</a>
        <a class="btn" href="#/">Zur Übersicht</a></div></div>`;
    document.getElementById('again').onclick = async (e) => { e.preventDefault(); await saveChain; await discard(); route(); };
  }
  render();
}

// ---------- Suche ----------
async function viewSearch(term) {
  setView(`<h1>Suche</h1>
    <form id="sf" class="row" style="margin-bottom:20px"><input name="q" value="${esc(term)}" placeholder="z. B. N. medianus, NT-proBNP, Spironolacton …" style="flex:1" autofocus><button class="primary">Suchen</button></form>
    <div id="sr"></div>`);
  document.getElementById('sf').onsubmit = (e) => { e.preventDefault(); location.hash = `#/suche?q=${encodeURIComponent(e.target.q.value)}`; };
  if (!term) return;
  const r = await api(`/search?q=${encodeURIComponent(term)}`);
  const hl = (s) => esc(s).replace(/«/g, '<mark>').replace(/»/g, '</mark>');
  document.getElementById('sr').innerHTML = `
    <div class="grid cols-2">
      <div class="card"><h3>Wissensbasis (${r.units.length})</h3>
        ${r.units.length ? `<ul class="list">${r.units.map((u) => `<li>${esc(u.content)}<div class="muted small"><a href="#/thema/${u.topicId}">${esc(u.topic)}</a> · ${esc(u.doc)} · <a target="_blank" href="/api/pdf/${u.docId}#page=${u.page}">S. ${u.page}</a></div></li>`).join('')}</ul>` : '<div class="muted small">Keine Treffer.</div>'}
      </div>
      <div class="card"><h3>Skriptseiten (${r.pages.length})</h3>
        ${r.pages.length ? `<ul class="list">${r.pages.map((p) => `<li><a target="_blank" href="/api/pdf/${p.docId}#page=${p.page}"><b>${esc(p.doc)} – S. ${p.page}</b></a><div class="small">${hl(p.snippet)}</div></li>`).join('')}</ul>` : '<div class="muted small">Keine Treffer.</div>'}
      </div>
    </div>`;
}

// ---------- KI-Tutor ----------
const tutorState = { history: [], focusKey: '' };
async function viewTutor(params) {
  const focus = params.get('item') ? { itemId: Number(params.get('item')) } : params.get('topic') ? { topicId: Number(params.get('topic')) } : null;
  const key = JSON.stringify(focus);
  if (key !== tutorState.focusKey) { tutorState.history = []; tutorState.focusKey = key; }
  let focusLabel = '';
  if (focus?.topicId) { try { focusLabel = 'Thema: ' + (await api(`/topics/${focus.topicId}`)).title; } catch {} }
  if (focus?.itemId) { try { const s = await api(`/items/${focus.itemId}/source`); focusLabel = `Lerninhalt aus: ${s.topic}`; } catch {} }
  await loadAi();
  if (!AI_ON) { setView(`<h1>Tutor</h1>${noAiBox('Der KI-Tutor')}`); return; }
  let web = true; try { web = localStorage.getItem('tutorWeb') !== '0'; } catch {}
  setView(`<h1>Tutor</h1>
    <div class="row between" style="margin:-6px 0 16px;align-items:flex-start">
      <div class="muted small" style="max-width:560px">${focusLabel ? `<b>${esc(focusLabel)}</b><br>` : ''}<span id="tmode"></span></div>
      <label class="switch"><input type="checkbox" id="webt" ${web ? 'checked' : ''}><span>Online-Recherche</span></label>
    </div>
    <div class="chat" id="chat"></div>
    <form id="tf" class="row" style="align-items:flex-end">
      <textarea name="m" placeholder="z. B. „Erkläre mir die Pathophysiologie“, „Prüfe mich zu diesem Thema“, „Warum ist Antwort B falsch?“" style="min-height:70px;flex:1"></textarea>
      <button class="primary">Senden</button></form>
    <div class="row small" style="margin-top:8px">${['Erkläre mir die Pathophysiologie.', 'Prüfe mich zu diesem Thema.', 'Gib mir einen schwierigeren Fall.', focus?.itemId ? 'Erkläre mir diese Frage und warum die anderen Antworten falsch sind.' : ''].filter(Boolean)
      .map((s) => `<button class="small" data-sugg="${esc(s)}">${esc(s)}</button>`).join('')}
      ${tutorState.history.length ? '<button class="small ghost" id="clear">Verlauf leeren</button>' : ''}</div>`);
  const chat = document.getElementById('chat');
  const modeText = () => { document.getElementById('tmode').textContent = web
    ? 'Eine Antwort auf Basis aktueller Leitlinien und Fachliteratur, mit Quellen. Weicht dein Skript ab, steht das direkt dabei.'
    : 'Antwortet nur auf Basis deines Skripts (mit Seitenangabe). Schneller, aber ohne Online-Quellen.'; };
  modeText();
  document.getElementById('webt').onchange = (e) => { web = e.target.checked; try { localStorage.setItem('tutorWeb', web ? '1' : '0'); } catch {} modeText(); };
  const draw = () => {
    chat.innerHTML = tutorState.history.map((m) => `<div class="msg ${m.role === 'user' ? 'user' : 'bot'}">${m.role === 'user' ? esc(m.content) : md(m.content)}</div>`).join('')
      || '<div class="muted small">Stell eine Frage zu deinem Lernstoff.</div>';
  };
  draw();
  const send = async (text) => {
    if (!text.trim()) return;
    const history = tutorState.history.slice();
    tutorState.history.push({ role: 'user', content: text });
    draw();
    chat.insertAdjacentHTML('beforeend', `<div class="msg bot" id="typing"><span class="spinner"></span> ${web ? 'Recherchiert in Leitlinien und Fachliteratur … (meist 20–60 Sekunden)' : 'Denkt nach …'}</div>`);
    try {
      const r = await api('/tutor', { method: 'POST', body: { message: text, history, focus, web } });
      tutorState.history.push({ role: 'assistant', content: r.reply });
    } catch (e) { tutorState.history.push({ role: 'assistant', content: 'Fehler: ' + e.message }); }
    if (document.getElementById('chat')) { draw(); window.scrollTo(0, document.body.scrollHeight); }
  };
  const form = document.getElementById('tf');
  form.onsubmit = (e) => { e.preventDefault(); const t = form.m.value; form.m.value = ''; send(t); };
  form.m.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  $app.querySelectorAll('[data-sugg]').forEach((b) => b.onclick = () => send(b.dataset.sugg));
  const c = document.getElementById('clear'); if (c) c.onclick = () => { tutorState.history = []; route(); };
}

// ---------- Fehler ----------
async function viewMistakes() {
  const list = await api('/mistakes');
  const byTopic = {};
  for (const m of list) (byTopic[m.topic_id] ||= { title: m.topic, subject: m.subject, chapter: m.chapter, items: [] }).items.push(m);
  setView(`<div class="row between"><h1>Meine Fehler</h1>${list.length ? '<a class="btn primary" href="#/lernen?mode=mistakes">Alle Fehler wiederholen</a>' : ''}</div>
    <div class="muted small" style="margin:-8px 0 16px">Fehler verschwinden automatisch, sobald du den Inhalt später richtig beantwortest. Fehlerhafte Inhalte werden in Sessions bevorzugt.</div>
    ${!list.length ? '<div class="card empty">Keine offenen Fehler. Falsch beantwortete Inhalte erscheinen hier automatisch.</div>' : Object.entries(byTopic).map(([tid, t]) => `
      <div class="card" style="margin-bottom:12px">
        <div class="row between"><div><b>${esc(t.title)}</b> <span class="muted small">· ${esc(t.subject)} › ${esc(t.chapter)}</span></div>
          <a class="btn small" href="#/lernen?scope=topic:${tid}&mode=mistakes">Wiederholen</a></div>
        <ul class="list">${t.items.map((m) => `<li class="row between" style="flex-wrap:nowrap">
          <span>${esc(m.description)}${m.user_answer && m.kind !== 'match' ? `<div class="muted small">Deine Antwort: ${esc(m.user_answer).slice(0, 200)}</div>` : ''}
            <div class="muted small">${new Date(m.ts + 'Z').toLocaleString('de-AT')}${m.item_id ? ` · <a href="#" data-src="${m.item_id}">Quelle</a>` : ''}</div></span>
          <button class="small ghost" data-res="${m.id}" title="Als erledigt markieren">${icon('check')}</button></li>`).join('')}</ul>
      </div>`).join('')}`);
  $app.querySelectorAll('[data-res]').forEach((b) => b.onclick = async () => { await api(`/mistakes/${b.dataset.res}/resolve`, { method: 'POST' }); route(); });
  $app.querySelectorAll('[data-src]').forEach((a) => a.onclick = (e) => { e.preventDefault(); showSource(a.dataset.src); });
}

// ---------- Einstellungen ----------
async function viewSettings() {
  const s = await api('/settings');
  const prof = await api('/profile').catch(() => ({ name: '', goal: 50 }));
  setView(`<h1>Einstellungen</h1>
  <div class="card stack" style="margin-bottom:16px">
    <h2>Du</h2>
    <form id="profForm" class="grid" style="grid-template-columns:1fr 160px auto;align-items:end">
      <div><label>Vorname (für die Begrüßung)</label><input name="name" value="${esc(prof.name)}" placeholder="optional" maxlength="40"></div>
      <div><label>Tagesziel (Antworten)</label><input name="goal" type="number" min="5" max="1000" step="5" value="${prof.goal}"></div>
      <button class="primary">Speichern</button>
    </form>
  </div>
  <div class="card stack">
    <div><label>KI-Anbindung</label>
      <select id="provider">
        <option value="claude-cli">Claude Code (über dein Claude-Abo – keine Zusatzkosten) – empfohlen</option>
        <option value="api">Anthropic API-Key (wird pro Nutzung separat abgerechnet)</option>
        <option value="offline">Ohne KI (kein Claude-Abo) – Lernen & Lernpakete ja, eigene Skripte & Tutor nein</option>
      </select></div>
    <div id="cli-box"><label>Pfad zum Claude-Code-Befehl</label><input id="claudePath" value="${esc(s.claudePath)}">
      <div class="muted small">Normalerweise einfach <code>claude</code>. Voraussetzung: Claude Code ist installiert und du bist mit deinem Abo eingeloggt (einmalig <code>claude</code> im Terminal starten).</div></div>
    <div id="api-box"><label>API-Key</label><input id="apiKey" value="${esc(s.apiKey)}" placeholder="sk-ant-…"></div>
    <div class="grid" style="grid-template-columns:1fr 1fr 1fr">
      <div><label>Modell für Skript-Verarbeitung</label><select id="model">${['sonnet', 'opus', 'haiku'].map((m) => `<option ${s.model === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div><label>Modell für Bewertung & Tutor</label><select id="fastModel">${['sonnet', 'haiku', 'opus'].map((m) => `<option ${s.fastModel === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div><label>Parallele KI-Aufrufe</label><select id="concurrency">${[1, 2, 3, 4].map((n) => `<option ${Number(s.concurrency) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="muted small">Tipp: „sonnet“ ist der beste Kompromiss aus Qualität und Verbrauch deines Abo-Kontingents. „opus“ liefert die gründlichste Extraktion, verbraucht aber dein Nutzungslimit schneller.</div>
    <div class="row"><button class="primary" id="save">Speichern</button><button id="test">Verbindung testen</button><span id="tres" class="small"></span></div>
  </div>
  <div class="card stack" style="margin-top:16px">
    <h2>App</h2>
    <div class="row between"><span>MedLearn <b id="ver">…</b></span>
      <span class="row"><button id="upd">${icon('rotate', 's')} Nach Updates suchen</button><button class="ghost danger" id="quit" title="Server beenden – beim nächsten Öffnen über das MedLearn-Symbol startet er wieder">Beenden</button></span></div>
    <div id="updres" class="small muted"></div>
  </div>
  <div class="card stack" style="margin-top:16px">
    <h2>Datensicherung</h2>
    <div class="muted small">MedLearn legt beim Start automatisch einmal täglich eine Sicherung deiner Datenbank an (die letzten 10 werden behalten).
      Für eine echte Sicherung den Ordner <code>backups</code> ab und zu auf einen USB-Stick oder eine externe Festplatte kopieren.</div>
    <div class="row"><button id="bnow">Jetzt sichern</button></div>
    <div id="blist" class="small"></div>
  </div>`);
  const loadBackups = async () => {
    const b = await api('/backups');
    document.getElementById('blist').innerHTML = `<div class="muted">Speicherort: <code>${esc(b.dir)}</code></div>` + (b.list.length
      ? `<ul class="list">${b.list.map((x) => `<li>${esc(x.name)} <span class="muted">· ${(x.size / 1048576).toFixed(1)} MB</span></li>`).join('')}</ul>`
      : '<div class="muted">Noch keine Sicherung.</div>');
  };
  loadBackups();
  document.getElementById('profForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/profile', { method: 'POST', body: { name: e.target.name.value, goal: e.target.goal.value } }); toast('Gespeichert'); }
    catch (err) { toast(err.message); }
  };
  api('/version').then((v) => { document.getElementById('ver').textContent = `Version ${v.version}`; }).catch(() => {});
  document.getElementById('upd').onclick = async (e) => {
    const out = document.getElementById('updres'); e.target.disabled = true; out.innerHTML = '<span class="spinner"></span> Suche …';
    try {
      const u = await api('/update/check');
      if (!u.configured) out.textContent = 'Für diese Installation ist keine Update-Quelle eingerichtet. Neue Versionen bekommst du dann als ZIP – einfach den Installer erneut starten, deine Daten bleiben erhalten.';
      else if (!u.available) out.innerHTML = `<span style="color:var(--good)">${icon('check', 's')} Du hast die neueste Version (${esc(u.current)}).</span>`;
      else {
        out.innerHTML = `Neue Version <b>${esc(u.latest)}</b> verfügbar${u.notes ? `: ${esc(u.notes)}` : ''}. <button class="small primary" id="doUpd">Jetzt aktualisieren</button>`;
        document.getElementById('doUpd').onclick = async (ev) => {
          ev.target.disabled = true; out.innerHTML = '<span class="spinner"></span> Update wird geladen und installiert – die App startet danach neu …';
          try {
            const r = await api('/update/apply', { method: 'POST' });
            for (let i = 0; i < 60; i++) {   // warten, bis der neue Server antwortet
              await new Promise((res) => setTimeout(res, 1000));
              const v = await api('/version').catch(() => null);
              if (v && v.version === r.version) { location.reload(); return; }
            }
            out.textContent = 'Update installiert. Bitte MedLearn neu öffnen.';
          } catch (err) { out.textContent = err.message; }
        };
      }
    } catch (err) { out.textContent = err.message; }
    e.target.disabled = false;
  };
  document.getElementById('quit').onclick = async () => {
    if (!confirm('MedLearn beenden? Öffne es später einfach wieder über das MedLearn-Symbol.')) return;
    await api('/shutdown', { method: 'POST' }).catch(() => {});
    document.body.innerHTML = '<div style="font-family:system-ui;padding:3rem;text-align:center"><h2>MedLearn wurde beendet</h2><p>Du kannst dieses Fenster schließen.</p></div>';
  };
  document.getElementById('bnow').onclick = async (e) => {
    e.target.disabled = true;
    try { const r = await api('/backups', { method: 'POST' }); toast(`Gesichert: ${r.name}`); await loadBackups(); }
    catch (err) { toast(err.message); }
    e.target.disabled = false;
  };
  const prov = document.getElementById('provider'); prov.value = s.provider;
  const toggle = () => {
    document.getElementById('cli-box').style.display = prov.value === 'claude-cli' ? '' : 'none';
    document.getElementById('api-box').style.display = prov.value === 'api' ? '' : 'none';
  };
  prov.onchange = toggle; toggle();
  const save = () => api('/settings', { method: 'POST', body: {
    provider: prov.value, claudePath: document.getElementById('claudePath').value.trim() || 'claude',
    apiKey: document.getElementById('apiKey').value.trim(), model: document.getElementById('model').value,
    fastModel: document.getElementById('fastModel').value, concurrency: Number(document.getElementById('concurrency').value) } });
  document.getElementById('save').onclick = async () => { await save(); await loadAi(); toast('Gespeichert'); };
  document.getElementById('test').onclick = async () => {
    const out = document.getElementById('tres'); out.innerHTML = '<span class="spinner"></span> teste …';
    try { await save(); const r = await api('/settings/test', { method: 'POST' }); out.innerHTML = `<span style="color:var(--good)">${icon('check', 's')} Verbindung ok (${(r.ms / 1000).toFixed(1)} s)</span>`; }
    catch (e) { out.innerHTML = `<span style="color:var(--bad)">${icon('x', 's')} ${esc(e.message)}</span>`; }
  };
}

// ---------- Abbildungen ----------
const figImg = (id, cls = '') => `<img class="fig-img ${cls}" src="/api/figures/${id}/img" alt="Abbildung aus dem Skript" loading="lazy" data-zoom="${id}">`;
const figFront = (id) => `<div class="fig-front">${figImg(id)}</div>`;
// Rückseite einer Bildkarte: Titel + Beschreibung der Abbildung (wird nachgeladen)
function figNote(id) {
  const el = `fignote-${id}-${Math.random().toString(36).slice(2, 7)}`;
  api(`/figures/${id}`).then((f) => {
    const n = document.getElementById(el); if (!n) return;
    n.innerHTML = `<b>${esc(f.title || 'Abbildung')}</b>${f.description ? ` – ${esc(f.description)}` : ''}${f.caption ? `<div class="muted small" style="margin-top:4px">Bildunterschrift im Skript: ${esc(f.caption)}</div>` : ''}`;
  }).catch(() => {});
  return `<div class="fig-note" id="${el}"></div>`;
}
// Passende Abbildungen auf der Rückseite von Textkarten
function figStrip(item) {
  const ids = item.data.figs || [];
  if (!ids.length) return '';
  return `<div class="fig-strip"><div class="muted small">Abbildung aus dem Skript – zum Vergrößern anklicken</div>${ids.map((id) => figImg(id)).join('')}</div>`;
}
document.addEventListener('click', async (e) => {
  const img = e.target.closest('[data-zoom]'); if (!img) return;
  e.preventDefault();
  const m = modal(`<div class="row between"><h2 id="zt">Abbildung</h2><button class="ghost" data-close title="Schließen">${icon('x')}</button></div>
    <img class="fig-zoom" src="/api/figures/${img.dataset.zoom}/img" alt=""><div id="zd" class="small" style="margin-top:10px"></div>`);
  m.classList.add('zoom-bg');
  try {
    const f = await api(`/figures/${img.dataset.zoom}`);
    m.querySelector('#zt').textContent = f.title || f.caption || 'Abbildung';
    m.querySelector('#zd').innerHTML = `${f.description ? `<p>${esc(f.description)}</p>` : ''}${f.labels?.length ? `<ul class="grade-list">${f.labels.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}<div class="muted" style="margin-top:6px">Seite ${f.page}${f.caption ? ` · ${esc(f.caption)}` : ''}</div>`;
  } catch {}
});

// ---------- Anki-Export ----------
$app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-anki]'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); ankiDialog(b.dataset.anki, b.dataset.ankiName);
}, true); // Capture-Phase: Klicks in Fachzeilen werden sonst vorher gestoppt
function ankiDialog(scope, name) {
  const extra = [['mc', 'MC-Fragen'], ['case', 'Klinische Fälle'], ['match', 'Zuordnungen']];
  const m = modal(`<div class="row between"><h2>Als Anki-Stapel exportieren</h2><button class="ghost" data-close title="Schließen">${icon('x')}</button></div>
    <p class="muted small" style="margin-top:0">${esc(name)} – erzeugt eine <b>.apkg</b>-Datei für Anki ab Version 2.1 (Mac, Windows, Linux), AnkiDroid und AnkiMobile.</p>
    <div class="seg" role="radiogroup">
      <label class="${AI_ON ? '' : 'disabled'}"><input type="radio" name="amode" value="compact" ${AI_ON ? 'checked' : 'disabled'}><span><b>Kompakt</b> ${AI_ON ? '(empfohlen)' : '(braucht ein Claude-Abo)'}<br><small>Deutlich weniger Karten: Doppeltes wird zusammengeführt, Zusammengehöriges gebündelt. Jede Wissenseinheit bleibt abgedeckt.</small></span></label>
      <label><input type="radio" name="amode" value="full" ${AI_ON ? '' : 'checked'}><span><b>Vollständig</b><br><small>Alle Karteikarten und Lückentexte einzeln – wie in der App.</small></span></label>
    </div>
    <div style="margin:14px 0"><label>Zusätzlich exportieren</label><div class="row">${extra.map(([k, l]) => `<label class="chk"><input type="checkbox" value="${k}"> ${l}</label>`).join('')}</div></div>
    <div class="muted small">Stapel-Struktur: <b>MedLearn › Fach › Skript › Thema</b>, mit Quelle und Abbildungen. Bei erneutem Export aktualisiert Anki vorhandene Karten statt sie zu verdoppeln.
      Wechselst du von Vollständig auf Kompakt, lösche den alten Stapel vorher in Anki.</div>
    <div class="row" style="margin-top:16px"><button class="primary" id="ankiGo">${icon('archive', 's')} Exportieren</button><span id="ankiRes" class="small muted"></span></div>`);
  const out = m.querySelector('#ankiRes');
  m.querySelector('#ankiGo').onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    const compact = m.querySelector('input[name="amode"]:checked').value === 'compact';
    const sel = [...m.querySelectorAll('.chk input:checked')].map((x) => x.value);
    if (!compact) sel.unshift('flashcard', 'cloze');
    let info = '';
    try {
      if (compact) {
        out.innerHTML = '<span class="spinner"></span> Karten werden verdichtet …';
        let job = await api('/export/anki/prepare', { method: 'POST', body: { scope } });
        while (!job.finished) {
          await new Promise((r) => setTimeout(r, 1500));
          if (!document.body.contains(m)) return; // Dialog geschlossen
          job = await api(`/export/anki/prepare/${job.id}`);
          if (job.missing) throw new Error('Vorbereitung abgebrochen – bitte erneut versuchen.');
          out.innerHTML = `<span class="spinner"></span> Karten werden verdichtet: ${job.done} von ${job.total} Themen …`;
        }
        if (job.errors.length) toast(`${job.errors.length} Thema/Themen konnten nicht verdichtet werden – bitte später erneut exportieren.`, 7000);
        info = job.source ? ` statt ${job.source} einzelner Karteikarten/Lückentexte` : '';
      } else out.innerHTML = '<span class="spinner"></span> wird erstellt …';
      const res = await fetch(`/api/export/anki?scope=${encodeURIComponent(scope)}&kinds=${sel.join(',')}${compact ? '&compact=1' : ''}`);
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || (res.status === 404 ? 'Bitte die App neu starten (control + C, dann npm run dev).' : `Fehler ${res.status}`)); }
      const blob = await res.blob();
      const fn = decodeURIComponent((res.headers.get('Content-Disposition') || '').match(/filename\*=UTF-8''([^;]+)/)?.[1] || 'medlearn.apkg');
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      const imgs = Number(res.headers.get('X-Anki-Images'));
      out.innerHTML = `${icon('check', 's')} ${res.headers.get('X-Anki-Cards')} Karten${info}${imgs ? `, ${imgs} Abbildungen` : ''} – gespeichert in „Downloads“ als ${esc(fn)}`;
    } catch (err) { out.textContent = err.message; }
    btn.disabled = false;
  };
}

// ---------- Prüfungs-Countdown ----------
// Jedes Fach bekommt eine feste Farbe (wie die Register in einem Atlas) – abgeleitet aus dem Namen
const SUBJ_COLORS = ['#14958a', '#5b6ee1', '#d9537a', '#d38a1f', '#2f95d6', '#9061d6', '#6f9a2e', '#e0674a'];
function subjColor(name = '') {
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return SUBJ_COLORS[h % SUBJ_COLORS.length];
}

// Hover-Übersicht für alle Ringe (ein schwebendes Element, damit nichts abgeschnitten wird)
(() => {
  let tipEl = null;
  const hide = () => { if (tipEl) tipEl.remove(); tipEl = null; };
  document.addEventListener('mouseover', (e) => {
    const r = e.target.closest?.('.ring[data-ring]');
    if (!r) return hide();
    if (tipEl && tipEl._for === r) return;
    hide();
    let v; try { v = JSON.parse(r.dataset.ring); } catch { return; }
    const p = (n) => (v.t ? Math.round(100 * n / v.t) : 0);
    tipEl = document.createElement('div'); tipEl.className = 'ring-tip'; tipEl._for = r;
    tipEl.innerHTML = `${v.n ? `<b>${esc(v.n)}</b>` : ''}
      <div class="rt-row"><span class="lg-dot ok"></span>Richtig<span>${v.ok}</span><span class="muted">${p(v.ok)} %</span></div>
      <div class="rt-row"><span class="lg-dot bad"></span>Falsch<span>${v.bad}</span><span class="muted">${p(v.bad)} %</span></div>
      <div class="rt-row"><span class="lg-dot open"></span>Unbeantwortet<span>${v.open}</span><span class="muted">${p(v.open)} %</span></div>
      <div class="rt-sum">${v.t} Lerninhalte gesamt</div>`;
    document.body.appendChild(tipEl);
    const b = r.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = b.left + b.width / 2 - w / 2, y = b.bottom + 8;
    if (y + h > innerHeight - 8) y = b.top - h - 8;
    tipEl.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, x))}px`; tipEl.style.top = `${y}px`;
  });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('hashchange', hide);
})();

// ---------- Fortschrittsringe (grün = richtig, rot = zuletzt falsch, grau = noch offen) ----------
function ring(st, size = 64, label = true) {
  const total = st.total || 0, ok = st.known || 0, bad = st.wrong || 0;
  const sw = size >= 48 ? 7 : 4, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const fo = total ? c * ok / total : 0, fb = total ? c * bad / total : 0;
  const gap = ok && bad ? Math.min(2, c / 100) : 0; // feiner Spalt zwischen Grün und Rot
  const pct = total ? Math.round(100 * ok / total) : 0;
  const open = Math.max(0, total - ok - bad);
  const tip = `data-ring="${esc(JSON.stringify({ n: st.name || '', t: total, ok, bad, open }))}"`;
  const arc = (len, off, cls) => (len > 0 ? `<circle class="${cls}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-off}"/>` : '');
  return `<span class="ring" style="width:${size}px;height:${size}px" ${tip}><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/>
    <g transform="rotate(-90 ${size / 2} ${size / 2})">${arc(fo, 0, 'ring-ok')}${arc(fb, fo, 'ring-bad')}</g></svg>
    ${label ? `<span class="ring-pct">${pct}<small>%</small></span>` : ''}</span>`;
}
const sumStats = (docs) => docs.flatMap((d) => d.chapters.flatMap((c) => c.topics))
  .reduce((a, t) => ({ total: a.total + (t.items || 0), known: a.known + (t.known || 0), wrong: a.wrong + (t.wrong || 0) }), { total: 0, known: 0, wrong: 0 });

function progressCard(d, saved = []) {
  const tile = (x, scope) => {
    const open = Math.max(0, x.total - (x.known || 0) - (x.wrong || 0));
    const run = saved.find((v) => v.key === `${scope}:mixed` && v.done > 0);
    return `<div class="ring-tile" style="--sc:${scope.startsWith('folder') ? 'var(--accent)' : subjColor(x.name)}">
      <a href="#/lernen?scope=${scope}" class="ring-link">${ring(x, 76)}</a>
      <div class="ring-body">
        <a href="#/lernen?scope=${scope}" class="ring-name">${scope.startsWith('folder') ? icon('folder', 's fold-ic') : ''}${esc(x.name)}</a>
        <div class="ring-legend"><span><span class="lg-dot ok"></span>${x.known || 0} richtig</span><span><span class="lg-dot bad"></span>${x.wrong || 0} falsch</span><span><span class="lg-dot open"></span>${open} offen</span></div>
        <div class="row" style="gap:6px;margin-top:8px"><a class="btn small ${run ? 'primary' : ''}" href="#/lernen?scope=${scope}" title="Alle ${x.total} Lerninhalte durchgemischt in einer Abfrage">${run ? `Fortsetzen · ${run.done}/${run.total}` : 'Abfrage starten'}</a>
          ${x.wrong ? `<a class="btn small ghost" href="#/lernen?scope=${scope}&mode=mistakes">Falsche wiederholen</a>` : ''}</div>
      </div></div>`;
  };
  const folders = d.folders || [];
  return `<div class="card" style="margin-bottom:16px"><div class="row between"><h3>Fortschritt</h3>
      <span class="ring-legend muted"><span><span class="lg-dot ok"></span>richtig</span><span><span class="lg-dot bad"></span>zuletzt falsch</span><span><span class="lg-dot open"></span>noch offen</span></span></div>
    ${folders.length ? `<div class="ring-sec">Ordner</div><div class="ring-grid">${folders.map((f) => tile(f, `folder:${f.id}`)).join('')}</div><div class="ring-sec">Fächer</div>` : ''}
    <div class="ring-grid">${d.subjects.map((s) => tile(s, `subject:${s.id}`)).join('')}</div></div>`;
}

function examForm(subjectId, value = '', subjects = null) {
  return `<form class="exam-form" data-exam-form>
    ${icon('calendar', 's')}
    ${subjects ? `<select name="sid">${subjects.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>` : `<input type="hidden" name="sid" value="${subjectId}"><span>Prüfungstermin</span>`}
    <input type="date" name="date" value="${value || ''}" required>
    <button class="small primary">Speichern</button>
    ${value ? '<button type="button" class="small ghost" data-exam-clear>Entfernen</button>' : ''}
  </form>`;
}
async function saveExam(sid, date) {
  try {
    await api(`/subjects/${sid}/exam`, { method: 'POST', body: { date } });
    toast(date ? 'Prüfungstermin gespeichert' : 'Prüfungstermin entfernt');
    route();
  } catch (e) {
    toast(/404/.test(e.message)
      ? 'Speichern nicht möglich: Die App läuft noch in der alten Version. Bitte im Terminal neu starten (control + C, dann npm run dev).'
      : `Speichern fehlgeschlagen: ${e.message}`, 9000);
  }
}
function bindExamForms() {
  $app.querySelectorAll('[data-exam-form]').forEach((f) => {
    f.onsubmit = (e) => {
      e.preventDefault();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date.value)) return toast('Bitte ein gültiges Datum wählen.');
      saveExam(f.sid.value, f.date.value);
    };
    const c = f.querySelector('[data-exam-clear]'); if (c) c.onclick = () => saveExam(f.sid.value, '');
  });
}
function examCard(d) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rows = d.subjects.map((s) => ({ s, date: d.exams?.[s.id] })).filter((x) => x.date)
    .map((x) => ({ ...x, days: Math.round((new Date(x.date + 'T00:00:00') - today) / 864e5) }))
    .filter((x) => x.days >= 0).sort((a, b) => a.days - b.days);
  if (!rows.length) return `<div class="card"><h3>Prüfungen</h3>
    <div class="muted small" style="margin-bottom:12px">Trag einen Prüfungstermin ein – hier siehst du dann den Countdown und wie viel du pro Tag schaffen musst.</div>
    ${d.subjects.length ? examForm(null, '', d.subjects) : ''}</div>`;
  return `<div class="card"><h3>Prüfungen</h3><ul class="list">${rows.map(({ s, date, days }) => {
    const left = Math.max(0, s.total - (s.known || 0));
    const perDay = Math.ceil(left / Math.max(1, days));
    const when = new Date(date + 'T00:00:00').toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' });
    return `<li><div class="row between"><a href="#/lernen?scope=subject:${s.id}"><b>${esc(s.name)}</b></a>
        <span class="exam-days ${days <= 7 ? 'soon' : ''}">${days === 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`}</span></div>
      <div class="bar" style="margin:8px 0 6px"><div style="width:${s.pct}%"></div></div>
      <div class="muted small">${when} · ${s.pct} % sicher · ${left ? `noch ${left} Lerninhalte, etwa <b>${perDay} pro Tag</b>` : 'alles sicher gelernt'}</div></li>`;
  }).join('')}</ul></div>`;
}

// ---------- Lernkalender (Antworten pro Tag, letzte 18 Wochen) ----------
function activityCard(activity = []) {
  const byDay = new Map(activity.map((a) => [a.d, a]));
  const key = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weeks = 18, cell = 12, gap = 3;
  const start = new Date(today); start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7); // Montag
  const level = (n) => (!n ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4);
  let rects = '', months = '', lastMonth = -1, days4w = 0, ans4w = 0;
  for (let w = 0; w < weeks; w++) {
    for (let dow = 0; dow < 7; dow++) {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + dow);
      if (dt > today) continue;
      const a = byDay.get(key(dt)); const n = a?.n || 0;
      if ((today - dt) / 864e5 < 28 && n) { days4w++; ans4w += n; }
      const label = `${dt.toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' })}: ${n ? `${n} Antworten, ${Math.round(100 * a.ok / n)} % richtig` : 'nicht gelernt'}`;
      rects += `<rect class="lv${level(n)}${+dt === +today ? ' today' : ''}" x="${22 + w * (cell + gap)}" y="${16 + dow * (cell + gap)}" width="${cell}" height="${cell}" rx="2.5"><title>${label}</title></rect>`;
      if (dow === 0 && dt.getMonth() !== lastMonth) { lastMonth = dt.getMonth(); months += `<text x="${22 + w * (cell + gap)}" y="10">${dt.toLocaleDateString('de-AT', { month: 'short' })}</text>`; }
    }
  }
  const W = 22 + weeks * (cell + gap), H = 16 + 7 * (cell + gap);
  return `<div class="card"><div class="row between"><h3>Lernkalender</h3>
      <span class="muted small">${days4w} Lerntage in den letzten 4 Wochen · ${ans4w} Antworten</span></div>
    <svg class="heat" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lernaktivität der letzten ${weeks} Wochen">
      ${months}<text x="0" y="${16 + cell - 2}">Mo</text><text x="0" y="${16 + 2 * (cell + gap) + cell - 2}">Mi</text><text x="0" y="${16 + 4 * (cell + gap) + cell - 2}">Fr</text>${rects}</svg>
    <div class="heat-legend muted small">weniger ${[0, 1, 2, 3, 4].map((l) => `<span class="sw lv${l}"></span>`).join('')} mehr</div></div>`;
}

// ---------- Fokus-Timer (läuft im Hintergrund weiter, auch beim Seitenwechsel) ----------
const FOCUS_MIN = 25;
function focusTick() {
  const el = document.getElementById('focusBtn'); if (!el) return;
  let end = 0; try { end = Number(localStorage.getItem('focusEnd')) || 0; } catch {}
  const left = end - Date.now();
  if (end && left <= 0) {
    try { localStorage.removeItem('focusEnd'); } catch {}
    toast(`${FOCUS_MIN} Minuten Fokus geschafft – Zeit für 5 Minuten Pause.`, 8000);
    try { const ctx = new AudioContext(); [0, .25].forEach((t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.15, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .2); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .22); }); } catch {}
  }
  const running = end && left > 0;
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  el.classList.toggle('running', !!running);
  el.querySelector('.lbl').textContent = running ? `Fokus ${mm}:${String(ss).padStart(2, '0')}` : `Fokus-Timer`;
  el.title = running ? 'Klicken zum Beenden' : `${FOCUS_MIN} Minuten konzentriert lernen`;
}
document.getElementById('focusBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  let end = 0; try { end = Number(localStorage.getItem('focusEnd')) || 0; } catch {}
  try {
    if (end > Date.now()) { if (confirm('Fokus-Timer beenden?')) localStorage.removeItem('focusEnd'); }
    else { localStorage.setItem('focusEnd', String(Date.now() + FOCUS_MIN * 60000)); toast(`Fokus-Timer läuft – ${FOCUS_MIN} Minuten`); }
  } catch {}
  focusTick();
});
setInterval(focusTick, 1000); focusTick();

// ---------- Schnellsuche (⌘K / Strg+K) ----------
function quickSearch() {
  if (document.querySelector('.qs')) return;
  const m = modal(`<div class="qs"><div class="qs-in">${icon('search')}<input id="qsq" placeholder="In deinen Skripten suchen, z. B. N. medianus" autocomplete="off"><span class="kbd">esc</span></div><div id="qsr"></div></div>`);
  m.classList.add('qs-bg');
  const inp = m.querySelector('#qsq'); inp.focus();
  let timer = null, results = [], sel = 0;
  const draw = () => {
    m.querySelector('#qsr').innerHTML = results.length ? results.map((u, i) => `<a class="qs-item ${i === sel ? 'sel' : ''}" href="#/thema/${u.topicId}">
        <span>${esc(u.content.length > 140 ? u.content.slice(0, 140) + '…' : u.content)}</span><span class="muted small">${esc(u.topic)} · S. ${u.page}</span></a>`).join('')
      : inp.value.trim().length >= 2 ? '<div class="muted small" style="padding:12px 4px">Keine Treffer in der Wissensbasis. Enter durchsucht die Skript-Volltexte.</div>' : '';
    m.querySelectorAll('.qs-item').forEach((a) => a.onclick = () => m.remove());
  };
  inp.oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
    const q = inp.value.trim(); if (q.length < 2) { results = []; return draw(); }
    try { results = (await api(`/search?q=${encodeURIComponent(q)}`)).units.slice(0, 8); sel = 0; draw(); } catch {}
  }, 180); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); draw(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
    if (e.key === 'Enter') { e.preventDefault(); m.remove(); location.hash = results[sel] ? `#/thema/${results[sel].topicId}` : `#/suche?q=${encodeURIComponent(inp.value)}`; }
  };
}
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); quickSearch(); }
});

route();
