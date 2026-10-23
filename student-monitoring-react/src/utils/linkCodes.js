// Link codes: 8 characters, no look-alike letters (no O/0 or I/1). The school office hands one to each parent.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const makeLinkCode = () => {
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => CHARS[n % CHARS.length]).join('');
};

export const uniqueLinkCode = (db) => {
  const used = new Set(db.students.map((s) => s.linkCode));
  let code = makeLinkCode();
  while (used.has(code)) code = makeLinkCode();
  return code;
};

// ABCD-2345 is easier to read than ABCD2345.
export const showCode = (c) => (c ? `${c.slice(0, 4)}-${c.slice(4)}` : '—');