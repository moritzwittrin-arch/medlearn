// iPhone-App (offline): Datenaustausch über iCloud Drive.
// Der Mac legt den aktuellen Lernstand als „MedLearn-Daten.json“ in iCloud Drive/MedLearn.
// Das iPhone sichert seine Antworten als „MedLearn-Fortschritt-….json“ (iCloud Drive/MedLearn oder Downloads);
// der Mac übernimmt sie automatisch und verschiebt sie nach „importiert“.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { db, q, one, run, ITEM_OK, getSetting, setSetting, DATA_DIR } from './db.js';
import { FIG_DIR } from './figures.js';
import { review } from './srs.js';
import { findWeakSpots } from './weak.js';
import { currentVersion } from './update.js';

db.exec('CREATE TABLE IF NOT EXISTS mobile_imports (uuid TEXT PRIMARY KEY, ts TEXT DEFAULT (datetime(\'now\')))');

export const MOBILE_URL = 'https://moritzwittrin-arch.github.io/medlearn/';
const DATA_NAME = 'MedLearn-Daten.json';
const PROGRESS_RE = /^MedLearn-Fortschritt.*\.json$/i;

export function icloudRoot() {
  const c = process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs')
    : path.join(os.homedir(), 'iCloudDrive');
  return fs.existsSync(c) ? c : null;
}
const icloudDir = () => { const r = icloudRoot(); return r ? path.join(r, 'MedLearn') : null; };

const parse = (s, d) => { try { return JSON.parse(s); } catch { return d; } };

