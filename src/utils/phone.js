// Philippine mobile numbers are stored as +639XXXXXXXXX.
export const PH_PREFIX = '+63';

// What goes in the box after the fixed +63: at most 10 digits, the first one is 9 (917 1234 567).
// The +63 already stands for the 0 of 09, so a pasted 09171234567, 639171234567 or +639171234567 is trimmed to 9171234567.
export function cleanPhoneInput(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('63') && d.length > 10) d = d.slice(2);
  d = d.replace(/^0+/, '');
  return d.slice(0, 10);
}

// Strict reader, kept for screens that want a live message while typing.
// Returns the digits to keep and, when something was refused, the message to show.
export function readPhoneInput(raw) {
  const str = String(raw || '');
  let d = str.replace(/\D/g, '');
  let error = '';
  if (/[^\d\s+()-]/.test(str)) error = 'Mobile numbers can only have numbers. Letters and symbols are not allowed.';
  if (d.startsWith('63') && d.length >= 12) d = d.slice(2);
  else if (d.startsWith('0') && d.length >= 11) d = d.slice(1);
  if (d && d[0] !== '9') return { digits: '', error: 'Start with 9, for example 917 1234 567. The +63 already replaces the 0.' };
  if (d.length > 10) { d = d.slice(0, 10); error = error || 'A mobile number has 10 digits after +63.'; }
  return { digits: d, error };
}

// While typing, anything is allowed. Only a clean run of digits is grouped as 917 1234 567.
// A pasted 09171234567, 639171234567 or +639171234567 is trimmed to 9171234567 (the +63 already stands for the 0).
// Letters and symbols are left as typed and are checked when the person presses Continue or Save.
export function typedPhone(raw) {
  const s = String(raw || '');
  if (!/^[\d\s+]*$/.test(s)) return s;
  let d = s.replace(/\D/g, '');
  if (d.startsWith('63') && d.length >= 12) d = d.slice(2);
  else if (d.startsWith('0') && d.length >= 11) d = d.slice(1);
  return d[0] === '9' ? formatPhone(d.slice(0, 10)) : d.slice(0, 12);
}

// A box that already shows +63. Valid only when it holds exactly 10 digits and the first one is 9.
// Returns '+639XXXXXXXXX' or '' when it is not valid.
export function boxToPhone(value) {
  const d = String(value || '').replace(/\s/g, '');
  return /^9\d{9}$/.test(d) ? `+63${d}` : '';
}

// A box where the person may type a whole number (+63 917 1234 567, 0917 1234 567 or 917 1234 567).
// Letters or symbols make it invalid.
export function parsePhone(input) {
  const s = String(input || '').trim();
  return /^\+?[\d\s]+$/.test(s) ? toPhone(s) : '';
}

// 9171234567 -> 917 1234 567
export const formatPhone = (d) => [d.slice(0, 3), d.slice(3, 7), d.slice(7, 10)].filter(Boolean).join(' ');

// Returns '+639XXXXXXXXX', or '' when the number is not a valid Philippine mobile number.
export function toPhone(input) {
  const d = cleanPhoneInput(input);
  return /^9\d{9}$/.test(d) ? `+63${d}` : '';
}

export const looksLikePhone = (s) => /^[+\d][\d\s-]*$/.test(String(s || '').trim());

// +639171234567 -> +63 917 1234 567
export const showPhone = (p) => (p && p.startsWith('+63') ? `+63 ${formatPhone(p.slice(3))}` : p || '');

// Stored number -> what appears in the box when editing (917 1234 567).
export const phoneToInput = (p) => {
  if (!p) return '';
  return p.startsWith('+63') ? formatPhone(p.slice(3)) : typedPhone(p);
};