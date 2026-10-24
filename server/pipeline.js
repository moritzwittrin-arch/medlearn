// Verarbeitung: PDF → Seiten → Gliederung → Wissensbasis → Lernmaterial
import path from 'node:path';
import { q, one, run, tx, PDF_DIR, setSetting } from './db.js';
import { extractPdf } from './pdf.js';
import { completeJson, aiSettings } from './ai.js';
import { structurePrompt, extractPrompt, generatePrompt, matchPrompt, quizPrompt, UNIT_KINDS } from './prompts.js';
import { processFigures, applyFiguresToTopic } from './figures.js';

const running = new Set();
export const isRunning = (id) => running.has(id);

function setStatus(docId, status, progress, message) {
  run('UPDATE documents SET status=?, progress=?, message=?, error=NULL WHERE id=?', status, progress, message, docId);
}
function getState(docId) { return JSON.parse(one('SELECT state FROM documents WHERE id=?', docId)?.state || '{}'); }
function saveState(docId, s) { run('UPDATE documents SET state=? WHERE id=?', JSON.stringify(s), docId); }

export function processDocument(docId) {
  if (running.has(docId)) return;
  running.add(docId);
  (async () => {
    try {
      await stepPages(docId);
      await stepStructure(docId);
      await stepExtract(docId);
      await stepGenerate(docId);
      await stepFigures(docId);
      const c = one('SELECT COUNT(*) n FROM items WHERE doc_id=?', docId).n;
      setStatus(docId, 'fertig', 1, `Fertig – ${c} Lerninhalte erstellt`);
    } catch (e) {
      console.error('[Verarbeitung]', e);
      run("UPDATE documents SET status='fehler', error=? WHERE id=?", String(e.message || e), docId);
    } finally {
      running.delete(docId);
    }
  })();
}

// ---------- 1. Seiten ----------
async function stepPages(docId) {
  if (one('SELECT COUNT(*) n FROM pages WHERE doc_id=?', docId).n > 0) return;
  setStatus(docId, 'analyse', 0.02, 'PDF wird gelesen …');
  const doc = one('SELECT * FROM documents WHERE id=?', docId);
  const { pages, outline } = await extractPdf(path.join(PDF_DIR, doc.filename));
  const textChars = pages.reduce((s, p) => s + p.text.length, 0);
  if (textChars < 50 * Math.max(1, pages.length / 10)) {
    throw new Error('Das PDF enthält kaum auslesbaren Text (vermutlich eingescannt). Bitte ein PDF mit Textebene verwenden (z. B. vorher OCR durchführen).');
  }
  tx(() => {
    for (const p of pages) {
      run('INSERT INTO pages(doc_id,page,text) VALUES(?,?,?)', docId, p.page, p.text);
      run('INSERT INTO pages_fts(text,doc_id,page) VALUES(?,?,?)', p.text, docId, p.page);
    }
    run('UPDATE documents SET pages=? WHERE id=?', pages.length, docId);
  });
  const st = getState(docId);
  st.headings = pages.map((p) => p.headings);
  st.outline = outline;
  saveState(docId, st);
}

// ---------- 2. Gliederung ----------
async function stepStructure(docId) {
  if (one('SELECT COUNT(*) n FROM chapters WHERE doc_id=?', docId).n > 0) return;
  setStatus(docId, 'analyse', 0.05, 'Kapitel und Themen werden erkannt …');
  const doc = one('SELECT * FROM documents WHERE id=?', docId);
  const st = getState(docId);
  const pages = q('SELECT page, text FROM pages WHERE doc_id=? ORDER BY page', docId)
    .map((p) => ({ ...p, headings: st.headings?.[p.page - 1] || [] }));

  let chapters;
  if (aiSettings().provider === 'offline') {
    chapters = offlineStructure(pages);
  } else {
    const r = await completeJson(structurePrompt({ title: doc.title, pages, outline: st.outline || [] }));
    chapters = r.chapters;
  }
  chapters = normalizeStructure(chapters, pages.length);
  tx(() => {
    chapters.forEach((c, ci) => {
      const cid = run('INSERT INTO chapters(doc_id,title,ord) VALUES(?,?,?)', docId, c.title, ci).lastInsertRowid;
      c.topics.forEach((t, ti) => run('INSERT INTO topics(chapter_id,doc_id,title,ord,page_from,page_to) VALUES(?,?,?,?,?,?)',
        cid, docId, t.title, ti, t.page_from, t.page_to));
    });
  });
}

