// KI-Anbindung. Standard: Claude Code im Headless-Modus (nutzt dein Claude-Abo, keine API-Kosten).
// Alternativ: Anthropic-API-Key (kostenpflichtig, optional) oder Offline-Modus (ohne KI, stark eingeschränkt).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getSetting, DATA_DIR } from './db.js';

export function aiSettings() {
  return {
    // Ohne Claude-Abo installiert (Installer legt data/no-ai an) → standardmäßig ohne KI
    provider: getSetting('provider', fs.existsSync(path.join(DATA_DIR, 'no-ai')) ? 'offline' : 'claude-cli'),   // claude-cli | api | offline
    claudePath: getSetting('claudePath', 'claude'),
    model: getSetting('model', 'sonnet'),              // für Verarbeitung (Extraktion/Generierung)
    fastModel: getSetting('fastModel', 'sonnet'),      // für Bewertung & Tutor
    apiKey: getSetting('apiKey', ''),
    concurrency: getSetting('concurrency', 2),
  };
}

// ---------- einfache Warteschlange (max. N parallele KI-Aufrufe) ----------
let active = 0;
const waiting = [];
async function limited(fn) {
  const max = Math.max(1, Number(aiSettings().concurrency) || 1);
  if (active >= max) await new Promise((r) => waiting.push(r));
  active++;
  try { return await fn(); }
  finally { active--; const n = waiting.shift(); if (n) n(); }
}

const SYSTEM = 'Du bist ein präziser medizinischer Didaktik-Assistent für einen Medizinstudenten. ' +
  'Du arbeitest ausschließlich mit Text, verwendest keine Werkzeuge und antwortest exakt im verlangten Format.';

function winQuote(a) {
  if (a === '') return '""';
  return /[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a;
}

let gitDir = null;
// „claude“ auch finden, wenn die App per Doppelklick gestartet wurde (dann fehlt ~/.local/bin oft im PATH)
let resolvedClaude = null;
function resolveClaude(p) {
  if (p && p !== 'claude') return p;
  if (resolvedClaude) return resolvedClaude;
  const home = os.homedir();
  const dirs = [...String(process.env.PATH || '').split(path.delimiter), path.join(home, '.local', 'bin'), path.join(home, '.claude', 'local'),
    '/opt/homebrew/bin', '/usr/local/bin', path.join(home, '.npm-global', 'bin')];
  const names = process.platform === 'win32' ? ['claude.exe', 'claude.cmd', 'claude'] : ['claude'];
  for (const d of dirs) for (const n of names) {
    const f = path.join(d, n);
    try { if (d && fs.statSync(f).isFile()) return (resolvedClaude = f); } catch {}
  }
  return 'claude';
}

function dummyGitDir() {
  if (gitDir) return gitDir;
  gitDir = path.join(os.tmpdir(), 'medlearn-nogit');
  fs.mkdirSync(gitDir, { recursive: true });
  const f = path.join(gitDir, 'git');
  fs.writeFileSync(f, '#!/bin/sh\necho "fatal: not a git repository" >&2\nexit 128\n');
  fs.chmodSync(f, 0o755);
  return gitDir;
}

function runClaudeCli(prompt, { model, web = false, images = null, system = SYSTEM, timeoutMs = 10 * 60 * 1000 } = {}) {
  const s = aiSettings();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'medlearn-'));
  const sysFile = path.join(tmp, 'system.txt');
  fs.writeFileSync(sysFile, system);
  // Standard: keine Werkzeuge. Für den Tutor: nur Websuche/Webseiten lesen (automatisch erlaubt, sonst nichts)
  // Bilder: nur das Lese-Werkzeug (Claude sieht sich die Bilddateien an), sonst nichts
  const tools = web ? ['--tools', 'WebSearch,WebFetch', '--allowedTools', 'WebSearch,WebFetch']
    : images?.length ? ['--tools', 'Read', '--allowedTools', 'Read', '--add-dir', path.dirname(images[0])] : ['--tools', ''];
  const args = ['-p', '--output-format', 'json', ...tools, '--no-session-persistence',
    '--strict-mcp-config', '--system-prompt-file', sysFile];
  if (model) args.push('--model', model);

  // Wichtig: ANTHROPIC_API_KEY entfernen, sonst würde Claude Code über die (kostenpflichtige) API abrechnen
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  // macOS: Ohne Xcode-Command-Line-Tools öffnet jeder git-Aufruf von Claude Code ein Installationsfenster.
  // Die App braucht kein git → einen stillen Platzhalter-"git" voranstellen.
  if (process.platform === 'darwin') env.PATH = `${dummyGitDir()}:${env.PATH || ''}`;

  const isWin = process.platform === 'win32';
  const claudeBin = resolveClaude(s.claudePath);
  return new Promise((resolve, reject) => {
    // Windows: claude.exe direkt starten (kein Shell-Quoting nötig, Pfade mit Leerzeichen ok); nur .cmd/Befehlsnamen über die Shell
    const viaShell = isWin && !/\.exe$/i.test(claudeBin);
    const child = spawn(viaShell ? [claudeBin, ...args].map(winQuote).join(' ') : claudeBin,
      viaShell ? [] : args, { cwd: tmp, env, shell: viaShell, windowsHide: true });
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Zeitüberschreitung beim KI-Aufruf')); }, timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`Claude Code konnte nicht gestartet werden (${e.message}). Ist Claude Code installiert und bist du eingeloggt? Siehe README.`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      fs.rmSync(tmp, { recursive: true, force: true });
      let parsed;
      try { parsed = JSON.parse(out); } catch {
        return reject(new Error(`Claude Code: unerwartete Ausgabe (Code ${code}). ${(err || out).slice(0, 500)}`));
      }
      if (parsed.is_error || parsed.subtype !== 'success') {
        return reject(new Error(`Claude Code Fehler: ${String(parsed.result || parsed.subtype || err).slice(0, 500)}`));
      }
      resolve(parsed.result || '');
    });
    child.stdin.end(prompt);
  });
}

