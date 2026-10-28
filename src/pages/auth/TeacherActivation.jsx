import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MIN_PASSWORD_LENGTH } from '../../config';

export default function TeacherActivation({ go }) {
  const { db, repo } = useApp();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  function submit(event) {
    event.preventDefault();
    setError('');

    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      setError('Enter your activation code.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    const teacher = (db.teachers || []).find(
      (item) =>
        item.status === 'Pending Activation' &&
        item.activationCode === normalizedCode
    );

    if (!teacher) {
      setError(
        'This activation code is invalid, already used, or no longer available.'
      );
      return;
    }

    if (
      !teacher.activationExpiresAt ||
      Date.now() >
        new Date(teacher.activationExpiresAt).getTime()
    ) {
      setError(
        'This activation code has expired. Contact the administrator for a new code.'
      );
      return;
    }

    setBusy(true);

    try {
      repo.update('teachers', teacher.id, {
        password,
        status: 'Active',
        mustChangePassword: false,
        activatedAt: new Date().toISOString(),
        activationCode: '',
        activationExpiresAt: '',
      });

      setSuccess(true);
    } catch (err) {
      console.error('[TEACHER ACTIVATION]', err);
      setError(
        'Could not activate your account. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div>
        <h2>Account activated</h2>

        <div className="info">
          Your teacher account is now active. You can sign in
          with your registered email address and the password
          you created.
        </div>

        <button
          type="button"
          className="primary wide"
          onClick={() => go('login')}
        >
          Continue to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h2>Activate Teacher Account</h2>

      <p className="muted">
        Enter the activation code provided by the administrator,
        then create your password.
      </p>

      <label>
        Activation code *
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          required
        />
      </label>

      <label>
        Create password *
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>

      <label>
        Confirm password *
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(event.target.value)
          }
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>

      {error && <div className="error">{error}</div>}

      <button
        type="submit"
        className="primary wide"
        disabled={busy}
      >
        {busy ? 'Activating…' : 'Activate account'}
      </button>

      <button
        type="button"
        className="text-btn"
        onClick={() => go('login')}
      >
        Back to sign in
      </button>
    </form>
  );
}