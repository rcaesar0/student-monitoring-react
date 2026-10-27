import React, { useState } from 'react';
import { Panel, Empty, Badge, Modal } from './UI';
import { useApp } from '../context/AppContext';
import { fullName, dateStr, formatDate } from '../utils/helpers';
import { flaggedIn } from '../utils/risk';

const COOLDOWN_DAYS = 7;      // the same student cannot be notified again before this many days
const NO_RESPONSE_DAYS = 3;   // after this many days without "I've seen this", the teacher sees "No response yet"

const daysSince = (d) => Math.floor((new Date(`${dateStr()}T00:00:00`) - new Date(`${d}T00:00:00`)) / 86400000);

// The most recent warning sent for this student in this room (or undefined).
const latestAlert = (db, x) =>
  (db.alerts || [])
    .filter((a) => a.kind === 'risk' && a.studentId === x.student.id && a.roomId === x.room.id)
    .sort((a, b) => (b.at || 0) - (a.at || 0))[0];

// Teacher dashboard: students who may need help, found by simple rules on attendance and grades (see utils/risk.js).
// Nothing reaches a guardian until the teacher reviews the reasons, edits the message and presses Send.
// After sending, the warning has a status: Notified -> Acknowledged (guardian pressed "I've seen this") -> Resolved.
export default function EarlyWarningPanel({ rooms }) {
  const { db, repo, user } = useApp();
  const [composing, setComposing] = useState(null);
  const list = flaggedIn(db, rooms);
  const guardiansOf = (studentId) => db.guardianLinks.filter((l) => l.studentId === studentId && l.status === 'Approved').length;

  function send(x, message) {
    repo.add('alerts', {
      kind: 'risk', studentId: x.student.id, roomId: x.room.id, teacherId: user.id,
      reasons: x.reasons, message: message.trim(), status: 'Notified',
      date: dateStr(), at: Date.now(),
    });
    setComposing(null);
  }

  const resolve = (a) => repo.update('alerts', a.id, { status: 'Resolved', resolvedAt: dateStr() });

  function statusBadge(a) {
    const status = a.status || 'Notified';
    if (status === 'Resolved') return <Badge tone="neutral">Resolved {formatDate(a.resolvedAt || a.date)}</Badge>;
    if (status === 'Acknowledged') return <Badge tone="green">Guardian saw this {formatDate(a.ackAt || a.date)}</Badge>;
    if (daysSince(a.date) >= NO_RESPONSE_DAYS) return <Badge tone="amber">No response yet · sent {formatDate(a.date)}</Badge>;
    return <Badge tone="blue">Notified {formatDate(a.date)}</Badge>;
  }

  return (
    <Panel title="Early warning" actions={list.length ? <Badge tone="amber">{list.length}</Badge> : null}>
      <p className="hint">Based on attendance and grades. Review the reasons, then notify the guardian if it helps.</p>
      {list.length ? (
        list.map((x) => {
          const a = latestAlert(db, x);
          const status = a ? a.status || 'Notified' : null;
          const canNotify = !a || daysSince(a.date) >= COOLDOWN_DAYS;
          return (
            <div className="list-card" key={`${x.room.id}-${x.student.id}`}>
              <div className="row-actions spread">
                <b>{fullName(x.student)}</b>
                <Badge tone={x.level === 'high' ? 'red' : 'amber'}>{x.level === 'high' ? 'Needs attention' : 'Watch'}</Badge>
              </div>
              <small>{x.room.subject} · {x.room.name}</small>
              <ul className="reasons">{x.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              <div className="row-actions">
                {a && statusBadge(a)}
                {a && status !== 'Resolved' && <button className="btn-sm" onClick={() => resolve(a)}>Mark resolved</button>}
                {canNotify && (guardiansOf(x.student.id)
                  ? <button className="btn-sm" onClick={() => setComposing(x)}>{a ? 'Notify again' : 'Notify guardian'}</button>
                  : <small>No linked guardian yet.</small>)}
              </div>
            </div>
          );
        })
      ) : (
        <Empty text="No students need a closer look right now." />
      )}
      {composing && <NotifyModal x={composing} teacher={user} onClose={() => setComposing(null)} onSend={(m) => send(composing, m)} />}
    </Panel>
  );
}

function NotifyModal({ x, teacher, onClose, onSend }) {
  const [message, setMessage] = useState(
    `Hello, we noticed ${x.student.firstName} may need some extra support in ${x.room.subject}:\n` +
    `${x.reasons.map((r) => `• ${r}`).join('\n')}\n` +
    'Please reach out if you would like to talk about it. Thank you.\n' +
    `— ${fullName(teacher)}`,
  );
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!message.trim()) return setError('Write a short message for the guardian.');
    onSend(message);
  }

  return (
    <Modal title={`Notify the guardian of ${fullName(x.student)}`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="hint">The guardian will see this message. You can edit it before sending.</p>
        <label>Message<textarea rows={8} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Send to guardian</button>
        </div>
      </form>
    </Modal>
  );
}