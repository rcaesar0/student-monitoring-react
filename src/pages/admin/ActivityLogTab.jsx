import React, { useState } from 'react';
import { Panel, Empty, Badge } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { downloadCsv } from '../../utils/download';
import { confirmDialog, noticeDialog } from '../../utils/dialog';

const ROLES = ['All', 'Admin', 'Teacher', 'Guardian', 'Guest'];
const TONE = { Admin: 'blue', Teacher: 'green', Guardian: 'amber', Guest: 'neutral' };
const stamp = (t) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// Who did what: grades released, links approved, accounts changed, announcements posted.
// Routine changes (messages, attendance, scores) are not logged. Passwords are never written to the log.
export default function ActivityLogTab() {
  const { db, repo } = useApp();
  const [role, setRole] = useState('All');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(100);

  const all = [...(db.audit || [])].sort((a, b) => b.at - a.at);
  const q = query.trim().toLowerCase();
  const list = all.filter((e) => (role === 'All' || e.role === role) && (!q || e.text.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q)));

  async function trim() {
    const cutoff = Date.now() - 90 * 86400000;
    const old = all.filter((e) => e.at < cutoff);
    if (!old.length) return noticeDialog({ title: 'Nothing to remove', message: 'There are no entries older than 90 days.' });
    const ok = await confirmDialog({
      title: `Remove ${old.length} old entr${old.length === 1 ? 'y' : 'ies'}?`,
      message: 'These are older than 90 days. Download the log first if you need them.',
      confirmText: 'Remove', tone: 'danger',
    });
    if (ok) old.forEach((e) => repo.remove('audit', e.id));
  }

  return (
    <Panel
      title={`Activity log (${all.length})`}
      actions={<button className="btn-sm" onClick={() => downloadCsv('activity-log.csv', [['When', 'Who', 'Role', 'What'], ...list.map((e) => [stamp(e.at), e.actor, e.role, e.text])])}>Download (CSV)</button>}
    >
      <div className="grid2">
        <label>Role<select value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
        <label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" /></label>
      </div>
      {list.length ? (
        <>
          {list.slice(0, limit).map((e) => (
            <div className="mini-row log-row" key={e.id}>
              <span><b>{e.text}</b><small>{e.actor} · {stamp(e.at)}</small></span>
              <Badge tone={TONE[e.role] || 'neutral'}>{e.role}</Badge>
            </div>
          ))}
          {list.length > limit && <button type="button" className="chat-more" onClick={() => setLimit(limit + 100)}>Show more</button>}
        </>
      ) : <Empty text="Nothing logged yet." />}
      <button type="button" className="text-btn" onClick={trim}>Remove entries older than 90 days</button>
    </Panel>
  );
}