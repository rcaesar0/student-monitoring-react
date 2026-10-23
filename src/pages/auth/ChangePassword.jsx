import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { roleCollection } from '../../services/auth';
import PasswordField from '../../components/PasswordField';
import { MIN_PASSWORD_LENGTH } from '../../config';

// Shown before anything else when an account still has a temporary password.
export default function ChangePassword() {
  const { user, repo, logout } = useApp();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (next.length < MIN_PASSWORD_LENGTH) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (next === user.password) return setError('Choose a password different from the temporary one.');
    if (next !== confirm) return setError('Passwords do not match.');
    repo.update(roleCollection(user.role), user.id, { password: next, mustChangePassword: false });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/logo-app.png" className="auth-logo" alt="Logo" />
        <h1>Set your password</h1>
        <form onSubmit={submit}>
          <p className="muted">
            Welcome, {user.firstName}. For security, replace the temporary password before continuing.
          </p>
          <PasswordField label="New password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" autoFocus />
          <PasswordField label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          {error && <div className="error">{error}</div>}
          <button type="submit" className="primary wide">Save and continue</button>
          <button type="button" className="text-btn" onClick={logout}>Sign out</button>
        </form>
      </div>
    </div>
  );
}