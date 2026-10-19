// Anki-Export als .apkg im klassischen Format (collection.anki2, Schema 11).
// Dieses Format importieren alle Anki-Versionen ab 2.1 (Desktop), AnkiDroid und AnkiMobile.
// Keine zusätzlichen Pakete nötig: SQLite ist in Node eingebaut, ZIP wird hier selbst geschrieben.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { q, one } from './db.js';
import { FIG_DIR } from './figures.js';
import { compactRows } from './compact.js';
import { scopeSql } from './srs.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
const strip = (html) => String(html).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
const csum = (s) => parseInt(crypto.createHash('sha1').update(strip(s)).digest('hex').slice(0, 8), 16);
const tagSafe = (s) => String(s).trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_\-]/gu, '');
const deckSafe = (s) => String(s).replace(/::/g, ':').replace(/"/g, "'").trim() || 'Ohne Titel';

// ---------- Karten-Layout (Inline-Styles: sieht in jeder Anki-Version und im Dunkelmodus gleich aus) ----------
const ACCENT = '#2f8fe0';   // Schlüsselbegriffe
const SUBTLE = '#8e959e';   // Erklärzeilen (hell und dunkel gut lesbar)
// ==Begriff== → farbig, **Fakt** → fett
const mark = (s) => esc(s).replace(/==(.+?)==/g, `<span style="color:${ACCENT};font-weight:600">$1</span>`).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const center = (html) => `<div style="text-align:center;line-height:1.45">${html}</div>`;
const subline = (x) => (x ? `<div style="color:${SUBTLE};font-size:.8em;margin-top:3px">${/^\s*→/.test(x) ? '' : '→ '}${mark(x)}</div>` : '');
function answerHtml(a) {
  // strukturiert: [{t, x}]; sonst Text mit Stichpunkten
  const pts = Array.isArray(a) ? a : String(a ?? '').split('\n').map((l) => l.replace(/^\s*[•\-]\s*/, '').trim()).filter(Boolean).map((t) => ({ t }));
  return center(pts.map((p, i) => `<div style="margin-top:${i ? 12 : 0}px">${mark(p.t)}${subline(p.x)}</div>`).join(''));
}
// Einordnung über der Antwort (Begriffsklärung/Grundprinzip)
const kontextHtml = (d) => (d.kontext ? `<div style="text-align:center;color:${SUBTLE};font-size:.85em;line-height:1.45;margin:0 auto 16px;max-width:92%">${mark(d.kontext)}</div>` : '');
function extraHtml(d) {
  if (!d.extra) return '';
  return `<div style="margin-top:30px;padding-top:14px;border-top:1px solid rgba(128,128,128,.28);text-align:center;line-height:1.45">`
    + `<div style="font-size:.7em;font-weight:600;letter-spacing:.03em;color:${d.extra_ki ? '#8a7fd8' : ACCENT};margin-bottom:4px">${d.extra_ki ? 'KI-Ergänzung (nicht aus dem Skript)' : 'Hintergrund'}</div>`
    + `<div style="font-size:.9em">${mark(d.extra)}</div></div>`;
}

// feste IDs, damit ein erneuter Export dieselben Notiztypen wiederverwendet
const MODEL_BASIC = 1700000000101;
const MODEL_CLOZE = 1700000000102;

const CSS = `.card { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 20px; line-height: 1.5; text-align: left; color: #17201e; background: #fff; padding: 8px 4px; }
.nightMode .card, .card.nightMode { color: #e2e9e7; background: #151c1b; }
hr#answer { border: 0; border-top: 1px solid #c7d1cd; margin: 18px 0; }
.src { margin-top: 22px; font-size: 13px; color: #5d6a66; }
.opts { margin: 12px 0 0; padding-left: 0; list-style: none; } .opts li { margin: 6px 0; }
.ok { color: #2d7a4c; font-weight: 600; } .why { font-size: 15px; color: #5d6a66; }
.pairs { border-collapse: collapse; margin-top: 10px; } .pairs td { border-bottom: 1px solid #dce3e0; padding: 6px 12px 6px 0; vertical-align: top; }
.ki { margin-top: 12px; font-size: 15px; padding: 8px 12px; border-left: 2px solid #4e5ba6; background: rgba(78,91,166,.08); }
.cloze { font-weight: 600; color: #1d5e58; } .nightMode .cloze { color: #72bcb2; }
.fig { text-align: center; margin: 4px 0 14px; } .fig img { max-width: 100%; max-height: 420px; border-radius: 6px; }
.figs { margin-top: 14px; } .figs img { max-width: 100%; max-height: 300px; border-radius: 6px; margin: 4px 0; }
.fignote { margin-top: 10px; font-size: 15px; color: #5d6a66; }`;

function field(name, ord) {
  return { name, ord, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] };
}
function models(now) {
  const base = { mod: now, usn: -1, sortf: 0, did: 1, css: CSS, tags: [], vers: [], latexsvg: false,
    latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
    latexPost: '\\end{document}' };
  return {
    [MODEL_BASIC]: { ...base, id: MODEL_BASIC, name: 'MedLearn – Frage/Antwort', type: 0,
      flds: [field('Vorderseite', 0), field('Rückseite', 1), field('Quelle', 2)],
      tmpls: [{ name: 'Karte 1', ord: 0, did: null, bqfmt: '', bafmt: '',
        qfmt: '{{Vorderseite}}',
        afmt: '{{FrontSide}}\n<hr id=answer>\n{{Rückseite}}\n{{#Quelle}}<div class="src">{{Quelle}}</div>{{/Quelle}}' }],
      req: [[0, 'any', [0]]] },
    [MODEL_CLOZE]: { ...base, id: MODEL_CLOZE, name: 'MedLearn – Lückentext', type: 1,
      flds: [field('Text', 0), field('Quelle', 1)],
      tmpls: [{ name: 'Lückentext', ord: 0, did: null, bqfmt: '', bafmt: '',
        qfmt: '{{cloze:Text}}',
        afmt: '{{cloze:Text}}\n{{#Quelle}}<div class="src">{{Quelle}}</div>{{/Quelle}}' }] },
  };
}

