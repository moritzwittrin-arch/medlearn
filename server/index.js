import './log.js';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { q, one, run, tx, PDF_DIR, getSetting, setSetting, ITEM_OK, createBackup, listBackups, BACKUP_DIR } from './db.js';
import { processDocument, isRunning, generateForTopic, upgradeMatches, upgradeFigures } from './pipeline.js';
import { FIG_DIR, applyFiguresToTopic } from './figures.js';
import { exportPackage, importPackage } from './package.js';
import { findWeakSpots, createDrill, getDrill } from './weak.js';
import { remoteGuard, remoteInfo, setRemote, resetRemoteToken, listenHost, isLocal } from './remote.js';
import { mobileStatus, mobileSyncNow, buildPack, importProgress, startMobileSync, MOBILE_URL } from './mobile.js';
import QRCode from 'qrcode';
import { checkUpdate, applyUpdate, restartServer, currentVersion } from './update.js';
import { review, buildSession, dashboard, hydrate, previewIntervals } from './srs.js';
import { completeJson, complete, testConnection, aiSettings } from './ai.js';
import { buildApkg } from './anki.js';
import { startCompactJob, getCompactJob } from './compact.js';
import { gradePrompt, tutorPrompt } from './prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(remoteGuard);   // Handy-Zugriff: nur verbundene Geräte (am Mac selbst immer erlaubt)
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const upload = multer({
  storage: multer.diskStorage({
    destination: PDF_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`),
  }),
  fileFilter: (req, file, cb) => cb(null, /\.pdf$/i.test(file.originalname) || file.mimetype === 'application/pdf'),
  limits: { fileSize: 300 * 1024 * 1024 },
});

const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(req, res)); }
  catch (e) { console.error(e); res.status(e.status || 500).json({ error: String(e.message || e) }); }
};
const fail = (msg, status = 400) => Object.assign(new Error(msg), { status });

// ---------- Dashboard ----------
app.get('/api/dashboard', wrap(() => dashboard()));

// ---------- Bibliothek ----------
app.get('/api/library', wrap(() => {
  const subjects = q('SELECT * FROM subjects ORDER BY name');
  const docs = q('SELECT id, subject_id, folder_id, title, pages, (filename != \'\') has_pdf, status, progress, message, error, created_at FROM documents ORDER BY title');
  const chapters = q('SELECT * FROM chapters ORDER BY doc_id, ord');
  const now = new Date().toISOString();
  const topics = q(`SELECT t.*,
      (SELECT COUNT(*) FROM units u WHERE u.topic_id=t.id) units,
      (SELECT COUNT(*) FROM items i WHERE i.topic_id=t.id AND ${ITEM_OK}) items,
      (SELECT COUNT(*) FROM items i JOIN item_state s ON s.item_id=i.id WHERE i.topic_id=t.id AND ${ITEM_OK} AND s.due <= ?) due,
      (SELECT COUNT(*) FROM items i JOIN item_state s ON s.item_id=i.id WHERE i.topic_id=t.id AND ${ITEM_OK} AND s.last_rating >= 3) known,
      (SELECT COUNT(*) FROM items i JOIN item_state s ON s.item_id=i.id WHERE i.topic_id=t.id AND ${ITEM_OK} AND s.last_rating < 3) wrong,
      (SELECT COUNT(*) FROM mistakes m WHERE m.topic_id=t.id AND m.resolved=0) mistakes
      FROM topics t ORDER BY t.doc_id, t.page_from, t.ord`, now);
  const exams = getSetting('exams', {});
  return subjects.map((s) => ({
    ...s, exam: exams[s.id] || '',
    documents: docs.filter((d) => d.subject_id === s.id).map((d) => ({
      ...d, running: isRunning(d.id),
      chapters: chapters.filter((c) => c.doc_id === d.id).map((c) => ({
        ...c, topics: topics.filter((t) => t.chapter_id === c.id),
      })),
    })),
  }));
}));

app.post('/api/upload', upload.single('file'), wrap((req) => {
  if (!req.file) throw fail('Bitte eine PDF-Datei auswählen.');
  const subject = String(req.body.subject || '').trim() || 'Allgemein';
  const title = String(req.body.title || '').trim() || Buffer.from(req.file.originalname, 'latin1').toString('utf8').replace(/\.pdf$/i, '');
  run('INSERT OR IGNORE INTO subjects(name) VALUES(?)', subject);
  const sid = one('SELECT id FROM subjects WHERE name=?', subject).id;
  const fid = Number(req.body.folder_id) || null;
  const folder = fid && one('SELECT id FROM folders WHERE id=?', fid) ? fid : null;
  const id = run('INSERT INTO documents(subject_id,title,filename,folder_id) VALUES(?,?,?,?)', sid, title, req.file.filename, folder).lastInsertRowid;
  processDocument(Number(id));
  return { id: Number(id) };
}));

// ---------- Ordner ----------
app.get('/api/folders', wrap(() => q('SELECT * FROM folders ORDER BY name COLLATE NOCASE')));
const folderName = (v) => {
  const n = String(v || '').trim().slice(0, 80);
  if (!n) throw fail('Bitte einen Namen eingeben.');
  return n;
};
app.post('/api/folders', wrap((req) => ({ id: Number(run('INSERT INTO folders(name) VALUES(?)', folderName(req.body?.name)).lastInsertRowid) })));
app.put('/api/folders/:id', wrap((req) => {
  if (!run('UPDATE folders SET name=? WHERE id=?', folderName(req.body?.name), Number(req.params.id)).changes) throw fail('Ordner nicht gefunden', 404);
  return { ok: true };
}));
// Ordner löschen: Skripte bleiben erhalten und landen wieder bei „Ohne Ordner“
app.delete('/api/folders/:id', wrap((req) => {
  const id = Number(req.params.id);
  tx(() => { run('UPDATE documents SET folder_id=NULL WHERE folder_id=?', id); run('DELETE FROM folders WHERE id=?', id); });
  return { ok: true };
}));

// Skript umbenennen / in einen Ordner verschieben
app.put('/api/documents/:id', wrap((req) => {
  const id = Number(req.params.id);
  if (!one('SELECT id FROM documents WHERE id=?', id)) throw fail('Nicht gefunden', 404);
  const b = req.body || {};
  if ('title' in b) {
    const t = String(b.title || '').trim().slice(0, 200);
    if (!t) throw fail('Bitte einen Namen eingeben.');
    run('UPDATE documents SET title=? WHERE id=?', t, id);
  }
  if ('folder_id' in b) {
    const fid = b.folder_id == null || b.folder_id === '' ? null : Number(b.folder_id);
    if (fid && !one('SELECT id FROM folders WHERE id=?', fid)) throw fail('Ordner nicht gefunden', 404);
    run('UPDATE documents SET folder_id=? WHERE id=?', fid, id);
  }
  return { ok: true };
}));

app.post('/api/documents/:id/resume', wrap((req) => { processDocument(Number(req.params.id)); return { ok: true }; }));

app.delete('/api/documents/:id', wrap((req) => {
  const id = Number(req.params.id);
  if (isRunning(id)) throw fail('Dokument wird gerade verarbeitet – bitte warten.');
  const d = one('SELECT * FROM documents WHERE id=?', id);
  if (!d) throw fail('Nicht gefunden', 404);
  tx(() => {
    run('DELETE FROM units_fts WHERE unit_id IN (SELECT id FROM units WHERE doc_id=?)', id);
    run('DELETE FROM pages_fts WHERE doc_id=?', id);
    run('DELETE FROM documents WHERE id=?', id);
    run('DELETE FROM subjects WHERE id NOT IN (SELECT subject_id FROM documents)');
  });
  fs.rmSync(path.join(PDF_DIR, d.filename), { force: true });
  fs.rmSync(path.join(FIG_DIR, String(id)), { recursive: true, force: true });
  return { ok: true };
}));

app.get('/api/topics/:id', wrap((req) => {
  const t = one(`SELECT t.*, c.title chapter, d.title doc FROM topics t JOIN chapters c ON c.id=t.chapter_id
                 JOIN documents d ON d.id=t.doc_id WHERE t.id=?`, req.params.id);
  if (!t) throw fail('Nicht gefunden', 404);
  const units = q('SELECT * FROM units WHERE topic_id=? ORDER BY ord', t.id);
  const counts = q(`SELECT kind, COUNT(*) n FROM items i WHERE topic_id=? AND ${ITEM_OK} GROUP BY kind`, t.id);
  const suspended = one('SELECT COUNT(*) n FROM items WHERE topic_id=? AND suspended=1', t.id).n;
  const mistakes = q('SELECT * FROM mistakes WHERE topic_id=? AND resolved=0 ORDER BY ts DESC', t.id);
  const figures = q("SELECT id, page, caption, title, description, kind, relevant, status, cards FROM figures WHERE topic_id=? ORDER BY page, id", t.id)
    .map((f) => ({ ...f, cards: JSON.parse(f.cards || '[]').length }));
  return { ...t, units, counts, mistakes, suspended, figures };
}));

app.post('/api/topics/:id/regenerate', wrap(async (req) => {
  const t = one(`SELECT t.*, c.title chapter FROM topics t JOIN chapters c ON c.id=t.chapter_id WHERE t.id=?`, req.params.id);
  if (!t) throw fail('Nicht gefunden', 404);
  await generateForTopic(t);
  run("UPDATE topics SET gen_status='fertig' WHERE id=?", t.id);
  return { items: one('SELECT COUNT(*) n FROM items WHERE topic_id=?', t.id).n };
}));

// ---------- Lernen ----------
app.post('/api/session', wrap((req) => buildSession(req.body || {})));

// Gespeicherte (angefangene) Sessions
app.get('/api/saved-sessions', wrap(() => q(`SELECT key, label, updated_at,
    json_array_length(data, '$.items') total,
    (SELECT COUNT(*) FROM json_each(data, '$.done')) done
    FROM saved_sessions ORDER BY updated_at DESC`)));
app.get('/api/saved-session', wrap((req) => {
  const row = one('SELECT data FROM saved_sessions WHERE key=?', String(req.query.key || ''));
  if (!row) return null;
  const s = JSON.parse(row.data);
  // Inhalte, die inzwischen gelöscht/neu generiert wurden, aussortieren
  const ids = new Set(q(`SELECT id FROM items i WHERE ${ITEM_OK} AND id IN (SELECT value FROM json_each(?))`, JSON.stringify(s.items.map((i) => i.id))).map((r) => r.id));
  const before = s.items.length;
  s.items = s.items.filter((i) => ids.has(i.id));
  if (!s.items.length) { run('DELETE FROM saved_sessions WHERE key=?', req.query.key); return null; }
  if (s.items.length !== before) s.i = Math.min(s.i || 0, s.items.length);
  return s;
}));
app.put('/api/saved-session', wrap((req) => {
  const { key, label, data } = req.body || {};
  if (!key || !data) throw fail('key/data fehlt');
  run(`INSERT INTO saved_sessions(key,label,data,updated_at) VALUES(?,?,?,datetime('now'))
       ON CONFLICT(key) DO UPDATE SET label=excluded.label, data=excluded.data, updated_at=excluded.updated_at`,
    String(key), String(label || ''), JSON.stringify(data));
  return { ok: true };
}));
app.delete('/api/saved-session', wrap((req) => { run('DELETE FROM saved_sessions WHERE key=?', String(req.query.key || '')); return { ok: true }; }));

// Lerninhalt ausblenden / wieder einblenden / bearbeiten
app.post('/api/items/:id/suspend', wrap((req) => {
  run('UPDATE items SET suspended=? WHERE id=?', req.body?.suspended === false ? 0 : 1, req.params.id);
  return { ok: true };
}));
app.post('/api/topics/:id/unsuspend', wrap((req) => {
  const r = run('UPDATE items SET suspended=0 WHERE topic_id=? AND suspended=1', req.params.id);
  return { restored: Number(r.changes) };
}));
app.put('/api/items/:id', wrap((req) => {
  const item = one('SELECT * FROM items WHERE id=?', req.params.id);
  if (!item) throw fail('Nicht gefunden', 404);
  const d = JSON.parse(item.data);
  const b = req.body || {};
  if (item.kind === 'flashcard') {
    if (!String(b.q || '').trim() || !String(b.a || '').trim()) throw fail('Frage und Antwort dürfen nicht leer sein.');
    d.q = String(b.q).trim(); d.a = String(b.a).trim();
  } else if (item.kind === 'cloze') {
    if (!/\{\{.+?\}\}/.test(String(b.text || ''))) throw fail('Mindestens eine Lücke mit {{…}} markieren.');
    d.text = String(b.text).trim();
  } else if (item.kind === 'mc') {
    if (b.explanation != null) d.explanation = String(b.explanation);
  } else throw fail('Dieser Inhaltstyp kann nicht bearbeitet werden.');
  d.edited = true;
  run('UPDATE items SET data=? WHERE id=?', JSON.stringify(d), item.id);
  return { data: d };
}));

app.get('/api/items/:id/intervals', wrap((req) => previewIntervals(Number(req.params.id))));

app.post('/api/review', wrap((req) => {
  const { itemId, rating, correct, answer, mistake } = req.body;
  return review(Number(itemId), rating, { correct: correct ?? rating >= 3, answer, mistake });
}));

app.post('/api/grade', wrap(async (req) => {
  const { itemId, answer } = req.body;
  if (!String(answer || '').trim()) throw fail('Bitte eine Antwort eingeben.');
  const item = one('SELECT * FROM items WHERE id=?', itemId);
  if (!item) throw fail('Nicht gefunden', 404);
  const d = JSON.parse(item.data);
  const units = q(`SELECT u.*, d.title doc FROM units u JOIN documents d ON d.id=u.doc_id
                   WHERE u.id IN (SELECT value FROM json_each(?))`, item.unit_ids);
  const sources = units.map((u) => `[S.${u.page}] ${u.content}`).join('\n') || '(keine)';
  if (aiSettings().provider === 'offline') return offlineGrade(d, answer);
  const r = await completeJson(gradePrompt({ question: d.q, answer: d.answer, points: d.points, sources, userAnswer: answer }), { fast: true });
  r.rating = Math.min(4, Math.max(1, parseInt(r.rating) || (r.score >= 85 ? 4 : r.score >= 60 ? 3 : r.score >= 35 ? 2 : 1)));
  return r;
}));

function offlineGrade(d, answer) {
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const a = norm(answer);
  const points = d.points?.length ? d.points : [d.answer];
  const hit = points.filter((p) => norm(p).split(/\W+/).filter((w) => w.length > 4).some((w) => a.includes(w)));
  const score = Math.round(100 * hit.length / points.length);
  return { score, rating: score >= 85 ? 4 : score >= 60 ? 3 : score >= 35 ? 2 : 1, richtig: hit,
    fehlt: points.filter((p) => !hit.includes(p)), falsch: [], extra: [],
    feedback: 'Offline-Modus: einfache Stichwort-Bewertung. Bitte mit der Musterantwort vergleichen.' };
}

// ---------- Abbildungen ----------
app.get('/api/figures/:id/img', (req, res) => {
  const f = one('SELECT doc_id, file FROM figures WHERE id=?', req.params.id);
  if (!f) return res.status(404).end();
  res.setHeader('Cache-Control', 'max-age=86400');
  res.sendFile(path.join(FIG_DIR, String(f.doc_id), f.file));
});
app.get('/api/figures/:id', wrap((req) => {
  const f = one('SELECT id, doc_id, page, caption, title, description, labels, kind, relevant FROM figures WHERE id=?', req.params.id);
  if (!f) throw fail('Nicht gefunden', 404);
  return { ...f, labels: JSON.parse(f.labels || '[]') };
}));
app.post('/api/figures/:id/relevant', wrap((req) => {
  const f = one('SELECT * FROM figures WHERE id=?', req.params.id);
  if (!f) throw fail('Nicht gefunden', 404);
  run('UPDATE figures SET relevant=? WHERE id=?', req.body?.relevant ? 1 : 0, f.id);
  if (f.topic_id) applyFiguresToTopic(f.topic_id);
  return { ok: true };
}));

// ---------- Quellen ----------
app.get('/api/items/:id/source', wrap((req) => {
  const item = one('SELECT * FROM items WHERE id=?', req.params.id);
  if (!item) throw fail('Nicht gefunden', 404);
  const [h] = hydrate(q(`SELECT i.*, t.title topic, c.title chapter, d.title doc, d.id doc_id, s.name subject,
      NULL due, 0 lapses, 0 wrong FROM items i JOIN topics t ON t.id=i.topic_id JOIN chapters c ON c.id=t.chapter_id
      JOIN documents d ON d.id=i.doc_id JOIN subjects s ON s.id=d.subject_id WHERE i.id=?`, item.id));
  const units = q('SELECT id, page, kind, content FROM units WHERE id IN (SELECT value FROM json_each(?)) ORDER BY ord', item.unit_ids);
  const pages = q('SELECT page, text FROM pages WHERE doc_id=? AND page IN (SELECT value FROM json_each(?)) ORDER BY page', item.doc_id, item.pages);
  const figs = q("SELECT id, page, title, caption FROM figures WHERE doc_id=? AND relevant=1 AND page IN (SELECT value FROM json_each(?)) ORDER BY page, id", item.doc_id, item.pages);
  return { ...h.source, units, pageTexts: pages, figures: figs };
}));

app.get('/api/pdf/:docId', (req, res) => {
  const d = one('SELECT * FROM documents WHERE id=?', req.params.docId);
  if (!d) return res.status(404).end();
  if (!d.filename || !fs.existsSync(path.join(PDF_DIR, d.filename))) {
    return res.status(404).type('html').send('<p style="font-family:system-ui;padding:2rem">Zu diesem Skript ist keine PDF vorhanden (Lernpaket ohne PDF importiert).</p>');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(d.title)}.pdf"`);
  fs.createReadStream(path.join(PDF_DIR, d.filename)).pipe(res);
});

// ---------- Suche ----------
function ftsQuery(s) {
  const words = String(s).replace(/["*()^:]/g, ' ').split(/\s+/).filter(Boolean);
  return words.map((w) => `"${w}"*`).join(' ');
}
app.get('/api/search', wrap((req) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) return { pages: [], units: [] };
  const fq = ftsQuery(term);
  const pages = q(`SELECT f.doc_id docId, f.page, d.title doc, snippet(pages_fts, 0, '«', '»', ' … ', 24) snippet
      FROM pages_fts f JOIN documents d ON d.id=f.doc_id WHERE pages_fts MATCH ? ORDER BY rank LIMIT 40`, fq);
  const units = q(`SELECT u.id, u.page, u.kind, u.content, u.topic_id topicId, t.title topic, d.title doc, d.id docId
      FROM units_fts f JOIN units u ON u.id=f.unit_id JOIN topics t ON t.id=u.topic_id JOIN documents d ON d.id=u.doc_id
      WHERE units_fts MATCH ? ORDER BY rank LIMIT 40`, fq);
  return { pages, units };
}));

// ---------- KI-Tutor ----------
app.post('/api/tutor', wrap(async (req) => {
  const { message, history = [], focus, web = true } = req.body;
  if (!String(message || '').trim()) throw fail('Leere Nachricht');
  let focusText = '';
  let ctxUnits = [];
  if (focus?.itemId) {
    const it = one('SELECT * FROM items WHERE id=?', focus.itemId);
    if (it) {
      const d = JSON.parse(it.data);
      focusText = `Lerninhalt (${it.kind}): ${JSON.stringify(d)}`;
      ctxUnits = q(`SELECT u.*, d.title doc FROM units u JOIN documents d ON d.id=u.doc_id
                    WHERE u.topic_id=? ORDER BY u.ord LIMIT 80`, it.topic_id);
    }
  } else if (focus?.topicId) {
    const t = one('SELECT title FROM topics WHERE id=?', focus.topicId);
    focusText = t ? `Thema: ${t.title}` : '';
    ctxUnits = q(`SELECT u.*, d.title doc FROM units u JOIN documents d ON d.id=u.doc_id WHERE u.topic_id=? ORDER BY u.ord LIMIT 120`, focus.topicId);
  }
  // Zusätzlich: Volltextsuche nach Begriffen aus der Frage
  const words = String(message + ' ' + history.slice(-2).map((h) => h.content).join(' '))
    .split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 4).slice(0, 12);
  if (words.length) {
    const fq = words.map((w) => `"${w}"*`).join(' OR ');
    try {
      const extra = q(`SELECT u.*, d.title doc FROM units_fts f JOIN units u ON u.id=f.unit_id JOIN documents d ON d.id=u.doc_id
                       WHERE units_fts MATCH ? ORDER BY rank LIMIT 40`, fq);
      const seen = new Set(ctxUnits.map((u) => u.id));
      ctxUnits.push(...extra.filter((u) => !seen.has(u.id)));
    } catch {}
  }
  const useWebCtx = web !== false && aiSettings().provider !== 'offline';
  // Mit Online-Recherche: nur wenige Skriptstellen als Abgleich, damit sie die Antwort nicht dominieren
  const context = (useWebCtx ? ctxUnits.slice(0, 25) : ctxUnits).map((u) => `[${u.doc}, S. ${u.page}] ${u.content}`).join('\n');
  const useWeb = web !== false && aiSettings().provider !== 'offline';
  const reply = await complete(tutorPrompt({ context, history, message, focus: focusText, web: useWeb }), { fast: true, web: useWeb });
  return { reply: reply.trim(), sources: ctxUnits.length, web: useWeb };
}));

