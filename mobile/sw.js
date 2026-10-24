/* MedLearn Mobil – Service Worker
 * Übernimmt auf dem iPhone die Rolle des Mac-Servers: beantwortet alle „api/…“-Anfragen der App
 * offline aus den Daten, die der Mac über iCloud Drive bereitstellt (MedLearn-Daten.json).
 * Antworten werden lokal gespeichert und als „MedLearn-Fortschritt-….json“ zurück an den Mac gegeben. */
'use strict';
const VERSION = '__VERSION__';
const CACHE = `medlearn-shell-${VERSION}`;
const SHELL = ['./', 'index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png', 'vendor/fsrs.umd.js'];

importScripts('vendor/fsrs.umd.js');
const { fsrs, generatorParameters, createEmptyCard, TypeConvert, Rating } = self.FSRS;
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));
const RATINGS = [0, Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('medlearn-shell-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const scope = self.registration.scope;
  if (!e.request.url.startsWith(scope)) return;
  const rel = e.request.url.slice(scope.length);
  if (rel.startsWith('api/')) { e.respondWith(handleApi(e.request, url, rel.slice(4).split(/[?#]/)[0])); return; }
  // App-Dateien: zuerst aus dem Speicher (offline), im Hintergrund aktualisieren
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((res) => { if (res.ok && e.request.method === 'GET') caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; }).catch(() => hit);
    return hit || net;
  }));
});

// ---------- Speicher (IndexedDB) ----------
let dbp = null;
function idb() {
  if (!dbp) dbp = new Promise((ok, fail) => {
    const r = indexedDB.open('medlearn-mobil', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
  });
  return dbp;
}
async function kvGet(k) { const db = await idb(); return new Promise((ok, fail) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); }); }
async function kvSet(k, v) { const db = await idb(); return new Promise((ok, fail) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => ok(); t.onerror = () => fail(t.error); }); }

// ---------- Zustand ----------
let D = null;   // geladene Daten + Indizes
async function load() {
  if (D) return D;
  const [pack, log, sessions, profile, resolved, suspended, meta] = await Promise.all(
    ['pack', 'log', 'sessions', 'profile', 'resolved', 'suspended', 'meta'].map((k) => kvGet(k)));
  D = build(pack || null, log || [], sessions || {}, profile || null, resolved || [], suspended || [], meta || {});
  return D;
}
function build(pack, log, sessions, profile, resolved, suspended, meta) {
  const d = { pack, log, sessions, profile, resolved: new Set(resolved), suspended: new Set(suspended), meta };
  const P = pack || { folders: [], subjects: [], documents: [], chapters: [], topics: [], units: [], items: [], states: {}, mistakes: [], activity: [], recent: [], weak: [], drills: [], figures: [], exams: {} };
  d.P = P;
  const by = (arr) => new Map(arr.map((x) => [x.id, x]));
  d.folders = by(P.folders); d.subjects = by(P.subjects); d.docs = by(P.documents); d.chapters = by(P.chapters);
  d.topics = by(P.topics); d.units = by(P.units); d.figs = by(P.figures); d.drills = by(P.drills);
  d.items = by(P.items);
  d.unitsByTopic = new Map(); for (const u of P.units) { if (!d.unitsByTopic.has(u.topic_id)) d.unitsByTopic.set(u.topic_id, []); d.unitsByTopic.get(u.topic_id).push(u); }
  // Kartenzustände: Stand vom Mac + lokale Antworten, die der Mac noch nicht kennt
  d.states = {};
  for (const [k, v] of Object.entries(P.states || {})) d.states[k] = { ...v };
  d.localMistakes = [];
  for (const r of log) applyReview(d, r);
  return d;
}
const st = (id) => D.states[id] || null;
const okItem = (it) => it && !D.suspended.has(it.id);
const activeItems = () => D.P.items.filter((it) => okItem(it) && (it.kind === 'mc' || it.kind === 'mcm'));

