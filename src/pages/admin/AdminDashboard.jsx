import React, { useState } from 'react';
import Shell from '../../components/Shell';
import { usePersistentState } from '../../utils/usePersistentState';
import { Panel, Stat } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import StudentsTab from './StudentsTab';
import SectionsTab from './SectionsTab';
import TeachersTab from './TeachersTab';
import GuardiansTab from './GuardiansTab';
import ArchivesTab from './ArchivesTab';
import ChatLogsTab from './ChatLogsTab';
import ProfilePanel from '../../components/ProfilePanel';

// Chat logs and Archives sit in the top-right menu to keep the bottom nav short.
const NAV = ['Dashboard', 'Students', 'Sections', 'Teachers', 'Guardians'];
const ADMIN_VIEWS = [...NAV, 'Archives', 'Chat logs', 'Profile', 'Password'];

export default function AdminDashboard() {
  const { db, user, logout, theme, toggleTheme } = useApp();
  const [view, setView] = usePersistentState('sm_nav_admin_view', 'Dashboard', (v) => ADMIN_VIEWS.includes(v));

  const active = (list) => list.filter((x) => x.status === 'Active');
  const pending = db.guardianLinks.filter((l) => l.status === 'Pending').length;

  return (
    <Shell {...{ user, logout, theme, toggleTheme, nav: NAV, view, setView, badges: { Guardians: pending > 0 }, menuItems: [{ label: 'Chat logs', icon: 'chat', onClick: () => setView('Chat logs') }, { label: 'Archives', icon: 'archive', onClick: () => setView('Archives') }] }}>
      {view === 'Dashboard' && (
        <>
          <div className="hero">
            <span className="live-dot">System Online</span>
            <p>Welcome back, Administrator</p>
            <h2>School Setup</h2>
          </div>
          <div className="stats">
            <Stat title="Students" value={active(db.students).length} icon="students" tone="blue" />
            <Stat title="Sections" value={active(db.rooms).length} icon="sections" tone="indigo" />
            <Stat title="Teachers" value={active(db.teachers).length} icon="teachers" tone="amber" />
            <Stat title="Guardians" value={active(db.guardians).length} icon="guardians" tone="green" />
          </div>
          <Panel title="Quick Access">
            <div className="quick">
              <button onClick={() => setView('Students')}>Manage students</button>
              <button onClick={() => setView('Sections')}>Manage sections</button>
              <button onClick={() => setView('Teachers')}>Add a teacher</button>
              <button onClick={() => setView('Guardians')}>Guardian links{pending ? ` (${pending})` : ''}</button>
            </div>
          </Panel>
          <Panel title="Setup order">
            <ol className="steps">
              <li>Add or import your <b>students</b>.</li>
              <li>Add <b>teachers</b>. Each receives a school account and temporary password.</li>
              <li>Create <b>sections</b>, assign a teacher, and enroll students.</li>
              <li>Print the <b>link slips</b> (Students page) and give one to each parent so they can link their child.</li>
            </ol>
          </Panel>
        </>
      )}
      {view === 'Students' && <StudentsTab />}
      {view === 'Sections' && <SectionsTab />}
      {view === 'Teachers' && <TeachersTab />}
      {view === 'Guardians' && <GuardiansTab />}
      {view === 'Archives' && <ArchivesTab />}
      {view === 'Chat logs' && <ChatLogsTab />}
      {view === 'Profile' && <ProfilePanel />}
    </Shell>
  );
}