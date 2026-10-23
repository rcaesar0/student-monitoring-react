import { GRADING, QUARTER_STARTS, QUARTERS } from '../config';
import { dateStr } from './helpers';

export const CATEGORY_NAMES = Object.keys(GRADING.categories);
export const groupOf = (a) => GRADING.categories[a?.category] || 'classStanding';
export const categoryOf = (a) => (GRADING.categories[a?.category] ? a.category : 'Activity');

// The day the work was given or held. Older assessments without one fall back to the day they were created.
export const conductedOf = (a) => a?.conductedDate || a?.date || '';

// Which quarter a date falls in, using QUARTER_STARTS from config.js (wraps around the new year).
export function quarterForDate(date = dateStr()) {
  const md = String(date).slice(5, 10);
  const starts = QUARTER_STARTS.map((s, i) => ({ s, n: i + 1 })).sort((a, b) => a.s.localeCompare(b.s));
  const begun = starts.filter((q) => q.s <= md);
  return (begun.length ? begun[begun.length - 1] : starts[starts.length - 1]).n;
}

// An assessment's quarter. Older ones without a saved quarter are placed by the day they were held.
export const quarterOf = (a) => a?.quarter || quarterForDate(conductedOf(a));

// Percent shown with at most one decimal (87.5, 90).
export const fmt = (n) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));

export const remarkOf = (final) =>
  final === null || final === undefined ? '' : GRADING.remarks.find(([min]) => final >= min)[1];

// Computes one student's grade. Nothing is stored: change a score and every number updates.
//   assessments: list of { id, total, category }
//   scoreOf(assessment): the student's score, or undefined when not graded yet
// Each group's percent = total points earned / total points possible (like =SUM(scores)/SUM(totals) in Excel).
// Blank scores are skipped (enter 0 for work that was not handed in).
// Final = 60% x Class Standing + 40% x Exams & Quizzes. If only one group has scores so far,
// the final uses that group alone so the grade is not dragged down by work not given yet.
// complete = both groups have scores. When it is false the grade is only "so far" and screens say so.
export function computeGrade(assessments, scoreOf) {
  const sums = { classStanding: { got: 0, out: 0 }, examQuiz: { got: 0, out: 0 } };
  assessments.forEach((a) => {
    const s = scoreOf(a);
    if (s === undefined || s === null || s === '' || !(a.total > 0)) return;
    const g = sums[groupOf(a)];
    g.got += Math.min(Number(s), a.total);
    g.out += a.total;
  });
  const pct = (g) => (g.out ? (g.got / g.out) * 100 : null);
  const classStanding = pct(sums.classStanding);
  const examQuiz = pct(sums.examQuiz);

  let weight = 0, total = 0;
  [['classStanding', classStanding], ['examQuiz', examQuiz]].forEach(([k, v]) => {
    if (v === null) return;
    weight += GRADING.weights[k];
    total += v * GRADING.weights[k];
  });
  const final = weight ? total / weight : null;
  return { classStanding, examQuiz, final, complete: classStanding !== null && examQuiz !== null };
}

// An assessment is visible to a guardian when it was released to everyone,
// or (older data) released to that one student.
export const isReleasedTo = (db, assessment, studentId) =>
  !!assessment.released || (db.releases || []).some((r) => r.id === `${assessment.id}_${studentId}`);

// A student's grade in one room. Guardians only count assessments released to them.
// quarter (1-4) limits it to that quarter; leave it out to count the whole year.
export function studentGrade(db, roomId, studentId, releasedOnly = false, quarter = null) {
  const list = db.assessments.filter(
    (a) => a.roomId === roomId && (!releasedOnly || isReleasedTo(db, a, studentId)) && (!quarter || quarterOf(a) === quarter)
  );
  return computeGrade(list, (a) => db.grades.find((g) => g.id === `${a.id}_${studentId}`)?.score);
}

// One grade per quarter: [{ quarter: 1, final, complete, ... }, ...]
export const quarterGrades = (db, roomId, studentId, releasedOnly = false) =>
  QUARTERS.map((q) => ({ quarter: q, ...studentGrade(db, roomId, studentId, releasedOnly, q) }));