// ---------- Fehler ----------
app.get('/api/mistakes', wrap(() => q(`SELECT m.*, t.title topic, c.title chapter, s.name subject, i.kind
    FROM mistakes m JOIN topics t ON t.id=m.topic_id JOIN chapters c ON c.id=t.chapter_id
    JOIN documents d ON d.id=t.doc_id JOIN subjects s ON s.id=d.subject_id
    LEFT JOIN items i ON i.id=m.item_id WHERE m.resolved=0 ORDER BY m.ts DESC LIMIT 300`)));
app.post('/api/mistakes/:id/resolve', wrap((req) => { run('UPDATE mistakes SET resolved=1 WHERE id=?', req.params.id); return { ok: true }; }));

// ---------- Version, Updates, Beenden ----------
app.get('/api/version', wrap(() => ({ version: currentVersion() })));
app.get('/api/update/check', wrap(() => checkUpdate()));
app.post('/api/update/apply', wrap(async () => {
  const r = await applyUpdate();
  setTimeout(restartServer, 500);
  return r;
}));
app.post('/api/shutdown', wrap(() => { setTimeout(() => process.exit(0), 300); return { ok: true }; }));

// ---------- Lernpakete teilen (.medlearn) ----------
app.get('/api/export/package', (req, res) => {
  try {
    const [type, id] = String(req.query.scope || '').split(':');
    const r = exportPackage({ type, id }, { withPdf: req.query.pdf !== '0' });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="lernpaket.medlearn"; filename*=UTF-8''${encodeURIComponent(r.filename)}`);
    res.setHeader('X-Package-Docs', String(r.documents));
    res.setHeader('X-Package-Items', String(r.items));
    res.end(r.buffer);
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
});
const pkgUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 800 * 1024 * 1024 } });
app.post('/api/import/package', pkgUpload.single('file'), wrap((req) => {
  if (!req.file) throw fail('Bitte eine .medlearn-Datei auswählen.');
  const folderId = Number(req.body.folder_id) || null;
  return importPackage(req.file.buffer, { folderId: folderId && one('SELECT id FROM folders WHERE id=?', folderId) ? folderId : null });
}));

// ---------- Anki-Export (.apkg) ----------
app.get('/api/export/anki', (req, res) => {
  try {
    const [type, id] = String(req.query.scope || 'all').split(':');
    const kinds = String(req.query.kinds || '').split(',').filter(Boolean);
    const r = buildApkg({ scope: { type, id }, kinds, compact: req.query.compact === '1' });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="medlearn.apkg"; filename*=UTF-8''${encodeURIComponent(r.filename)}`);
    res.setHeader('X-Anki-Notes', String(r.notes));
    res.setHeader('X-Anki-Cards', String(r.cards));
    res.setHeader('X-Anki-Images', String(r.images || 0));
    res.end(r.buffer);
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
});

