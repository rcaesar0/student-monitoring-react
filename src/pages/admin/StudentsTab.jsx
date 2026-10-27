import React, { useMemo, useState } from 'react';
import { Panel, Empty, Modal, Avatar, Badge } from '../../components/UI';
import DateField from '../../components/DateField';
import { useApp } from '../../context/AppContext';
import { fullName, initials, formatDate, dateStr } from '../../utils/helpers';
import { byName } from '../../utils/selectors';
import { parseStudents, downloadStudentTemplate } from '../../utils/csv';
import { sectionsOf, enrollInSection } from '../../utils/sections';
import { uniqueLinkCode, makeLinkCode, showCode } from '../../utils/linkCodes';
import { printSlips } from '../../utils/slips';
import { confirmDialog } from '../../utils/dialog';
import { GRADE_LEVELS } from '../../config';

const EMPTY = { firstName: '', middleName: '', lastName: '', lrn: '', birthdate: '', grade: '', sectionKey: '' };

export function validateStudent(s, takenLrns) {
  if (!s.firstName.trim() || !s.lastName.trim()) return 'First and last name are required.';
  if (!/^\d{12}$/.test(s.lrn.trim())) return 'LRN must be exactly 12 digits.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.birthdate.trim()) || isNaN(Date.parse(s.birthdate))) return 'Birthdate must be YYYY-MM-DD.';
  if (!GRADE_LEVELS.includes(s.grade)) return 'Grade level must be Grade 1 to Grade 6.';
  if (takenLrns.has(s.lrn.trim())) return 'LRN already exists.';
  return '';
}

const slipItem = (s, sectionName = '') => ({ name: fullName(s), grade: s.grade, section: sectionName, lrn: s.lrn, code: s.linkCode });

export default function StudentsTab() {
  const { db, repo } = useApp();
  const [query, setQuery] = useState('');
  const [desk, setDesk] = useState(false);
  const [importing, setImporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const sections = sectionsOf(db);
  const students = db.students.filter((s) => s.status === 'Active').sort(byName);
  const q = query.trim().toLowerCase();
  const shown = q ? students.filter((s) => `${fullName(s)} ${s.lrn} ${s.linkCode || ''}`.toLowerCase().includes(q)) : students;

  // Section names the student is enrolled in.
  const sectionNames = (id) => sections.filter((sec) => sec.rooms.some((r) => db.roomStudents.some((x) => x.id === `${r.id}_${id}`))).map((sec) => sec.name);

  async function resetCode(s) {
    const ok = await confirmDialog({
      title: `Make a new link code for ${fullName(s)}?`,
      message: 'The old code will stop working.',
      confirmText: 'Make new code', tone: 'danger',
    });
    if (!ok) return;
    repo.update('students', s.id, { linkCode: uniqueLinkCode(db) });
  }

  return (
    <>
      <Panel
        title={`Students (${students.length})`}
        actions={
          <div className="row-actions">
            <button className="btn-sm" onClick={() => setPrinting(true)}>Print link slips</button>
            <button className="btn-sm" onClick={() => setImporting(true)}>Import CSV</button>
            <button className="primary" onClick={() => setDesk(true)}>+ Enroll a student</button>
          </div>
        }
      >
        <div className="toolbar">
          <input placeholder="Search by name, LRN or link code" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {shown.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Student</th><th>LRN</th><th>Birthdate</th><th>Grade</th><th>Link code</th><th>Section</th><th /></tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.id}>
                    <td><div className="row-main"><Avatar letter={initials(s)} size={32} /><b>{fullName(s)}</b></div></td>
                    <td>{s.lrn}</td>
                    <td>{formatDate(s.birthdate)}</td>
                    <td>{s.grade || '—'}</td>
                    <td><code>{showCode(s.linkCode)}</code></td>
                    <td>{sectionNames(s.id).join(', ') || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-sm" onClick={() => resetCode(s)}>New code</button>
                        <button className="danger-outline btn-sm" onClick={() => repo.update('students', s.id, { status: 'Archived' })}>Archive</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text={query ? 'No matching students.' : 'No students yet. Enroll one or import a CSV.'} />
        )}
      </Panel>

      {desk && <DeskModal sections={sections} onClose={() => setDesk(false)} />}
      {importing && <ImportModal sections={sections} onClose={() => setImporting(false)} />}
      {printing && (
        <PrintModal
          sections={sections} students={students} sectionNames={sectionNames}
          onClose={() => setPrinting(false)}
        />
      )}
    </>
  );
}

