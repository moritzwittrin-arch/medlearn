// Schwachstellen: erkennt anhand der Antworten, welche Wissenseinheiten (Unterpunkte) wiederholt falsch beantwortet werden,
// und erstellt daraus ein gezieltes Mini-Training statt das ganze Kapitel zu wiederholen.
import crypto from 'node:crypto';
import { db, q, one, run, tx, ITEM_OK } from './db.js';
import { completeJson, aiSettings } from './ai.js';

db.exec(`CREATE TABLE IF NOT EXISTS weak_drills (
  id INTEGER PRIMARY KEY, topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  unit_key TEXT NOT NULL, unit_ids TEXT NOT NULL, title TEXT, summary TEXT, item_ids TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
)`);

const RECENT = 6;        // letzte Versuche pro Wissenseinheit
const MIN_WRONG = 2;     // mindestens so oft zuletzt falsch …
const MIN_RATE = 0.4;    // … und mindestens dieser Anteil falsch

const unitKey = (ids) => crypto.createHash('sha1').update([...ids].sort((a, b) => a - b).join(',')).digest('hex').slice(0, 16);
const parse = (s, d) => { try { return JSON.parse(s); } catch { return d; } };

function questionText(kind, d) {
  return String(d.q || d.stem || d.vignette || d.title || d.text || '').replace(/\{\{(.+?)\}\}/g, '___').slice(0, 300);
}
function correctText(kind, d) {
  if (kind === 'mc') return d.options?.[d.correct] || '';
  if (kind === 'case') return d.answer || '';
  if (kind === 'cloze') return (String(d.text || '').match(/\{\{(.+?)\}\}/g) || []).map((x) => x.slice(2, -2)).join('; ');
  if (kind === 'match') return (d.pairs || []).map((p) => `${p.l} → ${p.r}`).join('; ');
  return String(d.a || d.answer || '').slice(0, 300);
}

/** Schwachstellen-Cluster (pro Thema die zuletzt wiederholt falsch beantworteten Wissenseinheiten). */
export function findWeakSpots({ limit = 5, scope = null } = {}) {
  const rows = q(`SELECT r.item_id, r.correct, r.ts, r.answer, i.kind, i.data, i.unit_ids, i.topic_id
    FROM review_log r JOIN items i ON i.id = r.item_id
    WHERE r.ts >= datetime('now', '-90 days') AND ${ITEM_OK} ORDER BY r.ts`);
  const byUnit = new Map();
  for (const r of rows) {
    for (const u of parse(r.unit_ids, [])) {
      if (!byUnit.has(u)) byUnit.set(u, []);
      byUnit.get(u).push(r);
    }
  }
  const weakByTopic = new Map();
  for (const [u, ev] of byUnit) {
    const last = ev.slice(-RECENT);
    const wrong = last.filter((e) => !e.correct).length;
    // die letzten beiden Versuche richtig → gilt als behoben
    const fixed = last.length >= 2 && last.slice(-2).every((e) => e.correct);
    if (wrong < MIN_WRONG || wrong / last.length < MIN_RATE || fixed) continue;
    const t = last[last.length - 1].topic_id;
    if (!weakByTopic.has(t)) weakByTopic.set(t, { units: new Map(), wrong: 0, attempts: 0, mistakes: new Map() });
    const c = weakByTopic.get(t);
    c.units.set(u, { wrong, attempts: last.length });
    c.wrong += wrong; c.attempts += last.length;
    for (const e of last) if (!e.correct && !c.mistakes.has(e.item_id)) c.mistakes.set(e.item_id, e);
  }
  const out = [];
  for (const [topicId, c] of weakByTopic) {
    const t = one(`SELECT t.id, t.title, c.title chapter, s.name subject, s.id subject_id, d.folder_id, d.id doc_id
      FROM topics t JOIN chapters c ON c.id=t.chapter_id JOIN documents d ON d.id=t.doc_id JOIN subjects s ON s.id=d.subject_id WHERE t.id=?`, topicId);
    if (!t) continue;
    if (scope?.type === 'subject' && t.subject_id !== Number(scope.id)) continue;
    const ids = [...c.units.keys()];
    const units = q(`SELECT id, content FROM units WHERE id IN (SELECT value FROM json_each(?)) ORDER BY ord`, JSON.stringify(ids));
    const acc = one(`SELECT COUNT(*) seen, SUM(CASE WHEN st.last_rating >= 3 THEN 1 ELSE 0 END) ok FROM items i JOIN item_state st ON st.item_id=i.id
      WHERE i.topic_id=? AND ${ITEM_OK}`, topicId);
    const key = unitKey(ids);
    const drill = one('SELECT id, title, summary, item_ids FROM weak_drills WHERE topic_id=? AND unit_key=? ORDER BY id DESC', topicId, key);
    out.push({
      key, topicId, topic: t.title, chapter: t.chapter, subject: t.subject, unitIds: ids,
      units: units.map((u) => ({ id: u.id, content: u.content })),
      wrong: c.wrong, mistakes: c.mistakes.size,
      topicAccuracy: acc.seen ? Math.round(100 * (acc.ok || 0) / acc.seen) : null,
      drill: drill ? { id: drill.id, title: drill.title, summary: drill.summary, items: parse(drill.item_ids, []).length } : null,
    });
  }
  out.sort((a, b) => b.wrong - a.wrong || b.mistakes - a.mistakes);
  return out.slice(0, limit);
}

