import React from 'react';
import { Panel, Empty, Badge } from '../../components/UI';
import { AttachmentList } from '../../components/Attachments';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/helpers';

// Archived announcements and activities for one room.
export default function ArchivedPosts({ room }) {
  const { db, repo } = useApp();
  const items = [
    ...db.announcements.map((x) => ({ ...x, col: 'announcements', kind: 'Announcement' })),
    ...db.activities.map((x) => ({ ...x, col: 'activities', kind: 'Activity' })),
  ]
    .filter((x) => x.roomId === room.id && x.status === 'Archived')
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Panel title="Archived posts">
      {items.length ? items.map((x) => (
        <div className="list-card" key={`${x.col}-${x.id}`}>
          <div className="row-actions spread">
            <b>{x.title}</b>
            <div className="row-actions">
              <button className="btn-sm" onClick={() => repo.update(x.col, x.id, { status: 'Active' })}>Restore</button>
              <button className="danger-outline btn-sm" onClick={() => window.confirm('Delete this post for good?') && repo.remove(x.col, x.id)}>Delete</button>
            </div>
          </div>
          <small>Posted {formatDate(x.date)}</small>
          <div className="due-line"><Badge tone={x.kind === 'Activity' ? 'amber' : 'blue'}>{x.kind}</Badge></div>
          {x.body && <p>{x.body}</p>}
          <AttachmentList files={x.attachments} />
        </div>
      )) : <Empty text="No archived posts." />}
    </Panel>
  );
}