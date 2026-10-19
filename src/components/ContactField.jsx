import React from 'react';
import { toPhone, formatPhone, PH_PREFIX } from '../utils/phone';

// One box for "Mobile number or email".
// The person can type anything. Nothing is blocked or flagged while typing, so the box never shifts.
// The check happens when they tap Continue (see Signup). When they leave the box, a valid
// mobile number is tidied to +63 917 1234 567. The placeholder is the same text as the label.
export default function ContactField({ label = 'Mobile number or email', value, onChange, invalid = false }) {
  function tidy() {
    const v = value.trim();
    if (!v || v.includes('@')) return;
    const phone = toPhone(v);
    if (phone) onChange(`${PH_PREFIX} ${formatPhone(phone.slice(3))}`);
  }

  return (
    <label>
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={tidy}
        placeholder={label}
        autoComplete="username"
        aria-invalid={invalid}
        className={invalid ? 'invalid' : ''}
      />
    </label>
  );
}