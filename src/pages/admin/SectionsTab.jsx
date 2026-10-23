import React, { useState } from 'react';
import { Panel, Empty, Modal, Badge, Avatar } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { fullName, initials, uniqueCode, uid } from '../../utils/helpers';
import { byName } from '../../utils/selectors';
import { sectionsOf, sectionKey, sectionRoster, enrollInSection, removeFromSection } from '../../utils/sections';
import { WEEKDAYS, slotsOf, timeRange } from '../../utils/schedule';
import { GRADE_LEVELS } from '../../config';

// A section (for example Grade 6 - Rizal) holds one room per subject.
// Students are enrolled in the section once and land in every subject.
// The class schedule is set here by the admin. Teachers and guardians can only view it.
export default function SectionsTab() {
  const { db } = useApp();
  const [selected, setSelected] = useState(null); // section key
  const [adding, setAdding] = useState(false);

  const sections = sectionsOf(db);
  const section = sections.find((s) => s.key === selected);
  if (section) return <SectionDetail section={section} onBack={() => setSelected(null)} />;

  return (
    <>
      <Panel title={`Sections (${sections.length})`} actions={<button className="primary" onClick={() => setAdding(true)}>+ New section</button>}>
        {sections.length ? (
          sections.map((s) => (
            <div className="row clickable" key={s.key} onClick={() => setSelected(s.key)}>
              <div>
                <b>{s.name}</b>
                <small>{s.gradeLevel} · {s.rooms.map((r) => r.subject).join(', ')}</small>
              </div>
              <Badge tone="blue">{sectionRoster(db, s).length} students</Badge>
            </div>
          ))
        ) : (
          <Empty text="No sections yet. Create one and assign a teacher." />
        )}
      </Panel>
      {adding && <SubjectModal onClose={() => setAdding(false)} onCreated={(key) => { setAdding(false); setSelected(key); }} />}
    </>
  );
}

