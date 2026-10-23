import React, { useState } from 'react';
import { Modal, Avatar } from './UI';
import { useApp } from '../context/AppContext';
import { roleCollection } from '../services/auth';
import { chatContacts } from '../utils/chat';
import { initials } from '../utils/helpers';
import { SOUNDS, DEFAULT_SOUND, playSound } from '../utils/sounds';
import {
  loadNotifySettings, saveNotifySettings, outsideSupported, outsidePermission, enableOutside, showOutside,
} from '../utils/systemNotify';

// Opens from the account menu (top right) for every role.
// 1) Notifications outside the app  2) Notification sound  3) Muted chats
export default function NotificationSettings({ onClose }) {
  const { db, user, repo } = useApp();
  const col = roleCollection(user.role);

  // ----- outside the app (this device only) -----
  const [settings, setSettings] = useState(() => loadNotifySettings(user.id));
  const [perm, setPerm] = useState(outsidePermission());
  const [note, setNote] = useState('');
  const on = settings.outside && perm === 'granted';

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveNotifySettings(user.id, next);
  };

  async function turnOn() {
    setNote('');
    const result = await enableOutside();
    setPerm(result);
    if (result === 'granted') update({ outside: true });
    else if (result === 'denied') setNote('Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.');
    else if (result === 'unsupported') setNote('This browser or address cannot show notifications. They need HTTPS, or localhost on the same computer.');
  }

  async function test() {
    const ok = await showOutside({ title: 'Notifications are on', body: 'This is how a message will look outside the app.', tag: 'test' });
    setNote(ok ? 'Sent. Switch to another window to see how it looks.' : 'Could not show it. Check that notifications are allowed for this site.');
  }

  // ----- sound -----
  const saved = user.notifSound || DEFAULT_SOUND;
  const [choice, setChoice] = useState(saved);
  const [applied, setApplied] = useState(false);

  function pick(id) {
    setChoice(id);
    setApplied(false);
    playSound(id);
  }

  function apply() {
    repo.update(col, user.id, { notifSound: choice });
    setApplied(true);
  }

  // ----- muted chats -----
  const prefs = user.chatPrefs || {};
  const muted = chatContacts(db, user).filter((c) => prefs[c.id]?.muted);
  const unmute = (id) => repo.update(col, user.id, { chatPrefs: { ...prefs, [id]: { ...prefs[id], muted: false } } });

  return (
    <Modal title="Notification settings" onClose={onClose}>
      <h4 className="mini-h">Outside the app</h4>
      <p className="hint">Get a notification on your screen when a message arrives while the app is in another tab or window, like Messenger or WhatsApp. It shows who sent it. This setting is for this device only, so turn it on separately on your laptop and your phone.</p>
      {!outsideSupported() ? (
        <div className="info">This browser or address cannot show notifications. They need HTTPS, or localhost on the same computer.</div>
      ) : (
        <>
          <div className="nset-row">
            <span><b>{on ? 'On' : 'Off'}</b><small>{perm === 'denied' ? 'Blocked in your browser settings' : 'Messages and updates'}</small></span>
            {on
              ? <button type="button" className="btn-sm" onClick={() => update({ outside: false })}>Turn off</button>
              : <button type="button" className="primary btn-sm" onClick={turnOn}>Turn on</button>}
          </div>
          {on && (
            <>
              <label className="check">
                <input type="checkbox" checked={settings.preview} onChange={(e) => update({ preview: e.target.checked })} />
                <span>Show the message text (turn off to hide it on a locked screen)</span>
              </label>
              <button type="button" className="btn-sm" onClick={test}>Send a test notification</button>
            </>
          )}
        </>
      )}
      {note && <div className="info">{note}</div>}
      <p className="hint">Notifications arrive while the app is open in a tab or installed on your phone. They cannot arrive when every tab is closed until the school connects a push service.</p>

      <h4 className="mini-h">Sound inside the app</h4>
      {SOUNDS.map((s) => (
        <div className={`nset-row ${choice === s.id ? 'on' : ''}`} key={s.id}>
          <label className="nset-pick">
            <input type="radio" name="notif-sound" checked={choice === s.id} onChange={() => pick(s.id)} />
            <span>{s.label}</span>
          </label>
          {s.id !== 'off' && <button type="button" className="btn-sm" onClick={() => playSound(s.id)}>Play</button>}
        </div>
      ))}
      {applied && <div className="info">Notification sound saved.</div>}
      <button type="button" className="primary btn-sm" disabled={choice === saved} onClick={apply}>Apply sound</button>

      <h4 className="mini-h">Muted chats</h4>
      {muted.length ? (
        muted.map((c) => (
          <div className="nset-row" key={c.id}>
            <span className="nset-who">
              <Avatar letter={initials({ firstName: c.name })} src={c.photo} size={32} />
              <span><b>{c.name}</b><small>{c.sub}</small></span>
            </span>
            <button type="button" className="btn-sm" onClick={() => unmute(c.id)}>Unmute</button>
          </div>
        ))
      ) : (
        <p className="muted">No muted chats. To mute one, open Messages and tap the ⋮ button next to a person.</p>
      )}

      <div className="form-actions"><button type="button" className="primary" onClick={onClose}>Done</button></div>
    </Modal>
  );
}