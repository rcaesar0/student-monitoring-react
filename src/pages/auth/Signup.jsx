import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import VerifyCode from '../../components/VerifyCode';
import TermsModal, { TERMS_VERSION } from '../../components/TermsModal';
import { emailTaken, phoneTaken } from '../../services/auth';
import { boxToPhone, parsePhone } from '../../utils/phone';
import { MIN_PASSWORD_LENGTH } from '../../config';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestore, firebaseConfigured } from '../../services/firebase';

const STEPS = ['About you', 'Contact & address', 'Password', 'Verify'];
const RELATIONS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Sibling', 'Legal guardian', 'Other'];
const EMPTY = {
  firstName: '',
  middleName: '',
  lastName: '',
  relationship: '',
  relationshipOther: '',
  occupation: '',
  contact: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  emName: '',
  emPhone: '',
  password: '',
  confirm: '',
};

const BAD_CONTACT = 'Please enter a valid mobile number or email address.';

const parseContact = (raw) => {
  const v = String(raw || '').trim();
  if (v.includes('@')) return { email: v, phone: '' };
  return { email: '', phone: parsePhone(v) };
};

export default function Signup({ go }) {
  const { db, repo } = useApp();
  const [f, setF] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function problem(s) {
    if (s === 0) {
      if (!f.firstName.trim() || !f.lastName.trim()) return 'Please enter your first and last name.';
      if (!f.relationship) return 'Please choose how you are related to the child.';
      if (f.relationship === 'Other' && !f.relationshipOther.trim()) return 'Please specify how you are related to the child.';
    }

    if (s === 1) {
      const raw = f.contact.trim();
      if (!raw) return BAD_CONTACT;
      if (raw.includes('@')) {
        const email = raw.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return BAD_CONTACT;
        if (emailTaken(db, email)) return 'That email is already registered.';
      } else {
        const phone = parsePhone(raw);
        if (!phone) return BAD_CONTACT;
        if (phoneTaken(db, phone)) return 'That mobile number is already registered.';
      }
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

  function back() {
    setError('');
    setStep(step - 1);
  }

  async function createAccount(via) {
    console.log('createAccount called:', via);

    const bad = [0, 1, 2].map(problem).find(Boolean);
    if (bad) {
      console.log('Signup validation failed:', bad);
      setStep(0);
      return setError(bad);
    }

    console.log('[SIGNUP] Validation passed');
    setBusy(true);
    setError('');

    const parsed = parseContact(f.contact);
    const phone = parsed.phone;
    const email = parsed.email.toLowerCase();

    const profile = {
      firstName: f.firstName.trim(),
      middleName: f.middleName.trim(),
      lastName: f.lastName.trim(),
      relationship: f.relationship,
      relationshipOther: f.relationship === 'Other' ? f.relationshipOther.trim() : '',
      occupation: f.occupation.trim(),
      phone,
      email,
      street: f.street.trim(),
      barangay: f.barangay.trim(),
      city: f.city.trim(),
      province: f.province.trim(),
      emName: f.emName.trim(),
      emPhone: boxToPhone(f.emPhone),
      verifiedVia: via.type,
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: TERMS_VERSION,
      mustChangePassword: false,
      status: 'Active',
      failedLinks: 0,
      lockedUntil: 0,
    };

    try {
      if (email && firebaseConfigured && firebaseAuth && firestore) {
        // Email path → Firebase Auth + Firestore + local dual-write
        console.log('[SIGNUP] Creating Firebase user...');
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, f.password);
        const uid = cred.user.uid;
        console.log('[SIGNUP] Firebase user created:', uid);

        // Save profile to Firestore
        await setDoc(doc(firestore, 'guardians', uid), {
          ...profile,
          firebaseUid: uid,
          createdAt: new Date().toISOString(),
        });
        console.log('[SIGNUP] Profile saved to Firestore');

        // Also save to local database (without password)
        repo.add('guardians', {
          ...profile,
          firebaseUid: uid,
        });

        // Sign out so the user must log in normally
        await signOut(firebaseAuth);
      } else {
        // Phone path or Firebase not configured → old local behaviour
        console.log('[SIGNUP] Using local-only path');
        repo.add('guardians', {
          ...profile,
          password: f.password,
        });
      }

      try {
        sessionStorage.setItem('signup-success', email || phone);
      } catch { /* ignore */ }

      go('login');
    } catch (err) {
      console.error('[SIGNUP] createAccount failed:', err);
      let msg = 'Could not create the account. Please try again.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'That email is already registered.';
      } else if (err?.code === 'auth/weak-password') {
        msg = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      } else if (err?.code === 'auth/invalid-email') {
        msg = BAD_CONTACT;
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const parsed = parseContact(f.contact);

  const channels = parsed.phone
    ? [{ type: 'phone', value: parsed.phone, label: 'SMS to mobile number' }]
    : parsed.email
      ? [{ type: 'email', value: parsed.email.toLowerCase(), label: 'Email' }]
      : [];

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
        <VerifyCode
          channels={channels}
          actionLabel={busy ? 'Creating account…' : 'Verify and create account'}
          onBack={back}
          onVerified={createAccount}
        />
        {error && <div className="error">{error}</div>}
        <button type="button" className="text-btn" onClick={() => go('login')}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={next}>
      {header}

      {step === 0 && (
        <>
          <div className="grid2">
            <label>
              First name
              <input value={f.firstName} onChange={set('firstName')} autoComplete="given-name" />
            </label>
            <label>
              Last name
              <input value={f.lastName} onChange={set('lastName')} autoComplete="family-name" />
            </label>
          </div>
          <label>
            Middle name (optional)
            <input value={f.middleName} onChange={set('middleName')} />
          </label>
          <div className="grid2">
            <label>
              Relationship to the child
              <select value={f.relationship} onChange={set('relationship')}>
                <option value="">Choose one</option>
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Occupation (optional)
              <input value={f.occupation} onChange={set('occupation')} />
            </label>
          </div>
          {f.relationship === 'Other' && (
            <label>
              Please specify
              <input
                value={f.relationshipOther}
                onChange={set('relationshipOther')}
                placeholder="Please specify"
                autoFocus
              />
            </label>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <h4 className="form-section">Contact</h4>
          <label>
            Mobile number or email address
            <input
              type="text"
              value={f.contact}
              onChange={set('contact')}
              autoComplete="username"
              placeholder="09XXXXXXXXX or you@example.com"
            />
          </label>
          <p className="hint">
            Please enter a valid personal Contact to receive a verification code. This will be used
            to sign in to your account.
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <div className="grid2">
            <label>
              Password
              <input
                type={show ? 'text' : 'password'}
                value={f.password}
                onChange={set('password')}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm password
              <input
                type={show ? 'text' : 'password'}
                value={f.confirm}
                onChange={set('confirm')}
                autoComplete="new-password"
              />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            <span>Show passwords</span>
          </label>
          <p className="hint">
            Use at least {MIN_PASSWORD_LENGTH} characters. Next, we will send a code to confirm your
            mobile number or email.
          </p>

          <label className="check terms-check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              I have read and agree to the{' '}
              <button type="button" className="text-btn inline" onClick={() => setTerms(true)}>
                Terms and Agreement
              </button>
            </span>
          </label>
          {terms && (
            <TermsModal
              onClose={() => setTerms(false)}
              onAgree={() => {
                setAgree(true);
                setTerms(false);
              }}
            />
          )}
        </>
      )}

      {error && <div className="error">{error}</div>}

      <div className="signup-actions">
        {step > 0 && (
          <button type="button" onClick={back}>
            Back
          </button>
        )}
        <button type="submit" className="primary">
          {step === 2 ? 'Continue to verify' : 'Continue'}
        </button>
      </div>
      <button type="button" className="text-btn" onClick={() => go('login')}>
        Back to sign in
      </button>
    </form>
  );
}