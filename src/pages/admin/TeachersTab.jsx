import React, { useState } from 'react';
import { Panel, Empty, Modal, Badge, Avatar } from '../../components/UI';
import CredentialsModal from '../../components/CredentialsModal';
import { useApp } from '../../context/AppContext';
import { fullName, initials, institutionalEmail, makeTempPassword } from '../../utils/helpers';

export default function TeachersTab() {
  const { db, repo } = useApp();
  const [adding, setAdding] = useState(false);
  const [creds, setCreds] = useState(null);
  const [notice, setNotice] = useState('');

  const teachers = db.teachers.filter((t) => t.status === 'Active');
  const sectionsOf = (id) => db.rooms.filter((r) => r.teacherId === id && r.status === 'Active');

  function create(f) {
    const email = institutionalEmail(db, f.firstName, f.lastName);
    const password = makeTempPassword();
    repo.add('teachers', {
      firstName: f.firstName.trim(), middleName: '', lastName: f.lastName.trim(),
      employeeId: f.employeeId.trim(), personalEmail: f.personalEmail.trim(), subject: f.subject.trim(),
      email, password, mustChangePassword: true, status: 'Active',
    });
    setAdding(false);
    setCreds({
      title: 'Teacher account created',
      lines: [['Name', `${f.firstName} ${f.lastName}`], ['School account', email], ['Temporary password', password]],
      note: `Send these to ${f.personalEmail}. The teacher must choose a new password at first sign-in. This is the only time the password is shown.`,
    });
  }

  function reset(t) {
    const password = makeTempPassword();
    repo.update('teachers', t.id, { password, mustChangePassword: true });
    setCreds({
      title: 'Password reset',
      lines: [['School account', t.email], ['Temporary password', password]],
      note: 'The teacher will be asked to set a new password at next sign-in.',
    });
  }

  function archive(t) {
    if (sectionsOf(t.id).length) return setNotice(`${fullName(t)} still has sections. Reassign them first (Sections tab).`);
    setNotice('');
    repo.update('teachers', t.id, { status: 'Archived' });
  }

  return (
    <>
      <Panel title={`Teachers (${teachers.length})`} actions={<button className="primary" onClick={() => setAdding(true)}>+ Add teacher</button>}>
        {notice && <div className="error">{notice}</div>}
        {teachers.length ? (
          teachers.map((t) => (
            <div className="row" key={t.id}>
              <div className="row-main">
                <Avatar letter={initials(t)} />
                <div>
                  <b>{fullName(t)}</b>
                  <small>{t.email} · {t.subject || 'No subject'}{t.employeeId ? ` · ${t.employeeId}` : ''}</small>
                  <small>{sectionsOf(t.id).map((r) => r.name).join(', ') || 'No sections assigned'}</small>
                </div>
              </div>
              <div className="row-actions">
                {t.mustChangePassword && <Badge tone="amber">Awaiting first login</Badge>}
                <button className="btn-sm" onClick={() => reset(t)}>Reset password</button>
                <button className="danger-outline btn-sm" onClick={() => archive(t)}>Archive</button>
              </div>
            </div>
          ))
        ) : (
          <Empty text="No teachers yet." />
        )}
      </Panel>

      {adding && <AddTeacherModal db={db} onClose={() => setAdding(false)} onSave={create} />}
      {creds && <CredentialsModal {...creds} onClose={() => setCreds(null)} />}
    </>
  );
}

function AddTeacherModal({ db, onClose, onSave }) {
  const [f, setF] = useState({ firstName: '', lastName: '', employeeId: '', personalEmail: '', subject: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function submit(e) {
    e.preventDefault();
    if (!f.firstName.trim() || !f.lastName.trim()) return setError('First and last name are required.');
    if (!/^\S+@\S+\.\S+$/.test(f.personalEmail)) return setError('Enter the teacher’s personal email.');
    if (f.employeeId.trim() && db.teachers.some((t) => t.employeeId === f.employeeId.trim())) return setError('That employee ID already exists.');
    onSave(f);
  }

  return (
    <Modal title="Add teacher" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid2">
          <label>First name<input autoFocus value={f.firstName} onChange={set('firstName')} /></label>
          <label>Last name<input value={f.lastName} onChange={set('lastName')} /></label>
          <label>Employee ID<input value={f.employeeId} onChange={set('employeeId')} /></label>
          <label>Subject<input value={f.subject} onChange={set('subject')} /></label>
        </div>
        <label>Personal email (for sending the invitation)<input value={f.personalEmail} onChange={set('personalEmail')} /></label>
        <p className="hint">A school account and temporary password are generated automatically.</p>
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Create account</button>
        </div>
      </form>
    </Modal>
  );
}
