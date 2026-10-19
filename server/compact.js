// Kompakt-Export für Anki: verdichtet die Karten eines Themas (weniger, aber gut gebaute Karten),
// ohne Inhalte zu verlieren – jede Wissenseinheit bleibt durch mindestens eine Karte abgedeckt.
import crypto from 'node:crypto';
import { q, one, run, db } from './db.js';
import { completeJson } from './ai.js';
import { scopeSql } from './srs.js';

db.exec(`CREATE TABLE IF NOT EXISTS anki_compact (
  topic_id INTEGER PRIMARY KEY, hash TEXT, cards TEXT, source_count INTEGER, created_at TEXT DEFAULT (datetime('now')))`);

const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');

function topicSource(topicId) {
  const items = q(`SELECT id, kind, data, unit_ids FROM items WHERE topic_id=? AND suspended=0 AND kind IN ('flashcard','cloze') ORDER BY id`, topicId)
    .map((r) => ({ ...r, data: JSON.parse(r.data), u: JSON.parse(r.unit_ids || '[]') }));
  const units = q('SELECT id, page, kind, content FROM units WHERE topic_id=? ORDER BY ord', topicId);
  const hash = sha(JSON.stringify(['design-v3', items.map((i) => [i.id, i.data]), units.map((u) => u.id)]));
  return { items, units, hash };
}

