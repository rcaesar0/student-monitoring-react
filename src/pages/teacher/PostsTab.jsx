import React, { useState } from 'react';
import { Panel, Empty, Modal, Badge } from '../../components/UI';
import { AttachmentPicker, AttachmentList } from '../../components/Attachments';
import { useApp } from '../../context/AppContext';
import DateField from '../../components/DateField';
import { dateStr, formatDate, dueInfo } from '../../utils/helpers';
import { CATEGORY_NAMES } from '../../utils/grading';
import { DEFAULT_QUARTER } from '../../config';

// Quiz and Exam are added directly in Grades, so they are not offered when posting.
const POST_TYPES = CATEGORY_NAMES.filter((c) => c !== 'Quiz' && c !== 'Exam');

// Used for both Activities and Announcements (same shape, different collection).
// A schedule (date) is only for viewing. Nothing is submitted in the system.
// A posted activity is also added to the Grades page as a draft assessment, so activities always belong to one room.
// An announcement can go to this room only, or to all of the teacher's rooms. Each room gets its own copy
// (linked by groupId), so every copy lives in its room and can be archived there without touching the others.
export default function PostsTab({ room, collection, label }) {
  const { db, repo, user } = useApp();
  const [adding, setAdding] = useState(false);
  const myRooms = db.rooms.filter((r) => r.teacherId === user.id && r.status === 'Active');
  const items = db[collection]
    .filter((x) => x.roomId === room.id && x.status !== 'Archived')
    .sort((a, b) => b.date.localeCompare(a.date));
  const assessmentOf = (post) => db.assessments.find((a) => a.postId === post.id);

  return (
    <>
      <Panel title={`${label}s`} actions={<button className="primary" onClick={() => setAdding(true)}>+ New {label.toLowerCase()}</button>}>
        {items.length ? (
          items.map((x) => {
            const info = dueInfo({ ...x, kind: label });
            const graded = assessmentOf(x);
            return (
              <div className="list-card" key={x.id}>
                <div className="row-actions spread">
                  <b>{x.title}</b>
                  <button className="btn-sm" onClick={() => repo.update(collection, x.id, { status: 'Archived' })}>Archive</button>
                </div>
                <small>Posted {formatDate(x.date)}</small>
                {(info || graded || x.groupId) && (
                  <div className="due-line">
                    {info && <Badge tone={info.tone}>{info.label}</Badge>}
                    {x.groupId && <Badge tone="neutral">Sent to all my rooms</Badge>}
                    {graded && <Badge tone="blue">{graded.category} · {graded.total} pts (only you can see this)</Badge>}
                  </div>
                )}
                {x.body && <p>{x.body}</p>}
                <AttachmentList files={x.attachments} />
              </div>
            );
          })
        ) : (
          <Empty text={`No ${label.toLowerCase()}s yet.`} />
        )}
      </Panel>
      {adding && (
        <PostModal
          label={label}
          room={room}
          roomCount={myRooms.length}
          onClose={() => setAdding(false)}
          onSave={(f) => {
            const base = {
              teacherId: user.id, title: f.title.trim(), body: f.body.trim(), date: dateStr(),
              dueDate: f.hasDate ? f.dueDate : '',
              attachments: f.attachments,
            };
            if (label === 'Activity') {
              const postId = repo.add(collection, { ...base, roomId: room.id, category: f.category });
              repo.add('assessments', {
                roomId: room.id, title: base.title, category: f.category, total: Number(f.total),
                released: false, date: dateStr(), quarter: DEFAULT_QUARTER, postId,
              });
            } else {
              const targets = f.scope === 'all' ? myRooms : [room];
              const groupId = targets.length > 1 ? `grp_${Date.now()}` : undefined;
              targets.forEach((r) => repo.add(collection, { ...base, roomId: r.id, ...(groupId ? { groupId } : {}) }));
            }
            setAdding(false);
          }}
        />
      )}
    </>
  );
}

function PostModal({ label, room, roomCount, onClose, onSave }) {
  const isActivity = label === 'Activity';
  const canChooseRooms = !isActivity && roomCount > 1;
  const [f, setF] = useState({
    title: '', body: '', hasDate: false, dueDate: dateStr(), category: 'Activity', total: 10, attachments: [], scope: 'room',
  });
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!f.title.trim()) return setError('Title is required.');
    if (isActivity && !(Number(f.total) > 0)) return setError('Total points must be more than 0.');
    if (f.hasDate && !f.dueDate) return setError('Pick a date or turn the schedule off.');
    onSave(f);
  }

  return (
    <Modal title={`New ${label.toLowerCase()}`} onClose={onClose}>
      <form onSubmit={submit}>
        {canChooseRooms && (
          <>
            <div className="role-switch" role="group" aria-label="Who receives this">
              <button type="button" className={f.scope === 'room' ? 'selected' : ''} onClick={() => setF({ ...f, scope: 'room' })}>This room only</button>
              <button type="button" className={f.scope === 'all' ? 'selected' : ''} onClick={() => setF({ ...f, scope: 'all' })}>All my rooms ({roomCount})</button>
            </div>
            <p className="hint">
              {f.scope === 'room'
                ? `Only guardians of ${room.name} will see this.`
                : `Guardians of all ${roomCount} of your rooms will see this. Each room keeps its own copy, so you can archive it per room.`}
            </p>
          </>
        )}

        <label>Title<input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label>Details<textarea rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>

        <AttachmentPicker files={f.attachments} onChange={(attachments) => setF({ ...f, attachments })} />

        {isActivity && (
          <>
            <div className="grid2">
              <label>
                Type
                <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                  {POST_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>Total points<input type="number" min="1" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></label>
            </div>
            <p className="hint">Type and total points are only for your gradebook. Guardians will not see them. Activities always belong to one room.</p>
          </>
        )}

        <label className="check">
          <input type="checkbox" checked={f.hasDate} onChange={(e) => setF({ ...f, hasDate: e.target.checked })} />
          <span>Set a schedule (date)</span>
        </label>
        {f.hasDate && (
          <>
            <label>Date<DateField required min={dateStr()} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></label>
            <p className="hint">Guardians see this as the schedule, for viewing only. Nothing is submitted in the system. The post moves to your Archive and shows as Done for guardians the day after.</p>
          </>
        )}

        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Post</button>
        </div>
      </form>
    </Modal>
  );
}