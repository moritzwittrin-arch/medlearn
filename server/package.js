// Lernpakete (.medlearn): fertig verarbeitete Skripte mit Freunden teilen.
// Inhalt: Struktur, Wissenseinheiten, Lerninhalte, Abbildungen, Seitentexte und optional die PDF.
// Lernfortschritt wird NICHT mitgegeben – jeder startet bei null.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { q, one, run, tx, PDF_DIR } from './db.js';
import { FIG_DIR } from './figures.js';
import { zip } from './anki.js';

const FORMAT = 'medlearn-paket';
const VERSION = 1;

function docsFor({ type, id }) {
  const n = parseInt(id);
  switch (type) {
    case 'document': return q('SELECT * FROM documents WHERE id=?', n);
    case 'subject': return q('SELECT * FROM documents WHERE subject_id=? ORDER BY title', n);
    case 'folder': return q('SELECT * FROM documents WHERE folder_id=? ORDER BY title', n);
    default: throw Object.assign(new Error('Unbekannte Auswahl'), { status: 400 });
  }
}

export function exportPackage(scope, { withPdf = true } = {}) {
  const docs = docsFor(scope).filter((d) => d.status === 'fertig');
  if (!docs.length) throw Object.assign(new Error('Hier gibt es noch kein fertig verarbeitetes Skript zum Teilen.'), { status: 400 });
  const files = [];
  const out = [];
  for (const d of docs) {
    const subject = one('SELECT name FROM subjects WHERE id=?', d.subject_id).name;
    const folder = d.folder_id ? one('SELECT name FROM folders WHERE id=?', d.folder_id)?.name : null;
    const figures = q('SELECT * FROM figures WHERE doc_id=?', d.id);
    for (const f of figures) {
      const p = path.join(FIG_DIR, String(d.id), f.file);
      if (fs.existsSync(p)) files.push({ name: `fig/${d.id}/${f.file}`, data: fs.readFileSync(p) });
    }
    const pdfPath = d.filename ? path.join(PDF_DIR, d.filename) : '';
    const hasPdf = withPdf && pdfPath && fs.existsSync(pdfPath);
    if (hasPdf) files.push({ name: `pdf/${d.id}.pdf`, data: fs.readFileSync(pdfPath) });
    out.push({
      key: d.id, title: d.title, subject, folder, pages: d.pages, hasPdf,
      pageTexts: q('SELECT page, text FROM pages WHERE doc_id=? ORDER BY page', d.id),
      chapters: q('SELECT id, title, ord FROM chapters WHERE doc_id=? ORDER BY ord', d.id),
      topics: q('SELECT id, chapter_id, title, ord, page_from, page_to, gen_status, match_status FROM topics WHERE doc_id=?', d.id),
      units: q('SELECT id, topic_id, page, kind, content, ord FROM units WHERE doc_id=?', d.id),
      items: q('SELECT id, topic_id, kind, data, unit_ids, pages, suspended FROM items WHERE doc_id=?', d.id),
      figures: figures.map(({ doc_id, ...f }) => f),
    });
  }
  const label = scope.type === 'document' ? docs[0].title
    : scope.type === 'subject' ? one('SELECT name FROM subjects WHERE id=?', parseInt(scope.id)).name
      : one('SELECT name FROM folders WHERE id=?', parseInt(scope.id))?.name || 'Ordner';
  const manifest = { format: FORMAT, version: VERSION, created: new Date().toISOString(), label, documents: out };
  const buffer = zip([{ name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest)) }, ...files]);
  const items = out.reduce((a, d) => a + d.items.length, 0);
  return { buffer, filename: `${label}.medlearn`, documents: out.length, items };
}

// ---------- minimaler ZIP-Leser (Deflate/Stored) ----------
export function unzip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw Object.assign(new Error('Keine gültige Paketdatei.'), { status: 400 });
  const count = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw Object.assign(new Error('Paketdatei ist beschädigt.'), { status: 400 });
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(off + 26), lxlen = buf.readUInt16LE(off + 28);
    const raw = buf.subarray(off + 30 + lnlen + lxlen, off + 30 + lnlen + lxlen + csize);
    files.set(name, method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nlen + xlen + clen;
  }
  return files;
}

const safeName = (s) => String(s).replace(/[^\w.-]/g, '_');

