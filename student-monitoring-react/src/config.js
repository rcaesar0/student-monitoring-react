export const SCHOOL_DOMAIN = 'school.local';   // teacher accounts become first.last@school.local
export const MAX_GUARDIANS_PER_CHILD = 3;
export const MAX_LINK_REQUESTS = 3;            // times a declined guardian may ask again for the same child
export const MAX_LINK_ATTEMPTS = 5;            // wrong code/LRN/birthdate tries before lockout
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 8;

// The school only covers elementary grades. Students and sections must use one of these.
export const GRADE_LEVELS = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

// The month-day each quarter begins, in school-year order (Q1, Q2, Q3, Q4). Change them to match your school calendar.
export const QUARTER_STARTS = ['06-01', '09-01', '11-16', '02-16'];
export const DEFAULT_QUARTER = 1;
export const QUARTERS = [1, 2, 3, 4];

// Grading rules. Class standing counts 60% and exams/quizzes count 40% of the final grade.
export const GRADING = {
  weights: { classStanding: 60, examQuiz: 40 },
  groupLabels: { classStanding: 'Class Standing', examQuiz: 'Exams & Quizzes' },
  // Each assessment type belongs to one group.
  categories: {
    Activity: 'classStanding',
    Assignment: 'classStanding',
    Seatwork: 'classStanding',
    Project: 'classStanding',
    Recitation: 'classStanding',
    Quiz: 'examQuiz',
    Exam: 'examQuiz',
  },
  passing: 75,
  // Remarks by final grade (highest first).
  remarks: [
    [90, 'Outstanding'],
    [85, 'Very Satisfactory'],
    [80, 'Satisfactory'],
    [75, 'Fairly Satisfactory'],
    [0, 'Needs Improvement'],
  ],
};