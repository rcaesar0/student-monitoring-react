import React, { useEffect, useRef, useState } from 'react';
import { fullName, initials } from '../utils/helpers';
import { notificationsFor } from '../utils/notifications';
import { unreadChat } from '../utils/chat';
import { useApp } from '../context/AppContext';
import { Avatar } from './UI';
import Icon from './Icon';
import { createPortal } from 'react-dom';
import ChangePasswordModal from './ChangePasswordModal';
import { useAutoArchive } from '../utils/autoArchive';
import { useGoHomeOnApproval } from '../utils/goHome';
import { showPhone } from '../utils/phone';

const NAV_ICON = {
  Dashboard: 'home', Students: 'students', Sections: 'sections', Teachers: 'teachers', Guardians: 'guardians',
  'My Rooms': 'rooms', Attendance: 'attendance', Grades: 'grades', Posts: 'posts',
  'My Children': 'children', Updates: 'posts',
};

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
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  const { items, unread, postIds } = notificationsFor(db, user);

  // Guardians: mark posts as seen once the menu is closed, so "new" labels stay visible while open.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open && user.role === 'Guardian' && postIds.length) {
      const merged = [...new Set([...(user.seenPosts || []), ...postIds])].slice(-100);
      if (merged.length !== (user.seenPosts || []).length) repo.update('guardians', user.id, { seenPosts: merged });
    }
    wasOpen.current = open;
  });

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="icon-btn bell" onClick={() => setOpen(!open)} aria-label="Notifications" aria-expanded={open}>
        <Icon name="bell" size={20} />
        {unread > 0 && <span className="dot-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown notif">
          <div className="dropdown-head"><b>Notifications</b></div>
          {items.length ? (
            items.map((n) => (
              <button key={n.id} className={`dropdown-item notif-item ${n.fresh ? 'fresh' : ''}`} onClick={() => { setView(n.view, n.roomId); setOpen(false); }}>
                <span className="notif-dot" />
                <span className="notif-text"><b>{n.title}</b><small>{n.sub}</small></span>
              </button>
            ))
          ) : (
            <div className="dropdown-empty">You’re all caught up.</div>
          )}
        </div>
      )}
    </div>
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
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  const go = (fn) => () => { setOpen(false); fn(); };
  useAutoArchive(); // posts whose deadline or date has passed move to the teacher's archive
  useGoHomeOnApproval(user, setView); // a guardian is sent home once the school office approves a child

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
            <Icon name="edit" size={18} /><span>Edit profile</span>
          </button>
          <button className="dropdown-item" onClick={go(() => setPwOpen(true))}>
            <Icon name="key" size={18} /><span>Change password</span>
          </button>
          {menuItems.map((m) => (
            <button key={m.label} className="dropdown-item" onClick={go(m.onClick)}>
              <Icon name={m.icon} size={18} /><span>{m.label}</span>
            </button>
          ))}
          <button className="dropdown-item" onClick={toggleTheme}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            <span className={`switch ${theme === 'dark' ? 'on' : ''}`} aria-hidden="true"><i /></span>
          </button>
          <div className="dropdown-sep" />
          <button className="dropdown-item danger" onClick={go(logout)}>
            <Icon name="logout" size={18} /><span>Sign out</span>
          </button>
        </div>
      )}
      {pwOpen && createPortal(<ChangePasswordModal onClose={() => setPwOpen(false)} />, document.body)}
    </div>
  );
}

// Layout: top bar (back button, page title, messages, notifications, profile menu) + floating bottom nav.
// title: overrides the heading (defaults to the view name). onBack: shows a back arrow.
// An empty nav hides the bottom bar.
export default function Shell({ children, user, logout, theme, toggleTheme, nav, view, setView, badges = {}, menuItems = [], title, onBack }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          {onBack ? (
            <button className="icon-btn back-btn" onClick={onBack} aria-label="Back"><Icon name="back" size={22} /></button>
          ) : (
            <img className="topbar-logo" src="/logo-app.png" alt="Logo" />
          )}
          <div>
            <small>{user.role} portal</small>
            <h1>{title || view}</h1>
          </div>
        </div>
        <div className="topbar-right">
          {user.role !== 'Admin' && <ChatButton user={user} setView={setView} />}
          <NotificationMenu user={user} setView={setView} />
          <ProfileMenu {...{ user, logout, theme, toggleTheme, setView, menuItems }} />
        </div>
      </header>

      <main className="main">
        <div className="content" key={`${view}-${title || ''}`}>{children}</div>
      </main>

      {nav.length > 0 && (
        <nav className="dock" aria-label="Main navigation">
          {nav.map((n) => (
            <button key={n} className={view === n ? 'active' : ''} onClick={() => setView(n)} aria-current={view === n ? 'page' : undefined}>
              <span className="dock-icon">
                <Icon name={NAV_ICON[n] || 'home'} size={22} />
                {badges[n] ? <span className="nav-dot" aria-label="Needs attention" /> : null}
              </span>
              <span className="dock-label">{n}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}