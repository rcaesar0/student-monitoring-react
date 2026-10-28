import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { createSharedDb } from './sharedDb.js';
import { createVerifier } from './verify.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const dist = path.resolve('dist');
const db = createSharedDb();
const verify = createVerifier(env);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const mount = (req, prefix) => {
  req.url = req.url.slice(prefix.length) || '/';
};

function serve(req, res) {
  const urlPath = decodeURIComponent(
    new URL(req.url, 'http://x').pathname
  );

  let file = path.join(dist, path.normalize(urlPath));

  if (!file.startsWith(dist)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(dist, 'index.html');
  }

  const ext = path.extname(file);

  res.setHeader(
    'Content-Type',
    MIME[ext] || 'application/octet-stream'
  );

  res.setHeader(
    'Cache-Control',
    ext === '.html' || file.endsWith('sw.js')
      ? 'no-cache'
      : urlPath.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600'
  );

  fs.createReadStream(file).pipe(res);
}

const handler = (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');

  if (env.HTTPS_KEY) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=15552000'
    );
  }

  if (req.url.startsWith('/api/db')) {
    mount(req, '/api/db');
    return db(req, res);
  }

  if (req.url.startsWith('/api/verify')) {
    mount(req, '/api/verify');
    return verify(req, res);
  }

  return serve(req, res);
};

const port = Number(env.PORT || 8080);

const server =
  env.HTTPS_KEY && env.HTTPS_CERT
    ? https.createServer(
        {
          key: fs.readFileSync(env.HTTPS_KEY),
          cert: fs.readFileSync(env.HTTPS_CERT),
        },
        handler
      )
    : http.createServer(handler);

server.listen(port, '0.0.0.0', () => {
  console.log(
    `Student Monitoring is running on ${
      env.HTTPS_KEY ? 'https' : 'http'
    }://localhost:${port}`
  );

  if (!fs.existsSync(dist)) {
    console.log(
      'The dist folder is missing. Run "npm run build" first.'
    );
  }

  if (env.DEMO_CODES !== 'false') {
    console.log(
      'Verification codes are in demo mode. Set DEMO_CODES=false in .env before real use.'
    );
  }
});