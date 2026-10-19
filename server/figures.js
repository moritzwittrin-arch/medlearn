// Abbildungen aus PDFs: finden, ausschneiden, von der KI auswerten lassen und als Lerninhalte nutzen.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { getDocument, OPS, Util } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { q, one, run, tx, DATA_DIR, PDF_DIR } from './db.js';
import { completeJson, aiSettings } from './ai.js';

export const FIG_DIR = path.join(DATA_DIR, 'figures');
const require = createRequire(import.meta.url);
const PDFJS_DIR = path.dirname(require.resolve('pdfjs-dist/package.json'));
const PDF_OPTS = { isEvalSupported: false, verbosity: 0, disableFontFace: true, useSystemFonts: false,
  standardFontDataUrl: path.join(PDFJS_DIR, 'standard_fonts') + path.sep, cMapUrl: path.join(PDFJS_DIR, 'cmaps') + path.sep, cMapPacked: true };
const CAPTION_RE = /^\s*(Abb\.?|Abbildung|Fig\.?|Figure|Grafik|Schema|Bild)\s*\d*/i;

// ---------- 1. Bildbereiche finden ----------
function bboxOf(ctm, x0, y0, x1, y1) {
  const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => Util.applyTransform([x, y], ctm));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; // PDF-Koordinaten (y nach oben)
}
const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
const near = (a, b, pad) => !(a[2] + pad < b[0] || b[2] + pad < a[0] || a[3] + pad < b[1] || b[3] + pad < a[1]);
const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
function mergeBoxes(boxes, pad = 10) {
  let out = boxes.map((b) => [...b]);
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < out.length && !changed; i++) for (let j = i + 1; j < out.length; j++) {
      if (near(out[i], out[j], pad)) { out[i] = union(out[i], out[j]); out.splice(j, 1); changed = true; break; }
    }
  }
  return out;
}

async function analyzePage(page) {
  const view = page.view; // [x0,y0,x1,y1]
  const pageArea = (view[2] - view[0]) * (view[3] - view[1]);
  const ops = await page.getOperatorList();
  const images = [], paths = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i], args = ops.argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = Util.transform(ctm, args);
    else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm); if (args?.[0]) ctm = Util.transform(ctm, args[0]); }
    else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageXObjectRepeat) {
      images.push(bboxOf(ctm, 0, 0, 1, 1));
    } else if (fn === OPS.constructPath) {
      const mm = args?.[2];
      if (mm && mm.length === 4 && Number.isFinite(mm[0])) paths.push(bboxOf(ctm, mm[0], mm[1], mm[2], mm[3]));
    }
  }
  // Textzeilen mit Position (für Bildunterschriften)
  const tc = await page.getTextContent();
  const lines = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const x = it.transform[4], y = it.transform[5];
    let l = lines.find((L) => Math.abs(L.y - y) < 3);
    if (!l) { l = { y, x0: x, x1: x + (it.width || 0), parts: [] }; lines.push(l); }
    l.parts.push({ x, s: it.str }); l.x0 = Math.min(l.x0, x); l.x1 = Math.max(l.x1, x + (it.width || 0));
  }
  for (const l of lines) l.text = l.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(' ').replace(/\s+/g, ' ').trim();
  return { view, pageArea, images, paths, lines };
}

function captionFor(box, lines) {
  const cands = lines.filter((l) => l.x1 > box[0] - 20 && l.x0 < box[2] + 20
    && ((l.y < box[1] && box[1] - l.y < 45) || (l.y > box[3] && l.y - box[3] < 30)));
  const cap = cands.find((l) => CAPTION_RE.test(l.text)) || cands.sort((a, b) => Math.min(Math.abs(a.y - box[1]), Math.abs(a.y - box[3])) - Math.min(Math.abs(b.y - box[1]), Math.abs(b.y - box[3])))[0];
  if (!cap) return '';
  // Folgezeile der Bildunterschrift mitnehmen
  const next = lines.find((l) => l.y < cap.y && cap.y - l.y < 16 && Math.abs(l.x0 - cap.x0) < 30);
  return (cap.text + (next && CAPTION_RE.test(cap.text) ? ' ' + next.text : '')).slice(0, 300);
}

