import React from 'react';
import { Panel } from './UI';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';
import { visibleSchoolPosts } from '../utils/schoolPosts';

// School-wide announcements from the administrator, shown at the top of the teacher's and guardian's home page.
export default function SchoolPosts() {
  const { db, user } = useApp();
  const list = visibleSchoolPosts(db, user.role).slice(0, 5);
  if (!list.length) return null;
  return (
    <Panel title="School announcements">
      {list.map((p) => (
        <div className="list-card" key={p.id}>
          <b>{p.title}</b>
          <small>{formatDate(p.date)}</small>
          {p.body && <p>{p.body}</p>}
        </div>
      ))}
    </Panel>
  );
}