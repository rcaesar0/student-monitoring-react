// Talks to the verification service that runs with the app (server/verify.js).
// The code is made, sent and checked on the server, so the browser never knows it.
async function post(path, body) {
  const res = await fetch(`/api/verify${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, ...data };
}

export const sendCode = (type, value) => post('/send', { type, value });
export const checkCode = (type, value, code) => post('/check', { type, value, code });