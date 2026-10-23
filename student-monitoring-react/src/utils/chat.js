import { approvedChildren, roomsOfStudent } from './selectors';
import { fullName } from './helpers';

// One conversation per teacher + guardian pair, no matter which room it started from.
export const threadKey = (a, b) => [a, b].sort().join('__');

// Each person's own chat settings live on their account: { [otherPersonId]: { muted, pinned, clearedAt } }.
// clearedAt is when they deleted the conversation. It only hides older messages from them.
export const chatPrefsOf = (db, userId) => {
  const u = [...(db.teachers || []), ...(db.guardians || [])].find((x) => x.id === userId);
  return (u && u.chatPrefs) || {};
};

// The messages this user can still see (their own, minus conversations they deleted).
export function visibleMessages(db, userId) {
  const prefs = chatPrefsOf(db, userId);
  return (db.messages || []).filter((m) => {
    if (m.from !== userId && m.to !== userId) return false;
    const other = m.from === userId ? m.to : m.from;
    return m.at > (prefs[other]?.clearedAt || 0);
  });
}

// How many messages are waiting for this user (drives the red badge on the chat button).
// Muted conversations do not count.
export function unreadChat(db, userId) {
  const prefs = chatPrefsOf(db, userId);
  return visibleMessages(db, userId).filter((m) => m.to === userId && !m.read && !prefs[m.from]?.muted).length;
}

// Who this user is allowed to message.
//   Guardian -> the teachers of the rooms their approved children are in.
//   Teacher  -> the guardians of approved children who are in their rooms.
export function chatContacts(db, user) {
  if (user.role === 'Guardian') {
    const map = new Map();
    approvedChildren(db, user.id).forEach((child) => {
      roomsOfStudent(db, child.id).forEach((room) => {
        const t = db.teachers.find((x) => x.id === room.teacherId);
        if (!t || t.status === 'Archived') return;
        const entry = map.get(t.id) || { id: t.id, name: fullName(t), photo: t.photo, tags: new Set() };
        entry.tags.add(`${room.subject} · ${child.firstName}`);
        map.set(t.id, entry);
      });
    });
    return [...map.values()].map((c) => ({ id: c.id, name: c.name, photo: c.photo, sub: [...c.tags].join(', ') }));
  }

  if (user.role === 'Teacher') {
    const myRooms = new Set(db.rooms.filter((r) => r.teacherId === user.id && r.status === 'Active').map((r) => r.id));
    const map = new Map();
    db.guardianLinks.filter((l) => l.status === 'Approved').forEach((l) => {
      const inMyRoom = db.roomStudents.some((x) => x.studentId === l.studentId && myRooms.has(x.roomId));
      const g = db.guardians.find((x) => x.id === l.guardianId);
      const child = db.students.find((s) => s.id === l.studentId);
      if (!inMyRoom || !g || g.status === 'Archived' || !child) return;
      const entry = map.get(g.id) || { id: g.id, name: fullName(g), photo: g.photo, tags: new Set() };
      entry.tags.add(`Parent of ${child.firstName}`);
      map.set(g.id, entry);
    });
    return [...map.values()].map((c) => ({ id: c.id, name: c.name, photo: c.photo, sub: [...c.tags].join(', ') }));
  }

  return [];
}