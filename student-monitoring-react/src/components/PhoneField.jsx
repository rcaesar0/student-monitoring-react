import React from 'react';
import { cleanPhoneInput, toPhone, formatPhone, PH_PREFIX } from '../utils/phone';

// Mobile number box with a fixed +63 in front. The +63 already stands for the 0 of 09, so the number starts with 9.
// While typing: letters are dropped, a leading 0 or 63 is dropped, at most 10 digits are kept,
// and the digits are grouped as 917 1234 567. Nothing is flagged while typing, so the layout never shifts.
// The parent checks the number when the form is submitted (it must start with 9) and sets `invalid` to outline the box in red.
// The placeholder is the same text as the label.
export default function PhoneField({ label = 'Mobile number', value, onChange, optional = false, invalid = false }) {
  const text = `${label}${optional ? ' (optional)' : ''}`;

  // Keep the stored value in the same grouped form, even if it was saved without spaces.
  const shown = formatPhone(cleanPhoneInput(toPhone(value) ? toPhone(value).slice(3) : value));

  return (
    <label>
      <span>{text}</span>
      <span className="phone-field">
        <span className="phone-prefix">{PH_PREFIX}</span>
        <input
          value={shown}
          onChange={(e) => onChange(formatPhone(cleanPhoneInput(e.target.value)))}
          inputMode="numeric"
          placeholder={text}
          autoComplete="tel-national"
          aria-invalid={invalid}
          className={invalid ? 'invalid' : ''}
        />
      </span>
    </label>
  );
}