// PDF-Text seitenweise extrahieren (pdf.js, lokal)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const require = createRequire(import.meta.url);
const PDFJS_DIR = path.dirname(require.resolve('pdfjs-dist/package.json'));
const FONT_URL = path.join(PDFJS_DIR, 'standard_fonts') + path.sep;

/**
 * Liefert { pages: [{page, text, headings:[...]}], outline: [{title, page}] }
 * Text wird zeilenweise rekonstruiert, damit Tabellen zeilenweise lesbar bleiben.
 */
export async function extractPdf(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await getDocument({ data, useSystemFonts: true, standardFontDataUrl: FONT_URL, isEvalSupported: false, verbosity: 0 }).promise;
  const pages = [];
  const allHeights = [];
  const raw = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const lines = [];
    for (const it of content.items) {
      if (!('str' in it)) continue;
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      const h = Math.round(Math.abs(it.transform[3]) || it.height || 0);
      let line = lines.find((l) => Math.abs(l.y - y) <= 2);
      if (!line) { line = { y, parts: [], h: 0 }; lines.push(line); }
      line.parts.push({ x, s: it.str, w: it.width || 0 });
      line.h = Math.max(line.h, h);
    }
    lines.sort((a, b) => b.y - a.y);
    const out = [];
    for (const l of lines) {
      l.parts.sort((a, b) => a.x - b.x);
      let s = '';
      let lastEnd = null;
      for (const part of l.parts) {
        if (!part.s.trim()) continue;          // Leerraum-Elemente überspringen (Lücken werden über Positionen erkannt)
        if (lastEnd !== null) {
          const gap = part.x - lastEnd;
          if (gap > 18) s += ' | ';           // große Lücke → Tabellenspalte
          else if (gap > 1 && !s.endsWith(' ') && !part.s.startsWith(' ')) s += ' ';
        }
        s += part.s;
        lastEnd = part.x + part.w;
      }
      s = s.replace(/\s+/g, ' ').trim();
      if (s) { out.push({ s, h: l.h }); allHeights.push(l.h); }
    }
    raw.push(out);
  }

  // Überschriften-Kandidaten: Zeilen mit deutlich größerer Schrift
  const sorted = [...allHeights].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 10;
  raw.forEach((out, i) => {
    const headings = out.filter((l) => l.h >= median * 1.25 && l.s.length < 120).map((l) => l.s);
    pages.push({ page: i + 1, text: out.map((l) => l.s).join('\n'), headings });
  });

  let outline = [];
  try {
    const ol = await doc.getOutline();
    const walk = async (items, depth) => {
      for (const it of items || []) {
        let page = null;
        try {
          const dest = typeof it.dest === 'string' ? await doc.getDestination(it.dest) : it.dest;
          if (dest && dest[0]) page = (await doc.getPageIndex(dest[0])) + 1;
        } catch {}
        outline.push({ title: it.title, page, depth });
        if (depth < 2) await walk(it.items, depth + 1);
      }
    };
    await walk(ol, 0);
  } catch { outline = []; }

  await doc.destroy();
  return { pages, outline };
}