// The enrollment desk: one form creates the student, enrolls them in the section, and shows the link slip.
function DeskModal({ sections, onClose }) {
  const { db, repo } = useApp();
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { student, sectionName }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Sections of the chosen grade first.
  const ordered = [...sections].sort((a, b) => (b.gradeLevel === f.grade) - (a.gradeLevel === f.grade));

  function submit(e) {
    e.preventDefault();
    const err = validateStudent(f, new Set(db.students.map((s) => s.lrn)));
    if (err) return setError(err);
    const section = sections.find((s) => s.key === f.sectionKey);
    const linkCode = uniqueLinkCode(db);
    const student = {
      firstName: f.firstName.trim(), middleName: f.middleName.trim(), lastName: f.lastName.trim(),
      lrn: f.lrn.trim(), birthdate: f.birthdate, grade: f.grade, linkCode, status: 'Active',
    };
    const id = repo.add('students', student);
    if (section) enrollInSection(repo, section, id);
    setDone({ student: { ...student, id }, sectionName: section ? section.name : '' });
  }

  if (done) {
    return (
      <Modal title="Student enrolled" onClose={onClose}>
        <div className="info">
          {fullName(done.student)} was added{done.sectionName ? ` and enrolled in ${done.sectionName}` : ''}.
        </div>
        <p className="muted">Give this to the parent. They use it with the LRN to link their child in the app.</p>
        <div className="desk-code">
          <small>Link code</small>
          <b>{showCode(done.student.linkCode)}</b>
          <small>LRN {done.student.lrn}</small>
        </div>
        <div className="form-actions">
          <button onClick={() => { setDone(null); setF(EMPTY); setError(''); }}>Enroll another</button>
          <button className="primary" onClick={() => printSlips([slipItem(done.student, done.sectionName)])}>Print slip</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Enroll a student" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid2">
          <label>First name<input autoFocus value={f.firstName} onChange={set('firstName')} /></label>
          <label>Last name<input value={f.lastName} onChange={set('lastName')} /></label>
          <label>Middle name (optional)<input value={f.middleName} onChange={set('middleName')} /></label>
          <label>Birthdate<DateField max={dateStr()} value={f.birthdate} onChange={set('birthdate')} /></label>
          <label>LRN (12 digits)<input value={f.lrn} onChange={(e) => setF({ ...f, lrn: e.target.value.replace(/\D/g, '').slice(0, 12) })} inputMode="numeric" /></label>
          <label>
            Grade level
            <select value={f.grade} onChange={set('grade')}>
              <option value="">Select grade (1 to 6)</option>
              {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        </div>
        <label>
          Section (optional)
          <select value={f.sectionKey} onChange={set('sectionKey')}>
            <option value="">No section yet</option>
            {ordered.map((s) => <option key={s.key} value={s.key}>{s.name} ({s.gradeLevel})</option>)}
          </select>
        </label>
        <p className="hint">The student is enrolled in every subject of the section.</p>
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Enroll student</button>
        </div>
      </form>
    </Modal>
  );
}

const STATUS_TONE = { Ready: 'green', Existing: 'blue', Duplicate: 'amber', Error: 'red' };

// Import a class list. Pick a section to enroll everyone in it. Students already in the system are not duplicated.
function ImportModal({ sections, onClose }) {
  const { db, repo } = useApp();
  const [text, setText] = useState('');
  const [sectionKey, setSectionKey] = useState('');
  const section = sections.find((s) => s.key === sectionKey);

  const rows = useMemo(() => {
    const byLrn = new Map(db.students.map((s) => [s.lrn, s]));
    const seen = new Set();
    return parseStudents(text).map((r) => {
      const lrn = r.lrn.trim();
      const err = validateStudent(r, new Set());
      if (err) return { ...r, status: 'Error', note: err };
      if (seen.has(lrn)) return { ...r, status: 'Duplicate', note: 'Repeated in this file. Skipped.' };
      seen.add(lrn);
      const old = byLrn.get(lrn);
      if (old && old.status !== 'Active') return { ...r, status: 'Duplicate', note: 'This student is archived. Skipped.' };
      if (old) return { ...r, existing: old, status: 'Existing', note: section ? `Already in the system. Will be enrolled in ${section.name}.` : 'Already in the system. Skipped.' };
      return { ...r, status: 'Ready', note: section ? `Will be enrolled in ${section.name}.` : '' };
    });
  }, [text, db.students, section]);

  const ready = rows.filter((r) => r.status === 'Ready');
  const existing = rows.filter((r) => r.status === 'Existing' && section);
  const total = ready.length + existing.length;

  function run() {
    const used = new Set(db.students.map((s) => s.linkCode).filter(Boolean));
    ready.forEach((r) => {
      let code = makeLinkCode();
      while (used.has(code)) code = makeLinkCode();
      used.add(code);
      const id = repo.add('students', {
        firstName: r.firstName.trim(), middleName: r.middleName.trim(), lastName: r.lastName.trim(),
        lrn: r.lrn.trim(), birthdate: r.birthdate.trim(), grade: r.grade, linkCode: code, status: 'Active',
      });
      if (section) enrollInSection(repo, section, id);
    });
    existing.forEach((r) => enrollInSection(repo, section, r.existing.id));
    onClose();
  }

  return (
    <Modal title="Import students (CSV)" onClose={onClose}>
      <p className="hint">First row must be the header: <b>firstName, middleName, lastName, lrn, birthdate, grade</b>. Grade is 1 to 6 (for example Grade 4 or 4).</p>
      <button type="button" className="btn-sm" onClick={downloadStudentTemplate}>Download template</button>
      <label style={{ marginTop: 12 }}>
        Enroll into section (optional)
        <select value={sectionKey} onChange={(e) => setSectionKey(e.target.value)}>
          <option value="">Do not enroll</option>
          {sections.map((s) => <option key={s.key} value={s.key}>{s.name} ({s.gradeLevel})</option>)}
        </select>
      </label>
      <label>
        Choose a .csv file
        <input type="file" accept=".csv,text/csv" onChange={async (e) => e.target.files[0] && setText(await e.target.files[0].text())} />
      </label>
      <label>
        …or paste rows
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={'firstName,middleName,lastName,lrn,birthdate,grade\nJuan,,Cruz,123456789012,2014-04-21,Grade 6'} />
      </label>

      {rows.length > 0 && (
        <>
          <div className="pill-row">
            <Badge tone="green">{ready.length} new</Badge>
            {existing.length > 0 && <Badge tone="blue">{existing.length} to enroll</Badge>}
            <Badge tone="red">{rows.filter((r) => r.status === 'Error').length} errors</Badge>
            <Badge tone="amber">{rows.filter((r) => r.status === 'Duplicate' || (r.status === 'Existing' && !section)).length} skipped</Badge>
          </div>
          <div className="table-wrap preview-table">
            <table className="table">
              <thead><tr><th>#</th><th>Student</th><th>LRN</th><th>Status</th><th>Note</th></tr></thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{`${r.firstName} ${r.lastName}`.trim() || '(no name)'}</td>
                    <td>{r.lrn}</td>
                    <td><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                    <td className="wrap-cell">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 50 && <p className="hint">Showing the first 50 of {rows.length} rows.</p>}
        </>
      )}

      <div className="form-actions">
        <button type="button" onClick={onClose}>Cancel</button>
        <button className="primary" disabled={!total} onClick={run}>Import {total || ''}</button>
      </div>
    </Modal>
  );
}

// Printable slips for the parents: one per child, with the LRN and the link code.
function PrintModal({ sections, students, sectionNames, onClose }) {
  const [scope, setScope] = useState('all');
  const section = sections.find((s) => s.key === scope);

  const list = section
    ? students.filter((s) => sectionNames(s.id).includes(section.name))
    : students;
  const ready = list.filter((s) => s.linkCode);

  return (
    <Modal title="Print link slips" onClose={onClose}>
      <p className="hint">One slip per child with the LRN and the link code. Hand it to the parent. Keep the slips private.</p>
      <label>
        Print for
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="all">All students ({students.length})</option>
          {sections.map((s) => <option key={s.key} value={s.key}>{s.name} ({s.gradeLevel})</option>)}
        </select>
      </label>
      <div className="info">{ready.length} slip{ready.length === 1 ? '' : 's'} ready.</div>
      <div className="form-actions">
        <button type="button" onClick={onClose}>Close</button>
        <button
          className="primary" disabled={!ready.length}
          onClick={() => printSlips(ready.map((s) => slipItem(s, sectionNames(s.id)[0] || '')))}
        >
          Print {ready.length || ''}
        </button>
      </div>
    </Modal>
  );
}