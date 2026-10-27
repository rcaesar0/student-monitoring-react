import { toPhone, looksLikePhone } from '../utils/phone';

export const ROLE_COLLECTION = { Admin: 'admins', Teacher: 'teachers', Guardian: 'guardians' };
export const roleCollection = (role) => ROLE_COLLECTION[role];

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

export async function authenticateAsync(db, identifier, password) {
  const local = authenticate(db, identifier, password);
  if (local) return local;

  const id = String(identifier || '').trim().toLowerCase();
  if (!id.includes('@')) return null;

  try {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const { firebaseAuth, firebaseConfigured } = await import('./firebase');

    if (!firebaseConfigured || !firebaseAuth) return null;

    const cred = await signInWithEmailAndPassword(firebaseAuth, id, password);

    const u = (db.guardians || []).find(
      (x) =>
        x.status !== 'Archived' &&
        (x.firebaseUid === cred.user.uid || (x.email && x.email.toLowerCase() === id))
    );

    if (u) return { role: 'Guardian', id: u.id };
  } catch (err) {
    console.log('[AUTH] Firebase login failed:', err?.code || err?.message);
  }

  return null;
}

export const emailTaken = (db, email, exceptId = null) =>
  Object.values(ROLE_COLLECTION).some((col) =>
    (db[col] || []).some(
      (x) => x.id !== exceptId && x.email && x.email.toLowerCase() === email.trim().toLowerCase()
    )
  );

export const phoneTaken = (db, phone, exceptId = null) =>
  Object.values(ROLE_COLLECTION).some((col) =>
    (db[col] || []).some((x) => x.id !== exceptId && x.phone && x.phone === phone)
  );