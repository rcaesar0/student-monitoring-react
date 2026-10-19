import { byName } from './selectors';

export const sectionKey = (name) => String(name || '').trim().toLowerCase();

// A section such as "Grade 6 - Rizal" is a group of subject rooms that share the same name.
export function sectionsOf(db) {
  const map = new Map();
  db.rooms.filter((r) => r.status === 'Active').forEach((r) => {
    const key = sectionKey(r.name);
    if (!map.has(key)) map.set(key, { key, name: r.name.trim(), gradeLevel: r.gradeLevel || '', rooms: [] });
    map.get(key).rooms.push(r);
  });
  return [...map.values()].sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel) || a.name.localeCompare(b.name));
}

// Students enrolled in at least one subject of the section.
export function sectionRoster(db, section) {
  const roomIds = new Set(section.rooms.map((r) => r.id));
  const ids = new Set(db.roomStudents.filter((x) => roomIds.has(x.roomId)).map((x) => x.studentId));
  return db.students.filter((s) => s.status === 'Active' && ids.has(s.id)).sort(byName);
}

// Puts a student in every subject room of the section.
export function enrollInSection(repo, section, studentId) {
  section.rooms.forEach((r) => repo.set('roomStudents', `${r.id}_${studentId}`, { roomId: r.id, studentId }));
}

export function removeFromSection(repo, section, studentId) {
  section.rooms.forEach((r) => repo.remove('roomStudents', `${r.id}_${studentId}`));
}