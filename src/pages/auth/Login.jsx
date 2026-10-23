import React, { useState } from 'react';
import { authenticate } from '../../services/auth';
import { useApp } from '../../context/AppContext';
import { showCode } from '../../utils/linkCodes';
import PasswordField from '../../components/PasswordField';

export default function Login({ go }) {
  const { db, login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // The demo child's real link code, read from the current data.
  const demoChild = db.students.find((s) => s.lrn === '100000000001');

  function submit(e) {
    e.preventDefault();
    const session = authenticate(db, username, password);
    if (!session) return setError('Invalid email, mobile number or password.');
    login(session);
  }

  return (
    <form onSubmit={submit}>
      <h2>Sign in</h2>
      <label>
        Email or mobile number
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Email or mobile number" />
      </label>
      <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      {error && <div className="error">{error}</div>}
      <button type="submit" className="primary wide">Sign In</button>
      <div className="auth-links">
        <button type="button" className="text-btn" onClick={() => go('forgot')}>Forgot password?</button>
        <button type="button" className="text-btn" onClick={() => go('signup')}>Guardian sign up</button>
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