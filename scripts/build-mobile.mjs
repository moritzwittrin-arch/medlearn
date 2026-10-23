// Baut die iPhone-App (GitHub Pages, Ordner docs/) aus der normalen Oberfläche + Service Worker.
// Aufruf: node scripts/build-mobile.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });
for (const f of ['app.js', 'style.css', 'icon-180.png', 'icon-512.png']) fs.copyFileSync(path.join(root, 'public', f), path.join(out, f));
let html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', `<link rel="stylesheet" href="style.css?v=${version}">\n  <script>window.MEDLEARN_MOBILE = true;</script>`)
  .replace('<script src="app.js" type="module"></script>', `<script src="app.js?v=${version}" type="module"></script>`);
fs.writeFileSync(path.join(out, 'index.html'), html);
const man = JSON.parse(fs.readFileSync(path.join(root, 'public', 'manifest.webmanifest'), 'utf8'));
fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify({ ...man, name: 'MedLearn', start_url: './', scope: './', id: './' }, null, 2));
fs.copyFileSync(path.join(root, 'node_modules', 'ts-fsrs', 'dist', 'index.umd.js'), path.join(out, 'vendor', 'fsrs.umd.js'));
fs.writeFileSync(path.join(out, 'sw.js'), fs.readFileSync(path.join(root, 'mobile', 'sw.js'), 'utf8').replace('__VERSION__', version));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`docs/ gebaut (Version ${version})`);