function drillPrompt({ topic, units, mistakes }) {
  const ul = units.map((u) => `[u${u.id}] ${u.content}`).join('\n');
  const ml = mistakes.map((m, i) => `${i + 1}. Frage: ${m.q}\n   Gewählt/geantwortet: ${m.given || '(Karte als „nicht gewusst“ bewertet)'}\n   Richtig wäre: ${m.right}`).join('\n');
  return `Ein Medizinstudent lernt das Thema „${topic}“. Er beantwortet bestimmte Unterpunkte wiederholt falsch.

WISSENSEINHEITEN AUS SEINEM SKRIPT, BEI DENEN ER FEHLER MACHT:
${ul}

SEINE LETZTEN FALSCHEN ANTWORTEN:
${ml}

Aufgabe:
1. Finde heraus, was genau er verwechselt oder nicht verstanden hat (z. B. zwei ähnliche Krankheitsbilder, Grenzwerte, Zuordnungen). Benenne es kurz.
2. Erstelle ein gezieltes Mini-Training, das genau diese Lücke schließt – nicht das ganze Thema:
   - "cards": 3–4 Kontrast-Karteikarten, die die Unterscheidungsmerkmale direkt gegenüberstellen ("Woran unterscheidest du X von Y?", "Welcher Befund spricht für X statt Y?"). Antworten knapp, gern mit Stichpunkten.
   - "mc": 2–3 Single-Best-Answer-Fragen mit genau 5 Optionen, die genau die Verwechslung prüfen. Distraktoren plausibel, ähnlich lang und ähnlich aufgebaut wie die richtige Antwort; die richtige Antwort darf nicht die längste sein. why_wrong hat genau 5 Einträge (für die richtige Option leerer String).
   - "match": 1 Zuordnungsaufgabe mit 3–5 Paaren, die die Merkmale der verwechselten Begriffe gegenüberstellt (nur wenn sinnvoll, sonst leeres Array).
3. Nutze ausschließlich Inhalte aus den Wissenseinheiten. Wenn ergänzendes Wissen zum Verständnis nötig ist, schreibe es nur in das Feld "ki".
4. "u" verweist auf die IDs der Wissenseinheiten (Zahl ohne "u").

Antworte NUR mit JSON:
{"title":"Kurzname der Schwachstelle, max. 60 Zeichen, z. B. Eisenmangelanämie vs. Anämie bei chronischer Entzündung",
 "summary":"2–3 Sätze in Du-Form direkt an den Lernenden (nicht „der Student“): was du verwechselst und woran du es sicher unterscheidest",
 "cards":[{"q":"…","a":"…","u":[1]}],
 "mc":[{"stem":"…","options":["…","…","…","…","…"],"correct":0,"explanation":"…","why_wrong":["","…","…","…","…"],"u":[1],"ki":""}],
 "match":[{"title":"…","pairs":[{"l":"…","r":"…"}],"u":[1]}]}`;
}

