import crypto from 'node:crypto';

// Verification codes for sign up and change password.
// The code is made, sent and checked here, so the browser never knows it.
//
// Settings in .env:
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_USER=studentmonitoring610@gmail.com
// SMTP_PASS=YOUR_GMAIL_APP_PASSWORD
// SMTP_FROM="Student Monitoring <studentmonitoring610@gmail.com>"
// DEMO_CODES=false

const CODE_MS = 5 * 60 * 1000;
const RESEND_MS = 30 * 1000;
const MAX_TRIES = 5;
const MAX_SENDS_PER_HOUR = 5;
const MAX_SENDS_PER_IP_HOUR = 30;

const sha = (s) => crypto.createHash('sha256').update(s).digest();

async function sendSms(env, phone, text) {
  if (env.SMS_PROVIDER === 'semaphore' && env.SEMAPHORE_API_KEY) {
    const body = new URLSearchParams({
      apikey: env.SEMAPHORE_API_KEY,
      number: phone.replace('+', ''),
      message: text,
    });

    if (env.SEMAPHORE_SENDER) {
      body.set('sendername', env.SEMAPHORE_SENDER);
    }

    const response = await fetch(
      'https://api.semaphore.co/api/v4/messages',
      {
        method: 'POST',
        body,
      }
    );

    if (!response.ok) {
      throw new Error(`SMS provider answered ${response.status}`);
    }

    return true;
  }

  return false;
}

async function sendEmail(env, to, subject, text) {
  if (!env.SMTP_HOST) return false;

  const { default: nodemailer } = await import('nodemailer');

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
  });

  await transport.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to,
    subject,
    text,
  });

  return true;
}