// Lerninhalt → Anki-Notiz
function toNote(it, media) {
  const d = it.data;
  const img = (id) => { const fn = media(id); return fn ? `<img src="${fn}">` : ''; };
  const figs = (d.figs || []).map(img).filter(Boolean);
  const back = figs.length ? `<div class="figs">${figs.join('<br>')}</div>` : '';
  const letters = 'ABCDEFG';
  const ki = (t) => (t ? `<div class="ki"><b>KI-Ergänzung</b> (nicht aus dem Skript): ${esc(t)}</div>` : '');
  switch (it.kind) {
    case 'flashcard': {
      if (d.fig) {
        const fimg = img(d.fig); if (!fimg) return null;
        const f = one('SELECT title, description FROM figures WHERE id=?', d.fig) || {};
        return { model: MODEL_BASIC, fields: [`<div class="fig">${fimg}</div>${center(esc(d.q))}`,
          `${kontextHtml(d)}${answerHtml(d.a)}${f.description ? `<div class="fignote" style="text-align:center"><b>${esc(f.title || 'Abbildung')}:</b> ${esc(f.description)}</div>` : ''}${extraHtml(d)}`] };
      }
      return { model: MODEL_BASIC, fields: [center(esc(d.q)), kontextHtml(d) + answerHtml(d.a) + extraHtml(d) + back] };
    }
    case 'cloze': {
      let n = 0;
      // oneCard: alle Lücken werden gemeinsam abgefragt (eine Karte statt einer pro Lücke)
      const text = mark(d.text).replace(/\{\{(.+?)\}\}/g, (_, g) => (++n, `{{c${d.oneCard ? 1 : n}::${g}}}`));
      return n ? { model: MODEL_CLOZE, fields: [kontextHtml(d) + center(text) + (d.x ? center(subline(d.x)) : '') + extraHtml(d) + back], clozes: d.oneCard ? 1 : n } : null;
    }
    case 'mc':
      return { model: MODEL_BASIC, fields: [
        `${esc(d.stem)}<ul class="opts">${d.options.map((o, k) => `<li><b>${letters[k]}</b>&nbsp; ${esc(o)}</li>`).join('')}</ul>`,
        `<div class="ok">${letters[d.correct]}: ${esc(d.options[d.correct])}</div>
         ${d.explanation ? `<p>${esc(d.explanation)}</p>` : ''}
         ${(d.why_wrong || []).some(Boolean) ? `<ul class="opts why">${d.options.map((o, k) => (k !== d.correct && d.why_wrong[k] ? `<li><b>${letters[k]}</b>: ${esc(d.why_wrong[k])}</li>` : '')).join('')}</ul>` : ''}
         ${ki(d.ki)}${back}`] };
    case 'case':
      return { model: MODEL_BASIC, fields: [`${esc(d.vignette)}<br><br><b>${esc(d.q)}</b>`,
        `<b>${esc(d.answer)}</b>${d.explanation ? `<p>${esc(d.explanation)}</p>` : ''}${ki(d.ki)}${back}`] };
    case 'match':
      return { model: MODEL_BASIC, fields: [
        `<b>${esc(d.title)}</b><ul class="opts">${d.pairs.map((p) => `<li>${esc(p.l)} → ?</li>`).join('')}</ul>`,
        `<table class="pairs">${d.pairs.map((p) => `<tr><td><b>${esc(p.l)}</b></td><td>${esc(p.r)}</td></tr>`).join('')}</table>${back}`] };
    default: return null;
  }
}