function applyReview(d, r) {
  const it = d.items.get(r.itemId); if (!it) return null;
  const now = new Date(r.ts);
  const prev = d.states[r.itemId];
  const card = prev && prev.card ? TypeConvert.card(prev.card) : createEmptyCard(now);
  const { card: next } = scheduler.next(card, now, RATINGS[r.rating]);
  d.states[r.itemId] = { card: next, due: next.due.toISOString(), reps: next.reps, lapses: next.lapses,
    wrong: (prev?.wrong || 0) + (r.correct ? 0 : 1), last_rating: r.rating, last_review: now.toISOString() };
  if (!r.correct) {
    d.localMistakes.unshift({ id: -Math.abs(hash(r.uuid)), item_id: r.itemId, topic_id: it.topic_id, description: r.mistake || defaultMistake(it), user_answer: r.answer ?? null, ts: r.ts, resolved: 0 });
  } else if (r.rating >= 3) {
    for (const m of d.P.mistakes || []) if (m.item_id === r.itemId) d.resolved.add(m.id);
    d.localMistakes = d.localMistakes.filter((m) => m.item_id !== r.itemId);
  }
  return next;
}
function hash(s) { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h || 1; }
function defaultMistake(it) {
  const d = it.data;
  if (it.kind === 'flashcard') return `Nicht gewusst: ${d.q}`;
  if (it.kind === 'cloze') return `Lücke nicht gewusst: ${String(d.text).replace(/\{\{(.+?)\}\}/g, '[$1]')}`;
  if (it.kind === 'match') return `Zuordnung fehlerhaft: ${d.title}`;
  if (it.kind === 'case') return `Fall falsch: ${d.answer}`;
  return `Falsch beantwortet: ${d.stem || d.q || ''}`;
}
const openMistakes = () => [...D.localMistakes, ...(D.P.mistakes || []).filter((m) => !D.resolved.has(m.id))]
  .filter((m) => D.items.has(m.item_id) && okItem(D.items.get(m.item_id)));

