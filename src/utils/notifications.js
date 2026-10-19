import { approvedChildren, roomsOfStudent } from './selectors';
import { fullName, formatDate, dateStr } from './helpers';

// Builds the bell menu for each role. `unread` is what the red badge counts.
// Guardians remember which posts they have already seen in user.seenPosts.
export function notificationsFor(db, user) {
  if (user.role === 'Teacher') {
    const mine = new Set(db.rooms.filter((r) => r.teacherId === user.id && r.status === 'Active').map((r) => r.id));
    const pending = db.guardianLinks.filter((l) => l.status === 'Pending' && mine.has(l.roomId));
    const nameOf = (col, id) => {
      const x = db[col].find((y) => y.id === id);
      return x ? fullName(x) : 'Someone';
    };
    return {
      unread: pending.length,
      items: pending.slice(0, 6).map((l) => ({
        id: l.id,
        title: 'New guardian request',
        sub: `${nameOf('guardians', l.guardianId)} wants to view ${nameOf('students', l.studentId)}`,
        view: 'Requests',
        fresh: true,
      })),
      postIds: [],
    };
  }

  if (user.role === 'Admin') {
    const pending = db.guardianLinks.filter((l) => l.status === 'Pending');
    const n = pending.length;
    const guardianName = (id) => { const g = db.guardians.find((x) => x.id === id); return g ? fullName(g) : 'A guardian'; };
    const childName = (id) => { const s = db.students.find((x) => x.id === id); return s ? fullName(s) : 'a student'; };
    return {
      unread: n,
      items: pending.slice(0, 6).map((l) => ({
        id: l.id,
        title: 'Guardian link request',
        sub: `${guardianName(l.guardianId)} for ${childName(l.studentId)}`,
        view: 'Guardians',
        fresh: true,
      })),
      postIds: [],
    };
  }

  // Guardian: new posts, attendance alerts, grades released, link approvals, and other guardians linking to the same child (last 7 days).
  const kids = approvedChildren(db, user.id);
  const kidById = new Map(kids.map((c) => [c.id, c]));
  const rooms = new Map(kids.flatMap((c) => roomsOfStudent(db, c.id)).map((r) => [r.id, r]));
  const roomName = (id) => db.rooms.find((r) => r.id === id)?.name || '';
  const seen = new Set(user.seenPosts || []);
  const since = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return dateStr(d); })();

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

  // Your own request was approved.
  const approvals = db.guardianLinks
    .filter((l) => l.guardianId === user.id && l.status === 'Approved' && (l.approvedAt || '') >= since && kidById.has(l.studentId))
    .map((l) => ({
      id: `approved-${l.id}`, at: l.approvedAt,
      title: `${kidById.get(l.studentId).firstName} is now linked to your account`,
      sub: 'The school office approved your request', view: 'My Children', roomId: null,
    }));

  // Another guardian was approved for a child you are linked to.
  const newLinks = db.guardianLinks
    .filter((l) => l.status === 'Approved' && l.guardianId !== user.id && kidById.has(l.studentId) && (l.approvedAt || l.createdAt || '') >= since)
    .map((l) => {
      const g = db.guardians.find((x) => x.id === l.guardianId);
      return {
        id: `link-${l.id}`, at: l.approvedAt || l.createdAt,
        title: `${g ? fullName(g) : 'Another guardian'} was linked to ${kidById.get(l.studentId).firstName}`,
        sub: 'If this is not expected, tell the school office', view: 'My Children', roomId: null,
      };
    });

  const all = [...posts, ...attendance, ...grades, ...approvals, ...newLinks].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  const pending = db.guardianLinks.filter((l) => l.guardianId === user.id && l.status === 'Pending').length;
  const items = [
    ...(pending ? [{ id: 'pending', title: 'Waiting for approval', sub: `${pending} request${pending > 1 ? 's' : ''} sent to the school office`, view: 'My Children', fresh: false }] : []),
    ...all.map(({ at, ...n }) => ({ ...n, fresh: !seen.has(n.id) })),
  ];
  return { unread: items.filter((i) => i.fresh).length, items, postIds: all.map((n) => n.id) };
}