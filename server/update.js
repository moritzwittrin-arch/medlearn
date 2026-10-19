// Updates: neue Versionen von GitHub laden (öffentliches Repo, in package.json unter medlearn.updateRepo eingetragen).
// Daten (data/) und installierte Pakete (node_modules/) bleiben unangetastet.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unzip } from './package.js';

export const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readPkg = () => JSON.parse(fs.readFileSync(path.join(APP_DIR, 'package.json'), 'utf8'));

export function currentVersion() { return readPkg().version; }
function repo() { return String(process.env.MEDLEARN_UPDATE_REPO || readPkg().medlearn?.updateRepo || '').trim(); }
function branch() { return String(readPkg().medlearn?.updateBranch || 'main'); }

const newer = (a, b) => {   // ist a neuer als b?
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
  return false;
};

function base() {
  const r = repo();
  if (process.env.MEDLEARN_UPDATE_BASE) return process.env.MEDLEARN_UPDATE_BASE;   // für Tests
  return r ? { raw: `https://raw.githubusercontent.com/${r}/${branch()}`, zip: `https://codeload.github.com/${r}/zip/refs/heads/${branch()}` } : null;
}

export async function checkUpdate() {
  const b = typeof base() === 'string' ? { raw: base(), zip: `${base()}/app.zip` } : base();
  const current = currentVersion();
  if (!b) return { configured: false, current };
  const r = await fetch(`${b.raw}/package.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Update-Server nicht erreichbar (${r.status})`);
  const remote = await r.json();
  return { configured: true, current, latest: remote.version, available: newer(remote.version, current), notes: remote.medlearn?.notes || '' };
}

let updating = false;
export async function applyUpdate() {
  if (updating) throw new Error('Update läuft bereits');
  updating = true;
  try {
    const b = typeof base() === 'string' ? { raw: base(), zip: `${base()}/app.zip` } : base();
    if (!b) throw new Error('Keine Update-Quelle eingerichtet');
    const r = await fetch(b.zip);
    if (!r.ok) throw new Error(`Download fehlgeschlagen (${r.status})`);
    const files = unzip(Buffer.from(await r.arrayBuffer()));
    // GitHub-ZIPs haben einen Oberordner (repo-main/) → abschneiden
    const names = [...files.keys()];
    const top = names.every((n) => n.includes('/')) ? names[0].split('/')[0] + '/' : '';
    const oldPkg = readPkg();
    let written = 0;
    for (const [name, data] of files) {
      const rel = top && name.startsWith(top) ? name.slice(top.length) : name;
      if (!rel || rel.endsWith('/')) continue;
      if (/^(data|node_modules|runtime)\//.test(rel) || rel.includes('..')) continue;
      const dest = path.join(APP_DIR, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, data);
      if (/\.(sh|command)$/.test(rel)) fs.chmodSync(dest, 0o755);
      written++;
    }
    const newPkg = readPkg();
    if (JSON.stringify(oldPkg.dependencies) !== JSON.stringify(newPkg.dependencies)) await npmInstall();
    return { ok: true, version: newPkg.version, files: written };
  } finally { updating = false; }
}

function npmInstall() {
  const npm = path.join(path.dirname(process.execPath), process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const env = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ''}` };
  return new Promise((resolve, reject) => execFile(fs.existsSync(npm) ? npm : 'npm', ['install', '--omit=dev', '--no-audit', '--no-fund'],
    { cwd: APP_DIR, env, shell: process.platform === 'win32', timeout: 600000 }, (e, so, se) => (e ? reject(new Error(`npm install fehlgeschlagen: ${se || e.message}`)) : resolve())));
}

// Server neu starten: neuen Prozess losgelöst starten, alten beenden (der neue wartet, bis der Port frei ist)
export function restartServer() {
  const child = spawn(process.execPath, process.execArgv.concat(process.argv.slice(1)), {
    cwd: process.cwd(), detached: true, stdio: 'ignore', env: { ...process.env, MEDLEARN_NO_OPEN: '1' },
  });
  child.unref();
  setTimeout(() => process.exit(0), 300);
}
