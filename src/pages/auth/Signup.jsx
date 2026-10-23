import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import PhoneField from '../../components/PhoneField';
import ContactField from '../../components/ContactField';
import VerifyCode from '../../components/VerifyCode';
import TermsModal, { TERMS_VERSION } from '../../components/TermsModal';
import { emailTaken, phoneTaken } from '../../services/auth';
import { boxToPhone, parsePhone } from '../../utils/phone';
import { MIN_PASSWORD_LENGTH } from '../../config';

const STEPS = ['About you', 'Contact & address', 'Password', 'Verify'];
const RELATIONS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Sibling', 'Legal guardian', 'Other'];
const EMPTY = {
  firstName: '', middleName: '', lastName: '', relationship: '', relationshipOther: '', occupation: '',
  contact: '', street: '', barangay: '', city: '', province: '',
  emName: '', emPhone: '', password: '', confirm: '',
};

const BAD_CONTACT = 'Please enter a valid mobile number or email address.';

// One box for the sign-in contact: anything with an @ is an email, anything else is a mobile number.
// phone is '' when the text is not a valid mobile number (wrong first digit, letters, too short...).
const parseContact = (raw) => {
  const v = String(raw || '').trim();
  if (v.includes('@')) return { email: v, phone: '' };
  return { email: '', phone: parsePhone(v) };
};

