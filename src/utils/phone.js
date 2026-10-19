// Philippine mobile numbers are stored as +639XXXXXXXXX.
export const PH_PREFIX = '+63';

// Up to 10 digits after the +63. A leading 63 or 0 is dropped (09171234567 and +639171234567 both become 9171234567).
export function cleanPhoneInput(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('63') && d.length > 10) d = d.slice(2);
  d = d.replace(/^0+/, '');
  return d.slice(0, 10);
}

// Older strict reader, kept for any screen that still blocks wrong input while typing.
export function readPhoneInput(raw) {
  const s = String(raw || '');
  let d = s.replace(/\D/g, '');
  let error = '';
  if (/[^\d\s+()-]/.test(s)) error = 'Mobile numbers can only have numbers. Letters and symbols are not allowed.';
  if (d.startsWith('63') && d.length >= 12) d = d.slice(2);
  else if (d.startsWith('0') && d.length >= 11) d = d.slice(1);
  if (d && d[0] !== '9') return { digits: '', error: 'Start with 9, for example 917 1234 567. The +63 already replaces the 0.' };
  if (d.length > 10) { d = d.slice(0, 10); error = error || 'A mobile number has 10 digits after +63.'; }
  return { digits: d, error };
}

// 9171234567 -> 917 1234 567
export const formatPhone = (d) => [d.slice(0, 3), d.slice(3, 7), d.slice(7, 10)].filter(Boolean).join(' ');

// Strict check. Returns '+639XXXXXXXXX' only for a real Philippine mobile number:
// exactly 10 digits starting with 9 (optionally written with 0, 63 or +63 in front). Letters and symbols are rejected.
export function toPhone(input) {
  const s = String(input || '').trim();
  if (!s || /[^\d\s+()-]/.test(s)) return '';
  const m = s.replace(/\D/g, '').match(/^(?:63|0)?(9\d{9})$/);
  return m ? `+63${m[1]}` : '';
}

export const looksLikePhone = (s) => /^[+\d][\d\s-]*$/.test(String(s || '').trim());

// +639171234567 -> +63 917 1234 567
export const showPhone = (p) => (p && p.startsWith('+63') ? `+63 ${formatPhone(p.slice(3))}` : p || '');

// Stored number -> what appears in the box when editing (917 1234 567).
export const phoneToInput = (p) => {
  if (!p) return '';
  return formatPhone(p.startsWith('+63') ? p.slice(3) : cleanPhoneInput(p));
};