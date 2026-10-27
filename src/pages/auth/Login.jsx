import React, { useState, useEffect } from 'react';
import { guardedLogin } from '../../utils/loginGuard';
import { useT } from '../../utils/i18n';
import { useApp } from '../../context/AppContext';
import { showCode } from '../../utils/linkCodes';
import PasswordField from '../../components/PasswordField';

export default function Login({ go }) {
  const { db, repo, login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
    const t = useT();
  // Shown once when the person was signed out for being inactive.
    // Shown once: after signup, or after being signed out for inactivity.
  const [notice] = useState(() => {
    try {
      const created = sessionStorage.getItem('signup-success');
      if (created) return `Account created successfully! You can now sign in with ${created}.`;
      return sessionStorage.getItem('idle-logout')
        ? 'You were signed out because you were inactive. Please sign in again.'
        : '';
    } catch { return ''; }
  });

  // Clear the flags after the first render so the message shows only once.
  useEffect(() => {
    try {
      sessionStorage.removeItem('signup-success');
      sessionStorage.removeItem('idle-logout');
    } catch { /* ignore */ }
  }, []);

  // The demo child's real link code, read from the current data.
  const demoChild = db.students.find((s) => s.lrn === '100000000001');

  function submit(e) {
    e.preventDefault();
    const result = guardedLogin(db, repo, username, password);
    if (result.error) return setError(result.error);
    login(result.session);
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
       />
   </label>

    <PasswordField
      label={t('Password')}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      autoComplete="current-password"
       />

     {error && <div className="error">{error}</div>}

    <button type="submit" className="primary wide">
       {t('Sign In')}
    </button>

    <div className="auth-links">
     <button
      type="button"
      className="text-btn"
      onClick={() => go('forgot')}
      >
    {t('Forgot password?')}
      </button>

      <button
        type="button"
        className="text-btn"
        onClick={() => go('signup')}
       >
    {t('Guardian sign up')}
       </button>
    </div>

      {import.meta.env.DEV && (
        <div className="demo-box">
          <b>Demo accounts</b>
          <div>Admin: admin@school.local / admin123</div>
          <div>Teacher: teacher@school.local / teacher123</div>
          <div>Guardian: guardian@gmail.com / guardian123</div>
          <div className="demo-sep">
            Link a child (guardian): LRN <b>100000000001</b> · link code{' '}
            {demoChild?.linkCode
              ? <b>{showCode(demoChild.linkCode)}</b>
              : <span>not made yet. Sign in once as admin, then it appears here.</span>}
          </div>
          <div>No code? Tap “I don’t have a code” and use birthdate <b>2014-03-14</b>. The admin approves it.</div>
        </div>
      )}
    </form>
  );
}