// Abbildungen fürs iPhone verkleinern (max. 800 px, WebP) – sonst wird die Datei viel zu groß. Ergebnis wird zwischengespeichert.
const IMG_CACHE = path.join(DATA_DIR, 'mobile-img');
let canvasMod;
async function phoneImage(f) {
  const src = path.join(FIG_DIR, String(f.doc_id), f.file);
  let stat; try { stat = fs.statSync(src); } catch { return null; }
  const cached = path.join(IMG_CACHE, `${f.id}-${Math.round(stat.mtimeMs)}.webp`);
  try { return { data: fs.readFileSync(cached).toString('base64'), mime: 'image/webp' }; } catch {}
  try {
    canvasMod = canvasMod || await import('@napi-rs/canvas');
    const img = await canvasMod.loadImage(fs.readFileSync(src));
    const k = Math.min(1, 800 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const c = canvasMod.createCanvas(w, h); const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
    const buf = await c.encode('webp', 62);
    fs.mkdirSync(IMG_CACHE, { recursive: true });
    for (const old of fs.readdirSync(IMG_CACHE)) if (old.startsWith(`${f.id}-`)) fs.rmSync(path.join(IMG_CACHE, old), { force: true });
    fs.writeFileSync(cached, buf);
    return { data: buf.toString('base64'), mime: 'image/webp' };
  } catch {
    // ohne Bildbibliothek: Original nur nehmen, wenn es klein genug ist
    return stat.size < 150 * 1024 ? { data: fs.readFileSync(src).toString('base64'), mime: 'image/png' } : null;
  }
}

/** Kompletter Lernstand für das iPhone (ohne Lernfortschritt-Historie, aber mit Kartenzuständen). */
export async function buildPack() {
  const items = q(`SELECT id, topic_id, doc_id, kind, data, unit_ids, pages FROM items i WHERE ${ITEM_OK}`)
    .map((i) => ({ ...i, data: parse(i.data, {}), unit_ids: parse(i.unit_ids, []), pages: parse(i.pages, []) }));
  const states = {};
  for (const s of q('SELECT * FROM item_state')) states[s.item_id] = { card: parse(s.card, null), due: s.due, reps: s.reps, lapses: s.lapses, wrong: s.wrong, last_rating: s.last_rating, last_review: s.last_review };
  // Abbildungen nur, wenn sie auf Karten vorkommen oder lernrelevant sind
  const usedFigs = new Set();
  for (const i of items) { if (i.data.fig) usedFigs.add(i.data.fig); for (const f of i.data.figs || []) usedFigs.add(f); }
  const figures = [];
  for (const f of q('SELECT id, doc_id, topic_id, page, file, caption, title, description, labels, kind, relevant, status FROM figures')
    .filter((x) => usedFigs.has(x.id) || x.relevant)) {
    const img = await phoneImage(f);
    if (!img) continue;
    const { file, ...rest } = f;
    figures.push({ ...rest, labels: parse(f.labels, []), img: img.data, mime: img.mime });
  }
  let weak = [];
  try { weak = findWeakSpots({ limit: 6 }); } catch {}
  return {
    format: 'medlearn-mobil', version: 1, created: new Date().toISOString(), appVersion: currentVersion(),
    profile: getSetting('profile', { name: '', goal: 50 }), exams: getSetting('exams', {}),
    folders: q('SELECT id, name FROM folders ORDER BY name COLLATE NOCASE'),
    subjects: q('SELECT id, name FROM subjects ORDER BY name'),
    documents: q("SELECT id, subject_id, folder_id, title, pages FROM documents WHERE status='fertig' ORDER BY title"),
    chapters: q('SELECT id, doc_id, title, ord FROM chapters ORDER BY doc_id, ord'),
    topics: q('SELECT id, chapter_id, doc_id, title, ord, page_from, page_to FROM topics ORDER BY doc_id, page_from, ord'),
    units: q('SELECT id, topic_id, doc_id, page, kind, content, ord FROM units ORDER BY ord'),
    items, states,
    mistakes: q('SELECT id, item_id, topic_id, description, user_answer, ts FROM mistakes WHERE resolved=0 ORDER BY ts DESC LIMIT 500'),
    activity: q(`SELECT date(ts, 'localtime') d, COUNT(*) n, SUM(correct) ok FROM review_log WHERE ts >= datetime('now', '-130 days') GROUP BY d ORDER BY d`),
    recent: q(`SELECT t.id, t.title, c.title chapter, s.name subject, MAX(r.ts) last
      FROM review_log r JOIN items i ON i.id=r.item_id JOIN topics t ON t.id=i.topic_id
      JOIN chapters c ON c.id=t.chapter_id JOIN documents d ON d.id=t.doc_id JOIN subjects s ON s.id=d.subject_id
      GROUP BY t.id ORDER BY last DESC LIMIT 6`),
    weak,
    drills: q('SELECT id, topic_id, title, summary, item_ids FROM weak_drills').map((d) => ({ ...d, item_ids: parse(d.item_ids, []) })),
    figures,
    imported: q('SELECT uuid FROM mobile_imports ORDER BY ts DESC LIMIT 20000').map((r) => r.uuid),
  };
}

/** Antworten vom iPhone übernehmen (jede Antwort nur einmal, in zeitlicher Reihenfolge). */
export function importProgress(data) {
  if (!data || data.format !== 'medlearn-fortschritt') throw Object.assign(new Error('Das ist keine MedLearn-Fortschrittsdatei.'), { status: 400 });
  const reviews = (data.reviews || []).filter((r) => r && r.uuid && r.itemId).sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  let added = 0, skipped = 0;
  for (const r of reviews) {
    if (one('SELECT 1 FROM mobile_imports WHERE uuid=?', r.uuid)) { skipped++; continue; }
    try {
      if (one('SELECT 1 FROM items WHERE id=?', r.itemId)) {
        review(Number(r.itemId), r.rating, { correct: !!r.correct, answer: r.answer ?? null, mistake: r.mistake ?? null, at: r.ts });
        added++;
      } else skipped++;
    } catch { skipped++; }
    run('INSERT OR IGNORE INTO mobile_imports(uuid) VALUES(?)', r.uuid);
  }
  for (const id of data.resolved || []) if (Number(id) > 0) run('UPDATE mistakes SET resolved=1 WHERE id=?', Number(id));
  for (const id of data.suspended || []) if (Number(id) > 0) run('UPDATE items SET suspended=1 WHERE id=?', Number(id));
  if (data.profile && typeof data.profile === 'object') {
    const p = getSetting('profile', { name: '', goal: 50 });
    setSetting('profile', { name: String(data.profile.name ?? p.name).slice(0, 40), goal: Number(data.profile.goal) || p.goal });
  }
  setSetting('mobileLastImport', { at: new Date().toISOString(), added, skipped });
  if (added) lastSig = '';   // Daten fürs iPhone neu schreiben
  return { added, skipped };
}

// ---------- automatischer Abgleich über iCloud Drive ----------
let lastSig = '';
function signature() {
  const r = one('SELECT MAX(id) a, COUNT(*) b FROM review_log');
  const i = one('SELECT MAX(id) a, COUNT(*) b, SUM(suspended) c FROM items');
  const m = one('SELECT COUNT(*) n FROM mistakes WHERE resolved=0');
  const d = one('SELECT COUNT(*) n, MAX(id) a FROM weak_drills');
  const f = one('SELECT COUNT(*) n FROM folders');
  return [r.a, r.b, i.a, i.b, i.c, m.n, d.n, d.a, f.n, JSON.stringify(getSetting('profile', {})), JSON.stringify(getSetting('exams', {})),
    one('SELECT COUNT(*) n, MAX(id) a FROM documents').a, one("SELECT group_concat(id || title || IFNULL(folder_id,'')) s FROM documents").s].join('|');
}

let lastWrite = 0;
export async function writePack(force = false) {
  const dir = icloudDir();
  if (!dir) return { ok: false, reason: 'icloud' };
  const sig = signature();
  if (!force && sig === lastSig && fs.existsSync(path.join(dir, DATA_NAME))) return { ok: true, unchanged: true };
  // höchstens alle 10 Minuten neu schreiben (iCloud muss die Datei jedes Mal hochladen)
  if (!force && lastSig && Date.now() - lastWrite < 10 * 60 * 1000) return { ok: true, later: true };
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${DATA_NAME}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(await buildPack()));
  fs.renameSync(tmp, path.join(dir, DATA_NAME));
  lastSig = sig; lastWrite = Date.now();
  setSetting('mobileLastExport', { at: new Date().toISOString() });
  return { ok: true };
}

