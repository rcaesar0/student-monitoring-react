import fs from 'node:fs';
import path from 'node:path';

// The shared database every device reads and writes (saved in server-data/db.json).
// Used by the dev server (vite.config.js) and by the production server (server/start.js).
// Delete db.json (and restart) to go back to the demo data.
// A copy of the previous day's data is kept in server-data/backups (the last 14 days).
export function createSharedDb(root = process.cwd()) {
  const dir = path.resolve(root, 'server-data');
  const file = path.join(dir, 'db.json');
  let db = null;
  let version = Date.now();
  let timer = null;

  try {
    db = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    db = null;
  }

  // Before the first save of a day, copy the file as it was. Never throws.
  const backupOnce = () => {
    try {
      if (!fs.existsSync(file)) return;
      const folder = path.join(dir, 'backups');
      fs.mkdirSync(folder, { recursive: true });
      const copy = path.join(folder, `db-${new Date().toISOString().slice(0, 10)}.json`);
      if (fs.existsSync(copy)) return;
      fs.copyFileSync(file, copy);
      const all = fs.readdirSync(folder).filter((n) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
      all.slice(0, Math.max(0, all.length - 14)).forEach((n) => fs.unlinkSync(path.join(folder, n)));
    } catch { /* a failed backup must never stop the app */ }
  };

  const persist = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fs.mkdirSync(dir, { recursive: true });
      backupOnce();
      fs.writeFile(file, JSON.stringify(db), () => {});
    }, 300);
  };

  // The operations the app uses: add, set, update, remove, and replaceAll (restoring a backup).
  const apply = (op) => {
    const { type, col, id, data, patch } = op;
    const list = (db && db[col]) || [];
    if (type === 'add') db[col] = [...list, { ...data, id }];
    else if (type === 'set') db[col] = [...list.filter((x) => x.id !== id), { ...data, id }];
    else if (type === 'update') db[col] = list.map((x) => (x.id === id ? { ...x, ...patch } : x));
    else if (type === 'remove') db[col] = list.filter((x) => x.id !== id);
    else if (type === 'replaceAll' && op.db && typeof op.db === 'object') db = op.db;
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch (e) { reject(e); }
      });
      req.on('error', reject);
    });

  const send = (res, code, body) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };

  // req.url is relative to where this is mounted (/api/db).
  return async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET') {
        const since = Number(url.searchParams.get('since') || 0);
        if (db && since === version) return send(res, 200, { version, same: true });
        return send(res, 200, { version, db });
      }
      if (req.method === 'POST' && url.pathname === '/init') {
        const body = await readBody(req);
        if (!db && body.db) { db = body.db; version += 1; persist(); }
        return send(res, 200, { version, db });
      }
      if (req.method === 'POST' && url.pathname === '/op') {
        if (!db) return send(res, 409, { error: 'no-db' });
        apply(await readBody(req));
        version += 1;
        persist();
        return send(res, 200, { version });
      }
      return send(res, 404, { error: 'not-found' });
    } catch {
      return send(res, 400, { error: 'bad-request' });
    }
  };
}