import React from 'react';
import { cleanPhoneInput, formatPhone, PH_PREFIX } from '../utils/phone';

// One box for "Mobile number or email". The person can type anything.
// Digits are shown as +63 917 1234 567 while typing; letters or an @ are left alone as an email.
// Whether it is valid is checked when the person presses Continue, so no message appears while typing.
export default function ContactField({ label = 'Mobile number or email', value, onChange }) {
  const prefix = `${PH_PREFIX} `;

  function change(e) {
    let v = e.target.value;
    if (/[A-Za-z@]/.test(v)) {
      // An email that began with a digit was shown as "+63 9…". Take the display prefix and spaces back off.
      if (value.startsWith(prefix)) v = v.slice(prefix.length).replace(/\s/g, '');
      return onChange(v);
    }
    const d = cleanPhoneInput(v.startsWith(PH_PREFIX) ? v.slice(PH_PREFIX.length) : v);
    if (!d) return onChange(/\d/.test(v) ? v : '');
    return onChange(d[0] === '9' ? `${prefix}${formatPhone(d)}` : v);
  }

  return (
    <label>
      {label}
      <input value={value} onChange={change} placeholder={label} autoComplete="username" />
    </label>
  );
}