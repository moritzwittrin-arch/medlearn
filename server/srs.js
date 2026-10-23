// Spaced Repetition mit FSRS (ts-fsrs) + Sessions + Fehler
import { fsrs, generatorParameters, createEmptyCard, TypeConvert, Rating } from 'ts-fsrs';
import { q, one, run, tx, ITEM_OK, getSetting } from './db.js';

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));
const nowIso = () => new Date().toISOString();

export function review(itemId, rating, { correct = rating >= 3, answer = null, mistake = null } = {}) {
  rating = Math.min(4, Math.max(1, parseInt(rating) || 1));
  const item = one('SELECT * FROM items WHERE id=?', itemId);
  if (!item) throw new Error('Lerninhalt nicht gefunden');
  const st = one('SELECT * FROM item_state WHERE item_id=?', itemId);
  const now = new Date();
  const card = st ? TypeConvert.card(JSON.parse(st.card)) : createEmptyCard(now);
  const { card: next } = scheduler.next(card, now, [0, Rating.Again, Rating.Hard, Rating.Good, Rating.Easy][rating]);
  tx(() => {
    run(`INSERT INTO item_state(item_id,card,due,reps,lapses,wrong,last_rating,last_review)
         VALUES(?,?,?,?,?,?,?,?)
         ON CONFLICT(item_id) DO UPDATE SET card=excluded.card, due=excluded.due, reps=excluded.reps,
           lapses=excluded.lapses, wrong=item_state.wrong + ?, last_rating=excluded.last_rating, last_review=excluded.last_review`,
      itemId, JSON.stringify(next), next.due.toISOString(), next.reps, next.lapses, correct ? 0 : 1, rating, now.toISOString(),
      correct ? 0 : 1);
    run('INSERT INTO review_log(item_id,rating,correct,answer) VALUES(?,?,?,?)', itemId, rating, correct ? 1 : 0, answer);
    if (!correct) {
      run('INSERT INTO mistakes(item_id,topic_id,description,user_answer) VALUES(?,?,?,?)',
        itemId, item.topic_id, mistake || defaultMistake(item), answer);
    } else if (rating >= 3) {
      run('UPDATE mistakes SET resolved=1 WHERE item_id=? AND resolved=0', itemId);
    }
  });
  return { due: next.due.toISOString(), intervalDays: Math.round((next.due - now) / 864e5 * 10) / 10 };
}

function defaultMistake(item) {
  const d = JSON.parse(item.data);
  if (item.kind === 'flashcard') return `Nicht gewusst: ${d.q}`;
  if (item.kind === 'cloze') return `Lücke nicht gewusst: ${d.text.replace(/\{\{(.+?)\}\}/g, '[$1]')}`;
  if (item.kind === 'open') return `Lückenhaft beantwortet: ${d.q}`;
  if (item.kind === 'match') return `Zuordnung fehlerhaft: ${d.title}`;
  if (item.kind === 'case') return `Fall falsch: ${d.answer}`;
  return `Falsch beantwortet: ${d.stem || d.q || ''}`;
}

