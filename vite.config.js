import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Shared database for every device that opens this app from this computer.
// Phone and PC now read and write the same data, saved in server-data/db.json.
// Delete that file (and restart) to reset to the demo data.
function sharedDb() {
  const dir = path.resolve(process.cwd(), 'server-data');
  const file = path.join(dir, 'db.json');
  let db = null;
  let version = Date.now();
  let timer = null;

  try {
    db = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    db = null;
  }

  const persist = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFile(file, JSON.stringify(db), () => {});
    }, 300);
  };

  // Same four operations the app uses: add, set, update, remove.
  const apply = ({ type, col, id, data, patch }) => {
    const list = db[col] || [];
    if (type === 'add') db[col] = [...list, { ...data, id }];
    else if (type === 'set') db[col] = [...list.filter((x) => x.id !== id), { ...data, id }];
    else if (type === 'update') db[col] = list.map((x) => (x.id === id ? { ...x, ...patch } : x));
    else if (type === 'remove') db[col] = list.filter((x) => x.id !== id);
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

  const handler = async (req, res) => {
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

  // Must return nothing: Vite treats a returned value as a function to call after its own middlewares.
  const attach = (server) => {
    server.middlewares.use('/api/db', handler);
  };

  return { name: 'shared-db', configureServer: attach, configurePreviewServer: attach };
}

export default defineConfig({
  plugins: [react(), sharedDb()],
  server: { host: true, port: 5173, open: true, watch: { ignored: ['**/server-data/**'] } },
});