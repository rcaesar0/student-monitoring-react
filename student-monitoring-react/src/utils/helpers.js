import { SCHOOL_DOMAIN, GRADE_LEVELS } from '../config';
import { emailTaken } from '../services/auth';

export const fullName = (x) =>
  [x?.firstName, x?.middleName, x?.lastName].filter(Boolean).join(' ') || 'User';

export const initials = (x) => (fullName(x)[0] || 'U').toUpperCase();
export const dateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const formatDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

// Deadline / event date on activities and announcements.
export const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
export function dueInfo(post, today = dateStr()) {
  if (!post.dueDate) return null;
  const days = Math.round((new Date(`${post.dueDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
  const when = formatDate(post.dueDate);
  const tone = 'neutral';
  if (days < 0) return { days, tone, label: `${when} · Done` };
  if (days === 0) return { days, tone, label: 'Today' };
  if (days === 1) return { days, tone, label: 'Tomorrow' };
  return { days, tone, label: when };
}

const rand = (n) => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
};
const pick = (chars, len) => Array.from({ length: len }, () => chars[rand(chars.length)]).join('');

// Room codes avoid look-alike characters (0/O, 1/I).
export const makeCode = () => pick('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);
export const uniqueCode = (db) => {
  let code = makeCode();
  while (db.rooms.some((r) => r.code === code)) code = makeCode();
  return code;
};

// Temporary password for first login (user must change it immediately).
export const makeTempPassword = () => pick('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', 7) + pick('23456789', 2) + pick('@#$!', 1);

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
export function institutionalEmail(db, first, last) {
  const base = `${slug(first.trim().split(' ')[0])}.${slug(last)}`;
  let email = `${base}@${SCHOOL_DOMAIN}`;
  let n = 1;
  while (emailTaken(db, email)) email = `${base}${++n}@${SCHOOL_DOMAIN}`;
  return email;
}

// Accepts "4", "Grade 4", "grade4" and returns "Grade 4". Anything outside Grade 1-6 returns ''.
export function normalizeGrade(v) {
  const n = String(v || '').match(/\d+/);
  const label = n ? `Grade ${Number(n[0])}` : '';
  return GRADE_LEVELS.includes(label) ? label : '';
}

// Columns: firstName,middleName,lastName,lrn,birthdate,grade (header row required)
export function parseStudentCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const clean = (s) => s.replace(/^"|"$/g, '').trim();
  const head = lines[0].split(',').map((h) => clean(h).toLowerCase().replace(/[\s_]/g, ''));
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map(clean);
    const row = {};
    head.forEach((h, i) => (row[h] = cells[i] || ''));
    return {
      firstName: row.firstname || '',
      middleName: row.middlename || '',
      lastName: row.lastname || '',
      lrn: row.lrn || '',
      birthdate: row.birthdate || '',
      grade: normalizeGrade(row.grade || row.gradelevel),
    };
  });
}