/**
 * Baut ein .apkg. scope wie bei Lern-Sessions (subject/document/chapter/topic), kinds = erlaubte Inhaltstypen.
 * Rückgabe: { buffer, filename, notes, cards }
 */
export function buildApkg({ scope, kinds, compact = false }) {
  // Kompakt: kinds = nur die angehakten Extras (leer = keine Extras); sonst leer = alles
  let allowed = (kinds && (kinds.length || compact) ? kinds : ['flashcard', 'cloze', 'mc', 'case', 'match'])
    .filter((k) => ['flashcard', 'cloze', 'mc', 'case', 'match'].includes(k));
  // Kompakt: Karteikarten + Lückentexte kommen verdichtet aus dem Kompakt-Speicher
  const compactPart = compact ? compactRows(scope) : [];
  if (compact) allowed = allowed.filter((k) => !['flashcard', 'cloze'].includes(k));
  const { sql, params } = scopeSql(scope);
  const rows = q(`SELECT i.id, i.kind, i.data, i.pages, i.doc_id, t.title topic, t.ord tord, t.page_from, c.title chapter,
      d.title doc, s.name subject
      FROM items i JOIN topics t ON t.id=i.topic_id JOIN chapters c ON c.id=t.chapter_id
      JOIN documents d ON d.id=i.doc_id JOIN subjects s ON s.id=d.subject_id
      WHERE ${sql} AND i.suspended=0 AND i.kind IN (${allowed.map(() => '?').join(',') || "''"})
      ORDER BY s.name, d.title, t.page_from, t.ord, i.id`, ...params, ...allowed);
  if (compact) rows.unshift(...compactPart);
  if (!rows.length) throw Object.assign(new Error(compact ? 'Noch keine verdichteten Karten vorhanden – bitte den Export erneut starten.' : 'Keine passenden Lerninhalte für den Export gefunden.'), { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'medlearn-anki-'));
  const dbFile = path.join(tmp, 'collection.anki2');
  const db = new DatabaseSync(dbFile);
  db.exec(`
    CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null,
      dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null,
      dconf text not null, tags text not null);
    CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null,
      tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
    CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null,
      usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null,
      factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null,
      odid integer not null, flags integer not null, data text not null);
    CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null,
      lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
    CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
    CREATE INDEX ix_notes_usn on notes (usn);
    CREATE INDEX ix_cards_usn on cards (usn);
    CREATE INDEX ix_revlog_usn on revlog (usn);
    CREATE INDEX ix_cards_nid on cards (nid);
    CREATE INDEX ix_cards_sched on cards (did, queue, due);
    CREATE INDEX ix_revlog_cid on revlog (cid);
    CREATE INDEX ix_notes_csum on notes (csum);`);

  // Stapel: MedLearn::Fach::Skript::Thema
  const decks = {
    1: { id: 1, name: 'Default', desc: '', mod: now, usn: 0, lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0],
      collapsed: false, browserCollapsed: false, dyn: 0, conf: 1, extendNew: 10, extendRev: 50 },
  };
  const deckIds = new Map();
  let nextDeck = Date.now();
  const deckFor = (name) => {
    // auch alle Eltern-Stapel anlegen (ältere Anki-Versionen erwarten sie)
    const parts = name.split('::');
    let id;
    for (let i = 1; i <= parts.length; i++) {
      const n = parts.slice(0, i).join('::');
      if (!deckIds.has(n)) {
        const did = nextDeck++;
        deckIds.set(n, did);
        decks[did] = { ...decks[1], id: did, name: n, usn: -1, desc: i === 1 ? 'Erstellt mit MedLearn aus deinen Skripten.' : '' };
      }
      id = deckIds.get(n);
    }
    return id;
  };

  const insNote = db.prepare('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  const insCard = db.prepare('INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  // Bilder (Anki-Medien): Abbildung → Dateiname im Paket
  const mediaFiles = new Map(); // figId → { name, path }
  const media = (figId) => {
    if (mediaFiles.has(figId)) return mediaFiles.get(figId).name;
    const f = one('SELECT id, doc_id, file FROM figures WHERE id=?', figId);
    if (!f) return null;
    const p = path.join(FIG_DIR, String(f.doc_id), f.file);
    if (!fs.existsSync(p)) return null;
    const name = `medlearn-abb-${f.id}${path.extname(f.file)}`;
    mediaFiles.set(figId, { name, path: p });
    return name;
  };
  let id = Date.now() * 10; // eindeutige Millisekunden-IDs
  let due = 0, nNotes = 0, nCards = 0;
  db.exec('BEGIN');
  for (const r of rows) {
    const it = { ...r, data: JSON.parse(r.data) };
    const note = toNote(it, media);
    if (!note) continue;
    const pages = JSON.parse(r.pages || '[]');
    const source = esc(`${r.doc}${pages.length ? `, S. ${pages.join(', ')}` : ''} – ${r.chapter} › ${r.topic}`);
    const fields = [...note.fields, source];
    const did = deckFor(['MedLearn', deckSafe(r.subject), deckSafe(r.doc), deckSafe(r.topic)].join('::'));
    const tags = ` medlearn ${tagSafe(r.subject)} ${{ flashcard: 'Karteikarte', cloze: 'Lückentext', mc: 'MC', case: 'Fall', match: 'Zuordnung' }[r.kind]} `;
    const nid = ++id;
    insNote.run(nid, r.guid || `medlearn-${r.id}`, note.model, now, -1, tags, fields.join('\x1f'), strip(fields[0]).slice(0, 1000), csum(fields[0]), 0, '');
    nNotes++; due++;
    const ords = note.model === MODEL_CLOZE ? [...Array(note.clozes).keys()] : [0];
    for (const ord of ords) { insCard.run(++id, nid, did, ord, now, -1, 0, 0, due, 0, 0, 0, 0, 0, 0, 0, 0, ''); nCards++; }
  }
  const conf = { activeDecks: [1], addToCur: true, collapseTime: 1200, curDeck: 1, curModel: String(MODEL_BASIC), dueCounts: true,
    estTimes: true, newBury: true, newSpread: 0, nextPos: due + 1, sortBackwards: false, sortType: 'noteFld', timeLim: 0 };
  const dconf = { 1: { id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true, dyn: false,
    new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20, separate: true },
    lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
    rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 200 } } };
  db.prepare('INSERT INTO col VALUES (1,?,?,?,11,0,0,0,?,?,?,?,?)').run(
    now - (now % 86400), now * 1000, now * 1000, JSON.stringify(conf), JSON.stringify(models(now)),
    JSON.stringify(decks), JSON.stringify(dconf), '{}');
  db.exec('COMMIT');
  db.close();

  // Medien: im Paket als "0", "1", … abgelegt, Zuordnung in der Datei "media"
  const mediaMap = {}; const mediaEntries = [];
  [...mediaFiles.values()].forEach((m, i) => { mediaMap[i] = m.name; mediaEntries.push({ name: String(i), data: fs.readFileSync(m.path) }); });
  const buffer = zip([
    { name: 'collection.anki2', data: fs.readFileSync(dbFile) },
    { name: 'media', data: Buffer.from(JSON.stringify(mediaMap)) },
    ...mediaEntries,
  ]);
  fs.rmSync(tmp, { recursive: true, force: true });
  const label = scope?.type === 'folder' ? (one('SELECT name FROM folders WHERE id=?', parseInt(scope.id))?.name || 'Ordner')
    : rows[0] && scope?.type === 'subject' ? rows[0].subject : scope?.type === 'all' || !scope?.type ? 'Alle' : rows[0].doc;
  return { buffer, filename: `MedLearn – ${label}.apkg`, notes: nNotes, cards: nCards, images: mediaFiles.size };
}

// ---------- minimaler ZIP-Schreiber (Deflate) ----------
function crc32(buf) {
  if (zlib.crc32) return zlib.crc32(buf) >>> 0;
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const local = [], central = [];
  let offset = 0;
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const comp = zlib.deflateRawSync(f.data, { level: 9 });
    const crc = crc32(f.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(f.data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    local.push(lh, name, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(f.data.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += lh.length + name.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}
export { zip };
