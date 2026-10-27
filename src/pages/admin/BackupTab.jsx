import React, { useRef, useState } from 'react';
import { Panel } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { downloadJson } from '../../utils/download';
import { dateStr } from '../../utils/helpers';
import { confirmDialog } from '../../utils/dialog';

const REQUIRED = ['admins', 'teachers', 'guardians', 'students', 'rooms'];

// Download all of the school's data as one file, or put a saved file back.
// The server also keeps its own daily copy in server-data/backups (the last 14 days).
export default function BackupTab() {
  const { db, repo, user } = useApp();
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);

  function backup() {
    downloadJson(`school-backup-${dateStr()}.json`, db);
    setMsg({ type: 'info', text: 'Backup downloaded. It contains personal information, so keep it somewhere safe.' });
  }

  async function restore(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { return setMsg({ type: 'error', text: 'That file is not a valid backup.' }); }
    const bad = !data || typeof data !== 'object' || REQUIRED.some((k) => !Array.isArray(data[k])) || !data.admins.length;
    if (bad) return setMsg({ type: 'error', text: 'That file is not a backup of this system (it is missing the school’s accounts).' });

    const summary = `Students: ${data.students.length}\nTeachers: ${data.teachers.length}\nGuardians: ${data.guardians.length}\nSections: ${data.rooms.length}`;
    const ok = await confirmDialog({
      title: 'Replace all current data?',
      message: `This backup has:\n${summary}\n\nThis cannot be undone. Download a backup of the current data first if you may need it.`,
      confirmText: 'Replace everything', tone: 'danger',
    });
    if (!ok) return;

    repo.replaceAll(data);
    repo.add('audit', { at: Date.now(), role: 'Admin', actorId: user.id, actor: 'Administrator', text: 'Restored all data from a backup file' });
    setMsg({ type: 'info', text: 'Backup restored. If you are signed out, sign in again.' });
  }

  return (
    <>
      <Panel title="Backup">
        <p className="muted">Saves every student, account, grade, attendance record, message and post in one file.</p>
        <button className="primary" onClick={backup}>Download backup</button>
      </Panel>
      <Panel title="Restore">
        <p className="muted">Replaces everything in the system with the contents of a backup file. Use it to recover from a mistake or move to a new computer.</p>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={restore} />
        <button className="danger-outline" onClick={() => fileRef.current.click()}>Choose a backup file…</button>
        {msg && <div className={msg.type}>{msg.text}</div>}
      </Panel>
    </>
  );
}