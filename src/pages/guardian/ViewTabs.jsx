import React, { useState } from 'react';
import { Panel, Empty, Badge } from '../../components/UI';
import { AttachmentList } from '../../components/Attachments';
import { useApp } from '../../context/AppContext';
import { fullName, formatDate, dueInfo, dateStr } from '../../utils/helpers';
import { attendanceSummary, roomsOfStudent } from '../../utils/selectors';
import { studentGrade, quarterGrades, isReleasedTo, groupOf, categoryOf, conductedOf, quarterOf, fmt } from '../../utils/grading';
import { isDone } from '../../utils/autoArchive';
import ChildReportButton from '../../components/ChildReport';
import { GRADING, QUARTERS, DEFAULT_QUARTER } from '../../config';
import { showPost, cardProps } from '../../utils/postDetail';

const STATUS_TONE = { Present: 'green', Late: 'orange', Absent: 'red', Excused: 'blue' };

// room (optional): show only that room. Without it, every room of the child is included.
export function AttendanceView({ kids, room }) {
  const { db } = useApp();
  if (!kids.length) return <Panel title="Attendance"><Empty text="No linked children." /></Panel>;

  return kids.map((c) => {
    const sum = attendanceSummary(db, c.id, room?.id);
    const recent = db.attendance.filter((a) => a.studentId === c.id && (!room || a.roomId === room.id)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    return (
      <Panel key={c.id} title={fullName(c)}>
        <div className="pill-row">
          <Badge tone="green">{sum.present} present</Badge>
          <Badge tone="orange">{sum.late} late</Badge>
          <Badge tone="red">{sum.absent} absent</Badge>
          {sum.excused > 0 && <Badge tone="blue">{sum.excused} excused</Badge>}
          {sum.rate !== null && <Badge tone="blue">{sum.rate}% attendance</Badge>}
        </div>
        {recent.length ? recent.map((a) => (
          <div className="mini-row" key={a.id}>
            <span>{formatDate(a.date)} <small>{db.rooms.find((r) => r.id === a.roomId)?.subject}</small></span>
            <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
          </div>
        )) : <p className="muted">No attendance recorded yet.</p>}
      </Panel>
    );
  });
}

export function GradesView({ kids, room }) {
  const { db } = useApp();
  const [quarter, setQuarter] = useState(DEFAULT_QUARTER);
  if (!kids.length) return <Panel title="Grades"><Empty text="No linked children." /></Panel>;

  return (
    <>
      <div className="role-switch quarter-switch" role="tablist" aria-label="Quarter">
        {QUARTERS.map((q) => (
          <button key={q} className={quarter === q ? 'selected' : ''} onClick={() => setQuarter(q)} role="tab" aria-selected={quarter === q}>
            Quarter {q}
          </button>
        ))}
      </div>
      {kids.map((c) => {
        const rooms = room ? [room] : roomsOfStudent(db, c.id);
        return (
          <Panel key={c.id} title={fullName(c)} actions={rooms.length ? <ChildReportButton child={c} rooms={rooms} quarter={quarter} /> : null}>
            {rooms.map((r) => <RoomGrades key={r.id} room={r} student={c} quarter={quarter} />)}
            {!rooms.length && <p className="muted">Not enrolled in a section yet.</p>}
          </Panel>
        );
      })}
    </>
  );
}

// A guardian only sees assessments released to them. Scores and percentages are shown plainly:
// no colors and no remarks, so the numbers are not read as praise or blame.
function RoomGrades({ room, student, quarter }) {
  const { db } = useApp();
  const { weights, groupLabels } = GRADING;
  const released = db.assessments
    .filter((a) => a.roomId === room.id && quarterOf(a) === quarter && isReleasedTo(db, a, student.id))
    .sort((a, b) => conductedOf(a).localeCompare(conductedOf(b)));
  const scoreOf = (a) => db.grades.find((g) => g.id === `${a.id}_${student.id}`)?.score;
  const grade = studentGrade(db, room.id, student.id, true, quarter);
  const byQuarter = quarterGrades(db, room.id, student.id, true);

  return (
    <div className="room-grades">
      <h4 className="mini-h">{room.subject} <small>{room.name}</small></h4>
      {released.length ? (
        <>
          {['classStanding', 'examQuiz'].map((g) => {
            const list = released.filter((a) => groupOf(a) === g);
            if (!list.length) return null;
            return (
              <div key={g} className="grade-group">
                <div className="grade-group-head">
                  <b>{groupLabels[g]} ({weights[g]}%)</b>
                  <span>{fmt(grade[g])}</span>
                </div>
                {list.map((a) => (
                  <div className="mini-row" key={a.id}>
                    <span>{a.title} <small>{categoryOf(a)} · Conducted {formatDate(conductedOf(a))}</small></span>
                    <b>{scoreOf(a) ?? '—'} / {a.total}</b>
                  </div>
                ))}
              </div>
            );
          })}
          {grade.final !== null && (
            <div className="overall-grade">
              <div>
                <small>{grade.complete ? `Overall grade · Quarter ${quarter}` : `Grade so far · Quarter ${quarter}`}</small>
                <b>{fmt(grade.final)}</b>
              </div>
            </div>
          )}
        </>
      ) : <p className="muted">No released grades for Quarter {quarter} yet.</p>}

      {byQuarter.some((q) => q.final !== null) && (
        <div className="quarter-row">
          {byQuarter.map((q) => (
            <div key={q.quarter} className={`quarter-cell ${q.quarter === quarter ? 'on' : ''}`}>
              <small>Q{q.quarter}</small>
              <b>{q.final === null ? '—' : fmt(q.final)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Messages from the teacher about a child (early warning). The guardian can press "I've seen this".
// Resolved warnings and warnings older than 14 days are not shown.
function TeacherNotes({ kids, roomIds }) {
  const { db, repo, user } = useApp();
  const cutoff = (() => { const d = new Date(); d.setDate(d.getDate() - 14); return dateStr(d); })();
  const notes = (db.alerts || [])
    .filter((a) => a.kind === 'risk' && roomIds.has(a.roomId) && kids.some((c) => c.id === a.studentId)
      && a.date >= cutoff && (a.status || 'Notified') !== 'Resolved')
    .sort((a, b) => (b.at || 0) - (a.at || 0));
  if (!notes.length) return null;

  const acknowledge = (a) => repo.update('alerts', a.id, { status: 'Acknowledged', ackAt: dateStr(), ackBy: user.id });

  return (
    <Panel title="Message from the teacher">
      {notes.map((a) => {
        const child = kids.find((c) => c.id === a.studentId);
        const teacher = db.teachers.find((t) => t.id === a.teacherId);
        const seen = (a.status || 'Notified') === 'Acknowledged';
        return (
          <div className="list-card" key={a.id}>
            <div className="row-actions spread">
              <b>About {child.firstName}</b>
              <small>{formatDate(a.date)}{teacher ? ` · ${fullName(teacher)}` : ''}</small>
            </div>
            {a.message
              ? <p style={{ whiteSpace: 'pre-line' }}>{a.message}</p>
              : <ul className="reasons">{(a.reasons || []).map((r) => <li key={r}>{r}</li>)}</ul>}
            {seen
              ? <small>You marked this as seen on {formatDate(a.ackAt)}.</small>
              : <button className="primary btn-sm" onClick={() => acknowledge(a)}>I’ve seen this</button>}
          </div>
        );
      })}
    </Panel>
  );
}

// Current posts first. Once a post's schedule has passed it moves to the Done tab.
// Posts a teacher archived by hand are not shown.
// Clicking a post opens the floating detail card.
export function UpdatesView({ kids, room }) {
  const { db } = useApp();
  const [tab, setTab] = useState('current');
  const roomIds = room ? new Set([room.id]) : new Set(kids.flatMap((c) => roomsOfStudent(db, c.id).map((r) => r.id)));
  const all = [
    ...db.announcements.map((x) => ({ ...x, kind: 'Announcement' })),
    ...db.activities.map((x) => ({ ...x, kind: 'Activity' })),
  ].filter((x) => roomIds.has(x.roomId));

  const current = all.filter((x) => !isDone(x) && x.status !== 'Archived').sort((a, b) => b.date.localeCompare(a.date));
  const done = all.filter(isDone).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const posts = tab === 'current' ? current : done;

  return (
    <>
      <TeacherNotes kids={kids} roomIds={roomIds} />
      <div className="role-switch">
        <button className={tab === 'current' ? 'selected' : ''} onClick={() => setTab('current')}>Current ({current.length})</button>
        <button className={tab === 'done' ? 'selected' : ''} onClick={() => setTab('done')}>Done ({done.length})</button>
      </div>
      <Panel title={tab === 'current' ? 'Class announcements & activities' : 'Done'}>
        {posts.length ? posts.map((x) => (
          <div
            className={`list-card clickable ${tab === 'done' ? 'is-done' : ''}`}
            key={`${x.kind}-${x.id}`}
            {...cardProps(() => showPost(x, {
              badge: x.kind === 'Announcement' ? 'Class announcement' : x.kind,
              room: db.rooms.find((r) => r.id === x.roomId)?.name,
            }))}
          >
            <div className="row-actions spread">
              <b>{x.title}</b>
              <Badge tone={tab === 'done' ? 'neutral' : x.kind === 'Activity' ? 'amber' : 'blue'}>{tab === 'done' ? 'Done' : x.kind === 'Announcement' ? 'Class announcement' : x.kind}</Badge>
            </div>
            <small>{formatDate(x.date)} · {db.rooms.find((r) => r.id === x.roomId)?.name}{tab === 'done' ? ` · ${x.kind === 'Announcement' ? 'Class announcement' : x.kind}` : ''}</small>
            {x.dueDate && (
              <div className="due-line">
                <Badge tone="neutral">{tab === 'done' ? `Was scheduled ${formatDate(x.dueDate)}` : dueInfo(x).label}</Badge>
              </div>
            )}
            {x.body && <p>{x.body}</p>}
            <AttachmentList files={x.attachments} />
          </div>
        )) : <Empty text={tab === 'current' ? 'Nothing posted yet.' : 'Nothing is done yet.'} />}
      </Panel>
    </>
  );
}