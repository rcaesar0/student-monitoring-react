import { fullName } from './helpers';

// Turns a change to the data into one sentence for the Activity log. Returns null for changes that are not logged
// (messages, attendance, scores, notification settings and other routine changes), so the log stays readable.
// Passwords are never written to the log, only the fact that one was changed.
const LABEL = {
  students: 'student', teachers: 'teacher account', guardians: 'guardian account', admins: 'admin account',
  rooms: 'section', roomStudents: 'enrollment', guardianLinks: 'guardian link', assessments: 'assessment',
  announcements: 'announcement', activities: 'activity', schoolPosts: 'school announcement', alerts: 'early-warning alert',
};
const QUIET = new Set([
  'failedLinks', 'lockedUntil', 'failedLogins', 'lockedLoginUntil', 'seenPosts', 'viewedPosts', 'notifSound',
  'chatPrefs', 'photo', 'verifiedVia', 'mustChangePassword', 'autoArchived',
]);

const find = (db, col, id) => (db[col] || []).find((x) => x.id === id);
const nameOf = (db, col, id) => {
  const x = find(db, col, id);
  if (!x) return '';
  if (col === 'rooms') return x.name;
  if (col === 'assessments' || col === 'announcements' || col === 'activities' || col === 'schoolPosts') return `“${x.title}”`;
  return fullName(x);
};

export function describeChange({ action, col, id, data, patch, db }) {
  const label = LABEL[col];
  if (!label) return null;

  if (col === 'roomStudents') {
    const x = action === 'remove' ? find(db, col, id) : data;
    if (!x) return null;
    const s = find(db, 'students', x.studentId);
    const r = find(db, 'rooms', x.roomId);
    return `${action === 'remove' ? 'Removed' : 'Enrolled'} ${s ? fullName(s) : 'a student'} ${action === 'remove' ? 'from' : 'in'} ${r ? r.name : 'a section'}`;
  }

  if (action === 'add' || action === 'set') {
    if (col === 'alerts') {
      const s = find(db, 'students', data.studentId);
      return `Sent an early-warning alert about ${s ? fullName(s) : 'a student'}`;
    }
    if (col === 'guardianLinks') return `Guardian link ${String(data.status || 'requested').toLowerCase()}: ${nameOf(db, 'guardians', data.guardianId)} and ${nameOf(db, 'students', data.studentId)}`;
    const name = data.title ? `“${data.title}”` : fullName(data) || data.name || '';
    return `Added ${label}${name ? `: ${name}` : ''}`;
  }

  if (action === 'remove') {
    const name = nameOf(db, col, id);
    return `Removed ${label}${name ? `: ${name}` : ''}`;
  }

  // update
  const name = nameOf(db, col, id);
  if (col === 'guardianLinks' && patch.status) {
    const l = find(db, col, id);
    return `Guardian link ${patch.status.toLowerCase()}: ${l ? `${nameOf(db, 'guardians', l.guardianId)} and ${nameOf(db, 'students', l.studentId)}` : ''}`;
  }
  if (col === 'assessments') {
    if (patch.released === true) return `Released grades for ${name}`;
    if (patch.released === false) return `Took back released grades for ${name}`;
    return null;
  }
  if (col === 'announcements' || col === 'activities') {
    return patch.status === 'Archived' && !patch.autoArchived ? `Archived ${label} ${name}` : null;
  }
  if (patch.password) return `Password changed or reset for ${label} ${name}`;
  if (patch.status === 'Archived') return `Archived ${label}: ${name}`;
  if (patch.status === 'Active') return `Restored ${label}: ${name}`;
  const keys = Object.keys(patch).filter((k) => !QUIET.has(k));
  if (!keys.length) return null;
  return `Updated ${label} ${name}: ${keys.join(', ')}`;
}