import React, { useState } from 'react';
import { Panel, Badge } from './UI';
import { useApp } from '../context/AppContext';
import { isLive, meetLinkFrom, MEET_HOURS } from '../utils/meet';

// Teacher side, inside My Rooms: start a Google Meet class and share its link with the room.
// Guardians of this room see a Join button on their home page.
export default function MeetPanel({ room }) {
  const { repo } = useApp();
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const live = isLive(room);

  function share(e) {
    e.preventDefault();
    const found = meetLinkFrom(link);
    if (!found) return setError('Please paste a valid Google Meet link, like https://meet.google.com/abc-defg-hij');
    repo.update('rooms', room.id, { meet: { link: found, at: Date.now() } });
    setLink('');
    setError('');
  }

  const end = () => repo.update('rooms', room.id, { meet: null });
  const openNew = () => window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');

  return (
    <Panel title="Google Meet class" actions={live ? <Badge tone="green">Live</Badge> : null}>
      {live ? (
        <>
          <p className="muted">Guardians of {room.name} can join from their home page.</p>
          <div className="meet-link">{room.meet.link}</div>
          <div className="row-actions">
            <a className="join-live" href={room.meet.link} target="_blank" rel="noopener noreferrer">Open meeting</a>
            <button className="danger-outline btn-sm" onClick={end}>End meeting</button>
          </div>
          <p className="hint">The link is removed by itself after {MEET_HOURS} hours.</p>
        </>
      ) : (
        <>
          <ol className="steps">
            <li>Tap <b>Open Google Meet</b> and start a meeting with your Google account.</li>
            <li>Copy the meeting link.</li>
            <li>Paste it below and tap <b>Share with guardians</b>.</li>
          </ol>
          <button type="button" className="btn-sm" onClick={openNew}>Open Google Meet</button>
          <form onSubmit={share} style={{ marginTop: 14 }}>
            <label>
              Meeting link
              <input value={link} onChange={(e) => { setLink(e.target.value); setError(''); }} placeholder="Meeting link" aria-invalid={!!error} className={error ? 'invalid' : ''} />
            </label>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="primary" disabled={!link.trim()}>Share with guardians</button>
          </form>
        </>
      )}
    </Panel>
  );
}