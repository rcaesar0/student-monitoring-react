// Demo data. Every collection mirrors a future Firestore collection.
// Document ids are strings so they can move to Firestore unchanged.
// Demo link codes are ABCD2001 to ABCD2006. Real students get random codes from the admin.
const students = [
  ['s-1', 'John', 'Dela Cruz', '100000000001', '2014-03-14'],
  ['s-2', 'Anna', 'Santos', '100000000002', '2014-07-02'],
  ['s-3', 'Mark', 'Reyes', '100000000003', '2014-11-23'],
  ['s-4', 'Grace', 'Bautista', '100000000004', '2014-01-30'],
  ['s-5', 'Paolo', 'Garcia', '100000000005', '2014-05-18'],
  ['s-6', 'Liza', 'Mendoza', '100000000006', '2014-09-09'],
].map(([id, firstName, lastName, lrn, birthdate], i) => ({
  id, firstName, middleName: '', lastName, lrn, birthdate, grade: 'Grade 6', status: 'Active', linkCode: `ABCD200${i + 1}`,
}));

export const seedDatabase = {
  admins: [
    { id: 'a-1', firstName: 'Administrator', lastName: '', email: 'admin@school.local', password: 'admin123' },
  ],
  teachers: [
    {
      id: 't-1', firstName: 'Juan', middleName: '', lastName: 'Dela Cruz',
      email: 'teacher@school.local', personalEmail: 'juan@gmail.com', employeeId: 'EMP-001',
      subject: 'Mathematics', password: 'teacher123', mustChangePassword: false, status: 'Active',
    },
  ],
  guardians: [
    {
      id: 'g-1', firstName: 'Maria', middleName: '', lastName: 'Santos',
      email: 'guardian@gmail.com', password: 'guardian123', mustChangePassword: false,
      status: 'Active', failedLinks: 0, lockedUntil: 0,
    },
  ],
  students,
  rooms: [
    { id: 'r-1', name: 'Grade 6 - Rizal', subject: 'Mathematics', gradeLevel: 'Grade 6', teacherId: 't-1', code: 'MATH6A', status: 'Active', theme: 'leaf' },
  ],
  roomStudents: students.map((s) => ({ id: `r-1_${s.id}`, roomId: 'r-1', studentId: s.id })),
  guardianLinks: [],   // id = `${guardianId}_${studentId}`
  assessments: [],     // { roomId, title, category, total, released, date, postId? }
  grades: [],          // id = `${assessmentId}_${studentId}`
  releases: [],        // id = `${assessmentId}_${studentId}`: released to one student's guardian only
  attendance: [],      // id = `${roomId}_${date}_${studentId}`
  announcements: [],   // { roomId, title, body, date, dueDate, dueTime, attachments, status? }
  activities: [],      // same shape, plus category. Each one also creates an assessment.
  events: [],          // teacher's personal calendar: { teacherId, title, date, time }
};