// Kompakt-Export vorbereiten (verdichtet die Karten pro Thema im Hintergrund)
app.post('/api/export/anki/prepare', wrap((req) => {
  const [type, id] = String(req.body?.scope || 'all').split(':');
  if (aiSettings().provider === 'offline') throw fail('Der Kompakt-Export braucht die KI (Offline-Modus ist aktiv).');
  return startCompactJob({ type, id });
}));
app.get('/api/export/anki/prepare/:id', wrap((req) => getCompactJob(req.params.id) || { missing: true }));

// ---------- Prüfungstermine (pro Fach) ----------
app.post('/api/subjects/:id/exam', wrap((req) => {
  const exams = getSetting('exams', {});
  const date = String(req.body?.date || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) exams[req.params.id] = date; else delete exams[req.params.id];
  setSetting('exams', exams);
  return { ok: true, exams };
}));

// ---------- Schwachstellen & Mini-Training ----------
app.get('/api/weak', wrap((req) => findWeakSpots({ limit: Number(req.query.limit) || 5 })));
app.post('/api/weak/drill', wrap(async (req) => createDrill(req.body?.topicId, req.body?.unitIds)));
app.get('/api/drills/:id', wrap((req) => getDrill(req.params.id) || (() => { throw fail('Nicht gefunden', 404); })()));