// ---------- Hilfen ----------
const json = (data, status = 200) => new Response(JSON.stringify(data === undefined ? null : data), { status, headers: { 'content-type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const onlyMac = () => fail('Das geht nur in MedLearn am Mac.', 403);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const localDay = (iso) => { const t = new Date(iso); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

function source(it) {
  const t = D.topics.get(it.topic_id) || {}, c = D.chapters.get(t.chapter_id) || {}, doc = D.docs.get(it.doc_id) || {};
  return { doc: doc.title, docId: doc.id, chapter: c.title, topic: t.title, topicId: t.id, subject: D.subjects.get(doc.subject_id)?.name,
    folder: doc.folder_id ? D.folders.get(doc.folder_id)?.name : null, pages: it.pages };
}
function hydrate(it) {
  const s = st(it.id);
  return { id: it.id, kind: it.kind, data: it.data, pages: it.pages, isNew: !s, lapses: s?.lapses || 0, wrong: s?.wrong || 0, source: source(it) };
}
function inScope(scope) {
  const type = scope?.type || 'all', id = parseInt(scope?.id);
  const docOf = (it) => D.docs.get(it.doc_id) || {};
  switch (type) {
    case 'subject': return (it) => docOf(it).subject_id === id;
    case 'folder': return (it) => docOf(it).folder_id === id;
    case 'document': return (it) => it.doc_id === id;
    case 'chapter': return (it) => D.topics.get(it.topic_id)?.chapter_id === id;
    case 'topic': return (it) => it.topic_id === id;
    case 'drill': { const set = new Set(D.drills.get(id)?.item_ids || []); return (it) => set.has(it.id); }
    default: return () => true;
  }
}

function buildSession({ scope, mode = 'mixed', size } = {}) {
  const f = inScope(scope);
  const focused = scope && scope.type && scope.type !== 'all';
  const full = ['subject', 'folder', 'drill'].includes(scope?.type);
  const kindsFor = {};   // nur Single + Multiple Choice
  const pool = activeItems().filter(f);
  if (mode === 'mistakes') {
    const ids = new Set(openMistakes().map((m) => m.item_id));
    const rows = pool.filter((it) => ids.has(it.id)).sort((a, b) => (st(b.id)?.wrong || 0) - (st(a.id)?.wrong || 0));
    return shuffle((full ? rows : rows.slice(0, 30)).map(hydrate));
  }
  const kinds = kindsFor[mode] || ['mc', 'mcm'];
  const pk = pool.filter((it) => kinds.includes(it.kind));
  if (full) return shuffle(pk.map(hydrate));
  const now = new Date().toISOString();
  const due = pk.filter((it) => st(it.id) && st(it.id).due <= now)
    .sort((a, b) => (st(b.id).lapses - st(a.id).lapses) || st(a.id).due.localeCompare(st(b.id).due))
    .slice(0, size || (focused ? 40 : 20));
  const order = (a, b) => (a.doc_id - b.doc_id) || ((D.topics.get(a.topic_id)?.page_from || 0) - (D.topics.get(b.topic_id)?.page_from || 0))
    || ((D.topics.get(a.topic_id)?.ord || 0) - (D.topics.get(b.topic_id)?.ord || 0)) || (a.id - b.id);
  const takeNew = (ks, n) => (n > 0 ? pool.filter((it) => ks.includes(it.kind) && !st(it.id)).sort(order).slice(0, n) : []);
  let fresh;
  if (mode === 'mixed') fresh = takeNew(['mc', 'mcm'], focused ? 20 : 12);
  else fresh = takeNew(kinds, size || 15);
  const ids = new Set([...due, ...fresh].map((r) => r.id));
  const mids = new Set(openMistakes().map((m) => m.item_id));
  const weak = mode === 'mixed' ? pool.filter((it) => mids.has(it.id) && !ids.has(it.id)).sort((a, b) => (st(b.id)?.wrong || 0) - (st(a.id)?.wrong || 0)).slice(0, 3) : [];
  return [...shuffle([...due, ...weak].map(hydrate)), ...fresh.map(hydrate)];
}

async function review(body) {
  const rating = Math.min(4, Math.max(1, parseInt(body.rating) || 1));
  const it = D.items.get(Number(body.itemId)); if (!it) return fail('Lerninhalt nicht gefunden', 404);
  const r = { uuid: crypto.randomUUID(), itemId: it.id, rating, correct: body.correct ?? rating >= 3, answer: body.answer ?? null, mistake: body.mistake ?? null, ts: new Date().toISOString() };
  const next = applyReview(D, r);
  D.log.push(r);
  await Promise.all([kvSet('log', D.log), kvSet('resolved', [...D.resolved])]);
  return json({ due: next.due.toISOString(), intervalDays: Math.round((next.due - new Date()) / 864e5 * 10) / 10 });
}
function intervals(id) {
  const s = st(id); const now = new Date();
  const card = s && s.card ? TypeConvert.card(s.card) : createEmptyCard(now);
  const rec = scheduler.repeat(card, now);
  const fmt = (d) => { const m = (d - now) / 60000; if (m < 60) return `${Math.max(1, Math.round(m))} min`; if (m < 1440) return `${Math.round(m / 60)} h`; const days = m / 1440; return days < 30 ? `${Math.round(days)} d` : days < 365 ? `${Math.round(days / 30)} Mo` : `${(days / 365).toFixed(1)} J`; };
  return [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((r) => fmt(rec[r].card.due));
}

function activity() {
  const map = new Map((D.P.activity || []).map((a) => [a.d, { ...a }]));
  for (const r of D.log) {
    const k = localDay(r.ts);
    const a = map.get(k) || { d: k, n: 0, ok: 0 };
    a.n++; a.ok += r.correct ? 1 : 0; map.set(k, a);
  }
  return [...map.values()].sort((a, b) => a.d.localeCompare(b.d));
}
function statsFor(pred) {
  const its = activeItems().filter(pred);
  let known = 0, wrong = 0, seen = 0;
  for (const it of its) { const s = st(it.id); if (s) { seen++; if (s.last_rating >= 3) known++; else wrong++; } }
  return { total: its.length, known, wrong, seen };
}
function dashboard() {
  const now = new Date().toISOString();
  const due = { cards: 0, mc: 0, match: 0 }, fresh = { cards: 0, mc: 0, match: 0 };
  const grp = (k) => (k === 'flashcard' || k === 'cloze' ? 'cards' : k === 'match' ? 'match' : 'mc');
  for (const it of activeItems()) { const s = st(it.id); if (!s) fresh[grp(it.kind)]++; else if (s.due <= now) due[grp(it.kind)]++; }
  const act = activity();
  const today = act.find((a) => a.d === localDay(now)) || { n: 0, ok: 0 };
  const subjects = D.P.subjects.map((s) => ({ id: s.id, name: s.name, ...statsFor((it) => D.docs.get(it.doc_id)?.subject_id === s.id) }))
    .filter((s) => s.total).map((s) => ({ ...s, pct: s.total ? Math.round(100 * s.known / s.total) : 0 }));
  const folders = D.P.folders.map((f) => ({ id: f.id, name: f.name, ...statsFor((it) => D.docs.get(it.doc_id)?.folder_id === f.id) })).filter((f) => f.total);
  return {
    due, fresh, today: { reviews: today.n, correct: today.ok, items: today.n }, subjects, folders,
    profile: D.profile || D.P.profile || { name: '', goal: 50 }, weak: [], recent: D.P.recent || [], processing: [],
    activity: act, exams: D.P.exams || {}, openMistakes: openMistakes().length,
  };
}
function library() {
  const now = new Date().toISOString();
  const mByTopic = new Map(); for (const m of openMistakes()) mByTopic.set(m.topic_id, (mByTopic.get(m.topic_id) || 0) + 1);
  const tStats = new Map();
  for (const it of activeItems()) {
    const t = tStats.get(it.topic_id) || { items: 0, due: 0, known: 0, wrong: 0 };
    const s = st(it.id);
    t.items++; if (s) { if (s.due <= now) t.due++; if (s.last_rating >= 3) t.known++; else t.wrong++; }
    tStats.set(it.topic_id, t);
  }
  return D.P.subjects.map((s) => ({
    ...s, exam: (D.P.exams || {})[s.id] || '',
    documents: D.P.documents.filter((d) => d.subject_id === s.id).map((d) => ({
      ...d, status: 'fertig', progress: 1, message: '', error: null, running: false, has_pdf: 0,
      chapters: D.P.chapters.filter((c) => c.doc_id === d.id).map((c) => ({
        ...c, topics: D.P.topics.filter((t) => t.chapter_id === c.id).map((t) => ({
          ...t, gen_status: 'fertig', units: (D.unitsByTopic.get(t.id) || []).length,
          ...(tStats.get(t.id) || { items: 0, due: 0, known: 0, wrong: 0 }), mistakes: mByTopic.get(t.id) || 0,
        })),
      })),
    })),
  })).filter((s) => s.documents.length);
}
function topicView(id) {
  const t = D.topics.get(id); if (!t) return fail('Nicht gefunden', 404);
  const items = D.P.items.filter((it) => it.topic_id === id);
  const counts = Object.entries(items.filter(okItem).reduce((a, it) => ((a[it.kind] = (a[it.kind] || 0) + 1), a), {})).map(([kind, n]) => ({ kind, n }));
  const figures = D.P.figures.filter((f) => f.topic_id === id).map((f) => ({ ...f, img: undefined, cards: items.filter((it) => it.data.fig === f.id).length }));
  return json({ ...t, chapter: D.chapters.get(t.chapter_id)?.title, doc: D.docs.get(t.doc_id)?.title, units: D.unitsByTopic.get(id) || [],
    counts, mistakes: openMistakes().filter((m) => m.topic_id === id), suspended: items.filter((it) => D.suspended.has(it.id)).length, figures });
}
function sourceView(id) {
  const it = D.items.get(id); if (!it) return fail('Nicht gefunden', 404);
  const units = (it.unit_ids || []).map((u) => D.units.get(u)).filter(Boolean);
  const figures = D.P.figures.filter((f) => f.doc_id === it.doc_id && f.relevant && (it.pages || []).includes(f.page)).map((f) => ({ id: f.id, page: f.page, title: f.title, caption: f.caption }));
  return json({ ...source(it), units, pageTexts: [], figures });
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function search(term) {
  const words = norm(term).split(/\s+/).filter(Boolean);
  if (!words.length || term.trim().length < 2) return { pages: [], units: [] };
  const units = D.P.units.filter((u) => { const c = norm(u.content); return words.every((w) => c.includes(w)); }).slice(0, 40)
    .map((u) => ({ id: u.id, page: u.page, kind: u.kind, content: u.content, topicId: u.topic_id, topic: D.topics.get(u.topic_id)?.title, doc: D.docs.get(u.doc_id)?.title, docId: u.doc_id }));
  return { pages: [], units };
}
function mistakesList() {
  return openMistakes().map((m) => {
    const t = D.topics.get(m.topic_id) || {}, c = D.chapters.get(t.chapter_id) || {}, doc = D.docs.get(t.doc_id) || {};
    return { ...m, topic: t.title, chapter: c.title, subject: D.subjects.get(doc.subject_id)?.name, kind: D.items.get(m.item_id)?.kind };
  }).sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, 300);
}
function savedSessions() {
  return Object.entries(D.sessions).map(([key, s]) => ({ key, label: s.label, updated_at: s.updated_at, total: (s.data.items || []).length, done: Object.keys(s.data.done || {}).length }))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}
function savedSession(key) {
  const s = D.sessions[key]; if (!s) return null;
  const data = { ...s.data, items: (s.data.items || []).filter((i) => okItem(D.items.get(i.id))) };
  if (!data.items.length) { delete D.sessions[key]; kvSet('sessions', D.sessions); return null; }
  data.i = Math.min(data.i || 0, data.items.length);
  return data;
}
function mobileStatus() {
  const exported = D.meta.exportedUpTo || 0;
  return { hasData: !!D.pack, created: D.pack?.created || null, items: D.P.items.length, documents: D.P.documents.length,
    pending: D.log.length, unsaved: D.log.filter((r) => r.ts > (D.meta.exportedAt || '')).length, lastSaved: D.meta.exportedAt || null, exported };
}
async function importPack(pack) {
  if (!pack || pack.format !== 'medlearn-mobil') return fail('Das ist keine MedLearn-Datendatei. Wähle „MedLearn-Daten.json“ aus iCloud Drive › MedLearn.');
  const known = new Set(pack.imported || []);
  const log = D.log.filter((r) => !known.has(r.uuid));          // was der Mac schon kennt, fällt aus dem lokalen Protokoll
  const resolved = [...D.resolved].filter((id) => (pack.mistakes || []).some((m) => m.id === id));
  const suspended = [...D.suspended].filter((id) => (pack.items || []).some((it) => it.id === id));
  for (const [k, v] of Object.entries(D.sessions)) if (!v || !v.data) delete D.sessions[k];
  await Promise.all([kvSet('pack', pack), kvSet('log', log), kvSet('resolved', resolved), kvSet('suspended', suspended), kvSet('profile', null)]);
  D = null; await load();
  return json({ ok: true, items: pack.items.length, documents: pack.documents.length, pending: log.length, created: pack.created });
}
async function exportProgress() {
  const now = new Date().toISOString();
  D.meta.exportedAt = now; await kvSet('meta', D.meta);
  return json({ format: 'medlearn-fortschritt', version: 1, created: now, reviews: D.log, resolved: [...D.resolved], suspended: [...D.suspended], profile: D.profile || undefined });
}

async function handleApi(req, url, p) {
  try {
    await load();
    const m = req.method;
    const body = m === 'GET' || m === 'HEAD' ? null : await req.json().catch(() => ({}));
    const parts = p.split('/');
    switch (true) {
      case p === 'whoami': return json({ local: false, mobile: true });
      case p === 'version': return json({ version: D.pack?.appVersion || VERSION });
      case p === 'settings' && m === 'GET': return json({ provider: 'offline', mobile: true });
      case p === 'dashboard': return json(dashboard());
      case p === 'library': return json(library());
      case p === 'folders': return json(D.P.folders);
      case p === 'session' && m === 'POST': return json(buildSession(body || {}));
      case p === 'review' && m === 'POST': return review(body || {});
      case p === 'saved-sessions': return json(savedSessions());
      case p === 'saved-session' && m === 'GET': return json(savedSession(url.searchParams.get('key') || ''));
      case p === 'saved-session' && m === 'PUT': {
        D.sessions[String(body.key)] = { label: body.label || '', data: body.data, updated_at: new Date().toISOString() };
        await kvSet('sessions', D.sessions); return json({ ok: true });
      }
      case p === 'saved-session' && m === 'DELETE': delete D.sessions[url.searchParams.get('key') || '']; await kvSet('sessions', D.sessions); return json({ ok: true });
      case parts[0] === 'items' && parts[2] === 'intervals': return json(intervals(Number(parts[1])));
      case parts[0] === 'items' && parts[2] === 'source': return sourceView(Number(parts[1]));
      case parts[0] === 'items' && parts[2] === 'suspend' && m === 'POST': D.suspended.add(Number(parts[1])); await kvSet('suspended', [...D.suspended]); return json({ ok: true });
      case parts[0] === 'topics' && parts[2] === 'unsuspend' && m === 'POST': {
        let n = 0; for (const it of D.P.items) if (it.topic_id === Number(parts[1]) && D.suspended.delete(it.id)) n++;
        await kvSet('suspended', [...D.suspended]); return json({ restored: n });
      }
      case parts[0] === 'topics' && parts.length === 2 && m === 'GET': return topicView(Number(parts[1]));
      case p === 'mistakes': return json(mistakesList());
      case parts[0] === 'mistakes' && parts[2] === 'resolve': {
        const id = Number(parts[1]);
        if (id < 0) D.localMistakes = D.localMistakes.filter((x) => x.id !== id); else D.resolved.add(id);
        await kvSet('resolved', [...D.resolved]); return json({ ok: true });
      }
      case p === 'search': return json(search(url.searchParams.get('q') || ''));
      case p === 'weak': return json((D.P.weak || []).filter((w) => w.drill).slice(0, Number(url.searchParams.get('limit')) || 5));
      case p === 'weak/drill': return fail('Neue Mini-Trainings erstellst du am Mac – danach sind sie hier verfügbar.', 403);
      case parts[0] === 'drills': { const d = D.drills.get(Number(parts[1])); return d ? json({ id: d.id, topicId: d.topic_id, title: d.title, summary: d.summary, items: d.item_ids.length }) : fail('Nicht gefunden', 404); }
      case parts[0] === 'figures' && parts[2] === 'img': {
        const f = D.figs.get(Number(parts[1])); if (!f) return new Response('', { status: 404 });
        const bin = Uint8Array.from(atob(f.img), (c) => c.charCodeAt(0));
        return new Response(bin, { headers: { 'content-type': f.mime || 'image/png', 'cache-control': 'max-age=86400' } });
      }
      case parts[0] === 'figures' && parts.length === 2: { const f = D.figs.get(Number(parts[1])); return f ? json({ ...f, img: undefined }) : fail('Nicht gefunden', 404); }
      case p === 'profile' && m === 'GET': return json(D.profile || D.P.profile || { name: '', goal: 50 });
      case p === 'profile' && m === 'POST': {
        D.profile = { name: String(body.name || '').trim().slice(0, 40), goal: Math.min(1000, Math.max(5, parseInt(body.goal) || 50)) };
        await kvSet('profile', D.profile); return json(D.profile);
      }
      case p === 'mobile/status': return json(mobileStatus());
      case p === 'mobile/import' && m === 'POST': return importPack(body);
      case p === 'mobile/export': return exportProgress();
      default: return onlyMac();
    }
  } catch (e) {
    return fail(String(e && e.message || e), 500);
  }
}