// Sorgt dafür, dass jede Seite genau einem Thema zugeordnet ist
function normalizeStructure(chapters, nPages) {
  const flat = [];
  for (const c of chapters || []) for (const t of c.topics || []) {
    const a = Math.max(1, Math.min(nPages, parseInt(t.page_from) || 1));
    const b = Math.max(a, Math.min(nPages, parseInt(t.page_to) || a));
    flat.push({ chapter: String(c.title || 'Kapitel').trim(), title: String(t.title || 'Thema').trim(), page_from: a, page_to: b });
  }
  if (!flat.length) flat.push({ chapter: 'Skript', title: 'Gesamtes Skript', page_from: 1, page_to: nPages });
  flat.sort((x, y) => x.page_from - y.page_from);
  // Lücken schließen & Überlappungen beseitigen
  flat[0].page_from = 1;
  for (let i = 0; i < flat.length; i++) {
    const next = flat[i + 1];
    // Thema reicht bis vor den Beginn des nächsten (Lücken werden so geschlossen; gemeinsame Startseite erlaubt)
    flat[i].page_to = next ? Math.max(flat[i].page_from, next.page_from - 1) : nPages;
  }
  const out = [];
  for (const t of flat) {
    let c = out.find((x) => x.title === t.chapter);
    if (!c || out[out.length - 1] !== c) { c = { title: t.chapter, topics: [] }; out.push(c); }
    c.topics.push({ title: t.title, page_from: t.page_from, page_to: t.page_to });
  }
  return out;
}

