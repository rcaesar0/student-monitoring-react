import React from 'react';
import { Panel, Empty, Badge, Avatar } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { fullName, initials } from '../../utils/helpers';

export default function ArchivesTab() {
  const { db, repo } = useApp();

  const groups = [
    ['Student', 'students', db.students],
    ['Teacher', 'teachers', db.teachers],
    ['Guardian', 'guardians', db.guardians],
    ['Section', 'rooms', db.rooms],
  ];
  const items = groups.flatMap(([label, col, list]) =>
    list.filter((x) => x.status === 'Archived').map((x) => ({ label, col, x }))
  );

  return (
    <Panel title={`Archived records (${items.length})`}>
      {items.length ? (
        items.map(({ label, col, x }) => (
          <div className="row" key={`${col}-${x.id}`}>
            <div className="row-main">
              <Avatar letter={label === 'Section' ? (x.name || 'S')[0].toUpperCase() : initials(x)} />
              <div>
                <b>{label === 'Section' ? x.name : fullName(x)}</b>
                <Badge tone="amber">{label}</Badge>
              </div>
            </div>
            <button onClick={() => repo.update(col, x.id, { status: 'Active' })}>Restore</button>
          </div>
        ))
      ) : (
        <Empty text="Nothing archived." />
      )}
    </Panel>
  );
}
