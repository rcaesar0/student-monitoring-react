import React, { useEffect, useState } from 'react';
import { Panel } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { dateStr } from '../../utils/helpers';
import { linkPage } from '../../utils/goHome';
import { MAX_LINK_ATTEMPTS, LOCK_MINUTES, MAX_GUARDIANS_PER_CHILD, MAX_LINK_REQUESTS } from '../../config';

// The parent gets a slip at the school office with the child's LRN and a link code.
// Entering both sends a request. The school office approves it before the child appears on the home page.
// Without the slip, the parent can send the request with the child's LRN and birthdate instead.
// When the office approves it, the guardian is taken to the home page automatically (see utils/goHome.js).
// NOTE: in this local version the checks run in the browser. With a backend, move them to the server.
export default function LinkChildTab() {
  const { db, repo, user } = useApp();
  const [lrn, setLrn] = useState('');
  const [code, setCode] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [noCode, setNoCode] = useState(false);
  const [msg, setMsg] = useState(null);
  const [lrnError, setLrnError] = useState('');

  // Lets the app know this page is open, so an approval can send the guardian home.
  useEffect(() => {
    linkPage.open = true;
    return () => { linkPage.open = false; };
  }, []);

  const mismatch = 'The details do not match our records. Please check them and try again.';
  const waiting = db.guardianLinks.filter((l) => l.guardianId === user.id && l.status === 'Pending').length;

  // Digits only. Typing or pasting anything else is removed and the message explains why.
  function changeLrn(e) {
    const raw = e.target.value;
    setLrnError(/\D/.test(raw) ? 'LRN should only be a number. Letters and symbols are not allowed.' : '');
    setLrn(raw.replace(/\D/g, '').slice(0, 12));
  }

  // The slip shows ABCD-2345. Dashes and spaces are ignored.
  const changeCode = (e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));

  function submit(e) {
    e.preventDefault();
    if (!/^\d{12}$/.test(lrn)) {
      setLrnError('LRN must be exactly 12 digits, numbers only.');
      return setMsg(null);
    }
    if (noCode ? !birthdate : code.length !== 8) {
      return setMsg({ type: 'error', text: noCode ? 'Enter your child’s birthdate.' : 'The link code has 8 letters and numbers.' });
    }
    const now = Date.now();
    if ((user.lockedUntil || 0) > now) {
      const mins = Math.ceil((user.lockedUntil - now) / 60000);
      return setMsg({ type: 'error', text: `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` });
    }

    const student = db.students.find((s) => s.lrn === lrn && s.status === 'Active');
    const ok = student && (noCode ? student.birthdate === birthdate : student.linkCode && student.linkCode === code);
    if (!ok) {
      const fails = (user.failedLinks || 0) + 1;
      repo.update('guardians', user.id, fails >= MAX_LINK_ATTEMPTS ? { failedLinks: 0, lockedUntil: now + LOCK_MINUTES * 60000 } : { failedLinks: fails });
      return setMsg({ type: 'error', text: mismatch });
    }

    const id = `${user.id}_${student.id}`;
    const existing = db.guardianLinks.find((l) => l.id === id);
    if (existing?.status === 'Approved') return setMsg({ type: 'info', text: 'This child is already linked to your account.' });
    if (existing?.status === 'Pending') return setMsg({ type: 'info', text: 'Your request is already waiting for approval.' });
    if (existing?.status === 'Revoked') return setMsg({ type: 'error', text: 'This link was removed by the school. Please contact the school office.' });
    const tries = existing?.requests || 1;
    if (existing?.status === 'Declined' && tries >= MAX_LINK_REQUESTS) {
      return setMsg({ type: 'error', text: `This request was declined ${tries} times. Please visit the school office.` });
    }
    const approved = db.guardianLinks.filter((l) => l.studentId === student.id && l.status === 'Approved').length;
    if (approved >= MAX_GUARDIANS_PER_CHILD) return setMsg({ type: 'error', text: 'This student already has the maximum number of linked guardians. Please contact the school.' });

    // Always a request. The school office approves it first.
    repo.set('guardianLinks', id, {
      guardianId: user.id, studentId: student.id, roomId: null,
      status: 'Pending', viaAdmin: true, withCode: !noCode,
      createdAt: dateStr(), requests: existing ? tries + 1 : 1, dismissed: false,
    });
    repo.update('guardians', user.id, { failedLinks: 0 });
    setLrn(''); setCode(''); setBirthdate(''); setLrnError('');
    setMsg({ type: 'info', text: 'Request sent to the school office. Stay on this page and you will be taken to your home page as soon as it is approved.' });
  }

  return (
    <Panel title="Link your child">
      <p className="muted">
        {noCode
          ? 'No slip? Enter your child’s LRN and birthdate. The school office will review your request.'
          : 'Enter your child’s LRN and the link code from the slip the school office gave you. The school office approves every request before your child appears. You can repeat this for each child.'}
      </p>
      {waiting > 0 && !msg && (
        <div className="info">{waiting} request{waiting > 1 ? 's are' : ' is'} waiting for the school office. You will be taken to your home page once approved.</div>
      )}
      <form onSubmit={submit}>
        <label>
          Child’s LRN (12 digits)
          <input value={lrn} onChange={changeLrn} inputMode="numeric" pattern="[0-9]*" maxLength={12} aria-invalid={!!lrnError} className={lrnError ? 'invalid' : ''} />
          {lrnError && <span className="field-error" role="alert">{lrnError}</span>}
        </label>
        {noCode ? (
          <label>Child’s birthdate<input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} /></label>
        ) : (
          <label>Link code<input className="code-input" value={code} onChange={changeCode} placeholder="ABCD2345" autoCapitalize="characters" autoComplete="off" /></label>
        )}
        {msg && <div className={msg.type}>{msg.text}</div>}
        <button type="submit" className="primary wide">Link</button>
      </form>
      <button type="button" className="text-btn" onClick={() => { setNoCode(!noCode); setMsg(null); }}>
        {noCode ? 'I have a link code' : 'I don’t have a code'}
      </button>
    </Panel>
  );
}