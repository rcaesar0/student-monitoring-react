import React, { useState } from 'react';

// Password box with an eye button on the right to show or hide what was typed.
// The placeholder is the same text as the label.
export default function PasswordField({ label, value, onChange, autoComplete, autoFocus = false }) {
  const [show, setShow] = useState(false);
  return (
    <label>
      {label}
      <span className="password-field">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={label}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        <button
          type="button" className="eye-btn" onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {show && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </span>
    </label>
  );
}