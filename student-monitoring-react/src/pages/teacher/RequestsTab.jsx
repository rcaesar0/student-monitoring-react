import React from 'react';
import { Panel, Empty, Badge } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { fullName, formatDate } from '../../utils/helpers';
import { MAX_GUARDIANS_PER_CHILD } from '../../config';

// Guardians who entered the room code + the child's LRN and birthdate wait here for approval.
export default function RequestsTab({ rooms }) {
  const { db, repo } = useApp();
  const [error, setError] = React.useState('');
  const mine = db.guardianLinks.filter((l) => rooms.some((r) => r.id === l.roomId));
  const pending = mine.filter((l) => l.status === 'Pending');
  const history = mine.filter((l) => l.status !== 'Pending').slice(-5).reverse();

  const nameOf = (col, id) => { const x = db[col].find((y) => y.id === id); return x ? fullName(x) : 'Unknown'; };

  function approve(l) {
    const approved = db.guardianLinks.filter((x) => x.studentId === l.studentId && x.status === 'Approved').length;
    if (approved >= MAX_GUARDIANS_PER_CHILD) return setError(`This student already has ${MAX_GUARDIANS_PER_CHILD} linked guardians.`);
    setError('');
    repo.update('guardianLinks', l.id, { status: 'Approved' });
  }

  return (
    <>
      <Panel title={`Pending requests (${pending.length})`}>
        {error && <div className="error">{error}</div>}
        {pending.length ? (
          pending.map((l) => (
            <div className="row" key={l.id}>
              <div>
                <b>{nameOf('guardians', l.guardianId)}</b>
                <small>wants to view <b>{nameOf('students', l.studentId)}</b> · {db.rooms.find((r) => r.id === l.roomId)?.name} · {formatDate(l.createdAt)}</small>
              </div>
              <div className="row-actions">
                <button className="primary btn-sm" onClick={() => approve(l)}>Approve</button>
                <button className="danger-outline btn-sm" onClick={() => repo.update('guardianLinks', l.id, { status: 'Declined' })}>Decline</button>
              </div>
            </div>
          ))
        ) : (
          <Empty text="No pending requests." />
        )}
        <p className="hint">Only approve guardians you recognize. Their code, LRN and birthdate already matched school records.</p>
      </Panel>

      {history.length > 0 && (
        <Panel title="Recent decisions">
          {history.map((l) => (
            <div className="row" key={l.id}>
              <span>{nameOf('guardians', l.guardianId)} for {nameOf('students', l.studentId)}</span>
              <Badge tone={l.status === 'Approved' ? 'green' : 'red'}>{l.status}</Badge>
            </div>
          ))}
        </Panel>
      )}
    </>
  );
}
