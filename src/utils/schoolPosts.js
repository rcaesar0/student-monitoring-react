import { dateStr } from './helpers';

export const AUDIENCES = ['Everyone', 'Teachers', 'Guardians'];

// School-wide announcements written by the administrator.
export const audienceOk = (post, role) =>
  post.audience === 'Everyone' || (post.audience === 'Teachers' && role === 'Teacher') || (post.audience === 'Guardians' && role === 'Guardian');

export function visibleSchoolPosts(db, role, today = dateStr()) {
  return (db.schoolPosts || [])
    .filter((p) => p.status !== 'Archived' && audienceOk(p, role) && (!p.until || p.until >= today))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0));
}