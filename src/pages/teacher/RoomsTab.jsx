import React, { useState } from 'react';
import { Panel, Empty, Modal, Badge, Avatar } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { fullName, initials, uniqueCode, formatDate } from '../../utils/helpers';
import { rosterOf, attendanceSummary } from '../../utils/selectors';
import { studentGrade, categoryOf, quarterOf, fmt, remarkOf } from '../../utils/grading';
import { DEFAULT_QUARTER } from '../../config';

export default function RoomsTab({ room }) {
  const { db, repo } = useApp();
  const [open, setOpen] = useState(null);
  const [copied, setCopied] = useState(false);
  const students = rosterOf(db, room.id);

  const copy = async () => {
    try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  // A student can have linked guardians and new requests at the same time, so both are shown.
  const guardianBadges = (studentId) => {
    const links = db.guardianLinks.filter((l) => l.studentId === studentId);
    const linked = links.filter((l) => l.status === 'Approved').length;
    const pending = links.filter((l) => l.status === 'Pending').length;
    const out = [];
    if (linked) out.push(<Badge key="linked" tone="green">{linked > 1 ? `${linked} guardians linked` : 'Guardian linked'}</Badge>);
    if (pending) out.push(<Badge key="pending" tone="amber">{pending} request{pending > 1 ? 's' : ''} pending</Badge>);
    if (!linked && !pending) out.push(<Badge key="none" tone="blue">No guardian yet</Badge>);
    return out;
  };

  return (
    <>
      <Panel title="Room code">
          <p className="muted">Guardians now link their child with the LRN and the link slip from the school office. This room code is not used for linking.</p>
        <div className="row-actions code-line">
          <code className="code-lg">{room.code}</code>
          <button className="btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          <button className="btn-sm" onClick={() => repo.update('rooms', room.id, { code: uniqueCode(db) })}>Reset code</button>
        </div>
      </Panel>

      <Panel title={`${room.name} · ${students.length} students`}>
        {students.length ? (
          students.map((s) => (
            <div className="row clickable" key={s.id} onClick={() => setOpen(s)}>
              <div className="row-main">
                <Avatar letter={initials(s)} />
                <div><b>{fullName(s)}</b><small>LRN {s.lrn}</small></div>
              </div>
              <div className="row-actions">{guardianBadges(s.id)}</div>
            </div>
          ))
        ) : (
          <Empty text="No students enrolled in this section yet. The administrator enrolls students." />
        )}
      </Panel>

      {open && <StudentProfile student={open} room={room} onClose={() => setOpen(null)} />}
    </>
  );
}

function StudentProfile({ student, room, onClose }) {
  const { db } = useApp();
  const sum = attendanceSummary(db, student.id, room.id);
  const recent = db.attendance.filter((a) => a.studentId === student.id && a.roomId === room.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const quarter = DEFAULT_QUARTER;
  const assessments = db.assessments.filter((a) => a.roomId === room.id && quarterOf(a) === quarter);
  const grade = studentGrade(db, room.id, student.id, false, quarter);
  const scoreOf = (aid) => db.grades.find((g) => g.id === `${aid}_${student.id}`)?.score;

  return (
    <Modal title={fullName(student)} onClose={onClose}>
      <small>{student.grade} · LRN {student.lrn}</small>

      <h4 className="mini-h">Attendance</h4>
      {sum.total ? (
        <>
          <div className="pill-row">
            <Badge tone="green">{sum.present} present</Badge>
            <Badge tone="orange">{sum.late} late</Badge>
            <Badge tone="red">{sum.absent} absent</Badge>
            {sum.excused > 0 && <Badge tone="blue">{sum.excused} excused</Badge>}
            <Badge tone="blue">{sum.rate}% attendance</Badge>
          </div>
          {recent.map((a) => <div className="mini-row" key={a.id}><span>{formatDate(a.date)}</span><Badge tone={{ Present: 'green', Late: 'orange', Absent: 'red', Excused: 'blue' }[a.status]}>{a.status}</Badge></div>)}
        </>
      ) : <p className="muted">No attendance recorded yet.</p>}

      <h4 className="mini-h">Grades · Quarter {quarter}</h4>
      {grade.final !== null && (
        <div className="pill-row">
          <Badge tone="blue">{grade.complete ? `Final ${fmt(grade.final)} · ${remarkOf(grade.final)}` : `So far ${fmt(grade.final)} (incomplete)`}</Badge>
          <Badge tone="green">Class standing {fmt(grade.classStanding)}</Badge>
          <Badge tone="amber">Exams & quizzes {fmt(grade.examQuiz)}</Badge>
        </div>
      )}
      {assessments.length ? assessments.map((a) => (
        <div className="mini-row" key={a.id}>
          <span>{a.title} <small>{categoryOf(a)} · {a.released ? 'Released' : 'Draft'}</small></span>
          <b>{scoreOf(a.id) ?? '—'} / {a.total}</b>
        </div>
      )) : <p className="muted">No assessments this quarter.</p>}
    </Modal>
  );
}