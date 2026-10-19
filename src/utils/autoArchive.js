import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { makeLinkCode } from './linkCodes';

const pad = (n) => String(n).padStart(2, '0');

// True once a post's scheduled date (and time, if it has one) has passed.
export function isPastDue(post, now = new Date()) {
  if (!post.dueDate) return false;
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (post.dueDate < today) return true;
  if (post.dueDate === today && post.dueTime) return post.dueTime < `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return false;
}

// A post is "done" once its schedule has passed. Posts a teacher archived by hand are not done, they are hidden.
export const isDone = (post) => !!post.dueDate && (post.autoArchived === true || (post.status !== 'Archived' && isPastDue(post)));

// Background jobs that run while someone is signed in:
// teachers: posts whose schedule has passed move to the Archive by themselves.
// admins: every student that has no link code yet gets one (older students).
export function useAutoArchive() {
  const { db, repo, user } = useApp();

  useEffect(() => {
    if (!user || user.role !== 'Teacher') return undefined;
    const run = () => {
      const mine = new Set(db.rooms.filter((r) => r.teacherId === user.id).map((r) => r.id));
      ['announcements', 'activities'].forEach((col) => {
        (db[col] || []).forEach((p) => {
          if (mine.has(p.roomId) && p.status !== 'Archived' && isPastDue(p)) {
            repo.update(col, p.id, { status: 'Archived', autoArchived: true });
          }
        });
      });
    };
    run();
    const timer = setInterval(run, 60000);
    return () => clearInterval(timer);
  }, [db, user, repo]);

  useEffect(() => {
    if (!user || user.role !== 'Admin') return;
    const missing = db.students.filter((s) => !s.linkCode);
    if (!missing.length) return;
    const used = new Set(db.students.map((s) => s.linkCode).filter(Boolean));
    missing.forEach((s) => {
      let code = makeLinkCode();
      while (used.has(code)) code = makeLinkCode();
      used.add(code);
      repo.update('students', s.id, { linkCode: code });
    });
  }, [db.students, user, repo]);
}