import React, { useEffect, useRef, useState } from 'react';
import { fullName, initials } from '../utils/helpers';
import { notificationsFor } from '../utils/notifications';
import { unreadChat } from '../utils/chat';
import { useApp } from '../context/AppContext';
import { Avatar } from './UI';
import Icon from './Icon';
import { createPortal } from 'react-dom';
import ChangePasswordModal from './ChangePasswordModal';
import NotificationSettings from './NotificationSettings';
import { useAutoArchive } from '../utils/autoArchive';
import { showPhone } from '../utils/phone';
import { roleCollection } from '../services/auth';
import { useIdleLogout } from '../utils/idleLogout';
import { useLang } from '../utils/i18n';
import { visibleSchoolPosts } from '../utils/schoolPosts';
import { approvedChildren } from '../utils/selectors';
import { showPost } from '../utils/postDetail';
import Flag from './Flag';
import ErrorBoundary from './ErrorBoundary';

const NAV_ICON = {
  Dashboard: 'home', Students: 'students', Sections: 'sections', Teachers: 'teachers', Guardians: 'guardians',
  'My Rooms': 'rooms', Attendance: 'attendance', Grades: 'grades', Posts: 'posts',
  'My Children': 'children', Updates: 'posts',
};

// Line between two notifications. It is its own element with its own color, so no other style can hide it.
const DIVIDER = { height: 1, flex: 'none', margin: '0 12px', background: 'rgba(128, 128, 128, 0.45)' };

// Closes a dropdown when you click outside it or press Escape.
function useDismiss(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const key = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', outside);
    document.addEventListener('touchstart', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('touchstart', outside);
      document.removeEventListener('keydown', key);
    };
  }, [open, setOpen]);
  return ref;
}