function scanImports() {
  const root = icloudRoot(); if (!root) return [];
  const dirs = [path.join(root, 'MedLearn'), path.join(root, 'Downloads')];
  const results = [];
  for (const dir of dirs) {
    let names = [];
    try { names = fs.readdirSync(dir); } catch { continue; }
    for (const n of names) {
      // noch nicht heruntergeladene iCloud-Datei (".Name.json.icloud") → Download anstoßen, beim nächsten Durchlauf übernehmen
      const ph = n.match(/^\.(.+)\.icloud$/);
      if (ph && PROGRESS_RE.test(ph[1])) { if (process.platform === 'darwin') execFile('brctl', ['download', path.join(dir, n)], () => {}); continue; }
      if (!PROGRESS_RE.test(n)) continue;
      const file = path.join(dir, n);
      try {
        const r = importProgress(JSON.parse(fs.readFileSync(file, 'utf8')));
        const done = path.join(root, 'MedLearn', 'importiert');
        fs.mkdirSync(done, { recursive: true });
        fs.renameSync(file, path.join(done, `${Date.now()}-${n}`));
        results.push({ file: n, ...r });
        console.log(`  iPhone-Fortschritt übernommen: ${n} (${r.added} neue Antworten)`);
      } catch (e) { console.warn(`  iPhone-Datei ${n} nicht lesbar: ${e.message}`); }
    }
  }
  return results;
}

let timer = null;
export function startMobileSync() {
  if (timer) return;
  const tick = () => {
    try { scanImports(); } catch (e) { console.warn('[iPhone-Abgleich]', e.message); }
    writePack().catch((e) => console.warn('[iPhone-Abgleich]', e.message));
  };
  setTimeout(tick, 8000);
  timer = setInterval(tick, 90 * 1000);
}

export function mobileStatus() {
  const dir = icloudDir();
  let size = 0;
  try { size = fs.statSync(path.join(dir, DATA_NAME)).size; } catch {}
  return {
    url: MOBILE_URL, icloud: !!dir, folder: dir ? 'iCloud Drive › MedLearn' : null, size,
    lastExport: getSetting('mobileLastExport', null), lastImport: getSetting('mobileLastImport', null),
  };
}
export const mobileSyncNow = async () => { const imp = scanImports(); const exp = await writePack(true); return { imported: imp, exported: exp }; };
export const packId = () => crypto.randomUUID();
