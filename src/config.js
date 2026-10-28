export const SCHOOL_DOMAIN = 'stud.com';
export const MAX_GUARDIANS_PER_CHILD = 3;
export const MAX_LINK_REQUESTS = 3;
export const MAX_LINK_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 8;

// The school only covers elementary grades.
export const GRADE_LEVELS = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
];

// Month-day each quarter begins, in school-year order.
export const QUARTER_STARTS = [
  '06-01',
  '09-01',
  '11-16',
  '02-16',
];

export const DEFAULT_QUARTER = 1;
export const QUARTERS = [1, 2, 3, 4];

// Class standing counts 60%; exams and quizzes count 40%.
export const GRADING = {
  weights: {
    classStanding: 60,
    examQuiz: 40,
  },

  groupLabels: {
    classStanding: 'Class Standing',
    examQuiz: 'Exams & Quizzes',
  },

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

  remarks: [
    [90, 'Outstanding'],
    [85, 'Very Satisfactory'],
    [80, 'Satisfactory'],
    [75, 'Fairly Satisfactory'],
    [0, 'Needs Improvement'],
  ],
};