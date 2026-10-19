import React, { useState } from 'react';
import { Panel, Empty, Modal, Badge } from '../../components/UI';
import { AttachmentPicker, AttachmentList } from '../../components/Attachments';
import { useApp } from '../../context/AppContext';
import { dateStr, formatDate, dueInfo } from '../../utils/helpers';
import { CATEGORY_NAMES } from '../../utils/grading';
import { DEFAULT_QUARTER } from '../../config';

// Quiz and Exam are added directly in Grades, so they are not offered when posting.
const POST_TYPES = CATEGORY_NAMES.filter((c) => c !== 'Quiz' && c !== 'Exam');

// Used for both Activities and Announcements (same shape, different collection).
// A schedule (date and time) is only for viewing. Nothing is submitted in the system.
// A posted activity is also added to the Grades page as a draft assessment.
export default function PostsTab({ room, collection, label }) {
  const { db, repo, user } = useApp();
  const [adding, setAdding] = useState(false);
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
                {(info || graded) && (
                  <div className="due-line">
                    {info && <Badge tone={info.tone}>{info.label}</Badge>}
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
          onClose={() => setAdding(false)}
          onSave={(f) => {
            const base = {
              roomId: room.id, teacherId: user.id, title: f.title.trim(), body: f.body.trim(), date: dateStr(),
              dueDate: f.hasDate ? f.dueDate : '',
              attachments: f.attachments,
            };
            if (label === 'Activity') {
              const postId = repo.add(collection, { ...base, category: f.category });
              repo.add('assessments', {
                roomId: room.id, title: base.title, category: f.category, total: Number(f.total),
                released: false, date: dateStr(), quarter: DEFAULT_QUARTER, postId,
              });
            } else {
              repo.add(collection, base);
            }
            setAdding(false);
          }}
        />
      )}
    </>
  );
}

function PostModal({ label, onClose, onSave }) {
  const isActivity = label === 'Activity';
  const [f, setF] = useState({
    title: '', body: '', hasDate: false, dueDate: dateStr(), category: 'Activity', total: 10, attachments: [],
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
            <p className="hint">Type and total points are only for your gradebook. Guardians will not see them.</p>
          </>
        )}

        <label className="check">
          <input type="checkbox" checked={f.hasDate} onChange={(e) => setF({ ...f, hasDate: e.target.checked })} />
          <span>Set a schedule (date)</span>
        </label>
        {f.hasDate && (
          <>
            <label>Date<input type="date" min={dateStr()} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></label>
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