// Only guardians can sign up. Teacher accounts are created by the admin.
// Four short steps. The last one confirms a code sent to the mobile number or email.
export default function Signup({ go }) {
  const { db, repo } = useApp();
  const [f, setF] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Returns a message when the step is not ready, or '' when it is fine.
  function problem(s) {
    if (s === 0) {
      if (!f.firstName.trim() || !f.lastName.trim()) return 'Please enter your first and last name.';
      if (!f.relationship) return 'Please choose how you are related to the child.';
      if (f.relationship === 'Other' && !f.relationshipOther.trim()) return 'Please specify how you are related to the child.';
    }
    if (s === 1) {
      const { phone, email } = parseContact(f.contact);
      if (!email && !phone) return BAD_CONTACT;
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return BAD_CONTACT;
      if (phone && phoneTaken(db, phone)) return 'That mobile number is already registered.';
      if (email && emailTaken(db, email)) return 'That email is already registered.';
      if (!f.street.trim() || !f.barangay.trim() || !f.city.trim() || !f.province.trim()) return 'Please complete your address.';
      if (f.emPhone && !boxToPhone(f.emPhone)) return BAD_CONTACT;
    }
    if (s === 2) {
      if (f.password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      if (f.password !== f.confirm) return 'Passwords do not match.';
      if (!agree) return 'Please read and accept the Terms and Agreement to continue.';
    }
    return '';
  }

  function next(e) {
    e.preventDefault();
    const msg = problem(step);
    if (msg) return setError(msg);
    setError('');
    setStep(step + 1);
  }

  function createAccount(via) {
    const bad = [0, 1, 2].map(problem).find(Boolean);
    if (bad) { setStep(0); return setError(bad); }
    const { phone, email } = parseContact(f.contact);
    repo.add('guardians', {
      firstName: f.firstName.trim(), middleName: f.middleName.trim(), lastName: f.lastName.trim(),
      relationship: f.relationship, relationshipOther: f.relationship === 'Other' ? f.relationshipOther.trim() : '',
      occupation: f.occupation.trim(),
      phone, email,
      street: f.street.trim(), barangay: f.barangay.trim(), city: f.city.trim(), province: f.province.trim(),
      emName: f.emName.trim(), emPhone: boxToPhone(f.emPhone),
      verifiedVia: via.type,
      termsAcceptedAt: new Date().toISOString(), termsVersion: TERMS_VERSION,
      password: f.password, mustChangePassword: false,
      status: 'Active', failedLinks: 0, lockedUntil: 0,
    });
    go('login');
  }

  const back = () => { setError(''); setStep(step - 1); };

  const contact = parseContact(f.contact);
  const channels = [
    contact.phone && { type: 'phone', value: contact.phone, label: 'Mobile number' },
    contact.email && { type: 'email', value: contact.email, label: 'Email' },
  ].filter(Boolean);

  const header = (
    <>
      <h2>Create your guardian account</h2>
      <p className="muted">After signing up, you will link your child using the room code from their teacher.</p>
      <ol className="stepper" aria-label="Sign up steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>
            <span>{i + 1}</span><b>{s}</b>
          </li>
        ))}
      </ol>
    </>
  );

  if (step === 3) {
    return (
      <div>
        {header}
        <VerifyCode channels={channels} actionLabel="Verify and create account" onBack={back} onVerified={createAccount} />
        {error && <div className="error">{error}</div>}
        <button type="button" className="text-btn" onClick={() => go('login')}>Back to sign in</button>
      </div>
    );
  }

  return (
    <form onSubmit={next}>
      {header}

      {step === 0 && (
        <>
          <div className="grid2">
            <label>First name<input value={f.firstName} onChange={set('firstName')} autoComplete="given-name" /></label>
            <label>Last name<input value={f.lastName} onChange={set('lastName')} autoComplete="family-name" /></label>
          </div>
          <label>Middle name (optional)<input value={f.middleName} onChange={set('middleName')} /></label>
          <div className="grid2">
            <label>
              Relationship to the child
              <select value={f.relationship} onChange={set('relationship')}>
                <option value="">Choose one</option>
                {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label>Occupation (optional)<input value={f.occupation} onChange={set('occupation')} /></label>
          </div>
          {f.relationship === 'Other' && (
            <label>Please specify<input value={f.relationshipOther} onChange={set('relationshipOther')} placeholder="Please specify" autoFocus /></label>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <h4 className="form-section">Contact</h4>
          <ContactField value={f.contact} onChange={(contact) => setF({ ...f, contact })} />
          <p className="hint">You can sign in with it, and we send your verification code there. You can add the other one later in your profile.</p>

          <h4 className="form-section">Home address</h4>
          <label>House no., street<input value={f.street} onChange={set('street')} autoComplete="address-line1" /></label>
          <div className="grid2">
            <label>Barangay<input value={f.barangay} onChange={set('barangay')} /></label>
            <label>City or municipality<input value={f.city} onChange={set('city')} autoComplete="address-level2" /></label>
          </div>
          <label>Province<input value={f.province} onChange={set('province')} autoComplete="address-level1" /></label>

          <h4 className="form-section">Emergency contact (optional)</h4>
          <div className="grid2">
            <label>Name<input value={f.emName} onChange={set('emName')} /></label>
            <PhoneField label="Mobile number" value={f.emPhone} onChange={(emPhone) => setF({ ...f, emPhone })} />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="grid2">
            <label>Password<input type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete="new-password" /></label>
            <label>Confirm password<input type={show ? 'text' : 'password'} value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></label>
          </div>
          <label className="check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            <span>Show passwords</span>
          </label>
          <p className="hint">Use at least {MIN_PASSWORD_LENGTH} characters. Next, we will send a code to confirm your mobile number or email.</p>

          <label className="check terms-check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              I have read and agree to the{' '}
              <button type="button" className="text-btn inline" onClick={() => setTerms(true)}>Terms and Agreement</button>
            </span>
          </label>
          {terms && <TermsModal onClose={() => setTerms(false)} onAgree={() => { setAgree(true); setTerms(false); }} />}
        </>
      )}

      {error && <div className="error">{error}</div>}

      <div className="signup-actions">
        {step > 0 && <button type="button" onClick={back}>Back</button>}
        <button type="submit" className="primary">{step === 2 ? 'Continue to verify' : 'Continue'}</button>
      </div>
      <button type="button" className="text-btn" onClick={() => go('login')}>Back to sign in</button>
    </form>
  );
}