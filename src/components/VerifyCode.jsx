import React, { useEffect, useState } from 'react';
import { CODE_MINUTES, RESEND_SECONDS, maskPhone, maskEmail } from '../utils/verification';
import { sendCode, checkCode } from '../services/verifyApi';

// "We sent you a code" step used by sign up and change password.
// The server makes, sends and checks the code, so the browser never knows it.
// While no SMS or email service is connected the server runs in demo mode and answers with the code, which is
// then shown on screen (see server/verify.js and the .env file).
// channels: [{ type: 'phone' | 'email', value, label }]. onVerified(channel) runs when the right code is entered.
export default function VerifyCode({ channels, onVerified, onBack, actionLabel = 'Verify' }) {
  const [pick, setPick] = useState(0);
  const [sent, setSent] = useState(null); // { at, via, demo }
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!sent) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sent]);

  const mask = (c) => (c.type === 'email' ? maskEmail(c.value) : maskPhone(c.value));
  const wait = sent ? Math.max(0, RESEND_SECONDS - Math.floor((now - sent.at) / 1000)) : 0;

  const SEND_ERRORS = {
    'too-soon': 'Please wait a moment before asking for another code.',
    'too-many': 'Too many codes were requested. Please try again later.',
    'not-configured': 'Sending codes is not set up yet. Please contact the school office.',
    'send-failed': 'The code could not be sent. Please try again in a moment.',
    invalid: 'That mobile number or email does not look right.',
  };
  const CHECK_ERRORS = {
    wrong: 'That code is not correct.',
    expired: 'This code expired. Send a new one.',
    'too-many-tries': 'Too many wrong tries. Send a new code.',
    none: 'Send a new code first.',
  };

  async function send() {
    const via = channels[pick];
    setBusy(true);
    setError('');
    try {
      const res = await sendCode(via.type, via.value);
      if (res.ok) {
        setSent({ at: Date.now(), via, demo: res.demo ? res.code : null });
        setNow(Date.now());
        setInput('');
      } else {
        setError(SEND_ERRORS[res.error] || 'The code could not be sent. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setBusy(false);
  }

 


async function verify(e) {
  e.preventDefault();
  console.log('[VERIFY] Button clicked');

  if (!sent?.via) {
  console.error('[VERIFY] Missing sent state:', sent);
  setError('Verification state is missing. Please send a new code.');
  return;
  }
  setBusy(true);
  setError('');

  try {
    console.log('[VERIFY] Checking code...');

    const res = await checkCode(
      sent.via.type,
      sent.via.value,
      input.trim()
    );

    console.log('[VERIFY] Server response:', res);

    if (!res.ok) {
      setError(
        CHECK_ERRORS[res.error] ||
        'That code could not be checked. Please try again.'
      );
      return;
    }

    console.log('[VERIFY] Code accepted; calling onVerified');

    await onVerified(sent.via);

    console.log('[VERIFY] onVerified completed');
  } 
   catch (err) {
    console.error('[VERIFY] Actual error:', err);
    console.error('[VERIFY] Error stack:', err?.stack);
    setError(
      err?.message || 'An error occurred after verification.'
    );
  } finally {
    setBusy(false);
  }
}





  if (!channels.length) {
    return (
      <div>
        <div className="error">There is no mobile number or email on this account to send a code to.</div>
        <button type="button" onClick={onBack}>Back</button>
      </div>
    );
  }

  return (
    <div>
      {!sent ? (
        <>
          <p className="muted">For your security, we will send a 6-digit code. Where should we send it?</p>
          <div className="channel-pick">
            {channels.map((c, i) => (
              <label key={c.type} className={`channel-opt ${pick === i ? 'on' : ''}`}>
                <input type="radio" name="channel" checked={pick === i} onChange={() => setPick(i)} />
                <span>{c.label}<small>{mask(c)}</small></span>
              </label>
            ))}
          </div>
          {error && <div className="error">{error}</div>}
          <div className="signup-actions">
            <button type="button" onClick={onBack}>Back</button>
            <button type="button" className="primary" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send code'}</button>
          </div>
        </>
      ) : (
        <form onSubmit={verify}>
          <div className="info">We sent a 6-digit code to {mask(sent.via)}. It is valid for {CODE_MINUTES} minutes.</div>
          {sent.demo && (
            <div className="demo-box">
              <b>Demo mode</b>
              <div>No message was sent because no SMS or email service is connected. Your code is <b>{sent.demo}</b></div>
            </div>
          )}
          <label>
            Enter the code
            <input
              className="code-input" value={input} inputMode="numeric" autoComplete="one-time-code" autoFocus
              onChange={(e) => setInput(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000"
            />
          </label>
          {error && <div className="error">{error}</div>}
          <div className="signup-actions">
            <button type="button" onClick={onBack}>Back</button>
            <button type="submit" className="primary" disabled={busy || input.length !== 6}>{busy ? 'Checking…' : actionLabel}</button>
          </div>
          <button type="button" className="text-btn" disabled={wait > 0 || busy} onClick={send}>
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </button>
        </form>
      )}
    </div>
  );
}