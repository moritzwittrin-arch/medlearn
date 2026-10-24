// Zugriff vom Handy (iPhone/Android) im selben WLAN.
// Standardmäßig AUS. Wenn an: Der Server lauscht im Netzwerk, aber nur Geräte mit dem geheimen Schlüssel
// (per QR-Code übertragen, danach als Cookie gespeichert) kommen hinein. Der Mac selbst braucht keinen Schlüssel.
import os from 'node:os';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { getSetting, setSetting } from './db.js';

const COOKIE = 'ml_key';
export function remoteSettings() {
  let r = getSetting('remote', null);
  if (!r || !r.token) { r = { enabled: false, token: crypto.randomBytes(18).toString('base64url') }; setSetting('remote', r); }
  return r;
}
export const listenHost = () => (remoteSettings().enabled ? '0.0.0.0' : '127.0.0.1');

export const isLocal = (req) => {
  const a = req.socket.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
};
const cookieOf = (req) => {
  const m = String(req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
};
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Diese Funktionen gibt es nur am Mac selbst (Server beenden, Updates, KI-Einstellungen, Handy-Zugang verwalten)
const LOCAL_ONLY = [/^\/api\/shutdown/, /^\/api\/update\//, /^\/api\/settings/, /^\/api\/remote/, /^\/api\/backups/, /^\/api\/mobile/, /^\/api\/quiz/];

const page = (title, text) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MedLearn</title><style>body{font-family:-apple-system,system-ui,sans-serif;background:#0e3a3b;color:#e8f3f0;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}
h1{font-size:1.4rem}p{color:#b9d6d0;max-width:30em;line-height:1.5}</style></head><body><div><h1>${title}</h1><p>${text}</p></div></body></html>`;

export function remoteGuard(req, res, next) {
  if (isLocal(req)) return next();
  const r = remoteSettings();
  if (!r.enabled) return res.status(403).send(page('Handy-Zugriff ist aus', 'Schalte ihn am Mac in MedLearn unter Einstellungen › Handy ein.'));
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  if (key && same(key, r.token)) {
    res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(r.token)}; Max-Age=31536000; Path=/; HttpOnly; SameSite=Lax`);
    return res.redirect(302, '/');
  }
  const c = cookieOf(req);
  if (!c || !same(c, r.token)) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Nicht verbunden – bitte den QR-Code am Mac erneut scannen.' });
    return res.status(401).send(page('Dieses Gerät ist noch nicht verbunden', 'Öffne MedLearn am Mac, gehe zu Einstellungen › Handy und scanne den QR-Code mit der Kamera dieses Geräts.'));
  }
  if (LOCAL_ONLY.some((re) => re.test(req.path))) return res.status(403).json({ error: 'Diese Einstellung geht nur direkt am Mac.' });
  next();
}

function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (/^(lo|utun|awdl|llw|bridge|docker|veth|vmnet|vboxnet|anpi|ap\d)/i.test(name)) continue;
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push({ name, address: a.address });
  }
  // WLAN/Ethernet des Macs (en0, en1 …) zuerst
  return out.sort((a, b) => (/^en/.test(b.name) ? 1 : 0) - (/^en/.test(a.name) ? 1 : 0)).map((a) => a.address);
}

export async function remoteInfo(port) {
  const r = remoteSettings();
  const ips = lanAddresses();
  const host = os.hostname().replace(/\.local$/i, '');
  const urls = ips.map((ip) => `http://${ip}:${port}`);
  const pairUrl = urls[0] ? `${urls[0]}/?key=${r.token}` : '';
  const qr = pairUrl ? await QRCode.toString(pairUrl, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) : '';
  return { enabled: r.enabled, urls, local: `http://${host}.local:${port}`, pairUrl, qr };
}

export function setRemote(enabled) {
  const r = remoteSettings();
  setSetting('remote', { ...r, enabled: !!enabled });
}
export function resetRemoteToken() {
  const r = remoteSettings();
  setSetting('remote', { ...r, token: crypto.randomBytes(18).toString('base64url') });
}

// Schutz gegen fremde Webseiten im eigenen Browser (DNS-Rebinding und Cross-Site-Anfragen):
// 1. Nur Anfragen an bekannte Adressen (localhost bzw. die eigene WLAN-Adresse bei Handy-Zugriff).
// 2. Ändernde Anfragen (POST/PUT/DELETE) nur, wenn sie von MedLearn selbst kommen (Origin/Referer = gleiche Adresse).
let lanCache = { at: 0, hosts: new Set() };
function allowedHosts() {
  const base = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  if (!remoteSettings().enabled) return base;
  if (Date.now() - lanCache.at > 30000) {
    const h = new Set(lanAddresses());
    const name = os.hostname().replace(/\.local$/i, '').toLowerCase();
    h.add(`${name}.local`); h.add(name);
    lanCache = { at: Date.now(), hosts: h };
  }
  for (const h of lanCache.hosts) base.add(h);
  return base;
}
const hostOnly = (h) => String(h || '').toLowerCase().replace(/:\d+$/, '');
export function hostGuard(req, res, next) {
  const host = hostOnly(req.headers.host);
  if (!allowedHosts().has(host)) return res.status(403).type('text').send('Unbekannte Adresse – MedLearn ist nur über http://localhost:3210 erreichbar.');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const src = req.headers.origin || req.headers.referer || '';
    if (src) {
      let srcHost = '';
      try { srcHost = new URL(src).host.toLowerCase(); } catch {}
      if (srcHost !== String(req.headers.host || '').toLowerCase()) return res.status(403).json({ error: 'Anfrage von einer fremden Seite blockiert.' });
    }
  }
  next();
}