/** Findet Abbildungen im ganzen Dokument → [{page, box(PDF), caption, vector}] */
export async function detectFigures(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data, ...PDF_OPTS }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    pages.push({ p, ...(await analyzePage(page)) });
    page.cleanup();
  }
  // Logos/Kopfzeilen: gleiche Position+Größe auf vielen Seiten → raus
  const keyOf = (b) => b.map((v) => Math.round(v / 6)).join(',');
  const freq = new Map();
  for (const pg of pages) for (const k of new Set(pg.images.map(keyOf))) freq.set(k, (freq.get(k) || 0) + 1);
  const repeatLimit = Math.max(3, Math.ceil(pages.length * 0.3));

  const out = [];
  for (const pg of pages) {
    const minSide = 60, minArea = pg.pageArea * 0.015;
    let boxes = pg.images.filter((b) => (freq.get(keyOf(b)) || 0) < repeatLimit
      && (b[2] - b[0]) >= minSide && (b[3] - b[1]) >= minSide && area(b) >= minArea && area(b) < pg.pageArea * 0.85);
    boxes = mergeBoxes(boxes);
    // Vektorgrafiken: Seite mit Bildunterschrift, aber ohne Rasterbild daneben → Zeichenbereich ausschneiden
    const capLines = pg.lines.filter((l) => CAPTION_RE.test(l.text));
    for (const cl of capLines) {
      if (boxes.some((b) => cl.y < b[1] + 5 && b[1] - cl.y < 60 || cl.y > b[3] - 5 && cl.y - b[3] < 40)) continue;
      const pageW = pg.view[2] - pg.view[0];
      const shapes = pg.paths.filter((b) => (b[2] - b[0]) < pageW * 0.95 && b[3] > cl.y && b[3] - cl.y < 500 && area(b) > 4);
      if (shapes.length < 3) continue;
      let region = mergeBoxes(shapes, 40).filter((b) => b[1] - cl.y < 60).sort((a, b) => area(b) - area(a))[0];
      if (!region || area(region) < pg.pageArea * 0.03) continue;
      // Beschriftungen innerhalb des Bereichs gehören zur Grafik
      boxes.push(region);
    }
    boxes = mergeBoxes(boxes).sort((a, b) => b[3] - a[3]).slice(0, 6);
    for (const b of boxes) out.push({ page: pg.p, box: b, caption: captionFor(b, pg.lines) });
  }
  await doc.destroy();
  return out;
}

/** Schneidet die Bereiche als Bilddateien aus (gerendert, damit auch Beschriftungen/Pfeile erhalten bleiben). */
export async function renderFigures(pdfPath, figs, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data, ...PDF_OPTS }).promise;
  const byPage = new Map();
  for (const f of figs) (byPage.get(f.page) || byPage.set(f.page, []).get(f.page)).push(f);
  for (const [p, list] of byPage) {
    const page = await doc.getPage(p);
    const w = page.view[2] - page.view[0];
    const scale = Math.min(3, 2200 / w);
    const vp = page.getViewport({ scale });
    const { canvas, context } = doc.canvasFactory.create(Math.ceil(vp.width), Math.ceil(vp.height));
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport: vp }).promise;
    for (const f of list) {
      const pad = 6;
      const r = vp.convertToViewportRectangle([f.box[0] - pad, f.box[1] - pad, f.box[2] + pad, f.box[3] + pad]);
      const x = Math.max(0, Math.floor(Math.min(r[0], r[2]))), y = Math.max(0, Math.floor(Math.min(r[1], r[3])));
      const cw = Math.min(canvas.width - x, Math.ceil(Math.abs(r[2] - r[0]))), ch = Math.min(canvas.height - y, Math.ceil(Math.abs(r[3] - r[1])));
      if (cw < 20 || ch < 20) continue;
      const { canvas: c2, context: x2 } = doc.canvasFactory.create(cw, ch);
      x2.drawImage(canvas, x, y, cw, ch, 0, 0, cw, ch);
      let buf = c2.toBuffer('image/png'), ext = 'png';
      if (buf.length > 600 * 1024) { buf = c2.toBuffer('image/jpeg', 82); ext = 'jpg'; }
      f.file = `${f.page}-${Math.round(f.box[0])}-${Math.round(f.box[3])}.${ext}`;
      f.w = cw; f.h = ch;
      fs.writeFileSync(path.join(outDir, f.file), buf);
      doc.canvasFactory.destroy({ canvas: c2, context: x2 });
    }
    doc.canvasFactory.destroy({ canvas, context });
    page.cleanup();
  }
  await doc.destroy();
  return figs.filter((f) => f.file);
}