function NotificationMenu({ user, setView }) {
  const { db, repo } = useApp();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  const { items: allItems, unread: allUnread, postIds } = notificationsFor(db, user);

  // A guardian with no approved child does not get announcements from the admin or teachers yet.
  const blocked = user.role === 'Guardian' && approvedChildren(db, user.id).length === 0;

  // Guardians and teachers: mark items as seen once the menu is closed, so "new" labels stay visible while open.
  // Not done for a blocked guardian, so those posts still notify them once a child is approved.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open && !blocked && ['Guardian', 'Teacher'].includes(user.role) && postIds.length) {
      const merged = [...new Set([...(user.seenPosts || []), ...postIds])].slice(-200);
      if (merged.length !== (user.seenPosts || []).length) repo.update(roleCollection(user.role), user.id, { seenPosts: merged });
    }
    wasOpen.current = open;
  });

  // Every post a notification can point to. A notification that matches one opens the floating card.
  // Anything else (a request, a message) keeps its old behavior and goes to its page.
  const posts = [
    ...visibleSchoolPosts(db, user.role).map((p) => ({ ...p, badge: 'School announcement' })),
    ...(db.announcements || []).map((p) => ({ ...p, badge: 'Class announcement' })),
    ...(db.activities || []).map((p) => ({ ...p, badge: 'Activity' })),
  ];
  const postOf = (n) => {
    const id = String(n.id ?? '');
    return posts.find((p) => p.id === n.postId || p.id === n.id)
      || posts.find((p) => [`_${p.id}`, `-${p.id}`, `:${p.id}`].some((tail) => id.endsWith(tail)));
  };

  // For a blocked guardian, post notifications are left out of the list and the red count.
  const items = blocked ? allItems.filter((n) => !postOf(n)) : allItems;
  const unread = blocked ? Math.max(0, allUnread - allItems.filter((n) => n.fresh && postOf(n)).length) : allUnread;

  function pick(n) {
    setOpen(false);
    const p = postOf(n);
    if (!p) return setView(n.view, n.roomId);
    showPost(p, { badge: p.badge, room: p.roomId ? db.rooms.find((r) => r.id === p.roomId)?.name : '' });
  }

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="icon-btn bell" onClick={() => setOpen(!open)} aria-label="Notifications" aria-expanded={open}>
        <Icon name="bell" size={20} />
        {unread > 0 && <span className="dot-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown notif">
          <div className="dropdown-head"><b>{t('Notifications')}</b></div>
          {items.length ? (
            items.map((n, i) => (
              <React.Fragment key={n.id}>
                {i > 0 && <div role="separator" style={DIVIDER} />}
                <button className={`dropdown-item notif-item ${n.fresh ? 'fresh' : ''}`} onClick={() => pick(n)}>
                  <span className="notif-dot" />
                  <span className="notif-text"><b>{n.title}</b><small>{n.sub}</small></span>
                </button>
              </React.Fragment>
            ))
          ) : (
            <div className="dropdown-empty">{t('You’re all caught up.')}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Language switch beside the chat button: shows the current flag, tap to switch Filipino / English.
function LangButton() {
  const { lang, setLang } = useLang();
  return (
    <button className="lang-chip" onClick={() => setLang(lang === 'fil' ? 'en' : 'fil')} aria-label={lang === 'fil' ? 'Switch to English' : 'Lumipat sa Filipino'}>
      <Flag lang={lang} width={22} /><span>{lang === 'fil' ? 'FIL' : 'EN'}</span>
    </button>
  );
}

// Opens the guardian/teacher chat. The red badge counts unread messages.
function ChatButton({ user, setView }) {
  const { db } = useApp();
  const unread = unreadChat(db, user.id);
  return (
    <button className="icon-btn bell" onClick={() => setView('Chat')} aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}>
      <Icon name="chat" size={20} />
      {unread > 0 && <span className="dot-badge">{unread > 9 ? '9+' : unread}</span>}
    </button>
  );
}

function ProfileMenu({ user, logout, theme, toggleTheme, setView, menuItems = [] }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  const go = (fn) => () => { setOpen(false); fn(); };
  useAutoArchive(); // posts whose deadline or date has passed move to the teacher's archive

  // Tapping a notification outside the app brings the app back and opens the page it was about.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMessage = (e) => { if (e.data?.type === 'notification-click' && e.data.view) setView(e.data.view); };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [setView]);

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="profile-btn" onClick={() => setOpen(!open)} aria-label="Account menu" aria-expanded={open}>
        <Avatar letter={initials(user)} src={user.photo} size={36} />
        <span className={`chev ${open ? 'up' : ''}`}><Icon name="chevron" size={16} /></span>
      </button>
      {open && (
        <div className="dropdown account">
          <div className="dropdown-profile">
            <Avatar letter={initials(user)} src={user.photo} size={46} />
            <div className="who">
              <b>{fullName(user)}</b>
              <small>{user.email || showPhone(user.phone)}</small>
              <span className="role-chip">{user.role}</span>
            </div>
          </div>
          <div className="dropdown-sep" />
          <button className="dropdown-item" onClick={go(() => setView('Profile'))}>
            <Icon name="edit" size={18} /><span>{t('Edit profile')}</span>
          </button>
          <button className="dropdown-item" onClick={go(() => setPwOpen(true))}>
            <Icon name="key" size={18} /><span>{t('Change password')}</span>
          </button>
          <button className="dropdown-item" onClick={go(() => setNotifOpen(true))}>
            <Icon name="bell" size={18} /><span>{t('Notifications')}</span>
          </button>
          {menuItems.map((m) => (
            <button key={m.label} className="dropdown-item" onClick={go(m.onClick)}>
              <Icon name={m.icon} size={18} /><span>{t(m.label)}</span>
            </button>
          ))}
          <button className="dropdown-item" onClick={toggleTheme}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
            <span>{theme === 'light' ? t('Dark mode') : t('Light mode')}</span>
            <span className={`switch ${theme === 'dark' ? 'on' : ''}`} aria-hidden="true"><i /></span>
          </button>
          <div className="dropdown-sep" />
          <button className="dropdown-item danger" onClick={go(logout)}>
            <Icon name="logout" size={18} /><span>{t('Sign out')}</span>
          </button>
        </div>
      )}
      {pwOpen && createPortal(<ChangePasswordModal onClose={() => setPwOpen(false)} />, document.body)}
      {notifOpen && createPortal(<NotificationSettings onClose={() => setNotifOpen(false)} />, document.body)}
    </div>
  );
}

// Layout: top bar (back button, page title, messages, notifications, profile menu) + floating bottom nav.
// title: overrides the heading (defaults to the view name). onBack: shows a back arrow.
// An empty nav hides the bottom bar.
export default function Shell({ children, user, logout, theme, toggleTheme, nav, view, setView, badges = {}, menuItems = [], title, onBack }) {
  const { t } = useLang();
  useIdleLogout(); // signed out after a while without activity
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          {onBack ? (
            <button className="icon-btn back-btn" onClick={onBack} aria-label="Back"><Icon name="back" size={22} /></button>
          ) : (
            <button type="button" className="logo-btn" onClick={() => setView(user.role === 'Guardian' ? 'My Children' : 'Dashboard')} aria-label="Go to home">
              <img className="topbar-logo" src="/logo-app.png" alt="" />
            </button>
          )}
          <div>
            <small>{t(`${user.role} portal`)}</small>
            <h1>{t(title || view)}</h1>
          </div>
        </div>
        <div className="topbar-right">
          <LangButton />
          {user.role !== 'Admin' && <ChatButton user={user} setView={setView} />}
          <NotificationMenu user={user} setView={setView} />
          <ProfileMenu {...{ user, logout, theme, toggleTheme, setView, menuItems }} />
        </div>
      </header>

      <main className="main">
        <div className="content" key={`${view}-${title || ''}`}><ErrorBoundary>{children}</ErrorBoundary></div>
      </main>

      {nav.length > 0 && (
        <nav className="dock" aria-label="Main navigation">
          {nav.map((n) => (
            <button key={n} className={view === n ? 'active' : ''} onClick={() => setView(n)} aria-current={view === n ? 'page' : undefined}>
              <span className="dock-icon">
                <Icon name={NAV_ICON[n] || 'home'} size={22} />
                {badges[n] ? <span className="nav-dot" aria-label="Needs attention" /> : null}
              </span>
              <span className="dock-label">{t(n)}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}