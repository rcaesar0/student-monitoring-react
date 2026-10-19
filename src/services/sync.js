// Talks to the shared database that runs with the dev server (see vite.config.js).
const API = '/api/db';

const json = async (res) => {
  if (!res.ok) {
    const e = new Error(`sync ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json(); // also throws if the server answered with a web page instead of data
};

const post = (path, body) =>
  fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json);

// since = the version we already have. The server answers { same: true } when nothing changed.
export const fetchRemote = (since = 0) => fetch(`${API}?since=${since}`, { cache: 'no-store' }).then(json);
export const sendInit = (db) => post('/init', { db });
export const sendOp = (op) => post('/op', op);