// SQLite-Datenbank (in Node eingebaut – keine nativen Pakete nötig)
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = process.env.MEDLEARN_DATA || path.resolve(process.cwd(), 'data');
export const PDF_DIR = path.join(DATA_DIR, 'pdfs');
fs.mkdirSync(PDF_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'medlearn.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL, filename TEXT NOT NULL, pages INTEGER DEFAULT 0,
  status TEXT DEFAULT 'neu',          -- neu | analyse | extraktion | generierung | fertig | fehler
  progress REAL DEFAULT 0, message TEXT, error TEXT, state TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pages (
  doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER NOT NULL, text TEXT NOT NULL,
  PRIMARY KEY (doc_id, page)
);
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY,
  doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL, ord INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL, ord INTEGER DEFAULT 0,
  page_from INTEGER, page_to INTEGER,
  gen_status TEXT DEFAULT 'offen'     -- offen | fertig | fehler
);
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER, kind TEXT, content TEXT NOT NULL, ord INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                 -- flashcard | mc | open | case | cloze
  data TEXT NOT NULL,                 -- JSON
  unit_ids TEXT DEFAULT '[]', pages TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS item_state (
  item_id INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  card TEXT NOT NULL,                 -- FSRS-Kartenzustand (JSON)
  due TEXT NOT NULL, reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0,
  wrong INTEGER DEFAULT 0, last_rating INTEGER, last_review TEXT
);
CREATE TABLE IF NOT EXISTS review_log (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  rating INTEGER, correct INTEGER, answer TEXT,
  ts TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  description TEXT, user_answer TEXT, resolved INTEGER DEFAULT 0,
  ts TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
-- Abbildungen aus den Skripten
CREATE TABLE IF NOT EXISTS figures (
  id INTEGER PRIMARY KEY,
  doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  topic_id INTEGER, page INTEGER NOT NULL, file TEXT NOT NULL, w INTEGER, h INTEGER,
  caption TEXT, status TEXT DEFAULT 'neu', relevant INTEGER DEFAULT 0, kind TEXT, title TEXT,
  description TEXT, labels TEXT, illustrates TEXT, cards TEXT
);
CREATE INDEX IF NOT EXISTS idx_figures_topic ON figures(topic_id);
-- Angefangene Lern-Sessions (bleiben bis zum Abschluss erhalten)
CREATE TABLE IF NOT EXISTS saved_sessions (
  key TEXT PRIMARY KEY, label TEXT, data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_units_topic ON units(topic_id);
CREATE INDEX IF NOT EXISTS idx_items_topic ON items(topic_id);
CREATE INDEX IF NOT EXISTS idx_state_due ON item_state(due);
CREATE INDEX IF NOT EXISTS idx_log_ts ON review_log(ts);

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
  text, doc_id UNINDEXED, page UNINDEXED, tokenize = 'unicode61 remove_diacritics 2'
);
CREATE VIRTUAL TABLE IF NOT EXISTS units_fts USING fts5(
  content, unit_id UNINDEXED, tokenize = 'unicode61 remove_diacritics 2'
);
`);

export const q = (sql, ...p) => db.prepare(sql).all(...p);
export const one = (sql, ...p) => db.prepare(sql).get(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);

export function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function getSetting(key, def = null) {
  const r = one('SELECT value FROM settings WHERE key = ?', key);
  return r ? JSON.parse(r.value) : def;
}
export function setSetting(key, value) {
  run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    key, JSON.stringify(value));
}

// ---------- Migrationen (neue Spalten in bestehenden Datenbanken) ----------
function addColumn(table, col, def) {
  if (!q(`PRAGMA table_info(${table})`).some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
addColumn('items', 'suspended', 'INTEGER DEFAULT 0');   // ausgeblendete Lerninhalte
addColumn('topics', 'match_status', 'TEXT');             // Zuordnungsaufgaben erzeugt?
addColumn('documents', 'figures_status', 'TEXT');        // Abbildungen verarbeitet?
// Ordner in der Bibliothek (z. B. pro Prüfung); Skripte ohne Ordner haben folder_id NULL
db.exec(`CREATE TABLE IF NOT EXISTS folders (id INTEGER PRIMARY KEY, name TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`);
addColumn('documents', 'folder_id', 'INTEGER');

// Lerninhalte, die in Sessions/Statistik zählen (Freitext-Fragen sind deaktiviert)
export const ACTIVE_KINDS = ['flashcard', 'cloze', 'mc', 'case', 'match'];
export const ITEM_OK = `i.suspended = 0 AND i.kind IN (${ACTIVE_KINDS.map((k) => `'${k}'`).join(',')})`;

// ---------- Backups ----------
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db')).sort().reverse()
    .map((f) => ({ name: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size }));
}
export function createBackup(tag = '') {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `medlearn-${localDate()}${tag}.db`;
  const file = path.join(BACKUP_DIR, name);
  fs.rmSync(file, { force: true });
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  // nur die letzten 10 Backups behalten
  for (const b of listBackups().slice(10)) fs.rmSync(path.join(BACKUP_DIR, b.name), { force: true });
  return name;
}
// Automatisch: höchstens ein Backup pro Tag (beim Start)
try {
  const today = localDate();
  if (!listBackups().some((b) => b.name.includes(today)) && one('SELECT COUNT(*) n FROM documents').n > 0) createBackup();
} catch (e) { console.warn('Backup fehlgeschlagen:', e.message); }

// Abgebrochene Abbildungs-Auswertung: Dokument ist trotzdem fertig, Auswertung läuft beim nächsten Start weiter
run("UPDATE documents SET status='fertig', message=NULL WHERE status='abbildungen'");
// Beim Start: abgebrochene Verarbeitungen als fehlerhaft markieren (können neu gestartet werden)
run(`UPDATE documents SET status='fehler', error='Verarbeitung wurde unterbrochen (App beendet). Bitte "Fortsetzen" klicken.'
     WHERE status IN ('analyse','extraktion','generierung')`);
