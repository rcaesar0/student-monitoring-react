import React, { useState, useEffect } from 'react';
import { guardedLogin } from '../../utils/loginGuard';
import { useT } from '../../utils/i18n';
import { useApp } from '../../context/AppContext';
import { showCode } from '../../utils/linkCodes';
import PasswordField from '../../components/PasswordField';
import { authenticateAsync } from '../../services/auth';

export default function Login({ go }) {
  const { db, repo, login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();

  // Shown once: after signup, or after being signed out for inactivity.
  const [notice] = useState(() => {
    try {
      const created = sessionStorage.getItem('signup-success');
      if (created) return `Account created successfully! You can now sign in with ${created}.`;
      return sessionStorage.getItem('idle-logout')
        ? 'You were signed out because you were inactive. Please sign in again.'
        : '';
    } catch {
      return '';
    }
  });

  // Clear the flags after the first render so the message shows only once.
  useEffect(() => {
    try {
      sessionStorage.removeItem('signup-success');
      sessionStorage.removeItem('idle-logout');
    } catch { /* ignore */ }
  }, []);

  // The demo child's real link code
  const demoChild = db.students?.find((s) => s.lrn === '100000000001');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      // 1. Try local login first (old accounts + phone users)
      const result = guardedLogin(db, repo, username, password);

      if (!result.error) {
        login(result.session);
        return;
      }

      // 2. Try Firebase Auth (new email accounts)
      const firebaseResult = await authenticateAsync(db, username, password);
      if (firebaseResult) {
        login(firebaseResult);
        return;
      }

      // Both failed
      setError(result.error || 'Incorrect email/mobile or password.');
    } catch (err) {
      console.error('[LOGIN]', err);
      setError('Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>{t('Sign in')}</h2>
      {notice && <div className="info">{notice}</div>}

      <label>
        {t('Email or mobile number')}
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder={t('Email or mobile number')}
          disabled={busy}
        />
      </label>

      <PasswordField
        label={t('Password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        disabled={busy}
      />

      {error && <div className="error">{error}</div>}

      <button type="submit" className="primary wide" disabled={busy}>
        {busy ? t('Signing in…') : t('Sign In')}
      </button>

      <div className="auth-links">
        <button
          type="button"
          className="text-btn"
          onClick={() => go('forgot')}
          disabled={busy}
        >
          {t('Forgot password?')}
        </button>

        <button
          type="button"
          className="text-btn"
          onClick={() => go('signup')}
          disabled={busy}
        >
          {t('Guardian sign up')}
        </button>
      </div>

      {import.meta.env.DEV && (
        <div className="demo-box">
          <b>Demo accounts</b>
          <div>Admin: admin@school.local / admin123</div>
          <div>Teacher: teacher@gmail.com / teacher123</div>
          <div>Guardian: guardian@gmail.com / guardian123</div>
          <div className="demo-sep">
            Link a child (guardian): LRN <b>100000000001</b> · link code{' '}
            {demoChild?.linkCode ? (
              <b>{showCode(demoChild.linkCode)}</b>
            ) : (
              <span>not made yet. Sign in once as admin, then it appears here.</span>
            )}
          </div>
          <div>
            No code? Tap “I don’t have a code” and use birthdate <b>2014-03-14</b>. The admin
            approves it.
          </div>
        </div>
      )}
    </form>
  );
}