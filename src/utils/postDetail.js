import { detailDialog } from './dialog';
import { formatDate } from './helpers';

// Opens the floating announcement card for any post.
// opts: { badge, room }
export const showPost = (x, opts = {}) => detailDialog({
  title: x.title,
  badge: opts.badge,
  body: x.body,
  meta: [
    ['Posted', x.date ? formatDate(x.date) : ''],
    ['Room', opts.room || ''],
    ['Scheduled', x.dueDate ? formatDate(x.dueDate) : ''],
  ],
});

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