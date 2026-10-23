export const SHOW_DEMO_CODE = true;
export const CODE_MINUTES = 5;
export const RESEND_SECONDS = 30;
export const MAX_CODE_TRIES = 5;

export const makeVerificationCode = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

export const maskPhone = (p) => (p && p.startsWith('+63') ? `+63 ${p[3]}** *** **${p.slice(-2)}` : p || '');
export const maskEmail = (e) => {
  const [user = '', domain = ''] = String(e || '').split('@');
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
};