/** Mini-Training für ein Schwachstellen-Cluster erstellen (oder vorhandenes zurückgeben). */
export async function createDrill(topicId, unitIds) {
  topicId = Number(topicId);
  const ids = [...new Set((unitIds || []).map(Number).filter(Boolean))];
  if (!ids.length) throw Object.assign(new Error('Keine Wissenseinheiten angegeben'), { status: 400 });
  const key = unitKey(ids);
  const existing = one('SELECT * FROM weak_drills WHERE topic_id=? AND unit_key=? ORDER BY id DESC', topicId, key);
  if (existing) return { id: existing.id, title: existing.title, summary: existing.summary, items: parse(existing.item_ids, []).length };

  const topic = one('SELECT * FROM topics WHERE id=?', topicId);
  if (!topic) throw Object.assign(new Error('Thema nicht gefunden'), { status: 404 });
  const units = q(`SELECT id, page, content FROM units WHERE id IN (SELECT value FROM json_each(?)) ORDER BY ord`, JSON.stringify(ids));
  const byId = new Map(units.map((u) => [u.id, u]));

  // Bestehende Lerninhalte zu diesen Einheiten (insb. die falsch beantworteten) kommen immer mit ins Training
  const related = q(`SELECT i.id, i.kind, i.data, i.unit_ids,
      (SELECT COUNT(*) FROM review_log r WHERE r.item_id=i.id AND r.correct=0) wrongs,
      (SELECT answer FROM review_log r WHERE r.item_id=i.id AND r.correct=0 ORDER BY r.ts DESC LIMIT 1) last_answer
    FROM items i WHERE i.topic_id=? AND ${ITEM_OK}`, topicId)
    .filter((i) => parse(i.unit_ids, []).some((u) => byId.has(u)));
  const wrongItems = related.filter((i) => i.wrongs > 0).sort((a, b) => b.wrongs - a.wrongs);
  const keepIds = [...wrongItems.slice(0, 6), ...related.filter((i) => !i.wrongs).slice(0, 2)].map((i) => i.id);

  let title = topic.title, summary = '';
  const newIds = [];
  if (aiSettings().provider !== 'offline') {
    const mistakes = wrongItems.slice(0, 8).map((i) => {
      const d = parse(i.data, {});
      return { q: questionText(i.kind, d), given: i.kind === 'mc' ? i.last_answer : '', right: correctText(i.kind, d) };
    });
    const r = await completeJson(drillPrompt({ topic: topic.title, units, mistakes }));
    title = String(r.title || topic.title).slice(0, 80);
    summary = String(r.summary || '').slice(0, 600);
    const save = (kind, data, uids) => {
      const uu = (Array.isArray(uids) ? uids : []).map((x) => parseInt(String(x).replace(/\D/g, ''))).filter((x) => byId.has(x));
      const use = uu.length ? uu : ids;
      const pages = [...new Set(use.map((i) => byId.get(i)?.page).filter(Boolean))].sort((a, b) => a - b);
      newIds.push(Number(run('INSERT INTO items(topic_id,doc_id,kind,data,unit_ids,pages) VALUES(?,?,?,?,?,?)',
        topicId, topic.doc_id, kind, JSON.stringify(data), JSON.stringify(use), JSON.stringify(pages)).lastInsertRowid));
    };
    tx(() => {
      for (const c of r.cards || []) if (c.q && c.a) save('flashcard', { q: c.q, a: c.a, drill: true }, c.u);
      for (const m of r.mc || []) {
        const correct = Number(m.correct);
        if (!m.stem || !Array.isArray(m.options) || m.options.length < 4 || !(correct >= 0 && correct < m.options.length)) continue;
        save('mc', { type: 'wissen', stem: m.stem, options: m.options, correct, explanation: m.explanation || '', why_wrong: m.why_wrong || [], ki: m.ki || '', drill: true }, m.u);
      }
      for (const mt of r.match || []) {
        const pairs = (mt.pairs || []).filter((p) => p.l && p.r);
        if (pairs.length >= 3) save('match', { title: mt.title || 'Ordne zu', pairs: pairs.slice(0, 6), drill: true }, mt.u);
      }
    });
  }
  const itemIds = [...newIds, ...keepIds];
  const id = Number(run('INSERT INTO weak_drills(topic_id,unit_key,unit_ids,title,summary,item_ids) VALUES(?,?,?,?,?,?)',
    topicId, key, JSON.stringify(ids), title, summary, JSON.stringify(itemIds)).lastInsertRowid);
  return { id, title, summary, items: itemIds.length };
}

export function getDrill(id) {
  const d = one('SELECT * FROM weak_drills WHERE id=?', Number(id));
  if (!d) return null;
  return { id: d.id, topicId: d.topic_id, title: d.title, summary: d.summary, items: parse(d.item_ids, []).length };
}
