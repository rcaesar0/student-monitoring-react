import React, { useState } from 'react';
import { Panel, Empty, Modal, Badge } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { dateStr, formatDate } from '../../utils/helpers';
import { AUDIENCES } from '../../utils/schoolPosts';
import { confirmDialog } from '../../utils/dialog';
import DateField from '../../components/DateField';

// Announcements for the whole school. Teachers and guardians see them on their home page and in the bell.
export default function SchoolPostsTab() {
  const { db, repo, user } = useApp();
  const [adding, setAdding] = useState(false);
  const posts = [...(db.schoolPosts || [])].sort((a, b) => (a.status === 'Archived') - (b.status === 'Archived') || b.date.localeCompare(a.date));

  async function remove(p) {
    if (await confirmDialog({ title: `Delete “${p.title}”?`, message: 'This removes it for good.', confirmText: 'Delete', tone: 'danger' })) repo.remove('schoolPosts', p.id);
  }

  return (
    <>
      <Panel title="School announcements" actions={<button className="primary" onClick={() => setAdding(true)}>+ New announcement</button>}>
        <p className="muted">For things everyone should know: class suspensions, exam weeks, meetings. They are not tied to one room.</p>
        {posts.length ? posts.map((p) => (
          <div className={`list-card ${p.status === 'Archived' ? 'is-done' : ''}`} key={p.id}>
            <div className="row-actions spread">
              <b>{p.title}</b>
              <Badge tone={p.status === 'Archived' ? 'neutral' : 'blue'}>{p.status === 'Archived' ? 'Archived' : p.audience}</Badge>
            </div>
            <small>Posted {formatDate(p.date)}{p.until ? ` · Shown until ${formatDate(p.until)}` : ''}</small>
            {p.body && <p>{p.body}</p>}
            <div className="row-actions">
              <button className="btn-sm" onClick={() => repo.update('schoolPosts', p.id, { status: p.status === 'Archived' ? 'Active' : 'Archived' })}>
                {p.status === 'Archived' ? 'Show again' : 'Archive'}
              </button>
              <button className="danger-outline btn-sm" onClick={() => remove(p)}>Delete</button>
            </div>
          </div>
        )) : <Empty text="No school announcements yet." />}
      </Panel>

      {adding && (
        <NewPost
          onClose={() => setAdding(false)}
          onSave={(f) => {
            repo.add('schoolPosts', { title: f.title.trim(), body: f.body.trim(), audience: f.audience, until: f.until, date: dateStr(), at: Date.now(), status: 'Active', authorId: user.id });
            setAdding(false);
          }}
        />
      )}
    </>
  );
}

function NewPost({ onClose, onSave }) {
  const [f, setF] = useState({ title: '', body: '', audience: 'Everyone', until: '' });
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!f.title.trim()) return setError('Title is required.');
    if (f.until && f.until < dateStr()) return setError('The “shown until” date cannot be in the past.');
    onSave(f);
  }

  return (
    <Modal title="New school announcement" onClose={onClose}>
      <form onSubmit={submit}>
        <label>Title<input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label>Details<textarea rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
        <div className="grid2">
          <label>
            Who should see it
            <select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
              {AUDIENCES.map((a) => <option key={a} value={a}>{a === 'Everyone' ? 'Everyone' : `${a} only`}</option>)}
            </select>
          </label>
          <label>Shown until (optional)<DateField min={dateStr()} value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} placeholder="No end date" /></label>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Post</button>
        </div>
      </form>
    </Modal>
  );
}