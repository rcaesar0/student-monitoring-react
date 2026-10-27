import React, { useState } from 'react';
import PrintSheet from './PrintSheet';
import { useApp } from '../context/AppContext';
import { fullName, formatDate } from '../utils/helpers';
import { attendanceSummary } from '../utils/selectors';
import { studentGrade, quarterGrades, isReleasedTo, categoryOf, conductedOf, quarterOf, fmt } from '../utils/grading';

// Guardian: a progress report for one child that can be printed or saved as PDF.
// It only contains grades the teacher has released, like the Grades page.
export default function ChildReportButton({ child, rooms, quarter }) {
  const { db } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-sm" onClick={() => setOpen(true)}>Print report</button>
      {open && (
        <PrintSheet title={`Progress report · Quarter ${quarter}`} onClose={() => setOpen(false)}>
          <h2>{fullName(child)}</h2>
          <p>{child.grade || ''}{child.grade ? ' · ' : ''}LRN {child.lrn}</p>
          {rooms.map((room) => {
            const teacher = db.teachers.find((t) => t.id === room.teacherId);
            const sum = attendanceSummary(db, child.id, room.id);
            const released = db.assessments
              .filter((a) => a.roomId === room.id && quarterOf(a) === quarter && isReleasedTo(db, a, child.id))
              .sort((a, b) => conductedOf(a).localeCompare(conductedOf(b)));
            const grade = studentGrade(db, room.id, child.id, true, quarter);
            const byQuarter = quarterGrades(db, room.id, child.id, true);
            const scoreOf = (a) => db.grades.find((g) => g.id === `${a.id}_${child.id}`)?.score;
            return (
              <section key={room.id} className="print-room">
                <h3>{room.subject} <small>{room.name}{teacher ? ` · ${fullName(teacher)}` : ''}</small></h3>
                <p>
                  Attendance: {sum.rate === null ? 'no records yet' : `${sum.rate}%`} ({sum.present} present, {sum.late} late, {sum.absent} absent{sum.excused ? `, ${sum.excused} excused` : ''})
                </p>
                {released.length ? (
                  <table>
                    <thead><tr><th>Assessment</th><th>Type</th><th>Conducted</th><th>Score</th></tr></thead>
                    <tbody>
                      {released.map((a) => (
                        <tr key={a.id}><td>{a.title}</td><td>{categoryOf(a)}</td><td>{formatDate(conductedOf(a))}</td><td>{scoreOf(a) ?? '—'} / {a.total}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p>No released grades for Quarter {quarter} yet.</p>}
                {grade.final !== null && <p><b>{grade.complete ? 'Overall grade' : 'Grade so far'}, Quarter {quarter}: {fmt(grade.final)}</b></p>}
                {byQuarter.some((q) => q.final !== null) && (
                  <p>{byQuarter.map((q) => `Q${q.quarter}: ${q.final === null ? '—' : fmt(q.final)}`).join('   ·   ')}</p>
                )}
              </section>
            );
          })}
        </PrintSheet>
      )}
    </>
  );
}