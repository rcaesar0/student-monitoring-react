import React from 'react';
import { Panel, Empty, Badge, Avatar } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { fullName, initials, formatDate } from '../../utils/helpers';

export default function ArchivesTab() {
  const { db, repo } = useApp();

  const groups = [
    ['Student', 'students', db.students],
    ['Teacher', 'teachers', db.teachers],
    ['Guardian', 'guardians', db.guardians],
    ['Section', 'rooms', db.rooms],
  ];

  const records = groups.flatMap(([label, col, list]) =>
    list.filter((x) => x.status === 'Archived').map((x) => ({
      key: `${col}-${x.id}`,
      label,
      name: label === 'Section' ? `${x.name}${x.subject ? ` · ${x.subject}` : ''}` : fullName(x),
      letter: label === 'Section' ? (x.name || 'S')[0].toUpperCase() : initials(x),
      note: '',
      restore: () => repo.update(col, x.id, { status: 'Active' }),
    }))
  );

  const posts = (db.schoolPosts || [])
    .filter((p) => p.status === 'Archived')
    .map((p) => ({
      key: `post-${p.id}`,
      label: 'Announcement',
      name: p.title,
      letter: (p.title || 'A')[0].toUpperCase(),
      note: p.date ? `Posted ${formatDate(p.date)}` : '',
      restore: () => repo.update('schoolPosts', p.id, { status: 'Active' }),
    }));

  const links = (db.guardianLinks || [])
    .filter((l) => l.status === 'Revoked')
    .map((l) => {
      const g = db.guardians.find((x) => x.id === l.guardianId);
      const s = db.students.find((x) => x.id === l.studentId);
      return {
        key: `link-${l.id}`,
        label: 'Revoked link',
        name: `${g ? fullName(g) : 'Unknown guardian'} → ${s ? fullName(s) : 'Unknown student'}`,
        letter: g ? initials(g) : '?',
        note: 'Restoring lets the guardian see this student again.',
        restore: () => repo.update('guardianLinks', l.id, { status: 'Approved' }),
      };
    });

  const items = [...records, ...posts, ...links];

  return (
    <Panel title={`Archived records (${items.length})`}>
      {items.length ? (
        items.map((it) => (
          <div className="row" key={it.key}>
            <div className="row-main">
              <Avatar letter={it.letter} />
              <div>
                <b>{it.name}</b>
                <Badge tone="amber">{it.label}</Badge>
                {it.note && <small>{it.note}</small>}
              </div>
            </div>
            <button onClick={it.restore}>Restore</button>
          </div>
        ))
      ) : (
        <Empty text="Nothing archived." />
      )}
    </Panel>
  );
}