// ---------- 2. KI-Auswertung ----------
function figurePrompt({ title, figs }) {
  return `Du wertest Abbildungen aus dem Vorlesungsskript "${title}" für einen Medizinstudenten aus.

${figs.map((f) => `=== Abbildung F${f.id} (Seite ${f.page}) ===
Bilddatei: ${f.abs}
Bildunterschrift: ${f.caption || '(keine)'}
Text derselben Seite (Auszug): ${f.pageText.slice(0, 1200)}
Wissenseinheiten dieser Seite: ${f.units.map((u) => `[u${u.id}] ${u.content}`).join(' | ').slice(0, 2500) || '(keine)'}`).join('\n\n')}

AUFGABE
Öffne JEDE Bilddatei mit dem Read-Tool und sieh sie dir genau an. Bewerte dann jede Abbildung:
- relevant: true, wenn sie prüfungsrelevante Information zeigt (Anatomie, Histologie, Bildgebung/Befunde, Schemata, Signalwege, Diagramme, Kurven, Algorithmen, Tabellen). false bei Logos, Dekoration, Personenfotos, Hörsaalbildern, Platzhaltern oder unlesbaren Bildern.
- art: anatomie | histologie | bildgebung | schema | diagramm | tabelle | klinisches_foto | sonstiges | dekorativ
- titel: kurzer prägnanter Titel (max. 8 Wörter).
- beschreibung: 2–4 Sätze, was die Abbildung zeigt und was man daran lernen soll. Nur beschreiben, was tatsächlich sichtbar ist bzw. im Skript steht.
- beschriftungen: Liste der im Bild lesbaren Beschriftungen/Markierungen mit Bedeutung, z. B. "1 = Hinterhorn" (Bedeutung nur, wenn aus Bild oder Skripttext eindeutig).
- illustriert: IDs der Wissenseinheiten (nur Zahlen), die diese Abbildung veranschaulicht.
- karten: 1–4 Lernkarten NUR für relevante Abbildungen. Die Abbildung wird auf der VORDERSEITE gezeigt; die Frage muss sich auf das Bild beziehen und mit Blick auf das Bild beantwortet werden, z. B. "Welche Struktur ist mit 2 markiert?", "Welche Welle ist hier mit T bezeichnet und was bedeutet sie?", "Was zeigt dieses Schema – benenne die Schritte von oben nach unten.", "Welcher Befund ist zu sehen?". Antworten knapp und exakt, gestützt auf Bild + Skript. Keine Karte, deren Antwort im Bild als Beschriftung direkt neben der Frage steht, ohne Lerneffekt.
- Erfinde nichts: Was weder im Bild noch im Skript eindeutig ist, lässt du weg.

Antworte NUR mit JSON:
{"figures":[{"id":"F12","relevant":true,"art":"schema","titel":"...","beschreibung":"...","beschriftungen":["..."],"illustriert":[12],"karten":[{"q":"...","a":"..."}]}]}`;
}

export async function analyzeFigures(docId, onProgress = () => {}) {
  const doc = one('SELECT * FROM documents WHERE id=?', docId);
  const figs = q("SELECT * FROM figures WHERE doc_id=? AND status='neu' ORDER BY page, id", docId);
  if (!figs.length) return;
  const dir = path.join(FIG_DIR, String(docId));
  const batches = [];
  for (let i = 0; i < figs.length; i += 3) batches.push(figs.slice(i, i + 3));
  let done = 0;
  await Promise.all(batches.map(async (batch) => {
    const items = batch.map((f) => ({
      ...f, abs: path.join(dir, f.file),
      pageText: one('SELECT text FROM pages WHERE doc_id=? AND page=?', docId, f.page)?.text || '',
      units: q('SELECT id, content FROM units WHERE doc_id=? AND page=? ORDER BY ord', docId, f.page),
    }));
    try {
      const r = await completeJson(figurePrompt({ title: doc.title, figs: items }), { images: items.map((f) => f.abs) });
      tx(() => {
        for (const f of items) {
          const a = (r.figures || []).find((x) => String(x.id).replace(/\D/g, '') === String(f.id)) || {};
          const ok = a.relevant !== false && a.art !== 'dekorativ' && !!a.titel;
          const unitIds = new Set(f.units.map((u) => u.id));
          run(`UPDATE figures SET status='fertig', relevant=?, kind=?, title=?, description=?, labels=?, illustrates=?, cards=? WHERE id=?`,
            ok ? 1 : 0, String(a.art || ''), String(a.titel || ''), String(a.beschreibung || ''), JSON.stringify(a.beschriftungen || []),
            JSON.stringify((a.illustriert || []).map((x) => parseInt(String(x).replace(/\D/g, ''))).filter((x) => unitIds.has(x))),
            JSON.stringify(ok ? (a.karten || []).filter((k) => k.q && k.a).slice(0, 4) : []), f.id);
        }
      });
    } catch (e) {
      console.warn('  Abbildungen', batch.map((f) => f.id).join(','), e.message);
      run(`UPDATE figures SET status='fehler' WHERE id IN (${batch.map((f) => f.id).join(',')})`);
    }
    done += batch.length; onProgress(done, figs.length);
  }));
}