// ---------- Handy-Zugriff ----------
app.get('/api/whoami', wrap((req) => ({ local: isLocal(req) })));
app.get('/api/remote', wrap(async () => ({ ...(await remoteInfo(PORT)), listening: currentHost })));
app.post('/api/remote', wrap((req) => {
  const on = !!req.body?.enabled;
  setRemote(on);
  const need = on ? '0.0.0.0' : '127.0.0.1';
  if (need !== currentHost) setTimeout(restartServer, 300);   // Server muss mit neuer Netzwerk-Einstellung neu starten
  return { ok: true, restarting: need !== currentHost };
}));
app.post('/api/remote/reset', wrap(() => { resetRemoteToken(); return { ok: true }; }));

// ---------- iPhone-App (offline, Abgleich über iCloud Drive) ----------
app.get('/api/mobile/status', wrap(async () => ({ ...mobileStatus(), qr: await QRCode.toString(MOBILE_URL, { type: 'svg', margin: 1 }) })));
app.post('/api/mobile/sync', wrap(() => mobileSyncNow()));
app.get('/api/mobile/pack', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="MedLearn-Daten.json"');
    res.end(JSON.stringify(buildPack()));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
const jsonUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
app.post('/api/mobile/import', jsonUpload.single('file'), wrap((req) => {
  if (!req.file) throw fail('Bitte die Fortschrittsdatei vom iPhone auswählen.');
  let data; try { data = JSON.parse(req.file.buffer.toString('utf8')); } catch { throw fail('Die Datei ist kein gültiger MedLearn-Fortschritt.'); }
  return importProgress(data);
}));

// ---------- Profil (Name für die Begrüßung, Tagesziel) ----------
app.get('/api/profile', wrap(() => getSetting('profile', { name: '', goal: 50 })));
app.post('/api/profile', wrap((req) => {
  const p = { name: String(req.body?.name || '').trim().slice(0, 40), goal: Math.min(1000, Math.max(5, parseInt(req.body?.goal) || 50)) };
  setSetting('profile', p);
  return p;
}));

// ---------- Einstellungen ----------
const SETTING_KEYS = ['provider', 'claudePath', 'model', 'fastModel', 'apiKey', 'concurrency'];
app.get('/api/settings', wrap(() => { const s = aiSettings(); return { ...s, apiKey: s.apiKey ? '••••' + s.apiKey.slice(-4) : '' }; }));
app.post('/api/settings', wrap((req) => {
  for (const k of SETTING_KEYS) {
    if (!(k in req.body)) continue;
    if (k === 'apiKey' && String(req.body[k]).startsWith('••••')) continue;
    setSetting(k, req.body[k]);
  }
  return { ok: true };
}));
app.post('/api/settings/test', wrap(() => testConnection()));

// ---------- Backups ----------
app.get('/api/backups', wrap(() => ({ dir: BACKUP_DIR, list: listBackups() })));
app.post('/api/backups', wrap(() => ({ name: createBackup('-manuell') })));

const PORT = Number(process.env.PORT) || 3210;
const currentHost = listenHost();
// Beim Neustart nach einem Update kann der alte Prozess den Port noch kurz belegen → einige Sekunden erneut versuchen
function listen(tries = 0) {
  const srv = app.listen(PORT, currentHost, onListening);
  srv.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && tries < 20) return setTimeout(() => listen(tries + 1), 500);
    if (e.code === 'EADDRINUSE') { console.error(`\n  Port ${PORT} ist belegt – läuft MedLearn schon? Öffne http://localhost:${PORT}\n`); process.exit(1); }
    throw e;
  });
}
listen();
function onListening() {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  MedLearn läuft:  ${url}\n  (Beenden mit Strg+C)\n`);
  if (!process.env.MEDLEARN_NO_OPEN) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd, { windowsHide: true }, () => {});
  }
  startMobileSync();   // iPhone-App: Lernstand in iCloud Drive aktuell halten, Antworten vom iPhone übernehmen
  // ältere Skripte im Hintergrund um Zuordnungsaufgaben ergänzen
  setTimeout(() => upgradeMatches().catch((e) => console.warn(e.message)).finally(() => upgradeFigures().catch((e) => console.warn(e.message))), 3000);
}
