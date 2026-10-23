import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Empty, Avatar, Modal } from './UI';
import Icon from './Icon';
import { useApp } from '../context/AppContext';
import { threadKey, chatPrefsOf, visibleMessages } from '../utils/chat';
import { roleCollection } from '../services/auth';
import { initials } from '../utils/helpers';

const clock = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayLabel = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

// Chat between a guardian and a teacher. Messages live in db.messages, so they sync like everything else.
// Opening Messages always shows the list first: recent chats, then everyone you can start a new chat with.
//
// Chat options (the ⋮ next to a person): pin, mute, mark as read and Delete chat.
//   Delete chat only clears your copy of the conversation. The person stays in your list and keeps their copy.
// Message options (tap a message): Edit (your own), Delete for me, Delete for everyone (your own).
//
// contacts = [{ id, name, photo, sub }]
export default function Chat({ contacts }) {
  const { db, repo, user, syncState, syncNow } = useApp();
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [limit, setLimit] = useState(50);
  const [menuFor, setMenuFor] = useState(null); // the contact whose chat options are open
  const [msgMenu, setMsgMenu] = useState(null); // the message whose options are open
  const [editing, setEditing] = useState(null); // the message being edited
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

  // Pin, mute and delete chat are personal: they only change what this person sees.
  const setPref = (id, patch) =>
    repo.update(roleCollection(user.role), user.id, { chatPrefs: { ...prefs, [id]: { ...prefs[id], ...patch } } });

  function markRead(id) {
    const key = threadKey(user.id, id);
    messages.filter((m) => m.thread === key && m.to === user.id && !m.read).forEach((m) => repo.update('messages', m.id, { read: true }));
  }

  function deleteChat(c) {
    if (!window.confirm(`Delete your chat with ${c.name}? This clears the messages from your side only. ${c.name} keeps their copy, and you can still message them.`)) return;
    setPref(c.id, { clearedAt: Date.now(), pinned: false });
    setMenuFor(null);
    if (activeId === c.id) setActiveId(null);
  }

  function open(id) {
    setActiveId(id);
    setLimit(50);
    setText('');
    setEditing(null);
  }

  function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !active) return;
    if (editing) {
      if (body !== editing.text) repo.update('messages', editing.id, { text: body, edited: true, editedAt: Date.now() });
      setEditing(null);
      setText('');
      syncNow();
      return;
    }
    repo.add('messages', { thread: threadKey(user.id, active.id), from: user.id, to: active.id, text: body, at: Date.now(), read: false });
    setText('');
    syncNow(); // push it to the shared database right away
  }

  // ----- one message -----
  function startEdit(m) {
    setMsgMenu(null);
    setEditing(m);
    setText(m.text);
  }

  function deleteForMe(m) {
    repo.update('messages', m.id, { deletedFor: [...(m.deletedFor || []), user.id] });
    setMsgMenu(null);
    if (editing?.id === m.id) { setEditing(null); setText(''); }
    syncNow();
  }

  function deleteForEveryone(m) {
    if (!window.confirm('Delete this message for everyone? Both of you will see that it was deleted.')) return;
    repo.update('messages', m.id, { deleted: true, deletedAt: Date.now() });
    setMsgMenu(null);
    if (editing?.id === m.id) { setEditing(null); setText(''); }
    syncNow();
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
        <button className="danger-outline wide" onClick={() => deleteChat(menuFor)}>Delete chat</button>
      </div>
    </Modal>
  );

  const messageOptions = msgMenu && (
    <Modal title="Message" onClose={() => setMsgMenu(null)}>
      <p className="msg-preview">{msgMenu.deleted ? 'This message was deleted.' : msgMenu.text}</p>
      <div className="manage-actions">
        {msgMenu.from === user.id && !msgMenu.deleted && (
          <button className="wide" onClick={() => startEdit(msgMenu)}>Edit message</button>
        )}
        <button className="wide" onClick={() => deleteForMe(msgMenu)}>Delete for me</button>
        {msgMenu.from === user.id && !msgMenu.deleted && (
          <button className="danger-outline wide" onClick={() => deleteForEveryone(msgMenu)}>Delete for everyone</button>
        )}
      </div>
      <p className="hint">Delete for me removes it from your screen only. Delete for everyone removes it for both of you. The school administrator can still review conversations.</p>
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
                const n = messages.filter((m) => m.from === c.id && m.to === user.id && !m.read && !m.deleted).length;
                const p = prefs[c.id] || {};
                const preview = last.deleted ? 'This message was deleted' : last.text;
                return (
                  <div className="chat-row" key={c.id}>
                    <button className="chat-contact" onClick={() => open(c.id)}>
                      <Avatar letter={initials({ firstName: c.name })} src={c.photo} size={42} />
                      <span className="chat-contact-text">
                        <b>{c.name}{p.pinned && <em className="chat-tag">Pinned</em>}{p.muted && <em className="chat-tag">Muted</em>}</b>
                        <small>{`${last.from === user.id ? 'You: ' : ''}${preview}`}</small>
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
      {messageOptions}

      {status}
      <div className="chat-msgs">
        {!thread.length && <p className="chat-empty">No messages yet. Say hello.</p>}
        {thread.length > limit && <button type="button" className="chat-more" onClick={() => setLimit(limit + 50)}>Load earlier messages</button>}
        {shown.map((m) => {
          const day = dayLabel(m.at);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.from === user.id;
          return (
            <React.Fragment key={m.id}>
              {showDay && <div className="chat-day">{day}</div>}
              <div
                className={`bubble ${mine ? 'me' : 'them'} ${m.deleted ? 'deleted' : ''} tappable`}
                role="button" tabIndex={0} aria-label="Message options"
                onClick={() => setMsgMenu(m)}
                onKeyDown={(e) => { if (e.key === 'Enter') setMsgMenu(m); }}
              >
                {m.deleted ? <em>{mine ? 'You deleted this message' : 'This message was deleted'}</em> : <span>{m.text}</span>}
                <small>
                  {clock(m.at)}
                  {m.edited && !m.deleted ? ' · Edited' : ''}
                  {mine && !m.deleted ? (m.read ? ' · Seen' : ' · Sent') : ''}
                </small>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      {editing && (
        <div className="chat-editbar">
          <span>Editing message</span>
          <button type="button" className="btn-sm" onClick={() => { setEditing(null); setText(''); }}>Cancel</button>
        </div>
      )}
      <form className="chat-input" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={editing ? 'Edit your message' : 'Type a message'} maxLength={1000} />
        <button type="submit" className="primary" disabled={!text.trim()}>{editing ? 'Save' : 'Send'}</button>
      </form>
    </div>
  );
}