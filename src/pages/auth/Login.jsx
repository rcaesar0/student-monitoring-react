import React, { useState, useEffect } from 'react';
import { guardedLogin } from '../../utils/loginGuard';
import { useT } from '../../utils/i18n';
import { useApp } from '../../context/AppContext';
import PasswordField from '../../components/PasswordField';
import { authenticateAsync } from '../../services/auth';

export default function Login({ go }) {
  const { db, repo, login } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const t = useT();

  // Show a message after signup or an inactivity logout.
  const [notice] = useState(() => {
    try {
      const created = sessionStorage.getItem('signup-success');

      if (created) {
        return `Account created successfully! You can now sign in with ${created}.`;
      }

      return sessionStorage.getItem('idle-logout')
        ? 'You were signed out because you were inactive. Please sign in again.'
        : '';
    } catch {
      return '';
    }
  });

  // Clear the flags after the first render.
  useEffect(() => {
    try {
      sessionStorage.removeItem('signup-success');
      sessionStorage.removeItem('idle-logout');
    } catch {
      // Ignore sessionStorage errors.
    }
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      // First, try the existing local login process.
      const result = guardedLogin(
        db,
        repo,
        username,
        password
      );

      if (!result.error) {
        login(result.session);
        return;
      }

      // If local login fails, try Firebase Authentication.
      const firebaseResult = await authenticateAsync(
        db,
        username,
        password
      );

      if (firebaseResult) {
        login(firebaseResult);
        return;
      }

      setError(
        result.error ||
          'Incorrect email/mobile or password.'
      );
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

      <button
        type="submit"
        className="primary wide"
        disabled={busy}
      >
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

      <div className="teacher-login-section">
        <div className="teacher-divider">
          <span>Are you a teacher?</span>
        </div>

        <button
          type="button"
          className="outline-btn wide"
          onClick={() => go('teacher')}
          disabled={busy}
        >
          Teacher Portal
        </button>
      </div>
    </form>
  );
}