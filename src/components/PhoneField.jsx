import React from 'react';
import { typedPhone, PH_PREFIX } from '../utils/phone';

// Mobile number box with a fixed +63 in front. The +63 already stands for the 0 of 09, so the number starts at 9.
// The person can type anything. A clean run of digits is grouped while typing (917 1234 567).
// Whether the number is valid is checked when the form is submitted, not here, so nothing moves around on screen.
// invalid outlines the box in red after a failed Save or Continue. The placeholder is the same text as the label.
export default function PhoneField({ label = 'Mobile number', value, onChange, optional = false, invalid = false }) {
  const text = `${label}${optional ? ' (optional)' : ''}`;

  return (
    <label>
      <span>{text}</span>
      <span className="phone-field">
        <span className="phone-prefix">{PH_PREFIX}</span>
        <input
          value={value}
          onChange={(e) => onChange(typedPhone(e.target.value))}
          maxLength={20}
          placeholder={text}
          autoComplete="tel-national"
          aria-invalid={invalid}
          className={invalid ? 'invalid' : ''}
        />
      </span>
    </label>
  );
}