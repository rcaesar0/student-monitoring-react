import { seedDatabase } from '../data/seed';

// v3 = Grade 1-6 demo data. Older saved data is ignored.
const DB_KEY = 'student_monitoring_db_v3';
const SESSION_KEY = 'student_monitoring_session_v3';

const fresh = () => structuredClone(seedDatabase);

// Makes sure every collection exists, even in data saved by an older version.
export const withDefaults = (db) => ({ ...fresh(), ...db });

export const loadDatabase = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(DB_KEY));
    return stored ? withDefaults(stored) : fresh();
  } catch {
    return fresh();
  }
};

// Local copy of the data (so the app opens instantly). Never throws.
// If the browser storage is full (too many attachments), the teacher is warned once.
let warned = false;
export const saveDatabase = (db) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    if (!warned) {
      warned = true;
            window.dispatchEvent(new CustomEvent('app-notice', { detail: { title: 'Storage is full', message: 'Your latest changes may not be saved on this device. Remove some attachments or old posts.' } }));
    }
  }
};
export const resetDatabase = () => localStorage.removeItem(DB_KEY);

export const loadSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
};
export const saveSession = (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s));
export const clearSession = () => localStorage.removeItem(SESSION_KEY);