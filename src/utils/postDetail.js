import { detailDialog } from './dialog';
import { formatDate } from './helpers';
import { useApp } from '../context/AppContext';
import { roleCollection } from '../services/auth';

// Opens the floating announcement card for any post.
// opts: { badge, room }
// The card shows: title (top, centered), badge and room/schedule lines, the message, and "Posted <date>" at the bottom right.
export const showPost = (x, opts = {}) => detailDialog({
  title: x.title,
  badge: opts.badge,
  body: x.body,
  meta: [
    ['Room', opts.room || ''],
    ['Scheduled', x.dueDate ? formatDate(x.dueDate) : ''],
    ['Shown until', x.until ? formatDate(x.until) : ''],
    ['Posted', x.date ? formatDate(x.date) : ''],
  ],
});

// The id the bell uses for a post (see utils/notifications.js):
// school announcements are "school-<id>", class posts are "Announcement-<id>" or "Activity-<id>".
const bellId = (x) => (x.kind ? `${x.kind}-${x.id}` : `school-${x.id}`);

// Same as showPost, but also marks the post as seen for a guardian or teacher,
// so its bell notification is cleared. Use this inside components.
export function useOpenPost() {
  const { user, repo } = useApp();
  return (x, opts) => {
    const id = bellId(x);
    if (['Guardian', 'Teacher'].includes(user.role) && x.id && !(user.seenPosts || []).includes(id)) {
      repo.update(roleCollection(user.role), user.id, { seenPosts: [...(user.seenPosts || []), id].slice(-200) });
    }
    return showPost(x, opts);
  };
}

// Spread onto a card: <div className="list-card clickable" {...cardProps(() => showPost(x))}>
// Ignores clicks on buttons, links and fields inside the card. Also works with Enter or Space.
export const cardProps = (open) => ({
  role: 'button',
  tabIndex: 0,
  onClick: (e) => {
    if (e.target.closest('button, a, input, select, textarea')) return;
    open();
  },
  onKeyDown: (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  },
});