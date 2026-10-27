import { DEFAULT_QUARTER, GRADING } from '../config';
import { dateStr } from './helpers';
import { attendanceSummary } from './selectors';
import { studentGrade, fmt } from './grading';

// Early warning by simple rules (no AI). A student is flagged when:
//   - absent 3 or more times in the last 14 days, or
//   - attendance rate under 85% (with at least 5 records), or
//   - the grade so far in the quarter is under the passing mark.
// Two or more reasons = "high", one = "watch". The teacher reviews the list before any guardian is told.
export const WINDOW_DAYS = 14;
export const ABSENT_LIMIT = 3;
export const RATE_LIMIT = 85;
export const MIN_RECORDS = 5;

export function riskOf(db, room, student, quarter = DEFAULT_QUARTER) {
  const reasons = [];
  const since = (() => { const d = new Date(); d.setDate(d.getDate() - WINDOW_DAYS); return dateStr(d); })();

  const absent = db.attendance.filter((a) => a.studentId === student.id && a.roomId === room.id && a.date >= since && a.status === 'Absent').length;
  if (absent >= ABSENT_LIMIT) reasons.push(`Absent ${absent} times in the last ${WINDOW_DAYS} days`);

  const sum = attendanceSummary(db, student.id, room.id);
  if (sum.total >= MIN_RECORDS && sum.rate !== null && sum.rate < RATE_LIMIT) reasons.push(`Attendance is ${sum.rate}% (below ${RATE_LIMIT}%)`);

  const g = studentGrade(db, room.id, student.id, false, quarter);
  if (g.final !== null && g.final < GRADING.passing) {
    reasons.push(`${g.complete ? 'Grade' : 'Grade so far'} is ${fmt(g.final)}, below the passing mark of ${GRADING.passing}`);
  }

  return { level: reasons.length >= 2 ? 'high' : reasons.length ? 'watch' : 'ok', reasons };
}

// Every flagged student in the given rooms, most serious first.
export function flaggedIn(db, rooms) {
  const out = [];
  rooms.forEach((room) => {
    db.roomStudents.filter((x) => x.roomId === room.id).forEach((x) => {
      const student = db.students.find((s) => s.id === x.studentId && s.status === 'Active');
      if (!student) return;
      const r = riskOf(db, room, student);
      if (r.level === 'ok') return;
      const week = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return dateStr(d); })();
      const sent = (db.alerts || []).find((a) => a.kind === 'risk' && a.studentId === student.id && a.roomId === room.id && a.date >= week);
      out.push({ student, room, ...r, sent });
    });
  });
  return out.sort((a, b) => (b.level === 'high') - (a.level === 'high') || b.reasons.length - a.reasons.length);
}