function compactPrompt({ topic, units, items }) {
  const cards = items.map((it, k) => {
    const d = it.data;
    const tag = `K${k + 1}|u:${it.u.join(',')}${d.fig ? `|fig:${d.fig}` : ''}`;
    return it.kind === 'cloze' ? `[${tag}] LÜCKENTEXT: ${d.text}` : `[${tag}] F: ${d.q} → A: ${d.a}`;
  }).join('\n');
  const target = Math.max(3, Math.round(items.length * 0.45));
  return `Thema: "${topic.chapter} › ${topic.title}"

Wissenseinheiten aus dem Skript ([ID|Seite] Inhalt):
${units.map((u) => `[${u.id}|S.${u.page}] ${u.content}`).join('\n')}

Vorhandene Lernkarten (${items.length} Stück; u = abgedeckte Wissenseinheiten, fig = Abbildung auf der Vorderseite):
${cards}

AUFGABE
Verdichte diese Karten zu einem kompakten Anki-Stapel: deutlich weniger Karten (Richtwert: etwa ${target}, höchstens ${Math.round(items.length * 0.6)}), aber gleiche Abdeckung und gleiche Qualität.

So verdichtest du:
- Doppelte entfernen: Derselbe Fakt als Frage UND als Lückentext (oder zweimal ähnlich gefragt) → eine Karte.
- Zusammengehöriges bündeln: Aufzählungen, Einteilungen/Klassifikationen, Kriterien, Grenzwerte desselben Begriffs, Substanzklasse mit Beispielen und Nebenwirkung, Stadien, Ursachen/Symptome einer Erkrankung → je EINE Karte mit Stichpunkt-Antwort.
- Eine Karte = EIN klar abgegrenztes Lernziel, das sich als eine einzige Frage formulieren lässt. NICHT bündeln, was nur zufällig im selben Thema oder Abschnitt steht.
- Verboten sind Doppelfragen zu verschiedenen Lernzielen (z. B. "Was gilt für X? Ab welchem Wert ist Y kontraindiziert?" oder "Nenne den Goldstandard für A und die Befunde von B"). Solche Inhalte bleiben getrennte Karten – lieber eine Karte mehr.
- Höchstens 5 Antwortpunkte pro Karte; die Karte muss in einem Zug aus dem Gedächtnis beantwortbar sein.
- Die Frage sagt, was erwartet wird, z. B. "Nenne die 3 Formen der Herzinsuffizienz nach LVEF mit Grenzwerten." oder "Welche 4 Substanzklassen …?".
- Alle Zahlen, Grenzwerte, Einheiten und Fachbegriffe exakt aus den Wissenseinheiten übernehmen.

GESTALTUNG DER ANTWORT (wird als gut lesbare Anki-Karte gesetzt)
LEITGEDANKE: Der Student soll das Thema allein mit diesen Karten lernen und VERSTEHEN können – auch wenn er sich noch nie damit beschäftigt hat. Die Kernaussagen bleiben knapp, aber jede Karte liefert genug Erklärung, dass man versteht, WARUM etwas so ist und was die Begriffe bedeuten.
- Frage "q": selbsterklärend. Abkürzungen beim ersten Vorkommen ausschreiben, z. B. "MRA (Mineralokortikoid-Rezeptor-Antagonisten)". Kein Vorwissen aus anderen Karten voraussetzen.
- "kontext" (optional, aber bei allen Karten mit Fachbegriffen/Konzepten, die nicht selbsterklärend sind): 1 kurzer Satz (max. ca. 25 Wörter) VOR der Antwort, der einordnet, worum es geht – Begriffsklärung oder Grundprinzip. Beispiel: "Rhesus-positiv heißt: das D-Antigen sitzt auf den Erythrozyten. Manche Menschen haben veränderte Varianten davon."
- "a" ist eine Liste von Punkten. Jeder Punkt hat:
  - "t": die Kernaussage, knapp, im Stil "Begriff → Aussage" (Pfeil "→" für Folgen/Zuordnungen). Hebe den Schlüsselbegriff, um den es geht, mit ==Begriff== hervor (wird farbig) und die 1–3 wichtigsten Fakten/Zahlen mit **…** (wird fett). Nicht mehr hervorheben – sonst verliert es die Wirkung.
  - "x": eine Erklärzeile fürs Verständnis (max. ca. 25 Wörter) – bei den meisten Punkten erwünscht: erkläre den Mechanismus/das Warum, einen ungewohnten Fachbegriff, die Konsequenz oder die praktische Bedeutung, z. B. "Das D-Antigen ist vollständig, nur seltener vorhanden – deshalb verhält es sich als Empfänger und Spender wie D-positiv". Keine Wiederholung von "t". Weglassen nur, wenn der Punkt wirklich selbsterklärend ist.
  - Beispiel: {"t":"==D-weak== → **quantitative Verminderung** der D-Antigene (normale Epitope)","x":"verhält sich als Empfänger und Spender wie D-positiv"}
- "extra" (optional, bei etwa jeder zweiten Karte): ein abgesetzter Hintergrund-Satz, der das Gelernte verankert – klinische Relevanz, Merkhilfe, typische Prüfungsfalle oder interessanter Zusammenhang (max. 2 kurze Sätze). Bevorzugt aus dem Skript (Merksätze, klinische Hinweise).
- "extra_ki": true, wenn "extra" Wissen enthält, das NICHT in den Wissenseinheiten steht (wird als KI-Ergänzung gekennzeichnet). "kontext" und Erklärzeilen "x" dürfen Skriptwissen und unstrittiges medizinisches Grundlagenwissen (Physiologie, Begriffsdefinitionen, Mechanismen) enthalten – aber keine neuen prüfungsrelevanten Zahlen, Dosierungen oder Grenzwerte, die nicht im Skript stehen.
- Lückentext ("type":"cloze") nur, wenn ein Wert/Begriff im Satzzusammenhang am besten abgefragt wird; Lücken mit {{...}}; höchstens 3 Lücken pro Karte (sie werden gemeinsam abgefragt). Auch Lückentexte bekommen "kontext" (wird VOR dem Lückentext gezeigt – dort Abkürzungen wie LVEF/HFrEF und Grundbegriffe erklären, ohne die Lösung zu verraten), "x" (Erklärzeile) und ggf. "extra".
- Bildkarten (mit fig): pro Abbildung höchstens EINE Karte behalten (ggf. mehrere Bildfragen zu einer zusammenfassen, z. B. "Benenne die Strukturen 1–4"), "fig" übernehmen. Die Frage muss sich weiter auf das Bild beziehen.
- Keine neuen Fakten erfinden. Nichts weglassen, was prüfungsrelevant ist.
- "u": IDs ALLER Wissenseinheiten, die die Karte abdeckt. JEDE Wissenseinheit muss in mindestens einer Karte vorkommen (wird automatisch geprüft).

Antworte NUR mit JSON:
{"cards":[{"type":"basic","q":"Frage","kontext":"Einordnung","a":[{"t":"==Begriff== → **Kernfakt**","x":"Erklärzeile"},{"t":"…"}],"extra":"Hintergrund","extra_ki":false,"u":[12,13]},{"type":"cloze","text":"Satz mit {{Lücke}}","x":"Erklärzeile","u":[14]},{"type":"basic","q":"Bildfrage","a":[{"t":"…"}],"u":[15],"fig":7}]}`;
}

