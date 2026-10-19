import React, { useState } from 'react';
import { Panel, Empty, Badge, Avatar } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { fullName, initials, dateStr } from '../../utils/helpers';
import { rosterOf } from '../../utils/selectors';

const STATUSES = ['Present', 'Late', 'Absent', 'Excused'];

export default function AttendanceTab({ room }) {
  const { db, repo } = useApp();
  const [date, setDate] = useState(dateStr());
  const students = rosterOf(db, room.id);

  const docId = (studentId) => `${room.id}_${date}_${studentId}`;
  const statusOf = (studentId) => db.attendance.find((a) => a.id === docId(studentId))?.status || 'Pending';
  const mark = (studentId, status) => {
    if (!status) return repo.remove('attendance', docId(studentId));
    repo.set('attendance', docId(studentId), { roomId: room.id, studentId, date, status });
  };
  const count = (s) => students.filter((st) => statusOf(st.id) === s).length;

  // Only fills students who are not marked yet. Marks already chosen are kept.
  const markRest = () =>
    students.filter((s) => statusOf(s.id) === 'Pending').forEach((s) => mark(s.id, 'Present'));

  return (
    <Panel title="Attendance" actions={<button className="btn-sm" onClick={markRest}>Mark the rest present</button>}>
      <div className="toolbar">
        <input type="date" value={date} max={dateStr()} onChange={(e) => setDate(e.target.value || dateStr())} />
      </div>
      {students.length ? (
        <>
          <div className="pill-row">
            <Badge tone="green">{count('Present')} present</Badge>
            <Badge tone="orange">{count('Late')} late</Badge>
            <Badge tone="red">{count('Absent')} absent</Badge>
            <Badge tone="blue">{count('Excused')} excused</Badge>
            <Badge tone="amber">{count('Pending')} not marked</Badge>
          </div>
          {students.map((s) => {
            const status = statusOf(s.id);
            return (
              <div className={`row att-row ${status.toLowerCase()}`} key={s.id}>
                <div className="row-main"><Avatar letter={initials(s)} size={32} /><b>{fullName(s)}</b></div>
                <select
                  className={`att-select ${status.toLowerCase()}`}
                  value={status === 'Pending' ? '' : status}
                  onChange={(e) => mark(s.id, e.target.value)}
                  aria-label={`Attendance for ${fullName(s)}`}
                >
                  <option value="">Select</option>
                  {STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          })}
        </>
      ) : (
        <Empty text="No students in this section." />
      )}
    </Panel>
  );
}