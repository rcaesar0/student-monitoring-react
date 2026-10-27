import crypto from 'node:crypto';

// Verification codes for sign up and change password.
// The code is made, sent and checked here, so the browser never knows it.
//
// Settings (put them in a .env file next to package.json, see .env.example):
//   SMS_PROVIDER=semaphore  SEMAPHORE_API_KEY=...  SEMAPHORE_SENDER=...     text messages through Semaphore
//   SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... SMTP_FROM=...    email (run: npm install nodemailer)
//   DEMO_CODES=false                                                         never show codes on screen
// A channel that is not set up runs in demo mode: the server answers with the code and the screen shows it.
// Turn demo mode off (DEMO_CODES=false) before real use.
const CODE_MS = 5 * 60 * 1000;
const RESEND_MS = 30 * 1000;
const MAX_TRIES = 5;
const MAX_SENDS_PER_HOUR = 5;       // per mobile number or email
const MAX_SENDS_PER_IP_HOUR = 30;   // per device address

const sha = (s) => crypto.createHash('sha256').update(s).digest();

async function sendSms(env, phone, text) {
  if (env.SMS_PROVIDER === 'semaphore' && env.SEMAPHORE_API_KEY) {
    const body = new URLSearchParams({ apikey: env.SEMAPHORE_API_KEY, number: phone.replace('+', ''), message: text });
    if (env.SEMAPHORE_SENDER) body.set('sendername', env.SEMAPHORE_SENDER);
    const r = await fetch('https://api.semaphore.co/api/v4/messages', { method: 'POST', body });
    if (!r.ok) throw new Error(`SMS provider answered ${r.status}`);
    return true;
  }
  return false; // no SMS service set up
}

async function sendEmail(env, to, subject, text) {
  if (!env.SMTP_HOST) return false; // no email service set up
  const { default: nodemailer } = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject, text });
  return true;
}

export function createVerifier(env = {}) {
  const codes = new Map();   // "phone:+639..." -> { hash, at, tries, last }
  const sends = new Map();   // key -> [timestamps]
  const demoOn = () => env.DEMO_CODES !== 'false';

  const hit = (key, limit) => {
    const now = Date.now();
    const list = (sends.get(key) || []).filter((t) => now - t < 3600000);
    if (list.length >= limit) { sends.set(key, list); return false; }
    list.push(now);
    sends.set(key, list);
    return true;
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => { size += c.length; if (size > 10000) { reject(new Error('too-big')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch (e) { reject(e); } });
      req.on('error', reject);
    });

  const send = (res, code, body) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };

  const valid = (type, value) =>
    (type === 'phone' && /^\+639\d{9}$/.test(value)) || (type === 'email' && /^\S+@\S+\.\S+$/.test(value) && value.length <= 120);

  // req.url is relative to where this is mounted (/api/verify).
  return async (req, res) => {
    if (req.method !== 'POST') return send(res, 404, { error: 'not-found' });
    const path = new URL(req.url, 'http://localhost').pathname;
    let body;
    try { body = await readBody(req); } catch { return send(res, 400, { error: 'bad-request' }); }
    const type = body.type;
    const value = String(body.value || '').trim();
    if (!valid(type, value)) return send(res, 400, { ok: false, error: 'invalid' });
    const key = `${type}:${value.toLowerCase()}`;
    const now = Date.now();
    for (const [k, v] of codes) if (now - v.at > CODE_MS * 2) codes.delete(k);

    if (path === '/send') {
      const entry = codes.get(key);
      if (entry && now - entry.last < RESEND_MS) return send(res, 429, { ok: false, error: 'too-soon' });
      const ip = req.socket?.remoteAddress || 'unknown';
      if (!hit(`t:${key}`, MAX_SENDS_PER_HOUR) || !hit(`ip:${ip}`, MAX_SENDS_PER_IP_HOUR)) return send(res, 429, { ok: false, error: 'too-many' });

      const code = String(crypto.randomInt(100000, 1000000));
      const text = `Your Student Monitoring verification code is ${code}. It expires in 5 minutes. Do not share it with anyone.`;
      let sent = false;
      try {
        sent = type === 'phone' ? await sendSms(env, value, text) : await sendEmail(env, value, 'Your verification code', text);
      } catch (e) {
        console.error('[verify] sending failed:', e.message);
        return send(res, 502, { ok: false, error: 'send-failed' });
      }
      codes.set(key, { hash: sha(code), at: now, tries: 0, last: now });
      if (sent) return send(res, 200, { ok: true });
      if (demoOn()) {
        console.log(`[verify] DEMO code for ${value}: ${code}`);
        return send(res, 200, { ok: true, demo: true, code });
      }
      codes.delete(key);
      return send(res, 503, { ok: false, error: 'not-configured' });
    }

    if (path === '/check') {
      const entry = codes.get(key);
      if (!entry) return send(res, 200, { ok: false, error: 'none' });
      if (now - entry.at > CODE_MS) { codes.delete(key); return send(res, 200, { ok: false, error: 'expired' }); }
      if (entry.tries >= MAX_TRIES) return send(res, 200, { ok: false, error: 'too-many-tries' });
      const good = crypto.timingSafeEqual(sha(String(body.code || '')), entry.hash);
      if (!good) { entry.tries += 1; return send(res, 200, { ok: false, error: entry.tries >= MAX_TRIES ? 'too-many-tries' : 'wrong' }); }
      codes.delete(key);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'not-found' });
  };
}