// Adds a subject room to an existing section, or starts a new section with its first subject.
// Students already in the section are enrolled in the new subject automatically.
function SubjectModal({ section, onClose, onCreated }) {
  const { db, repo } = useApp();
  const sections = sectionsOf(db);
  const teachers = db.teachers.filter((t) => t.status === 'Active');
  const [f, setF] = useState({ sectionKey: section?.key || '__new', newName: '', subject: '', gradeLevel: '', teacherId: teachers[0]?.id || '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const existing = sections.find((s) => s.key === f.sectionKey);

  function submit(e) {
    e.preventDefault();
    const name = existing ? existing.name : f.newName.trim();
    const grade = existing ? existing.gradeLevel : f.gradeLevel;
    const subject = f.subject.trim();
    if (!name) return setError('Enter the section name.');
    if (!subject) return setError('Enter the subject.');
    if (!GRADE_LEVELS.includes(grade)) return setError('Choose a grade level from Grade 1 to Grade 6.');
    if (!f.teacherId) return setError('Add a teacher first, then assign them here.');
    const typed = sections.find((s) => s.key === sectionKey(name));
    const target = existing || typed;
    if (target && target.rooms.some((r) => r.subject.trim().toLowerCase() === subject.toLowerCase())) {
      return setError('This section already has that subject.');
    }
    const id = repo.add('rooms', { name: target ? target.name : name, subject, gradeLevel: target ? target.gradeLevel : grade, teacherId: f.teacherId, code: uniqueCode(db), status: 'Active' });
    if (target) sectionRoster(db, target).forEach((s) => repo.set('roomStudents', `${id}_${s.id}`, { roomId: id, studentId: s.id }));
    onCreated(sectionKey(name));
  }

  return (
    <Modal title={section ? `Add a subject to ${section.name}` : 'New section'} onClose={onClose}>
      <form onSubmit={submit}>
        {!section && (
          <label>
            Section
            <select value={f.sectionKey} onChange={set('sectionKey')}>
              <option value="__new">Create a new section</option>
              {sections.map((s) => <option key={s.key} value={s.key}>{s.name} ({s.gradeLevel})</option>)}
            </select>
          </label>
        )}
        {!existing && (
          <div className="grid2">
            <label>Section name<input autoFocus value={f.newName} onChange={set('newName')} placeholder="Grade 6 - Rizal" /></label>
            <label>
              Grade level
              <select value={f.gradeLevel} onChange={set('gradeLevel')}>
                <option value="">Select grade</option>
                {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="grid2">
          <label>Subject<input autoFocus={!!existing} value={f.subject} onChange={set('subject')} placeholder="Mathematics" /></label>
          <label>
            Assigned teacher
            <select value={f.teacherId} onChange={set('teacherId')}>
              {!teachers.length && <option value="">No teachers yet</option>}
              {teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}
            </select>
          </label>
        </div>
        {existing && <p className="hint">Students already in {existing.name} are enrolled in this subject automatically.</p>}
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">{existing ? 'Add subject' : 'Create section'}</button>
        </div>
      </form>
    </Modal>
  );
}

// The weekly class times of the section's subjects. Only the admin can change them.
// A time is refused when it overlaps another subject of the section, or another class of the same teacher.
function SectionSchedule({ section }) {
  const { db, repo } = useApp();
  const [f, setF] = useState({ roomId: section.rooms[0]?.id || '', day: 'Monday', start: '08:00', end: '09:00' });
  const [error, setError] = useState('');

  const slots = slotsOf(section.rooms);
  const room = section.rooms.find((r) => r.id === f.roomId) || section.rooms[0];

  function add(e) {
    e.preventDefault();
    if (!room) return setError('Add a subject to this section first.');
    if (!f.start || !f.end) return setError('Pick a start and an end time.');
    if (f.end <= f.start) return setError('The end time must be after the start time.');

    const teacherRooms = db.rooms.filter((r) => r.status === 'Active' && r.teacherId === room.teacherId);
    const checkRooms = [...new Map([...section.rooms, ...teacherRooms].map((r) => [r.id, r])).values()];
    const clash = slotsOf(checkRooms).find((s) => s.day === f.day && f.start < s.end && f.end > s.start);
    if (clash) return setError(`That overlaps ${clash.room.subject} (${clash.room.name}) on ${clash.day}, ${timeRange(clash)}.`);

    repo.update('rooms', room.id, { schedule: [...(room.schedule || []), { id: uid(), day: f.day, start: f.start, end: f.end }] });
    setError('');
  }

  const remove = (s) => repo.update('rooms', s.room.id, { schedule: (s.room.schedule || []).filter((x) => x.id !== s.id) });

  return (
    <Panel title="Class schedule">
      <p className="muted">When each subject meets every week. Teachers and guardians can see it on their home pages but cannot change it.</p>
      {slots.length ? (
        slots.map((s) => (
          <div className="row" key={s.id}>
            <span><b>{s.day}</b> <small>{timeRange(s)} · {s.room.subject}</small></span>
            <button className="danger-outline btn-sm" onClick={() => remove(s)}>Remove</button>
          </div>
        ))
      ) : (
        <p className="hint">No class times yet. Add the first one below.</p>
      )}
      <form className="sched-form admin-sched" onSubmit={add}>
        <select value={room?.id || ''} onChange={(e) => setF({ ...f, roomId: e.target.value })} aria-label="Subject">
          {section.rooms.map((r) => <option key={r.id} value={r.id}>{r.subject}</option>)}
        </select>
        <select value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} aria-label="Day">
          {WEEKDAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} aria-label="Start time" />
        <input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} aria-label="End time" />
        <button type="submit" className="primary">Add</button>
      </form>
      {error && <div className="error">{error}</div>}
    </Panel>
  );
}

function SectionDetail({ section, onBack }) {
  const { db, repo } = useApp();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState([]);
  const [onlyGrade, setOnlyGrade] = useState(true);
  const [addingSubject, setAddingSubject] = useState(false);

  const roster = sectionRoster(db, section);
  const rosterIds = new Set(roster.map((s) => s.id));
  const teachers = db.teachers.filter((t) => t.status === 'Active');
  const gaps = roster.filter((s) => section.rooms.some((r) => !db.roomStudents.some((x) => x.id === `${r.id}_${s.id}`)));

  const q = query.trim().toLowerCase();
  const available = db.students
    .filter((s) => s.status === 'Active' && !rosterIds.has(s.id))
    .filter((s) => !onlyGrade || !section.gradeLevel || s.grade === section.gradeLevel)
    .filter((s) => !q || `${fullName(s)} ${s.lrn} ${s.grade}`.toLowerCase().includes(q))
    .sort(byName);
  const allPicked = available.length > 0 && available.every((s) => picked.includes(s.id));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function enroll() {
    picked.forEach((id) => enrollInSection(repo, section, id));
    setPicked([]);
  }

  function removeStudent(s) {
    if (!window.confirm(`Remove ${fullName(s)} from ${section.name}? They will be removed from all its subjects.`)) return;
    removeFromSection(repo, section, s.id);
  }

  function archiveSubject(r) {
    if (!window.confirm(`Archive ${r.subject} in ${section.name}?`)) return;
    repo.update('rooms', r.id, { status: 'Archived' });
    if (section.rooms.length === 1) onBack();
  }

  function archiveSection() {
    if (!window.confirm(`Archive ${section.name} and all its subjects?`)) return;
    section.rooms.forEach((r) => repo.update('rooms', r.id, { status: 'Archived' }));
    onBack();
  }

  return (
    <>
      <button className="text-btn" onClick={onBack}>Back to all sections</button>

      <Panel
        title={section.name}
        actions={<div className="row-actions"><Badge tone="blue">{section.gradeLevel}</Badge><Badge tone="blue">{roster.length} enrolled</Badge></div>}
      >
        <h4 className="mini-h">Subjects and teachers</h4>
        {section.rooms.map((r) => (
          <div className="row" key={r.id}>
            <div><b>{r.subject}</b></div>
            <div className="row-actions">
              <select value={r.teacherId} onChange={(e) => repo.update('rooms', r.id, { teacherId: e.target.value })} aria-label={`Teacher for ${r.subject}`}>
                {teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}
              </select>
              <button className="danger-outline btn-sm" onClick={() => archiveSubject(r)}>Archive</button>
            </div>
          </div>
        ))}
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="btn-sm" onClick={() => setAddingSubject(true)}>+ Add a subject</button>
          <button className="danger-outline btn-sm" onClick={archiveSection}>Archive section</button>
        </div>
      </Panel>

      <SectionSchedule section={section} />

      <Panel title="Enrolled students">
        {gaps.length > 0 && (
          <div className="info note-row">
            <span>{gaps.length} student{gaps.length > 1 ? 's are' : ' is'} not in every subject of this section.</span>
            <button className="btn-sm" onClick={() => gaps.forEach((s) => enrollInSection(repo, section, s.id))}>Enroll in all subjects</button>
          </div>
        )}
        {roster.length ? (
          roster.map((s) => (
            <div className="row" key={s.id}>
              <div className="row-main"><Avatar letter={initials(s)} size={32} /><div><b>{fullName(s)}</b><small>LRN {s.lrn}</small></div></div>
              <button className="danger-outline btn-sm" onClick={() => removeStudent(s)}>Remove</button>
            </div>
          ))
        ) : (
          <Empty text="No students enrolled yet." />
        )}
      </Panel>

      <Panel
        title="Add students"
        actions={<button className="primary" disabled={!picked.length} onClick={enroll}>Enroll selected ({picked.length})</button>}
      >
        <div className="toolbar">
          <input placeholder="Search by name or LRN" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {section.gradeLevel && (
          <label className="check">
            <input type="checkbox" checked={onlyGrade} onChange={(e) => setOnlyGrade(e.target.checked)} />
            <span>Only show {section.gradeLevel} students</span>
          </label>
        )}
        {available.length > 0 && (
          <label className="check-row">
            <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : available.map((s) => s.id))} />
            <b>Select all shown ({available.length})</b>
          </label>
        )}
        {available.length ? (
          available.map((s) => (
            <label className="check-row" key={s.id}>
              <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
              <span>{fullName(s)} <small>{s.grade || 'No grade'} · LRN {s.lrn}</small></span>
            </label>
          ))
        ) : (
          <Empty text="No other students to add." />
        )}
        <p className="hint">Enrolling adds the student to every subject of {section.name}.</p>
      </Panel>

      {addingSubject && <SubjectModal section={section} onClose={() => setAddingSubject(false)} onCreated={() => setAddingSubject(false)} />}
    </>
  );
}