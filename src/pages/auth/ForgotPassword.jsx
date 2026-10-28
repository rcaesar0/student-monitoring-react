import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { firebaseAuth, firebaseConfigured } from '../../services/firebase';

export default function ForgotPassword({ go }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter the email address linked to your account.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!firebaseConfigured || !firebaseAuth) {
      setError('Firebase is not configured. Please check your Firebase environment variables and restart the development server.');
      return;
    }

    setBusy(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, normalizedEmail);
      setSuccess('If an account exists for this email, Firebase will send a password reset link. Please check your inbox and spam folder.');
      setEmail('');
    } catch (err) {
      console.error('[FORGOT PASSWORD] Password reset failed:', err);
      if (err?.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a while before trying again.');
      } else if (err?.code === 'auth/network-request-failed') {
        setError('Network error. Check your internet connection and try again.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError('Email/password authentication is disabled in Firebase. Enable it in Firebase Console under Authentication > Sign-in method.');
      } else {
        // Avoid revealing whether a particular email is registered.
        setError('Unable to send the reset email right now. Check the email address and Firebase Authentication settings, then try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2>Forgot your password?</h2>
      <p className="muted">
        Enter the email address associated with your account. Firebase will email you a secure
        link to reset your password.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="reset-email">Email address</label>
        <input
          id="reset-email"
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={busy}
        />

        {error && <div className="error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        {success && <div className="info" role="status" style={{ marginTop: 12 }}>{success}</div>}

        <button type="submit" className="primary wide" disabled={busy} style={{ marginTop: 16 }}>
          {busy ? 'Sending reset link...' : 'Send password reset link'}
        </button>
      </form>

      <button
        type="button"
        className="wide"
        onClick={() => go('login')}
        disabled={busy}
        style={{ marginTop: 10 }}
      >
        Back to sign in
      </button>
    </div>
  );
}
