import { ROLE_COLLECTION } from '../services/auth';
import { looksLikePhone, toPhone } from './phone';
import { MAX_LOGIN_ATTEMPTS, LOGIN_LOCK_MINUTES } from './security';

const BAD = 'Invalid email, mobile number or password.';

// Signs in like authenticate() but counts wrong passwords. After MAX_LOGIN_ATTEMPTS in a row the account is locked
// for LOGIN_LOCK_MINUTES. The school office can unlock it at once with Reset password (Teachers or Guardians tab).
// Returns { session } on success or { error } with the message to show.
export function guardedLogin(db, repo, identifier, password) {
  const id = String(identifier || '').trim();
  const email = id.toLowerCase();
  const phone = looksLikePhone(id) ? toPhone(id) : '';

  let found = null;
  for (const [role, col] of Object.entries(ROLE_COLLECTION)) {
    const u = (db[col] || []).find((x) => (x.email && x.email.toLowerCase() === email) || (phone && x.phone === phone));
    if (u) { found = { role, col, u }; break; }
  }
  // The same message for "no such account" and "archived", so nobody can use it to find out who has an account.
  if (!found || found.u.status === 'Archived') return { error: BAD };

  const { role, col, u } = found;
  const now = Date.now();
  if ((u.lockedLoginUntil || 0) > now) {
    const mins = Math.ceil((u.lockedLoginUntil - now) / 60000);
    return { error: `Too many wrong tries. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or ask the school office to reset your password.` };
  }

  if (u.password === password) {
    if (u.failedLogins || u.lockedLoginUntil) repo.update(col, u.id, { failedLogins: 0, lockedLoginUntil: 0 });
    return { session: { role, id: u.id } };
  }

  const fails = (u.failedLogins || 0) + 1;
  if (fails >= MAX_LOGIN_ATTEMPTS) {
    repo.update(col, u.id, { failedLogins: 0, lockedLoginUntil: now + LOGIN_LOCK_MINUTES * 60000 });
    return { error: `Too many wrong tries. This account is locked for ${LOGIN_LOCK_MINUTES} minutes.` };
  }
  repo.update(col, u.id, { failedLogins: fails });
  const left = MAX_LOGIN_ATTEMPTS - fails;
  return { error: left <= 2 ? `${BAD} ${left} ${left === 1 ? 'try' : 'tries'} left.` : BAD };
}