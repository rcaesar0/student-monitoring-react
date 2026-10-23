import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { notificationsFor } from './notifications';
import { chatPrefsOf, visibleMessages } from './chat';
import { fullName } from './helpers';
import { playSound, DEFAULT_SOUND } from './sounds';
import { loadNotifySettings, showOutside, outsidePermission } from './systemNotify';

const snippet = (t) => (t.length > 120 ? `${t.slice(0, 117)}…` : t);

// Announces what is new while the app is open:
//   - the app is on screen: the person's chosen sound plays
//   - the app is hidden or in the background and "outside the app" notifications are on: a notification appears
//     with the sender's name (like Messenger or WhatsApp), and the phone or laptop plays its own sound
// New = a new unread message in a chat that is not muted, or a new item in the bell. Muted chats stay silent.
export function useNotifySound() {
  const { db, user } = useApp();
  const announced = useRef(null);

  useEffect(() => {
    if (!user) return;
    const prefs = chatPrefsOf(db, user.id);
    const msgs = visibleMessages(db, user.id).filter((m) => m.to === user.id && !m.read && !m.deleted && !prefs[m.from]?.muted);
    const bell = (notificationsFor(db, user).items || []).filter((i) => i.fresh);
    const keys = new Set([...msgs.map((m) => `m:${m.id}`), ...bell.map((i) => `n:${i.id}`)]);

    // The first pass only remembers what is already there, so opening the app does not ring for old items.
    if (announced.current === null) { announced.current = keys; return; }
    const fresh = [...keys].filter((k) => !announced.current.has(k));
    announced.current = keys;
    if (!fresh.length) return;

    const settings = loadNotifySettings(user.id);
    const away = typeof document !== 'undefined' && (document.visibilityState !== 'visible' || !document.hasFocus());
    const outside = settings.outside && away && outsidePermission() === 'granted';

    if (!outside) {
      playSound(user.notifSound || DEFAULT_SOUND);
      return;
    }

    // One notification per sender, showing the latest message and how many are new.
    const nameOf = (id) => {
      const p = [...db.teachers, ...db.guardians, ...(db.admins || [])].find((x) => x.id === id);
      return p ? fullName(p) : 'New message';
    };
    const newMsgs = msgs.filter((m) => fresh.includes(`m:${m.id}`)).sort((a, b) => a.at - b.at);
    const bySender = new Map();
    newMsgs.forEach((m) => bySender.set(m.from, [...(bySender.get(m.from) || []), m]));
    bySender.forEach((list, from) => {
      const last = list[list.length - 1];
      const count = list.length;
      const body = settings.preview
        ? (count > 1 ? `${count} new messages · ${snippet(last.text)}` : snippet(last.text))
        : (count > 1 ? `${count} new messages` : 'Sent you a message');
      showOutside({ title: nameOf(from), body, tag: `chat-${from}`, data: { view: 'Chat', from } });
    });

    bell.filter((i) => fresh.includes(`n:${i.id}`)).slice(0, 3).forEach((i) => {
      showOutside({ title: i.title, body: i.sub || '', tag: `bell-${i.id}`, data: { view: i.view } });
    });
  }, [db, user]);
}