/** Verdichtet ein Thema (mit Cache). Rückgabe: { cards, source } */
export async function compactTopic(topicId, { force = false } = {}) {
  const topic = one('SELECT t.*, c.title chapter FROM topics t JOIN chapters c ON c.id=t.chapter_id WHERE t.id=?', topicId);
  const { items, units, hash } = topicSource(topicId);
  const cached = one('SELECT * FROM anki_compact WHERE topic_id=?', topicId);
  if (!force && cached && cached.hash === hash) return { cards: JSON.parse(cached.cards), source: cached.source_count };
  if (!items.length) { run('DELETE FROM anki_compact WHERE topic_id=?', topicId); return { cards: [], source: 0 }; }

  let cards = [];
  if (items.length <= 3) {
    // zu wenig zum Verdichten → unverändert übernehmen
    cards = items.map((it) => (it.kind === 'cloze' ? { type: 'cloze', text: it.data.text, u: it.u } : { type: 'basic', q: it.data.q, a: it.data.a, u: it.u, fig: it.data.fig }));
  } else {
    const unitIds = new Set(units.map((u) => u.id));
    const figIds = new Set(items.map((i) => i.data.fig).filter(Boolean));
    const r = await completeJson(compactPrompt({ topic, units, items }));
    for (const c of r.cards || []) {
      const u = (Array.isArray(c.u) ? c.u : []).map((x) => parseInt(String(x).replace(/\D/g, ''))).filter((x) => unitIds.has(x));
      const extra = { ...(c.extra ? { extra: String(c.extra).trim(), extra_ki: !!c.extra_ki } : {}), ...(c.kontext ? { kontext: String(c.kontext).trim() } : {}) };
      if (c.type === 'cloze' && /\{\{.+?\}\}/.test(String(c.text || ''))) cards.push({ type: 'cloze', text: String(c.text).trim(), ...(c.x ? { x: String(c.x).trim() } : {}), ...extra, u });
      else if (c.q && c.a) {
        // strukturierte Antwort: [{t, x}] – ältere/abweichende Ausgabe (Text) wird in Punkte zerlegt
        const pts = Array.isArray(c.a)
          ? c.a.map((p) => (typeof p === 'string' ? { t: p } : { t: String(p.t || '').trim(), ...(p.x ? { x: String(p.x).trim() } : {}) })).filter((p) => p.t)
          : String(c.a).split('\n').map((l) => l.replace(/^\s*[•\-]\s*/, '').trim()).filter(Boolean).map((t) => ({ t }));
        if (pts.length) cards.push({ type: 'basic', q: String(c.q).trim(), a: pts, ...extra, u, ...(figIds.has(Number(c.fig)) ? { fig: Number(c.fig) } : {}) });
      }
    }
    if (!cards.length) throw new Error(`Verdichtung für "${topic.title}" lieferte keine Karten`);
    // Abdeckungsprüfung: nicht abgedeckte Wissenseinheiten → passende Originalkarten übernehmen
    const covered = new Set(cards.flatMap((c) => c.u));
    const coveredBefore = new Set(items.flatMap((i) => i.u));
    for (const uid of unitIds) {
      if (covered.has(uid) || !coveredBefore.has(uid)) continue;
      const orig = items.find((i) => i.kind === 'flashcard' && !i.data.fig && i.u.includes(uid)) || items.find((i) => i.u.includes(uid));
      if (!orig) continue;
      cards.push(orig.kind === 'cloze' ? { type: 'cloze', text: orig.data.text, u: orig.u, filled: true }
        : { type: 'basic', q: orig.data.q, a: orig.data.a, u: orig.u, filled: true, ...(orig.data.fig ? { fig: orig.data.fig } : {}) });
      orig.u.forEach((x) => covered.add(x));
    }
  }
  run(`INSERT INTO anki_compact(topic_id,hash,cards,source_count,created_at) VALUES(?,?,?,?,datetime('now'))
       ON CONFLICT(topic_id) DO UPDATE SET hash=excluded.hash, cards=excluded.cards, source_count=excluded.source_count, created_at=excluded.created_at`,
    topicId, hash, JSON.stringify(cards), items.length);
  return { cards, source: items.length };
}