export function importPackage(buffer, { folderId = null } = {}) {
  const files = unzip(buffer);
  let m;
  try { m = JSON.parse(files.get('manifest.json')?.toString('utf8') || ''); } catch { m = null; }
  if (!m || m.format !== FORMAT) throw Object.assign(new Error('Das ist kein MedLearn-Lernpaket.'), { status: 400 });
  if (m.version > VERSION) throw Object.assign(new Error('Dieses Paket stammt aus einer neueren MedLearn-Version – bitte erst aktualisieren.'), { status: 400 });

  const created = [];
  const folderCache = new Map();
  const folderFor = (name) => {
    if (folderId) return folderId;
    if (!name) return null;
    if (!folderCache.has(name)) {
      const f = one('SELECT id FROM folders WHERE name=?', name);
      folderCache.set(name, f ? f.id : Number(run('INSERT INTO folders(name) VALUES(?)', name).lastInsertRowid));
    }
    return folderCache.get(name);
  };

  for (const d of m.documents) {
    let filename = '';
    const pdf = d.hasPdf && files.get(`pdf/${d.key}.pdf`);
    if (pdf) {
      filename = `import-${crypto.randomBytes(6).toString('hex')}.pdf`;
      fs.mkdirSync(PDF_DIR, { recursive: true });
      fs.writeFileSync(path.join(PDF_DIR, filename), pdf);
    }
    const docId = tx(() => {
      run('INSERT OR IGNORE INTO subjects(name) VALUES(?)', d.subject);
      const sid = one('SELECT id FROM subjects WHERE name=?', d.subject).id;
      const id = Number(run(`INSERT INTO documents(subject_id,title,filename,pages,status,progress,message,figures_status,folder_id)
        VALUES(?,?,?,?, 'fertig', 1, ?, 'fertig', ?)`, sid, d.title, filename, d.pages || 0,
        `Importiert – ${d.items.length} Lerninhalte`, folderFor(d.folder)).lastInsertRowid);
      for (const p of d.pageTexts || []) {
        run('INSERT INTO pages(doc_id,page,text) VALUES(?,?,?)', id, p.page, p.text);
        run('INSERT INTO pages_fts(text,doc_id,page) VALUES(?,?,?)', p.text, id, p.page);
      }
      const ch = new Map(), tp = new Map(), un = new Map(), fg = new Map();
      for (const c of d.chapters) ch.set(c.id, Number(run('INSERT INTO chapters(doc_id,title,ord) VALUES(?,?,?)', id, c.title, c.ord).lastInsertRowid));
      for (const t of d.topics) {
        tp.set(t.id, Number(run(`INSERT INTO topics(chapter_id,doc_id,title,ord,page_from,page_to,gen_status,match_status) VALUES(?,?,?,?,?,?,?,?)`,
          ch.get(t.chapter_id), id, t.title, t.ord, t.page_from, t.page_to, t.gen_status || 'fertig', t.match_status || 'fertig').lastInsertRowid));
      }
      for (const u of d.units) {
        const uid = Number(run('INSERT INTO units(topic_id,doc_id,page,kind,content,ord) VALUES(?,?,?,?,?,?)', tp.get(u.topic_id), id, u.page, u.kind, u.content, u.ord).lastInsertRowid);
        un.set(u.id, uid);
        run('INSERT INTO units_fts(content,unit_id) VALUES(?,?)', u.content, uid);
      }
      const mapUnits = (json) => { try { return JSON.stringify((JSON.parse(json || '[]') || []).map((x) => un.get(x)).filter(Boolean)); } catch { return '[]'; } };
      const figDir = path.join(FIG_DIR, String(id));
      for (const f of d.figures || []) {
        const img = files.get(`fig/${d.key}/${f.file}`);
        if (!img) continue;
        const file = safeName(f.file);
        fs.mkdirSync(figDir, { recursive: true });
        fs.writeFileSync(path.join(figDir, file), img);
        fg.set(f.id, Number(run(`INSERT INTO figures(doc_id,topic_id,page,file,w,h,caption,status,relevant,kind,title,description,labels,illustrates,cards)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, tp.get(f.topic_id) ?? null, f.page, file, f.w, f.h, f.caption, f.status, f.relevant, f.kind,
          f.title, f.description, f.labels, mapUnits(f.illustrates), f.cards).lastInsertRowid));
      }
      for (const it of d.items) {
        let data = it.data;
        try {
          const o = JSON.parse(it.data);
          if (o.fig) { if (!fg.has(o.fig)) continue; o.fig = fg.get(o.fig); }   // Bildkarte ohne Bild → weglassen
          if (Array.isArray(o.figs)) o.figs = o.figs.map((x) => fg.get(x)).filter(Boolean);
          data = JSON.stringify(o);
        } catch {}
        run('INSERT INTO items(topic_id,doc_id,kind,data,unit_ids,pages,suspended) VALUES(?,?,?,?,?,?,?)',
          tp.get(it.topic_id), id, it.kind, data, mapUnits(it.unit_ids), it.pages || '[]', it.suspended || 0);
      }
      return id;
    });
    created.push({ id: docId, title: d.title, items: d.items.length });
  }
  return { documents: created, label: m.label };
}
