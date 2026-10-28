// In-app message boxes that replace the browser's plain alert and confirm.
//   if (!(await confirmDialog({ title: 'Delete post?', message: '...', confirmText: 'Delete', tone: 'danger' }))) return;
//   await noticeDialog({ title: 'Nothing to remove', message: '...' });
//   detailDialog({ title: 'Exam week', badge: 'Everyone', body: '...', meta: [['Posted', 'Oct 27, 2026'], ['Shown until', 'Nov 3, 2026']] });
// <DialogHost /> (components/DialogHost.jsx) draws them. Before it is on screen they fall back to the browser's own boxes.
let host = null;

export const registerDialogHost = (h) => {
  host = h;
  return () => { if (host === h) host = null; };
};

const textOf = (o) => (typeof o === 'string' ? o : [o.title, o.message].filter(Boolean).join('\n\n'));

export const confirmDialog = (opts) => (host ? host.confirm(opts) : Promise.resolve(window.confirm(textOf(opts))));

export const noticeDialog = (opts) => {
  if (host) return host.notice(opts);
  window.alert(textOf(opts));
  return Promise.resolve();
};

// A floating card with the full announcement: title, badge, message and dates.
// The card grows with the message (long ones scroll inside it).
export const detailDialog = (opts) => {
  if (host) return host.detail(opts);
  window.alert([opts.title, opts.body].filter(Boolean).join('\n\n'));
  return Promise.resolve();
};

// Code that is not part of a screen (the storage service) can send a notice with this event.
if (typeof window !== 'undefined') {
  window.addEventListener('app-notice', (e) => noticeDialog(e.detail || {}));
}