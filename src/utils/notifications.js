import { approvedChildren, roomsOfStudent } from './selectors';
import { fullName, formatDate, dateStr } from './helpers';
import { visibleSchoolPosts } from './schoolPosts';

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d); };

// Builds the bell menu for each role. `unread` is what the red badge counts.
// Guardians and teachers remember what they have already seen in user.seenPosts.
export function notificationsFor(db, user) {
  const seen = new Set(user.seenPosts || []);
  const since = daysAgo(7);

  // School-wide announcements from the administrator (teachers and guardians).
  const school = visibleSchoolPosts(db, user.role)
    .filter((p) => p.date >= since)
    .map((p) => ({ id: `school-${p.id}`, at: p.date, title: p.title, sub: 'School announcement', view: user.role === 'Teacher' ? 'Dashboard' : 'My Children' }));

  if (user.role === 'Teacher') {
    const mine = new Set(db.rooms.filter((r) => r.teacherId === user.id && r.status === 'Active').map((r) => r.id));
    const pending = db.guardianLinks.filter((l) => l.status === 'Pending' && mine.has(l.roomId));
    const nameOf = (col, id) => {
      const x = db[col].find((y) => y.id === id);
      return x ? fullName(x) : 'Someone';
    };
    const requests = pending.slice(0, 6).map((l) => ({
      id: l.id,
      title: 'New guardian request',
      sub: `${nameOf('guardians', l.guardianId)} wants to view ${nameOf('students', l.studentId)}`,
      view: 'Requests',
      fresh: true,
    }));
    const notes = school.map(({ at, ...n }) => ({ ...n, fresh: !seen.has(n.id) }));
    const items = [...requests, ...notes];
    return { unread: items.filter((i) => i.fresh).length, items, postIds: school.map((n) => n.id) };
  }

  if (user.role === 'Admin') {
    const n = db.guardianLinks.filter((l) => l.status === 'Pending').length;
    return {
      unread: n,
      items: n ? [{ id: 'req', title: `${n} guardian link request${n > 1 ? 's' : ''} pending`, sub: 'Waiting for approval', view: 'Guardians', fresh: true }] : [],
      postIds: [],
    };
  }

  // Guardian: new posts, attendance alerts (absent / late / excused, last 7 days), grades released (last 7 days),
  // early-warning alerts the teacher sent (last 14 days, until resolved) and school announcements.
  const kids = approvedChildren(db, user.id);
  const kidById = new Map(kids.map((c) => [c.id, c]));
  const rooms = new Map(kids.flatMap((c) => roomsOfStudent(db, c.id)).map((r) => [r.id, r]));
  const roomName = (id) => db.rooms.find((r) => r.id === id)?.name || '';

  const posts = [
    ...db.announcements.map((x) => ({ ...x, kind: 'Announcement' })),
    ...db.activities.map((x) => ({ ...x, kind: 'Activity' })),
  ]
    .filter((x) => rooms.has(x.roomId) && x.status !== 'Archived')
    .map((x) => ({ id: `${x.kind}-${x.id}`, at: x.date, title: x.title, sub: `New ${x.kind.toLowerCase()} · ${roomName(x.roomId)}`, view: 'Updates', roomId: x.roomId }));

  const attendance = db.attendance
    .filter((a) => kidById.has(a.studentId) && rooms.has(a.roomId) && ['Absent', 'Late', 'Excused'].includes(a.status) && a.date >= since)
    .map((a) => ({
      id: `att-${a.id}`, at: a.date,
      title: `${kidById.get(a.studentId).firstName} was marked ${a.status.toLowerCase()}`,
      sub: `${rooms.get(a.roomId).subject} · ${formatDate(a.date)}`, view: 'Attendance', roomId: a.roomId,
    }));

  const grades = db.assessments
    .filter((a) => a.released && a.releasedAt && a.releasedAt >= since && rooms.has(a.roomId))
    .map((a) => ({
      id: `grade-${a.id}`, at: a.releasedAt, title: `${a.title}: grades posted`,
      sub: `${rooms.get(a.roomId).subject} · ${roomName(a.roomId)}`, view: 'Grades', roomId: a.roomId,
    }));

  // The message from the teacher is in Updates, where the guardian can press "I've seen this".
  const alerts = (db.alerts || [])
    .filter((a) => kidById.has(a.studentId) && rooms.has(a.roomId) && a.date >= daysAgo(14) && (a.status || 'Notified') !== 'Resolved')
    .map((a) => ({
      id: `alert-${a.id}`, at: a.date,
      title: `${kidById.get(a.studentId).firstName} may need extra help`,
      sub: `${rooms.get(a.roomId).subject} · Message from the teacher`,
      view: 'Updates', roomId: a.roomId,
    }));

  const all = [...posts, ...attendance, ...grades, ...alerts, ...school].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 14);
  const pending = db.guardianLinks.filter((l) => l.guardianId === user.id && l.status === 'Pending').length;
  const items = [
    ...(pending ? [{ id: 'pending', title: 'Waiting for approval', sub: `${pending} request${pending > 1 ? 's' : ''} sent`, view: 'My Children', fresh: false }] : []),
    ...all.map(({ at, ...n }) => ({ ...n, fresh: !seen.has(n.id) })),
  ];
  return { unread: items.filter((i) => i.fresh).length, items, postIds: all.map((n) => n.id) };
}