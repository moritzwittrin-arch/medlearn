// Optional: Ausgaben in eine Logdatei schreiben (wenn die App ohne Terminal gestartet wird, z. B. unter Windows)
import fs from 'node:fs';
import path from 'node:path';

const file = process.env.MEDLEARN_LOG;
if (file) {
  try {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    try { if (fs.statSync(file).size > 5e6) fs.renameSync(file, `${file}.alt`); } catch {}
    const out = fs.createWriteStream(file, { flags: 'a' });
    out.write(`---- Start ${new Date().toISOString()} ----\n`);
    for (const s of [process.stdout, process.stderr]) s.write = (chunk, enc, cb) => out.write(chunk, enc, cb);
  } catch {}
}