// ---------- 3. Wissensbasis ----------
function makeChunks(pages, maxChars = 7000) {
  const chunks = [];
  let cur = [];
  let len = 0;
  for (const p of pages) {
    if (cur.length && len + p.text.length > maxChars) { chunks.push(cur); cur = []; len = 0; }
    cur.push(p); len += p.text.length;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

async function stepExtract(docId) {
  const doc = one('SELECT * FROM documents WHERE id=?', docId);
  const st = getState(docId);
  st.extracted = st.extracted || [];
  const pages = q('SELECT page, text FROM pages WHERE doc_id=? ORDER BY page', docId);
  const topics = q(`SELECT t.id, t.title, t.page_from, t.page_to, c.title chapter FROM topics t
                    JOIN chapters c ON c.id=t.chapter_id WHERE t.doc_id=? ORDER BY t.page_from, t.id`, docId);
  const chunks = makeChunks(pages).filter((c) => !st.extracted.includes(c[0].page));
  if (!chunks.length && st.coverageChecked) return;

  let done = 0;
  const total = chunks.length;
  setStatus(docId, 'extraktion', 0.1, `Wissensbasis wird erstellt (0/${total} Abschnitte) …`);

  const doChunk = async (chunk, isRetry = false) => {
    const pFrom = chunk[0].page, pTo = chunk[chunk.length - 1].page;
    const rel = topics.filter((t) => t.page_to >= pFrom && t.page_from <= pTo);
    let units;
    if (aiSettings().provider === 'offline') units = offlineExtract(chunk, rel);
    else {
      const chunkText = chunk.map((p) => `[[Seite ${p.page}]]\n${p.text}`).join('\n\n');
      const r = await completeJson(extractPrompt({ title: doc.title, chunkText, topics: rel }));
      units = r.units || [];
    }
    tx(() => {
      if (isRetry) run('DELETE FROM units WHERE doc_id=? AND page BETWEEN ? AND ?', docId, pFrom, pTo);
      let ord = 0;
      for (const u of units) {
        const content = String(u.c || u.content || '').trim();
        if (!content) continue;
        let page = parseInt(u.p) || pFrom;
        if (page < pFrom || page > pTo) page = pFrom;
        let tid = parseInt(String(u.t).replace(/\D/g, ''));
        if (!rel.some((t) => t.id === tid)) tid = (rel.find((t) => page >= t.page_from && page <= t.page_to) || rel[0]).id;
        const kind = UNIT_KINDS.includes(u.k) ? u.k : 'fakt';
        const id = run('INSERT INTO units(topic_id,doc_id,page,kind,content,ord) VALUES(?,?,?,?,?,?)',
          tid, docId, page, kind, content, page * 1000 + ord++).lastInsertRowid;
        run('INSERT INTO units_fts(content,unit_id) VALUES(?,?)', content, id);
      }
    });
    if (!isRetry) {
      const s2 = getState(docId); s2.extracted = [...(s2.extracted || []), pFrom]; saveState(docId, s2);
      done++;
      setStatus(docId, 'extraktion', 0.1 + 0.45 * (done / total), `Wissensbasis wird erstellt (${done}/${total} Abschnitte) …`);
    }
  };
  await Promise.all(chunks.map((c) => doChunk(c)));

  // Vollständigkeitsprüfung: Seiten mit viel Text, aber ohne Wissenseinheiten erneut verarbeiten
  const s3 = getState(docId);
  if (!s3.coverageChecked && aiSettings().provider !== 'offline') {
    const empty = q(`SELECT p.page, p.text FROM pages p WHERE p.doc_id=? AND length(p.text) > 400
                     AND NOT EXISTS (SELECT 1 FROM units u WHERE u.doc_id=p.doc_id AND u.page=p.page)`, docId);
    if (empty.length) {
      setStatus(docId, 'extraktion', 0.56, `Vollständigkeitsprüfung: ${empty.length} Seite(n) werden nachbearbeitet …`);
      await Promise.all(empty.map((p) => doChunk([p], true).catch((e) => console.warn('Nachbearbeitung', e.message))));
    }
  }
  s3.coverageChecked = true;
  saveState(docId, s3);
}

// ---------- 4. Lernmaterial ----------
async function stepGenerate(docId) {
  const topics = q(`SELECT t.*, c.title chapter FROM topics t JOIN chapters c ON c.id=t.chapter_id
                    WHERE t.doc_id=? AND t.gen_status != 'fertig' ORDER BY t.page_from`, docId);
  const totalTopics = one('SELECT COUNT(*) n FROM topics WHERE doc_id=?', docId).n;
  let done = totalTopics - topics.length;
  const progress = () => setStatus(docId, 'generierung', 0.58 + 0.42 * (done / totalTopics),
    `Lernmaterial wird erstellt (${done}/${totalTopics} Themen) …`);
  progress();
  await Promise.all(topics.map(async (t) => {
    try {
      await generateForTopic(t);
      run("UPDATE topics SET gen_status='fertig' WHERE id=?", t.id);
    } catch (e) {
      console.error('[Generierung]', t.title, e.message);
      run("UPDATE topics SET gen_status='fehler' WHERE id=?", t.id);
    }
    done++; progress();
  }));
  const failed = one("SELECT COUNT(*) n FROM topics WHERE doc_id=? AND gen_status='fehler'", docId).n;
  if (failed) throw new Error(`${failed} Thema/Themen konnten nicht verarbeitet werden. "Fortsetzen" versucht es erneut.`);
}

// ---------- 5. Abbildungen ----------
async function stepFigures(docId) {
  try {
    await processFigures(docId, (msg, prog) => setStatus(docId, 'abbildungen', 0.9 + 0.1 * (prog || 0), msg));
    // Bildfragen für Themen mit lernrelevanten Abbildungen
    const ts = q(`SELECT DISTINCT t.*, c.title chapter FROM topics t JOIN chapters c ON c.id=t.chapter_id JOIN figures f ON f.topic_id=t.id
      WHERE t.doc_id=? AND f.relevant=1`, docId);
    await Promise.all(ts.map((t) => generateQuiz(t).catch((e) => console.warn('[Bildfragen]', e.message))));
  } catch (e) {
    // Abbildungen sind ein Zusatz – Fehler hier sollen das Skript nicht blockieren
    console.warn('[Abbildungen]', e.message);
  }
}

export async function generateForTopic(topic) {
  const units = q('SELECT * FROM units WHERE topic_id=? ORDER BY ord', topic.id);
  run('DELETE FROM items WHERE topic_id=?', topic.id);
  if (!units.length) return;
  const byId = new Map(units.map((u) => [u.id, u]));

  const save = (kind, data, uids) => {
    const ids = (Array.isArray(uids) ? uids : []).map((x) => parseInt(String(x).replace(/\D/g, ''))).filter((x) => byId.has(x));
    const pages = [...new Set(ids.map((i) => byId.get(i).page))].sort((a, b) => a - b);
    run('INSERT INTO items(topic_id,doc_id,kind,data,unit_ids,pages) VALUES(?,?,?,?,?,?)',
      topic.id, topic.doc_id, kind, JSON.stringify(data), JSON.stringify(ids), JSON.stringify(pages));
    return ids;
  };

  if (aiSettings().provider === 'offline') {
    tx(() => offlineGenerate(units).forEach((it) => save(it.kind, it.data, it.u)));
    run("UPDATE topics SET match_status='keine' WHERE id=?", topic.id);
    return;
  }

  const covered = new Set();
  const batches = [];
  for (let i = 0; i < units.length; i += 30) batches.push(units.slice(i, i + 30));
  for (const b of batches) {
    const r = await completeJson(generatePrompt({ topic, units: b }));
    tx(() => {
      for (const f of r.flashcards || []) if (f.q && f.a) save('flashcard', { q: f.q, a: f.a }, f.u).forEach((i) => covered.add(i));
      for (const c of r.cloze || []) if (c.text && /\{\{.+?\}\}/.test(c.text)) save('cloze', { text: c.text }, c.u);
      for (const m of r.mc || []) {
        if (!m.stem || !Array.isArray(m.options) || m.options.length < 4) continue;
        const correct = Number(m.correct);
        if (!(correct >= 0 && correct < m.options.length)) continue;
        save('mc', { type: m.type || 'wissen', stem: m.stem, options: m.options, correct,
          explanation: m.explanation || '', why_wrong: m.why_wrong || [], ki: m.ki || '' }, m.u);
      }
      for (const o of r.open || []) if (o.q) save('open', { q: o.q, answer: o.answer || '', points: o.points || [] }, o.u);
      for (const c of r.cases || []) if (c.vignette && c.q) save('case', { vignette: c.vignette, q: c.q, answer: c.answer || '', explanation: c.explanation || '', ki: c.ki || '' }, c.u);
    });
  }
  // Abdeckung: Einheiten ohne Karteikarte nachträglich abdecken (kein Informationsverlust)
  const missing = units.filter((u) => !covered.has(u.id));
  if (missing.length) {
    for (let i = 0; i < missing.length; i += 30) {
      const r = await completeJson(generatePrompt({ topic, units: missing.slice(i, i + 30), onlyFlashcards: true }));
      tx(() => { for (const f of r.flashcards || []) if (f.q && f.a) save('flashcard', { q: f.q, a: f.a }, f.u); });
    }
  }
  applyFiguresToTopic(topic.id);   // Bildkarten für den Anki-Export
  await generateQuiz(topic);
  run("UPDATE topics SET quiz_status='fertig' WHERE id=?", topic.id);
}

// ---------- Quizfragen für die App: nur Single Choice + Multiple Choice ----------
// Ergänzt nur, was fehlt: Wissenseinheiten ohne Quizfrage und lernrelevante Abbildungen ohne Bildfrage.
export async function generateQuiz(topic) {
  if (aiSettings().provider === 'offline') return 0;
  const units = q('SELECT * FROM units WHERE topic_id=? ORDER BY ord', topic.id);
  if (!units.length) return 0;
  const byId = new Map(units.map((u) => [u.id, u]));
  const parse = (x, d) => { try { return JSON.parse(x); } catch { return d; } };
  const quiz = () => q("SELECT data, unit_ids FROM items WHERE topic_id=? AND kind IN ('mc','mcm')", topic.id);
  const covered = () => new Set(quiz().flatMap((i) => parse(i.unit_ids, [])));
  const figDone = () => new Set(quiz().map((i) => parse(i.data, {}).fig).filter(Boolean));
  const figs = q("SELECT id, page, title, description, labels FROM figures WHERE topic_id=? AND relevant=1 AND status='fertig'", topic.id)
    .map((f) => ({ ...f, labels: parse(f.labels, []) }));
  const save = (kind, data, uids) => {
    const ids = (Array.isArray(uids) ? uids : []).map((x) => parseInt(String(x).replace(/\D/g, ''))).filter((x) => byId.has(x));
    const pages = [...new Set(ids.map((i) => byId.get(i).page))].sort((a, b) => a - b);
    run('INSERT INTO items(topic_id,doc_id,kind,data,unit_ids,pages) VALUES(?,?,?,?,?,?)',
      topic.id, topic.doc_id, kind, JSON.stringify(data), JSON.stringify(ids), JSON.stringify(pages));
  };
  const figIds = new Set(figs.map((f) => f.id));
  let added = 0;
  for (let pass = 0; pass < 2; pass++) {
    const cov = covered(), fd = figDone();
    const missing = units.filter((u) => !cov.has(u.id));
    const figTodo = figs.filter((f) => !fd.has(f.id));
    if (!missing.length && !figTodo.length) break;
    const batches = [];
    for (let i = 0; i < missing.length; i += 25) batches.push(missing.slice(i, i + 25));
    if (!batches.length) batches.push([]);
    for (const [bi, b] of batches.entries()) {
      const r = await completeJson(quizPrompt({ topic, units: b.length ? b : units.slice(0, 25), figures: bi === 0 ? figTodo : [] }));
      tx(() => {
        for (const m of [...(r.sc || []), ...(r.mc || [])]) {
          if (!m.stem || !Array.isArray(m.options) || m.options.length < 4) continue;
          const n = m.options.length;
          const corr = [...new Set((Array.isArray(m.correct) ? m.correct : [m.correct]).map(Number).filter((x) => x >= 0 && x < n))].sort((a, b) => a - b);
          if (!corr.length || corr.length === n) continue;
          const fig = figIds.has(Number(m.fig)) ? Number(m.fig) : undefined;
          const base = { type: m.type || 'wissen', stem: m.stem, options: m.options, explanation: m.explanation || '', ki: m.ki || '', ...(fig ? { fig } : {}) };
          const why = Array.isArray(m.why) ? m.why : Array.isArray(m.why_wrong) ? m.why_wrong : [];
          if (corr.length === 1) save('mc', { ...base, correct: corr[0], why_wrong: why.map((w, j) => (j === corr[0] ? '' : w)) }, m.u);
          else save('mcm', { ...base, correct: corr, why }, m.u);
          added++;
        }
      });
    }
  }
  return added;
}

// Bestehende Skripte im Hintergrund auf das neue Quiz umstellen (wird nach Neustart fortgesetzt).
// Ist das Claude-Nutzungslimit erreicht, pausiert die Umstellung und versucht es alle 30 Minuten erneut.
let quizUpgrading = false;
let quizRetry = null;
const quizCounts = () => one(`SELECT COUNT(*) total, SUM(CASE WHEN t.quiz_status='fertig' THEN 1 ELSE 0 END) done
  FROM topics t JOIN documents d ON d.id=t.doc_id WHERE t.gen_status='fertig' AND d.status='fertig'`);
export async function upgradeQuiz() {
  if (quizUpgrading || aiSettings().provider === 'offline') return;
  quizUpgrading = true;
  clearTimeout(quizRetry); quizRetry = null;
  try {
    const topics = q(`SELECT t.*, c.title chapter FROM topics t JOIN chapters c ON c.id=t.chapter_id JOIN documents d ON d.id=t.doc_id
      WHERE t.gen_status='fertig' AND t.quiz_status IS NULL AND d.status='fertig' ORDER BY d.id, t.page_from`);
    if (!topics.length) { setSetting('quizUpgrade', null); return; }
    const status = (extra = {}) => { const c = quizCounts(); setSetting('quizUpgrade', { done: c.done || 0, total: c.total, ...extra }); };
    status();
    console.log(`  Quizfragen werden für ${topics.length} Themen ergänzt (Hintergrund) …`);
    let failed = 0, stop = false;
    // in kleinen Gruppen, damit bei erreichtem Limit nicht alle restlichen Themen sofort fehlschlagen
    for (let i = 0; i < topics.length && !stop; i += 4) {
      await Promise.all(topics.slice(i, i + 4).map(async (t) => {
        if (running.has(t.doc_id) || stop) return;
        try { await generateQuiz(t); run("UPDATE topics SET quiz_status='fertig' WHERE id=?", t.id); failed = 0; }
        catch (e) { console.warn('  Quiz', t.title, e.message); if (++failed >= 4) stop = true; }
      }));
      status();
    }
    const c = quizCounts();
    if ((c.done || 0) < c.total) {
      const next = new Date(Date.now() + 30 * 60 * 1000);
      status({ paused: true, next: next.toISOString() });
      console.log(`  Quiz-Umstellung pausiert (vermutlich Nutzungslimit) – nächster Versuch ${next.toLocaleTimeString('de-AT')}`);
      quizRetry = setTimeout(() => upgradeQuiz().catch(() => {}), 30 * 60 * 1000);
    } else setSetting('quizUpgrade', null);
  } finally { quizUpgrading = false; }
}

// ---------- Zuordnungsaufgaben (Drag & Drop) ----------
export async function generateMatches(topic) {
  const units = q('SELECT * FROM units WHERE topic_id=? ORDER BY ord', topic.id);
  run("DELETE FROM items WHERE topic_id=? AND kind='match'", topic.id);
  if (units.length < 3 || aiSettings().provider === 'offline') {
    run("UPDATE topics SET match_status='keine' WHERE id=?", topic.id);
    return 0;
  }
  const byId = new Map(units.map((u) => [u.id, u]));
  const r = await completeJson(matchPrompt({ topic, units: units.slice(0, 120) }));
  let n = 0;
  tx(() => {
    for (const m of r.match || []) {
      const pairs = (m.pairs || []).map((p) => ({ l: String(p.l || '').trim(), r: String(p.r || '').trim() })).filter((p) => p.l && p.r);
      const uniq = (k) => new Set(pairs.map((p) => p[k].toLowerCase())).size === pairs.length;
      if (pairs.length < 3 || pairs.length > 8 || !uniq('l') || !uniq('r')) continue;
      const ids = (Array.isArray(m.u) ? m.u : []).map((x) => parseInt(String(x).replace(/\D/g, ''))).filter((x) => byId.has(x));
      const pages = [...new Set(ids.map((i) => byId.get(i).page))].sort((a, b) => a - b);
      run('INSERT INTO items(topic_id,doc_id,kind,data,unit_ids,pages) VALUES(?,?,?,?,?,?)', topic.id, topic.doc_id, 'match',
        JSON.stringify({ title: String(m.title || 'Ordne richtig zu'), pairs }), JSON.stringify(ids), JSON.stringify(pages));
      n++;
    }
    run("UPDATE topics SET match_status='fertig' WHERE id=?", topic.id);
  });
  return n;
}

// Bestehende Skripte (aus älteren Versionen) einmalig um Zuordnungsaufgaben ergänzen – läuft im Hintergrund
let upgrading = false;
export async function upgradeMatches() {
  if (upgrading || aiSettings().provider === 'offline') return;
  upgrading = true;
  try {
    const topics = q(`SELECT t.*, c.title chapter FROM topics t JOIN chapters c ON c.id=t.chapter_id
                      JOIN documents d ON d.id=t.doc_id
                      WHERE t.gen_status='fertig' AND t.match_status IS NULL AND d.status='fertig' ORDER BY t.doc_id, t.page_from`);
    if (!topics.length) return;
    console.log(`  Zuordnungsaufgaben werden für ${topics.length} Themen ergänzt (Hintergrund) …`);
    const counts = await Promise.all(topics.map(async (t) => {
      if (running.has(t.doc_id)) return 0;
      try { return await generateMatches(t); } catch (e) { console.warn('  Zuordnung', t.title, e.message); return 0; }
    }));
    const total = counts.reduce((x, y) => x + y, 0);
    console.log(`  ✓ ${total} Zuordnungsaufgaben ergänzt`);
  } finally { upgrading = false; }
}

// ---------- Offline-Fallback (ohne KI, nur Grundfunktionen) ----------
function offlineStructure(pages) {
  const topics = [];
  for (const p of pages) {
    const h = p.headings[0];
    if (h || !topics.length) topics.push({ title: h || `Seiten ab ${p.page}`, page_from: p.page, page_to: p.page });
    else topics[topics.length - 1].page_to = p.page;
  }
  return [{ title: 'Skript', topics }];
}
function offlineExtract(chunk, rel) {
  const units = [];
  for (const p of chunk) {
    const t = rel.find((x) => p.page >= x.page_from && p.page <= x.page_to) || rel[0];
    const parts = p.text.replace(/\n(?=[a-zäöüß])/g, ' ').split(/(?<=[.!?])\s+|\n/).map((s) => s.trim()).filter((s) => s.length > 25 && !/^\d+(\.\d+)*\s+\S+(\s+\S+){0,5}$/.test(s));
    for (const s of parts) units.push({ t: t.id, p: p.page, k: /\d/.test(s) ? 'zahl' : 'fakt', c: s });
  }
  return units;
}
function offlineGenerate(units) {
  const items = [];
  for (const u of units) {
    const m = u.content.match(/(\d+[\d.,]*\s*(%|mg|g|mmHg|ml|mmol\/l|mg\/dl|Jahre|h|min)?)/);
    const m2 = u.content.match(/^(.{4,60}?)\s+(ist|sind|bezeichnet|beträgt|wird definiert als)\s+(.+)$/);
    if (m) items.push({ kind: 'cloze', data: { text: u.content.replace(m[1], `{{${m[1]}}}`) }, u: [u.id] });
    if (m2) items.push({ kind: 'flashcard', data: { q: `${m2[1]} ${m2[2]} …?`, a: m2[3] }, u: [u.id] });
    else if (!m) items.push({ kind: 'flashcard', data: { q: 'Ergänze/erkläre: ' + u.content.split(/\s+/).slice(0, 5).join(' ') + ' …', a: u.content }, u: [u.id] });
  }
  return items;
}

// Ältere Skripte im Hintergrund um Abbildungen ergänzen (einmalig; bei Abbruch beim nächsten Start weiter)
let figUpgrading = false;
export async function upgradeFigures() {
  if (figUpgrading) return;
  figUpgrading = true;
  try {
    const docs = q(`SELECT id, title FROM documents WHERE status='fertig' AND (figures_status IS NULL OR figures_status='gefunden') ORDER BY id`);
    for (const d of docs) {
      if (running.has(d.id)) continue;
      running.add(d.id);
      try {
        await processFigures(d.id, (msg, prog) => run("UPDATE documents SET status='abbildungen', progress=?, message=? WHERE id=?", 0.9 + 0.1 * (prog || 0), msg, d.id));
        const ts = q(`SELECT DISTINCT t.*, c.title chapter FROM topics t JOIN chapters c ON c.id=t.chapter_id JOIN figures f ON f.topic_id=t.id
          WHERE t.doc_id=? AND f.relevant=1`, d.id);
        await Promise.all(ts.map((t) => generateQuiz(t).catch((e) => console.warn('[Bildfragen]', e.message))));
        const n = one("SELECT COUNT(*) n FROM figures WHERE doc_id=? AND relevant=1", d.id).n;
        console.log(`  ✓ ${d.title}: ${n} lernrelevante Abbildungen`);
      } catch (e) { console.warn('  Abbildungen', d.title, e.message); }
      finally {
        run("UPDATE documents SET status='fertig', progress=1 WHERE id=? AND status='abbildungen'", d.id);
        running.delete(d.id);
      }
    }
  } finally { figUpgrading = false; }
}
