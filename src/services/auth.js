import { toPhone, looksLikePhone } from '../utils/phone';

// Each role lives in its own collection.
export const ROLE_COLLECTION = { Admin: 'admins', Teacher: 'teachers', Guardian: 'guardians' };
export const roleCollection = (role) => ROLE_COLLECTION[role];

// The username can be an email or a Philippine mobile number.
export function authenticate(db, identifier, password) {
  const id = String(identifier || '').trim();
  const email = id.toLowerCase();
  const phone = looksLikePhone(id) ? toPhone(id) : '';
  for (const [role, col] of Object.entries(ROLE_COLLECTION)) {
    const u = (db[col] || []).find(
      (x) =>
        x.password === password &&
        x.status !== 'Archived' &&
        ((x.email && x.email.toLowerCase() === email) || (phone && x.phone === phone))
    );
    if (u) return { role, id: u.id };
  }
  return null;
}

// exceptId lets a person keep their own email or number when saving their profile.
export const emailTaken = (db, email, exceptId = null) =>
  Object.values(ROLE_COLLECTION).some((col) =>
    (db[col] || []).some((x) => x.id !== exceptId && x.email && x.email.toLowerCase() === email.trim().toLowerCase())
  );

export const phoneTaken = (db, phone, exceptId = null) =>
  Object.values(ROLE_COLLECTION).some((col) =>
    (db[col] || []).some((x) => x.id !== exceptId && x.phone && x.phone === phone)
  );