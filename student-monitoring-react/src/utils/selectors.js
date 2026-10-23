export const byName = (a, b) =>
  (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || '');

export const rosterOf = (db, roomId) =>
  db.roomStudents
    .filter((x) => x.roomId === roomId)
    .map((x) => db.students.find((s) => s.id === x.studentId))
    .filter((s) => s && s.status === 'Active')
    .sort(byName);

export const guardianState = (db, studentId) => {
  const links = db.guardianLinks.filter((l) => l.studentId === studentId);
  if (links.some((l) => l.status === 'Approved')) return 'Linked';
  if (links.some((l) => l.status === 'Pending')) return 'Pending';
  return 'None';
};

export const approvedChildren = (db, guardianId) =>
  db.guardianLinks
    .filter((l) => l.guardianId === guardianId && l.status === 'Approved')
    .map((l) => db.students.find((s) => s.id === l.studentId))
    .filter((s) => s && s.status === 'Active');

export const roomsOfStudent = (db, studentId) =>
  db.roomStudents
    .filter((x) => x.studentId === studentId)
    .map((x) => db.rooms.find((r) => r.id === x.roomId))
    .filter((r) => r && r.status === 'Active');

export function attendanceSummary(db, studentId, roomId) {
  const rec = db.attendance.filter((a) => a.studentId === studentId && (!roomId || a.roomId === roomId));
  const count = (s) => rec.filter((a) => a.status === s).length;
  const present = count('Present'), late = count('Late'), absent = count('Absent'), excused = count('Excused');
  // Excused days are shown but not held against the student, so they are left out of the rate.
  const total = present + late + absent;
  return { present, late, absent, excused, total, rate: total ? Math.round(((present + late) / total) * 100) : null };
}

// Grades a guardian is allowed to see: only from released assessments.
export const releasedGrades = (db, studentId) =>
  db.grades
    .filter((g) => g.studentId === studentId)
    .map((g) => ({ grade: g, assessment: db.assessments.find((a) => a.id === g.assessmentId) }))
    .filter((x) => x.assessment && x.assessment.released);