export function createVerifier(env = {}) {
  const codes = new Map();
  const sends = new Map();

  const demoOn = () => env.DEMO_CODES !== 'false';

  const hit = (key, limit) => {
    const now = Date.now();
    const list = (sends.get(key) || []).filter(
      (timestamp) => now - timestamp < 3600000
    );

    if (list.length >= limit) {
      sends.set(key, list);
      return false;
    }

    list.push(now);
    sends.set(key, list);
    return true;
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;

      req.on('data', (chunk) => {
        size += chunk.length;

        if (size > 10000) {
          reject(new Error('too-big'));
          req.destroy();
          return;
        }

        chunks.push(chunk);
      });

      req.on('end', () => {
        try {
          resolve(
            JSON.parse(Buffer.concat(chunks).toString() || '{}')
          );
        } catch (error) {
          reject(error);
        }
      });

      req.on('error', reject);
    });

  const send = (res, statusCode, body) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };

  const valid = (type, value) =>
    (type === 'phone' && /^\+639\d{9}$/.test(value)) ||
    (type === 'email' &&
      /^\S+@\S+\.\S+$/.test(value) &&
      value.length <= 120);

  // req.url is relative to /api/verify.
  return async (req, res) => {
    if (req.method !== 'POST') {
      return send(res, 404, { error: 'not-found' });
    }

    const route = new URL(req.url, 'http://localhost').pathname;

    let body;

    try {
      body = await readBody(req);
    } catch {
      return send(res, 400, { error: 'bad-request' });
    }

    // Send a teacher activation email.
    if (route === '/activation-email') {
      const to = String(body.to || '').trim().toLowerCase();
      const teacherName = String(body.teacherName || '')
        .trim()
        .slice(0, 120);
      const loginEmail = String(body.loginEmail || '')
        .trim()
        .toLowerCase();
      const code = String(body.code || '').trim().toUpperCase();
      const expiresAt = String(body.expiresAt || '').trim();

      const validEmail = (value) =>
        /^\S+@\S+\.\S+$/.test(value) && value.length <= 120;

      if (
        !validEmail(to) ||
        !validEmail(loginEmail) ||
        !/^[A-HJ-NP-Z2-9]{8}$/.test(code) ||
        !teacherName ||
        !expiresAt ||
        Number.isNaN(Date.parse(expiresAt))
      ) {
        return send(res, 400, {
          ok: false,
          error: 'invalid',
        });
      }

      if (!hit(`activation:${to}`, MAX_SENDS_PER_HOUR)) {
        return send(res, 429, {
          ok: false,
          error: 'too-many',
        });
      }

      const expiryText = new Date(expiresAt).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
      });

      const message = [
        `Hello ${teacherName},`,
        '',
        'Your Student Monitoring teacher registration has been approved.',
        '',
        `Activation code: ${code}`,
        `Teacher LMS login: ${loginEmail}`,
        `Code expiry: ${expiryText} (Philippine time)`,
        '',
        'Open Student Monitoring and choose "Activate teacher account".',
        'Enter this code and create your password.',
        '',
        'If you did not request a teacher account, contact the school administrator.',
        'Do not share this activation code with anyone.',
      ].join('\n');

      try {
        const sent = await sendEmail(
          env,
          to,
          'Student Monitoring — Activate your teacher account',
          message
        );

        if (!sent) {
          return send(res, 503, {
            ok: false,
            error: 'email-not-configured',
          });
        }

        return send(res, 200, { ok: true });
      } catch (error) {
        console.error(
          '[teacher activation email] sending failed:',
          error.message
        );

        return send(res, 502, {
          ok: false,
          error: 'send-failed',
        });
      }
    }

    // Existing email and SMS verification.
    const type = body.type;
    const value = String(body.value || '').trim();

    if (!valid(type, value)) {
      return send(res, 400, {
        ok: false,
        error: 'invalid',
      });
    }

    const key = `${type}:${value.toLowerCase()}`;
    const now = Date.now();

    for (const [storedKey, entry] of codes) {
      if (now - entry.at > CODE_MS * 2) {
        codes.delete(storedKey);
      }
    }

    if (route === '/send') {
      const entry = codes.get(key);

      if (entry && now - entry.last < RESEND_MS) {
        return send(res, 429, {
          ok: false,
          error: 'too-soon',
        });
      }

      const ip = req.socket?.remoteAddress || 'unknown';

      if (
        !hit(`t:${key}`, MAX_SENDS_PER_HOUR) ||
        !hit(`ip:${ip}`, MAX_SENDS_PER_IP_HOUR)
      ) {
        return send(res, 429, {
          ok: false,
          error: 'too-many',
        });
      }

      const code = String(crypto.randomInt(100000, 1000000));
      const message =
        `Your Student Monitoring verification code is ${code}. ` +
        'It expires in 5 minutes. Do not share it with anyone.';

      let sent = false;

      try {
        sent =
          type === 'phone'
            ? await sendSms(env, value, message)
            : await sendEmail(
                env,
                value,
                'Your verification code',
                message
              );
      } catch (error) {
        console.error('[verify] sending failed:', error.message);

        return send(res, 502, {
          ok: false,
          error: 'send-failed',
        });
      }

      codes.set(key, {
        hash: sha(code),
        at: now,
        tries: 0,
        last: now,
      });

      if (sent) {
        return send(res, 200, { ok: true });
      }

      if (demoOn()) {
        console.log(`[verify] DEMO code for ${value}: ${code}`);

        return send(res, 200, {
          ok: true,
          demo: true,
          code,
        });
      }

      codes.delete(key);

      return send(res, 503, {
        ok: false,
        error: 'not-configured',
      });
    }

    if (route === '/check') {
      const entry = codes.get(key);

      if (!entry) {
        return send(res, 200, {
          ok: false,
          error: 'none',
        });
      }

      if (now - entry.at > CODE_MS) {
        codes.delete(key);

        return send(res, 200, {
          ok: false,
          error: 'expired',
        });
      }

      if (entry.tries >= MAX_TRIES) {
        return send(res, 200, {
          ok: false,
          error: 'too-many-tries',
        });
      }

      const submittedCode = String(body.code || '');
      const good = crypto.timingSafeEqual(
        sha(submittedCode),
        entry.hash
      );

      if (!good) {
        entry.tries += 1;

        return send(res, 200, {
          ok: false,
          error:
            entry.tries >= MAX_TRIES
              ? 'too-many-tries'
              : 'wrong',
        });
      }

      codes.delete(key);

      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'not-found' });
  };
}