// ---------- 3. In Lerninhalte übernehmen ----------
/** Erstellt Bildkarten und hängt Abbildungen an passende Textkarten (Rückseite). Idempotent pro Thema. */
export function applyFiguresToTopic(topicId) {
  const figs = q("SELECT * FROM figures WHERE topic_id=? AND status='fertig' AND relevant=1 ORDER BY page, id", topicId);
  const topic = one('SELECT * FROM topics WHERE id=?', topicId);
  if (!topic) return;
  tx(() => {
    // vorhandene Bildkarten dieses Themas ersetzen
    run("DELETE FROM items WHERE topic_id=? AND kind='flashcard' AND json_extract(data,'$.fig') IS NOT NULL", topicId);
    for (const f of figs) {
      for (const c of JSON.parse(f.cards || '[]')) {
        run('INSERT INTO items(topic_id,doc_id,kind,data,unit_ids,pages) VALUES(?,?,?,?,?,?)', topicId, f.doc_id, 'flashcard',
          JSON.stringify({ q: c.q, a: c.a, fig: f.id }), f.illustrates || '[]', JSON.stringify([f.page]));
      }
    }
    // Textkarten: passende Abbildung auf der Rückseite
    const items = q("SELECT id, data, unit_ids FROM items WHERE topic_id=? AND json_extract(data,'$.fig') IS NULL", topicId);
    for (const it of items) {
      const uids = new Set(JSON.parse(it.unit_ids || '[]'));
      const figIds = figs.filter((f) => JSON.parse(f.illustrates || '[]').some((u) => uids.has(u))).map((f) => f.id).slice(0, 2);
      const d = JSON.parse(it.data);
      if (JSON.stringify(d.figs || []) === JSON.stringify(figIds)) continue;
      if (figIds.length) d.figs = figIds; else delete d.figs;
      run('UPDATE items SET data=? WHERE id=?', JSON.stringify(d), it.id);
    }
  });
}

/** Kompletter Ablauf für ein Dokument: finden → ausschneiden → auswerten → übernehmen */
export async function processFigures(docId, onProgress = () => {}) {
  const doc = one('SELECT * FROM documents WHERE id=?', docId);
  if (!doc) return;
  if (!doc.figures_status) {
    const pdf = path.join(PDF_DIR, doc.filename);
    onProgress('Abbildungen werden gesucht …', 0);
    const found = await detectFigures(pdf);
    const dir = path.join(FIG_DIR, String(docId));
    const rendered = found.length ? await renderFigures(pdf, found, dir) : [];
    const topics = q('SELECT id, page_from, page_to FROM topics WHERE doc_id=? ORDER BY page_from, ord', docId);
    tx(() => {
      run('DELETE FROM figures WHERE doc_id=?', docId);
      for (const f of rendered) {
        const t = topics.find((x) => f.page >= x.page_from && f.page <= x.page_to) || topics[0];
        run(`INSERT INTO figures(doc_id,page,file,w,h,caption,topic_id,status) VALUES(?,?,?,?,?,?,?,'neu')`,
          docId, f.page, f.file, f.w, f.h, f.caption, t?.id ?? null);
      }
      run("UPDATE documents SET figures_status='gefunden' WHERE id=?", docId);
    });
    console.log(`  ${doc.title}: ${rendered.length} Abbildungen gefunden`);
  }
  if (aiSettings().provider !== 'offline') {
    run("UPDATE figures SET status='neu' WHERE doc_id=? AND status='fehler'", docId); // fehlgeschlagene erneut versuchen
    await analyzeFigures(docId, (d, n) => onProgress(`Abbildungen werden ausgewertet (${d}/${n}) …`, d / n));
  }
  for (const t of q('SELECT DISTINCT topic_id FROM figures WHERE doc_id=? AND topic_id IS NOT NULL', docId)) applyFiguresToTopic(t.topic_id);
  const pending = one("SELECT COUNT(*) n FROM figures WHERE doc_id=? AND status IN ('neu','fehler')", docId).n;
  run('UPDATE documents SET figures_status=? WHERE id=?', pending ? 'gefunden' : 'fertig', docId);
}
