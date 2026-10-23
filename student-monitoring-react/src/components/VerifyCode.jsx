import React, { useEffect, useState } from 'react';
import {
  SHOW_DEMO_CODE, CODE_MINUTES, RESEND_SECONDS, MAX_CODE_TRIES,
  makeVerificationCode, maskPhone, maskEmail,
} from '../utils/verification';

export default function VerifyCode({ channels, onVerified, onBack, actionLabel = 'Verify' }) {
  const [pick, setPick] = useState(0);
  const [sent, setSent] = useState(null); // { code, at, via }
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [tries, setTries] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!sent) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sent]);

  const mask = (c) => (c.type === 'email' ? maskEmail(c.value) : maskPhone(c.value));
  const wait = sent ? Math.max(0, RESEND_SECONDS - Math.floor((now - sent.at) / 1000)) : 0;

  function send() {
    setSent({ code: makeVerificationCode(), at: Date.now(), via: channels[pick] });
    setNow(Date.now());
    setInput('');
    setError('');
    setTries(0);
  }

  function verify(e) {
    e.preventDefault();
    if (Date.now() - sent.at > CODE_MINUTES * 60000) return setError('This code expired. Send a new one.');
    if (tries >= MAX_CODE_TRIES) return setError('Too many wrong tries. Send a new code.');
    if (input !== sent.code) {
      setTries(tries + 1);
      return setError('That code is not correct.');
    }
    onVerified(sent.via);
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
          <div className="signup-actions">
            <button type="button" onClick={onBack}>Back</button>
            <button type="button" className="primary" onClick={send}>Send code</button>
          </div>
        </>
      ) : (
        <form onSubmit={verify}>
          <div className="info">We sent a 6-digit code to {mask(sent.via)}. It is valid for {CODE_MINUTES} minutes.</div>
          {SHOW_DEMO_CODE && (
            <div className="demo-box">
              <b>Demo mode</b>
              <div>No message is sent yet. Your code is <b>{sent.code}</b></div>
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
            <button type="submit" className="primary" disabled={input.length !== 6}>{actionLabel}</button>
          </div>
          <button type="button" className="text-btn" disabled={wait > 0} onClick={send}>
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </button>
        </form>
      )}
    </div>
  );
}