// ---------- Hintergrund-Jobs (der Export kann bei großen Skripten einige Minuten dauern) ----------
const jobs = new Map();
export function startCompactJob(scope) {
  const { sql, params } = scopeSql(scope);
  const topics = q(`SELECT DISTINCT i.topic_id id FROM items i WHERE ${sql} AND i.suspended=0 AND i.kind IN ('flashcard','cloze')`, ...params).map((r) => r.id);
  const id = crypto.randomUUID();
  const job = { id, total: topics.length, done: 0, errors: [], finished: false, source: 0, compact: 0 };
  jobs.set(id, job);
  (async () => {
    await Promise.all(topics.map(async (tid) => {
      try { const r = await compactTopic(tid); job.source += r.source; job.compact += r.cards.length; }
      catch (e) { job.errors.push(e.message); }
      job.done++;
    }));
    job.finished = true;
    setTimeout(() => jobs.delete(id), 30 * 60 * 1000);
  })();
  return job;
}
export const getCompactJob = (id) => jobs.get(id) || null;

/** Liefert die verdichteten Karten im Format, das der Anki-Export verarbeitet (wie Lerninhalte). */
export function compactRows(scope) {
  const { sql, params } = scopeSql(scope);
  const topics = q(`SELECT DISTINCT t.id, t.title topic, t.ord tord, t.page_from, c.title chapter, d.title doc, d.id doc_id, s.name subject
      FROM items i JOIN topics t ON t.id=i.topic_id JOIN chapters c ON c.id=t.chapter_id
      JOIN documents d ON d.id=i.doc_id JOIN subjects s ON s.id=d.subject_id
      WHERE ${sql} AND i.suspended=0 AND i.kind IN ('flashcard','cloze')
      ORDER BY s.name, d.title, t.page_from, t.ord`, ...params);
  const rows = [];
  for (const t of topics) {
    const c = one('SELECT cards FROM anki_compact WHERE topic_id=?', t.id);
    if (!c) continue;
    const unitPages = new Map(q('SELECT id, page FROM units WHERE topic_id=?', t.id).map((u) => [u.id, u.page]));
    const figs = q("SELECT id, illustrates FROM figures WHERE topic_id=? AND relevant=1 AND status='fertig'", t.id)
      .map((f) => ({ id: f.id, u: new Set(JSON.parse(f.illustrates || '[]')) }));
    const seen = new Map();
    for (const card of JSON.parse(c.cards)) {
      const pages = [...new Set(card.u.map((x) => unitPages.get(x)).filter(Boolean))].sort((a, b) => a - b);
      const backFigs = card.fig ? [] : figs.filter((f) => card.u.some((x) => f.u.has(x))).map((f) => f.id).slice(0, 2);
      // stabile ID: gleiche Karte bei erneutem Export → Anki aktualisiert statt dupliziert
      let key = `${card.type}:${[...card.u].sort((a, b) => a - b).join(',')}:${card.fig || ''}`;
      const n = (seen.get(key) || 0) + 1; seen.set(key, n); if (n > 1) key += `#${n}`;
      const more = { ...(card.x ? { x: card.x } : {}), ...(card.kontext ? { kontext: card.kontext } : {}), ...(card.extra ? { extra: card.extra, extra_ki: !!card.extra_ki } : {}) };
      const data = card.type === 'cloze'
        ? { text: card.text, oneCard: true, figs: backFigs, ...more }
        : { q: card.q, a: card.a, ...more, ...(card.fig ? { fig: card.fig } : { figs: backFigs }) };
      rows.push({ ...t, id: null, guid: `medlearn-k${t.id}-${sha(key).slice(0, 12)}`, kind: card.type === 'cloze' ? 'cloze' : 'flashcard',
        data: JSON.stringify(data), pages: JSON.stringify(pages) });
    }
  }
  return rows;
}
