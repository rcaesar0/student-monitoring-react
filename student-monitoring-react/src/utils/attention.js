import { dateStr, dueInfo } from './helpers';
import { rosterOf } from './selectors';

// Everything a teacher still needs to do, across all of their rooms.
// The dashboard lists these, and the red dots on the nav come from the same list.
// kind: 'attendance' | 'grades' | 'requests'
export function teacherAttention(db, rooms, today = dateStr()) {
  const items = [];

  rooms.forEach((room) => {
    const roster = rosterOf(db, room.id);
    if (!roster.length) return;

    // Attendance for today
    const marked = roster.filter((s) => db.attendance.some((a) => a.id === `${room.id}_${today}_${s.id}`)).length;
    if (marked === 0) {
      items.push({ id: `att-${room.id}`, kind: 'attendance', text: `Attendance not taken today`, sub: room.name, view: 'Attendance', roomId: room.id });
    } else if (marked < roster.length) {
      items.push({ id: `att-${room.id}`, kind: 'attendance', text: `${roster.length - marked} student${roster.length - marked > 1 ? 's' : ''} not marked today`, sub: room.name, view: 'Attendance', roomId: room.id });
    }

    // Grades: missing scores, and assessments that are ready to release
    const assessments = db.assessments.filter((a) => a.roomId === room.id);
    let missing = 0;
    let ready = 0;
    assessments.forEach((a) => {
      const scored = roster.filter((s) => db.grades.some((g) => g.id === `${a.id}_${s.id}`)).length;
      missing += roster.length - scored;
      if (!a.released && scored === roster.length) ready += 1;
    });
    if (missing > 0) {
      items.push({ id: `miss-${room.id}`, kind: 'grades', text: `${missing} score${missing > 1 ? 's' : ''} still empty`, sub: room.name, view: 'Grades', roomId: room.id });
    }
    if (ready > 0) {
      items.push({ id: `rel-${room.id}`, kind: 'grades', text: `${ready} assessment${ready > 1 ? 's are' : ' is'} complete but not released to guardians`, sub: room.name, view: 'Grades', roomId: room.id });
    }
  });

  const mine = new Set(rooms.map((r) => r.id));
  const pending = db.guardianLinks.filter((l) => l.status === 'Pending' && mine.has(l.roomId)).length;
  if (pending) items.push({ id: 'req', kind: 'requests', text: `${pending} guardian request${pending > 1 ? 's' : ''} waiting`, sub: 'Review and approve', view: 'Requests', roomId: null });

  return items;
}

// Activities and announcements with a date that is today or later, soonest first.
export function upcoming(db, rooms, today = dateStr()) {
  const mine = new Set(rooms.map((r) => r.id));
  return [
    ...db.activities.map((x) => ({ ...x, kind: 'Activity' })),
    ...db.announcements.map((x) => ({ ...x, kind: 'Announcement' })),
  ]
    .filter((x) => mine.has(x.roomId) && x.dueDate && x.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((x) => ({ ...x, info: dueInfo(x, today) }));
}
