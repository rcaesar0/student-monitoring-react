import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

const EMPTY = {
  firstName: '',
  middleName: '',
  lastName: '',
  requestedTeacherId: '',
  personalEmail: '',
  contactNumber: '',
  subject: '',
  message: '',
};

export default function TeacherRegistration({ go }) {
  const { db, repo } = useApp();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  function submit(event) {
    event.preventDefault();
    setError('');

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const personalEmail = form.personalEmail.trim().toLowerCase();
    const requestedTeacherId = form.requestedTeacherId.trim();

    if (!firstName || !lastName) {
      setError('Enter your first and last name.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(personalEmail)) {
      setError('Enter a valid personal email address.');
      return;
    }

    const requests = db.teacherRegistrationRequests || [];

    const existingRequest = requests.some(
      (request) =>
        ['Pending', 'Approved'].includes(request.status) &&
        String(request.personalEmail || '')
          .trim()
          .toLowerCase() === personalEmail
    );

    if (existingRequest) {
      setError(
        'A registration request for this email already exists.'
      );
      return;
    }

    const existingTeacher = (db.teachers || []).some(
      (teacher) =>
        teacher.status !== 'Archived' &&
        String(teacher.personalEmail || '')
          .trim()
          .toLowerCase() === personalEmail
    );

    if (existingTeacher) {
      setError(
        'A teacher account already uses this personal email.'
      );
      return;
    }

    if (
      requestedTeacherId &&
      (
        (db.teachers || []).some(
          (teacher) =>
            String(teacher.employeeId || '').toLowerCase() ===
            requestedTeacherId.toLowerCase()
        ) ||
        requests.some(
          (request) =>
            String(request.requestedTeacherId || '').toLowerCase() ===
              requestedTeacherId.toLowerCase() &&
            request.status === 'Pending'
        )
      )
    ) {
      setError(
        'That teacher ID is already in use or has a pending request.'
      );
      return;
    }

    setBusy(true);

    try {
      repo.add('teacherRegistrationRequests', {
        firstName,
        middleName: form.middleName.trim(),
        lastName,
        requestedTeacherId,
        personalEmail,
        contactNumber: form.contactNumber.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        status: 'Pending',
        submittedAt: new Date().toISOString(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error('[TEACHER REGISTRATION]', err);
      setError(
        'Could not submit your request. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="teacher-portal">
        <h2>Request submitted</h2>

        <div className="info" role="status">
          Your teacher registration request has been submitted
          for administrator review. If approved, an activation
          code will be sent to {form.personalEmail.trim()}.
        </div>

        <button
          type="button"
          className="primary wide"
          onClick={() => go('login')}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <button
        type="button"
        className="text-btn"
        onClick={() => go('teacher')}
      >
        ← Back to Teacher Portal
      </button>

      <h2>Teacher Registration</h2>

      <p className="muted">
        Submit your details. The administrator must approve your
        request before you can activate your account.
      </p>

      <div className="grid2">
        <label>
          First name *
          <input
            value={form.firstName}
            onChange={update('firstName')}
            autoComplete="given-name"
            required
          />
        </label>

        <label>
          Middle name
          <input
            value={form.middleName}
            onChange={update('middleName')}
            autoComplete="additional-name"
          />
        </label>

        <label>
          Last name *
          <input
            value={form.lastName}
            onChange={update('lastName')}
            autoComplete="family-name"
            required
          />
        </label>

        <label>
          Requested teacher ID
          <input
            value={form.requestedTeacherId}
            onChange={update('requestedTeacherId')}
          />
        </label>

        <label>
          Personal email *
          <input
            type="email"
            value={form.personalEmail}
            onChange={update('personalEmail')}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Contact number
          <input
            type="tel"
            value={form.contactNumber}
            onChange={update('contactNumber')}
            autoComplete="tel"
          />
        </label>

        <label>
          Subject / specialization
          <input
            value={form.subject}
            onChange={update('subject')}
          />
        </label>
      </div>

      <label>
        Additional information
        <textarea
          value={form.message}
          onChange={update('message')}
          rows={3}
          maxLength={1000}
        />
      </label>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="primary wide"
        disabled={busy}
      >
        {busy ? 'Submitting…' : 'Submit Registration Request'}
      </button>
    </form>
  );
}