async function runApi(prompt, { model, web = false, images = null, system = SYSTEM }) {
  const s = aiSettings();
  if (!s.apiKey) throw new Error('Kein API-Key hinterlegt (Einstellungen).');
  const map = { sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5', opus: 'claude-opus-5-5' };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': s.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: map[model] || model, max_tokens: 32000, system,
      ...(web ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }] } : {}),
      messages: [{ role: 'user', content: images?.length
        ? [...images.map((f) => ({ type: 'image', source: { type: 'base64', media_type: f.endsWith('.jpg') ? 'image/jpeg' : 'image/png', data: fs.readFileSync(f).toString('base64') } })),
           { type: 'text', text: prompt + '\n\n(Die Bilder sind in der Reihenfolge der Abbildungen oben angehängt; ignoriere die Hinweise zum Read-Tool.)' }]
        : prompt }] }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`API-Fehler: ${j.error?.message || res.status}`);
  return j.content.filter((c) => c.type === 'text').map((c) => c.text || '').join('');
}

const IMG_SYSTEM = 'Du bist ein präziser medizinischer Didaktik-Assistent. Du siehst dir Abbildungen aus Vorlesungsskripten mit dem Read-Tool an und antwortest exakt im verlangten JSON-Format. Du verwendest ausschließlich das Read-Tool.';

export const WEB_SYSTEM = 'Du bist ein medizinischer Tutor für einen Medizinstudenten. Du recherchierst gründlich mit der Websuche in hochwertigen medizinischen Quellen, belegst Aussagen mit Quellen und antwortest auf Deutsch. Du verwendest ausschließlich WebSearch und WebFetch.';

export async function complete(prompt, { fast = false, web = false, images = null } = {}) {
  const s = aiSettings();
  const model = fast ? s.fastModel : s.model;
  if (s.provider === 'offline') throw new Error('Offline-Modus: keine KI verfügbar.');
  const opts = { model, web, images, system: web ? WEB_SYSTEM : images?.length ? IMG_SYSTEM : SYSTEM };
  return limited(() => (s.provider === 'api' ? runApi(prompt, opts) : runClaudeCli(prompt, opts)));
}

export function parseJson(text) {
  let t = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('Keine JSON-Antwort erhalten');
  return JSON.parse(t.slice(a, b + 1));
}

export async function completeJson(prompt, opts = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await complete(attempt ? prompt + '\n\nWICHTIG: Antworte ausschließlich mit gültigem JSON, ohne weiteren Text.' : prompt, opts);
    try { return parseJson(text); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

export async function testConnection() {
  const t0 = Date.now();
  const r = await complete('Antworte nur mit dem Wort: OK', { fast: true });
  return { ok: /ok/i.test(r), reply: r.slice(0, 100), ms: Date.now() - t0 };
}
