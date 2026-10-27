import React, { useState } from 'react';
import { Panel } from './UI';
import PrintSheet from './PrintSheet';
import { useApp } from '../context/AppContext';
import { fullName } from '../utils/helpers';
import { rosterOf, attendanceSummary } from '../utils/selectors';
import { studentGrade, quarterOf, categoryOf, fmt } from '../utils/grading';
import { downloadCsv } from '../utils/download';
import { QUARTERS, DEFAULT_QUARTER, GRADING } from '../config';

const num = (v) => (v === null || v === undefined ? '' : Math.round(v * 10) / 10);

// Teacher: download the class grades or attendance as a spreadsheet, or print a class summary.
export default function ReportsPanel({ room }) {
  const { db } = useApp();
  const [quarter, setQuarter] = useState(DEFAULT_QUARTER);
  const [printing, setPrinting] = useState(false);
  const students = rosterOf(db, room.id);
  const file = (what) => `${room.name}-${what}`.replace(/[^\w-]+/g, '_');

  function gradesCsv() {
    const list = db.assessments.filter((a) => a.roomId === room.id && quarterOf(a) === quarter);
    const scoreOf = (a, s) => db.grades.find((g) => g.id === `${a.id}_${s.id}`)?.score;
    const head = ['LRN', 'Last name', 'First name', ...list.map((a) => `${a.title} (${categoryOf(a)}, /${a.total})`), 'Class standing', 'Exams & quizzes', 'Grade'];
    const rows = students.map((s) => {
      const g = studentGrade(db, room.id, s.id, false, quarter);
      return [s.lrn, s.lastName, s.firstName, ...list.map((a) => scoreOf(a, s) ?? ''), num(g.classStanding), num(g.examQuiz), num(g.final)];
    });
    downloadCsv(`${file(`grades-Q${quarter}`)}.csv`, [head, ...rows]);
  }

  function attendanceCsv() {
    const head = ['LRN', 'Last name', 'First name', 'Present', 'Late', 'Absent', 'Excused', 'Attendance rate (%)'];
    const rows = students.map((s) => {
      const a = attendanceSummary(db, s.id, room.id);
      return [s.lrn, s.lastName, s.firstName, a.present, a.late, a.absent, a.excused, a.rate ?? ''];
    });
    downloadCsv(`${file('attendance')}.csv`, [head, ...rows]);
  }

  return (
    <Panel title="Reports">
      <p className="muted">Download this class as a spreadsheet, or print a summary.</p>
      <label>
        Quarter for grades
        <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
          {QUARTERS.map((q) => <option key={q} value={q}>Quarter {q}</option>)}
        </select>
      </label>
      <div className="row-actions">
        <button className="btn-sm" onClick={gradesCsv}>Download grades (CSV)</button>
        <button className="btn-sm" onClick={attendanceCsv}>Download attendance (CSV)</button>
        <button className="btn-sm" onClick={() => setPrinting(true)}>Print class summary</button>
      </div>

      {printing && (
        <PrintSheet title={`Class summary · ${room.name} · ${room.subject} · Quarter ${quarter}`} onClose={() => setPrinting(false)}>
          <table>
            <thead><tr><th>Student</th><th>LRN</th><th>Present</th><th>Late</th><th>Absent</th><th>Attendance</th><th>Grade</th></tr></thead>
            <tbody>
              {students.map((s) => {
                const a = attendanceSummary(db, s.id, room.id);
                const g = studentGrade(db, room.id, s.id, false, quarter);
                return (
                  <tr key={s.id}>
                    <td>{fullName(s)}</td><td>{s.lrn}</td><td>{a.present}</td><td>{a.late}</td><td>{a.absent}</td>
                    <td>{a.rate === null ? '—' : `${a.rate}%`}</td>
                    <td>{fmt(g.final)}{g.final !== null && !g.complete ? ' (so far)' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p>{students.length} students. Passing grade: {GRADING.passing}. Grades include scores not yet released to guardians.</p>
        </PrintSheet>
      )}
    </Panel>
  );
}