// Gibt Vorschau der nächsten Intervalle für die vier Bewertungsknöpfe
export function previewIntervals(itemId) {
  const st = one('SELECT card FROM item_state WHERE item_id=?', itemId);
  const now = new Date();
  const card = st ? TypeConvert.card(JSON.parse(st.card)) : createEmptyCard(now);
  const rec = scheduler.repeat(card, now);
  const fmt = (d) => {
    const m = (d - now) / 60000;
    if (m < 60) return `${Math.max(1, Math.round(m))} min`;
    if (m < 1440) return `${Math.round(m / 60)} h`;
    const days = m / 1440;
    return days < 30 ? `${Math.round(days)} d` : days < 365 ? `${Math.round(days / 30)} Mo` : `${(days / 365).toFixed(1)} J`;
  };
  return [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((r) => fmt(rec[r].card.due));
}

// ---------- Filter (Fach / Dokument / Kapitel / Thema) ----------
export function scopeSql(scope) {
  if (!scope || !scope.type || scope.type === 'all') return { sql: '1=1', params: [] };
  const id = parseInt(scope.id);
  switch (scope.type) {
    case 'subject': return { sql: 'i.doc_id IN (SELECT id FROM documents WHERE subject_id=?)', params: [id] };
    case 'drill': return { sql: "i.id IN (SELECT value FROM json_each((SELECT item_ids FROM weak_drills WHERE id=?)))", params: [id] };
    case 'folder': return { sql: 'i.doc_id IN (SELECT id FROM documents WHERE folder_id=?)', params: [id] };
    case 'document': return { sql: 'i.doc_id=?', params: [id] };
    case 'chapter': return { sql: 'i.topic_id IN (SELECT id FROM topics WHERE chapter_id=?)', params: [id] };
    case 'topic': return { sql: 'i.topic_id=?', params: [id] };
    default: return { sql: '1=1', params: [] };
  }
}

const ITEM_SELECT = `SELECT i.*, t.title topic, c.title chapter, d.title doc, d.id doc_id, s.name subject,
  (SELECT name FROM folders WHERE id=d.folder_id) folder,
  st.due, st.reps, st.lapses, st.wrong, st.last_rating
  FROM items i JOIN topics t ON t.id=i.topic_id JOIN chapters c ON c.id=t.chapter_id
  JOIN documents d ON d.id=i.doc_id JOIN subjects s ON s.id=d.subject_id
  LEFT JOIN item_state st ON st.item_id=i.id`;

export function hydrate(rows) {
  return rows.map((r) => ({
    id: r.id, kind: r.kind, data: JSON.parse(r.data), pages: JSON.parse(r.pages),
    isNew: r.due == null, lapses: r.lapses || 0, wrong: r.wrong || 0,
    source: { doc: r.doc, docId: r.doc_id, chapter: r.chapter, topic: r.topic, topicId: r.topic_id, subject: r.subject, folder: r.folder, pages: JSON.parse(r.pages) },
  }));
}

/**
 * Stellt eine Lernsession zusammen.
 * mode: mixed | flashcards | mc | match | mistakes
 */
export function buildSession({ scope, mode = 'mixed', size } = {}) {
  const { sql, params } = scopeSql(scope);
  const now = nowIso();
  const focused = scope && scope.type && scope.type !== 'all';
  const kindsFor = { flashcards: ['flashcard', 'cloze'], mc: ['mc', 'case'], match: ['match'] };
  const kindFilter = (kinds) => `i.kind IN (${kinds.map((k) => `'${k}'`).join(',')})`;

  // Ganzes Fach / ganzer Ordner: eine große Abfrage mit ALLEN Lerninhalten, durchgemischt (wie bei Medibk+)
  const full = ['subject', 'folder', 'drill'].includes(scope?.type);

  if (mode === 'mistakes') {
    const rows = q(`${ITEM_SELECT} WHERE ${sql} AND ${ITEM_OK} AND i.id IN (SELECT item_id FROM mistakes WHERE resolved=0)
                    ORDER BY st.wrong DESC ${full ? '' : 'LIMIT 30'}`, ...params);
    return shuffle(hydrate(rows));
  }

  const kinds = kindsFor[mode] || ['flashcard', 'cloze', 'mc', 'case', 'match'];
  if (full) return shuffle(hydrate(q(`${ITEM_SELECT} WHERE ${sql} AND ${ITEM_OK} AND ${kindFilter(kinds)}`, ...params)));
  const due = q(`${ITEM_SELECT} WHERE ${sql} AND ${ITEM_OK} AND ${kindFilter(kinds)} AND st.due <= ?
                 ORDER BY st.lapses DESC, st.due ASC LIMIT ?`, ...params, now, size || (focused ? 40 : 20));

  const takeNew = (ks, n) => n > 0 ? q(`${ITEM_SELECT} WHERE ${sql} AND ${ITEM_OK} AND ${kindFilter(ks)} AND st.item_id IS NULL
      ORDER BY i.doc_id, t.page_from, t.ord, i.id LIMIT ?`, ...params, n) : [];

  let fresh = [];
  if (mode === 'mixed') {
    const f = focused ? 12 : 6;
    fresh = [...takeNew(['flashcard', 'cloze'], f), ...takeNew(['mc', 'case'], focused ? 6 : 5), ...takeNew(['match'], focused ? 2 : 1)];
  } else {
    fresh = takeNew(kinds, size || 15);
  }

  // Schwache Inhalte bevorzugen: offene Fehler, die nicht ohnehin fällig sind
  const ids = new Set([...due, ...fresh].map((r) => r.id));
  const weak = mode === 'mixed'
    ? q(`${ITEM_SELECT} WHERE ${sql} AND ${ITEM_OK} AND i.id IN (SELECT item_id FROM mistakes WHERE resolved=0) ORDER BY st.wrong DESC LIMIT 5`, ...params)
        .filter((r) => !ids.has(r.id)).slice(0, 3)
    : [];

  // Reihenfolge: Wiederholungen und Fehler gemischt, dann neue Inhalte (Karten vor MC vor offenen Fragen)
  return [...shuffle(hydrate([...due, ...weak])), ...hydrate(fresh)];
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- Dashboard ----------
export function dashboard() {
  const now = nowIso();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().replace('T', ' ').slice(0, 19);
  const due = one(`SELECT
      SUM(CASE WHEN i.kind IN ('flashcard','cloze') THEN 1 ELSE 0 END) cards,
      SUM(CASE WHEN i.kind IN ('mc','case') THEN 1 ELSE 0 END) mc,
      SUM(CASE WHEN i.kind='match' THEN 1 ELSE 0 END) mt
      FROM items i JOIN item_state st ON st.item_id=i.id WHERE ${ITEM_OK} AND st.due <= ?`, now);
  const fresh = one(`SELECT
      SUM(CASE WHEN i.kind IN ('flashcard','cloze') THEN 1 ELSE 0 END) cards,
      SUM(CASE WHEN i.kind IN ('mc','case') THEN 1 ELSE 0 END) mc,
      SUM(CASE WHEN i.kind='match' THEN 1 ELSE 0 END) mt
      FROM items i LEFT JOIN item_state st ON st.item_id=i.id WHERE ${ITEM_OK} AND st.item_id IS NULL`);
  const todayStats = one(`SELECT COUNT(*) n, SUM(correct) ok, COUNT(DISTINCT item_id) items FROM review_log WHERE ts >= ?`, todayIso);
  const subjects = q(`SELECT s.id, s.name, COUNT(i.id) total,
      SUM(CASE WHEN st.last_rating >= 3 THEN 1 ELSE 0 END) known,
      SUM(CASE WHEN st.last_rating < 3 THEN 1 ELSE 0 END) wrong,
      SUM(CASE WHEN st.item_id IS NOT NULL THEN 1 ELSE 0 END) seen
      FROM subjects s JOIN documents d ON d.subject_id=s.id JOIN items i ON i.doc_id=d.id AND ${ITEM_OK}
      LEFT JOIN item_state st ON st.item_id=i.id GROUP BY s.id ORDER BY s.name`);
  // gleiche Kennzahlen pro Ordner (Fortschrittsringe)
  const folders = q(`SELECT f.id, f.name, COUNT(i.id) total,
      SUM(CASE WHEN st.last_rating >= 3 THEN 1 ELSE 0 END) known,
      SUM(CASE WHEN st.last_rating < 3 THEN 1 ELSE 0 END) wrong,
      SUM(CASE WHEN st.item_id IS NOT NULL THEN 1 ELSE 0 END) seen
      FROM folders f JOIN documents d ON d.folder_id=f.id JOIN items i ON i.doc_id=d.id AND ${ITEM_OK}
      LEFT JOIN item_state st ON st.item_id=i.id GROUP BY f.id ORDER BY f.name COLLATE NOCASE`);
  const weak = q(`SELECT t.id, t.title, c.title chapter, s.name subject,
      COUNT(r.id) reviews, SUM(1 - r.correct) wrong,
      (SELECT COUNT(*) FROM mistakes m WHERE m.topic_id=t.id AND m.resolved=0) open_mistakes
      FROM review_log r JOIN items i ON i.id=r.item_id JOIN topics t ON t.id=i.topic_id
      JOIN chapters c ON c.id=t.chapter_id JOIN documents d ON d.id=t.doc_id JOIN subjects s ON s.id=d.subject_id
      WHERE r.ts >= datetime('now','-30 days') GROUP BY t.id HAVING reviews >= 3 AND wrong > 0
      ORDER BY (1.0*wrong/reviews) DESC, open_mistakes DESC LIMIT 6`);
  const recent = q(`SELECT t.id, t.title, c.title chapter, s.name subject, MAX(r.ts) last
      FROM review_log r JOIN items i ON i.id=r.item_id JOIN topics t ON t.id=i.topic_id
      JOIN chapters c ON c.id=t.chapter_id JOIN documents d ON d.id=t.doc_id JOIN subjects s ON s.id=d.subject_id
      GROUP BY t.id ORDER BY last DESC LIMIT 6`);
  const processing = q(`SELECT id, title, status, progress, message, error FROM documents WHERE status != 'fertig' ORDER BY id DESC`);
  // Lernaktivität der letzten 18 Wochen (Antworten pro Kalendertag, lokale Zeit)
  const activity = q(`SELECT date(ts, 'localtime') d, COUNT(*) n, SUM(correct) ok FROM review_log
      WHERE ts >= datetime('now', '-130 days') GROUP BY d ORDER BY d`);
  const exams = getSetting('exams', {});
  return {
    due: { cards: due.cards || 0, mc: due.mc || 0, match: due.mt || 0 },
    fresh: { cards: fresh.cards || 0, mc: fresh.mc || 0, match: fresh.mt || 0 },
    today: { reviews: todayStats.n || 0, correct: todayStats.ok || 0, items: todayStats.items || 0 },
    subjects: subjects.map((s) => ({ ...s, pct: s.total ? Math.round(100 * (s.known || 0) / s.total) : 0 })),
    folders,
    profile: getSetting('profile', { name: '', goal: 50 }),
    weak, recent, processing, activity, exams,
    openMistakes: one('SELECT COUNT(*) n FROM mistakes WHERE resolved=0').n,
  };
}
