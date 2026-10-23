import React, { useState } from 'react';
import { Modal } from './UI';
import VerifyCode from './VerifyCode';
import { useApp } from '../context/AppContext';
import { roleCollection } from '../services/auth';
import { MIN_PASSWORD_LENGTH } from '../config';

// Opens from the account menu (top right) for every role.
// Step 1: enter the passwords. Step 2: confirm with a code sent to the registered mobile number or email.
export default function ChangePasswordModal({ onClose }) {
  const { user, repo } = useApp();
  const [phase, setPhase] = useState('form'); // form | verify | done
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setPw({ ...pw, [k]: e.target.value });

  const channels = [
    user.phone && { type: 'phone', value: user.phone, label: 'Mobile number' },
    user.email && { type: 'email', value: user.email, label: 'Email' },
  ].filter(Boolean);

  function submit(e) {
    e.preventDefault();
    if (pw.current !== user.password) return setError('Your current password is incorrect.');
    if (pw.next.length < MIN_PASSWORD_LENGTH) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (pw.next === pw.current) return setError('Choose a password different from the current one.');
    if (pw.next !== pw.confirm) return setError('The new passwords do not match.');
    setError('');
    setPhase('verify');
  }

  function finish() {
    repo.update(roleCollection(user.role), user.id, { password: pw.next, mustChangePassword: false });
    setPhase('done');
  }

  const type = show ? 'text' : 'password';

  return (
    <Modal title={phase === 'verify' ? 'Verify it is you' : 'Change password'} onClose={onClose}>
      {phase === 'done' && (
        <>
          <div className="info">Your password was updated. Use it the next time you sign in.</div>
          <div className="form-actions"><button className="primary" onClick={onClose}>Done</button></div>
        </>
      )}

      {phase === 'verify' && (
        <VerifyCode channels={channels} actionLabel="Verify and update" onBack={() => setPhase('form')} onVerified={finish} />
      )}

      {phase === 'form' && (
        <form onSubmit={submit}>
          <label>Current password<input type={type} value={pw.current} onChange={set('current')} autoComplete="current-password" autoFocus /></label>
          <label>New password<input type={type} value={pw.next} onChange={set('next')} autoComplete="new-password" /></label>
          <label>Confirm new password<input type={type} value={pw.confirm} onChange={set('confirm')} autoComplete="new-password" /></label>
          <label className="check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            <span>Show passwords</span>
          </label>
          <p className="hint">Use at least {MIN_PASSWORD_LENGTH} characters. Next, we will send a code to confirm it is you.</p>
          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary">Continue</button>
          </div>
        </form>
      )}
    </Modal>
  );
}