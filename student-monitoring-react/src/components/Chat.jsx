import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Empty, Avatar, Modal } from './UI';
import Icon from './Icon';
import { useApp } from '../context/AppContext';
import { threadKey, chatPrefsOf, visibleMessages } from '../utils/chat';
import { roleCollection } from '../services/auth';
import { initials } from '../utils/helpers';
import { usePersistentState } from '../utils/usePersistentState';

const clock = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayLabel = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

// Chat between a guardian and a teacher. Messages live in db.messages, so they sync like everything else.
// Opening Messages always shows the list first: recent chats, then everyone you can start a new chat with.
// contacts = [{ id, name, photo, sub }]
export default function Chat({ contacts }) {
  const { db, repo, user, syncState, syncNow } = useApp();
  const [activeId, setActiveId] = usePersistentState(`sm_nav_chat_${user.id}`, () => (contacts.length === 1 ? contacts[0].id : null), (v) => v === null || contacts.some((c) => c.id === v));
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [limit, setLimit] = useState(50);
  const [menuFor, setMenuFor] = useState(null); // the contact whose options are open
  const endRef = useRef(null);
  const messages = useMemo(() => visibleMessages(db, user.id), [db, user.id]);
  const prefs = chatPrefsOf(db, user.id);
  const active = contacts.find((c) => c.id === activeId) || null;

  const thread = useMemo(() => {
    if (!active) return [];
    const key = threadKey(user.id, active.id);
    return messages.filter((m) => m.thread === key).sort((a, b) => a.at - b.at);
  }, [messages, active, user.id]);

  const shown = thread.slice(-limit);
  const unreadIn = thread.filter((m) => m.to === user.id && !m.read).length;

  // Messages count as read while their conversation is open on screen.
  useEffect(() => {
    if (!unreadIn) return;
    thread.filter((m) => m.to === user.id && !m.read).forEach((m) => repo.update('messages', m.id, { read: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadIn, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [thread.length, activeId]);

  // Pin, mute and delete are personal: they only change what this person sees.
  const setPref = (id, patch) =>
    repo.update(roleCollection(user.role), user.id, { chatPrefs: { ...prefs, [id]: { ...prefs[id], ...patch } } });

  function markRead(id) {
    const key = threadKey(user.id, id);
    messages.filter((m) => m.thread === key && m.to === user.id && !m.read).forEach((m) => repo.update('messages', m.id, { read: true }));
  }

  function deleteChat(c) {
    if (!window.confirm(`Delete your conversation with ${c.name}? It is removed from your messages only. ${c.name} keeps their copy.`)) return;
    setPref(c.id, { clearedAt: Date.now(), pinned: false });
    setMenuFor(null);
    if (activeId === c.id) setActiveId(null);
  }

  function open(id) {
    setActiveId(id);
    setLimit(50);
    setText('');
  }

  function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !active) return;
    repo.add('messages', { thread: threadKey(user.id, active.id), from: user.id, to: active.id, text: body, at: Date.now(), read: false });
    setText('');
    syncNow(); // push it to the shared database right away
  }

  // Messages only reach the other person when this device is connected to the shared database.
  const banner = {
    local: 'This device is not connected to the shared database, so messages will NOT reach the other person. Open the app with the Network address from the PC (not localhost) and make sure npm run dev is running.',
    offline: 'Connection lost. Messages are kept and will be sent when it reconnects.',
    connecting: 'Connecting to the shared database…',
  }[syncState];
  const status = banner && (
    <div className={`chat-banner ${syncState}`}>
      <span>{banner}</span>
      <button type="button" onClick={syncNow}>Retry</button>
    </div>
  );

  const options = menuFor && (
    <Modal title={menuFor.name} onClose={() => setMenuFor(null)}>
      <small>{menuFor.sub}</small>
      <div className="manage-actions">
        <button className="wide" onClick={() => { setPref(menuFor.id, { pinned: !prefs[menuFor.id]?.pinned }); setMenuFor(null); }}>
          {prefs[menuFor.id]?.pinned ? 'Unpin chat' : 'Pin chat to top'}
        </button>
        <button className="wide" onClick={() => { setPref(menuFor.id, { muted: !prefs[menuFor.id]?.muted }); setMenuFor(null); }}>
          {prefs[menuFor.id]?.muted ? 'Unmute notifications' : 'Mute notifications'}
        </button>
        {messages.some((m) => m.from === menuFor.id && m.to === user.id && !m.read) && (
          <button className="wide" onClick={() => { markRead(menuFor.id); setMenuFor(null); }}>Mark as read</button>
        )}
        <button className="danger-outline wide" onClick={() => deleteChat(menuFor)}>Delete conversation</button>
      </div>
    </Modal>
  );

  if (!active) {
    const q = query.trim().toLowerCase();
    const lastOf = (c) => messages.filter((m) => m.thread === threadKey(user.id, c.id)).sort((a, b) => b.at - a.at)[0];
    const matches = contacts.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.sub || '').toLowerCase().includes(q));
    const recent = matches
      .map((c) => ({ c, last: lastOf(c) }))
      .filter((x) => x.last)
      .sort((a, b) => Number(!!prefs[b.c.id]?.pinned) - Number(!!prefs[a.c.id]?.pinned) || b.last.at - a.last.at);
    const fresh = matches.filter((c) => !lastOf(c));

    return (
      <Panel title="Messages">
        {status}
        <p className="hint">Conversations between teachers and guardians can be reviewed by the school administrator.</p>
        {contacts.length > 0 && (
          <input
            className="chat-search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a person" aria-label="Search for a person"
          />
        )}

        {recent.length > 0 && (
          <>
            <h4 className="mini-h">Recent chats</h4>
            <div className="chat-list">
              {recent.map(({ c, last }) => {
                const n = messages.filter((m) => m.from === c.id && m.to === user.id && !m.read).length;
                const p = prefs[c.id] || {};
                return (
                  <div className="chat-row" key={c.id}>
                    <button className="chat-contact" onClick={() => open(c.id)}>
                      <Avatar letter={initials({ firstName: c.name })} src={c.photo} size={42} />
                      <span className="chat-contact-text">
                        <b>{c.name}{p.pinned && <em className="chat-tag">Pinned</em>}{p.muted && <em className="chat-tag">Muted</em>}</b>
                        <small>{`${last.from === user.id ? 'You: ' : ''}${last.text}`}</small>
                      </span>
                      {n > 0 && <span className={`chat-count ${p.muted ? 'muted' : ''}`}>{n}</span>}
                    </button>
                    <button className="icon-btn" onClick={() => setMenuFor(c)} aria-label={`Options for ${c.name}`}>
                      <Icon name="more" size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {fresh.length > 0 && (
          <>
            <h4 className="mini-h">Start a new chat</h4>
            <div className="chat-list">
              {fresh.map((c) => (
                <button key={c.id} className="chat-contact" onClick={() => open(c.id)}>
                  <Avatar letter={initials({ firstName: c.name })} src={c.photo} size={42} />
                  <span className="chat-contact-text">
                    <b>{c.name}</b>
                    <small>{c.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {!recent.length && !fresh.length && (
          contacts.length
            ? <Empty text="No one matches your search." />
            : <Empty text={user.role === 'Guardian' ? 'No teacher to message yet. Link a child first.' : 'No linked guardians yet.'} />
        )}
        {options}
      </Panel>
    );
  }

  let lastDay = '';
  return (
    <div className="chat-box">
      <div className="chat-head">
        <button className="icon-btn" onClick={() => setActiveId(null)} aria-label="Back to messages">
          <Icon name="back" size={20} />
        </button>
        <Avatar letter={initials({ firstName: active.name })} src={active.photo} size={38} />
        <div className="chat-head-text"><b>{active.name}{prefs[active.id]?.muted && <em className="chat-tag">Muted</em>}</b><small>{active.sub}</small></div>
        <button className="icon-btn" onClick={() => setMenuFor(active)} aria-label="Chat options"><Icon name="more" size={20} /></button>
      </div>
      {options}

      {status}
      <div className="chat-msgs">
        {!thread.length && <p className="chat-empty">No messages yet. Say hello.</p>}
        {thread.length > limit && <button type="button" className="chat-more" onClick={() => setLimit(limit + 50)}>Load earlier messages</button>}
        {shown.map((m) => {
          const day = dayLabel(m.at);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <React.Fragment key={m.id}>
              {showDay && <div className="chat-day">{day}</div>}
              <div className={`bubble ${m.from === user.id ? 'me' : 'them'}`}>
                <span>{m.text}</span>
                <small>{clock(m.at)}{m.from === user.id ? (m.read ? ' · Seen' : ' · Sent') : ''}</small>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" maxLength={1000} />
        <button type="submit" className="primary" disabled={!text.trim()}>Send</button>
      </form>
    </div>
  );
}