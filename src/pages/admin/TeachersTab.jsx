import React, { useState } from 'react';
import {
  Panel,
  Empty,
  Modal,
  Badge,
  Avatar,
} from '../../components/UI';
import CredentialsModal from '../../components/CredentialsModal';
import { useApp } from '../../context/AppContext';
import {
  fullName,
  initials,
  institutionalEmail,
  makeTempPassword,
} from '../../utils/helpers';

function makeActivationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint32Array(8);

  crypto.getRandomValues(values);

  return Array.from(
    values,
    (value) => chars[value % chars.length]
  ).join('');
}

export default function TeachersTab() {
  const { db, repo } = useApp();

  const [adding, setAdding] = useState(false);
  const [creds, setCreds] = useState(null);
  const [notice, setNotice] = useState('');
  const [approvingId, setApprovingId] = useState('');

  const teachers = (db.teachers || []).filter(
    (teacher) => teacher.status === 'Active'
  );

  const requests = (
    db.teacherRegistrationRequests || []
  ).filter((request) => request.status === 'Pending');

  const sectionsOf = (id) =>
    (db.rooms || []).filter(
      (room) =>
        room.teacherId === id &&
        room.status === 'Active'
    );

  function create(form) {
    const email = institutionalEmail(
      db,
      form.firstName,
      form.lastName
    );

    const password = makeTempPassword();

    repo.add('teachers', {
      firstName: form.firstName.trim(),
      middleName: '',
      lastName: form.lastName.trim(),
      employeeId: form.employeeId.trim(),
      personalEmail: form.personalEmail.trim(),
      subject: form.subject.trim(),
      email,
      password,
      mustChangePassword: true,
      status: 'Active',
    });

    setAdding(false);

    setCreds({
      title: 'Teacher account created',
      lines: [
        ['Name', `${form.firstName} ${form.lastName}`],
        ['School account', email],
        ['Temporary password', password],
      ],
      note: `Send these credentials to ${form.personalEmail}. The teacher must choose a new password at first sign-in. This is the only time the password is shown.`,
    });
  }

  async function approve(request) {
    if (approvingId) return;

    setNotice('');

    const personalEmail = String(
      request.personalEmail || ''
    )
      .trim()
      .toLowerCase();

    const duplicate = (db.teachers || []).some(
      (teacher) =>
        (teacher.personalEmail || '')
          .trim()
          .toLowerCase() === personalEmail &&
        teacher.status !== 'Archived'
    );

    if (duplicate) {
      setNotice(
        `Cannot approve ${request.firstName} ${request.lastName}: a teacher account already uses ${personalEmail}.`
      );
      return;
    }

    if (
      !personalEmail ||
      !/^\S+@\S+\.\S+$/.test(personalEmail)
    ) {
      setNotice(
        'This registration has an invalid personal email address.'
      );
      return;
    }

    const loginEmail = institutionalEmail(
      db,
      request.firstName || '',
      request.lastName || ''
    );

    const code = makeActivationCode();

    const expiresAt = new Date(
      Date.now() + 48 * 60 * 60 * 1000
    ).toISOString();

    const teacherName = [
      request.firstName || '',
      request.middleName || '',
      request.lastName || '',
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    setApprovingId(request.id);

    try {
      const response = await fetch(
        '/api/verify/activation-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: personalEmail,
            teacherName,
            loginEmail,
            code,
            expiresAt,
          }),
        }
      );

      let result = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok || !result.ok) {
        const messages = {
          'email-not-configured':
            'Email is not configured on the server. Check your SMTP settings in .env.',
          'send-failed':
            'The email service could not send the activation email. Check your SMTP settings.',
          'too-many':
            'Too many activation emails have been sent to this address. Try again later.',
          invalid:
            'The activation details were rejected by the server.',
        };

        throw new Error(
          messages[result.error] ||
            'The activation email could not be sent. The registration was not approved.'
        );
      }

      repo.add('teachers', {
        firstName: request.firstName,
        middleName: request.middleName || '',
        lastName: request.lastName,
        employeeId: request.requestedTeacherId || '',
        personalEmail,
        email: loginEmail,
        phone: request.contactNumber || '',
        subject: request.subject || '',
        password: '',
        status: 'Pending Activation',
        mustChangePassword: false,
        activationCode: code,
        activationExpiresAt: expiresAt,
        registrationRequestId: request.id,
        createdAt: new Date().toISOString(),
      });

      repo.update(
        'teacherRegistrationRequests',
        request.id,
        {
          status: 'Approved',
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'Administrator',
        }
      );

      setCreds({
        title: 'Teacher registration approved',
        lines: [
          ['Teacher', teacherName],
          ['LMS login', loginEmail],
          ['Activation email sent to', personalEmail],
          [
            'Code expires',
            new Date(expiresAt).toLocaleString(),
          ],
        ],
        note:
          'An activation email has been sent. The teacher should check their inbox and spam folder, open "Activate teacher account," enter the code, and create a password. Assign classes after activation. The code expires after 48 hours.',
      });
    } catch (error) {
      console.error('[TEACHER APPROVAL]', error);

      setNotice(
        error.message ||
          'Could not send the activation email. The request remains pending.'
      );
    } finally {
      setApprovingId('');
    }
  }

  function reject(request) {
    const reason = window.prompt(
      `Optional reason for rejecting ${request.firstName} ${request.lastName}:`
    );

    if (reason === null) return;

    repo.update(
      'teacherRegistrationRequests',
      request.id,
      {
        status: 'Rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'Administrator',
        rejectionReason: reason.trim(),
      }
    );
  }

  function reset(teacher) {
    const password = makeTempPassword();

    repo.update('teachers', teacher.id, {
      password,
      mustChangePassword: true,
    });

    setCreds({
      title: 'Password reset',
      lines: [
        ['School account', teacher.email],
        ['Temporary password', password],
      ],
      note:
        'Send this temporary password to the teacher using a private channel. They will be asked to set a new password at next sign-in.',
    });
  }

  function archive(teacher) {
    if (sectionsOf(teacher.id).length) {
      setNotice(
        `${fullName(teacher)} still has sections. Reassign them first in the Sections tab.`
      );
      return;
    }

    setNotice('');

    repo.update('teachers', teacher.id, {
      status: 'Archived',
    });
  }

  return (
    <>
      <Panel
        title={`Pending Teacher Registrations (${requests.length})`}
      >
        {notice && <div className="error">{notice}</div>}

        {requests.length ? (
          requests.map((request) => (
            <div className="list-card" key={request.id}>
              <div className="row-actions spread">
                <b>
                  {request.firstName}{' '}
                  {request.middleName || ''}{' '}
                  {request.lastName}
                </b>

                <Badge tone="amber">
                  Pending review
                </Badge>
              </div>

              <p>
                <b>Email:</b> {request.personalEmail}
                <br />
                <b>Requested teacher ID:</b>{' '}
                {request.requestedTeacherId || 'Not provided'}
                <br />
                <b>Contact:</b>{' '}
                {request.contactNumber || 'Not provided'}
                <br />
                <b>Subject:</b>{' '}
                {request.subject || 'Not specified'}
              </p>

              {request.message && (
                <p>
                  <b>Additional information:</b>{' '}
                  {request.message}
                </p>
              )}

              <small className="muted">
                Submitted:{' '}
                {request.submittedAt
                  ? new Date(
                      request.submittedAt
                    ).toLocaleString()
                  : 'Unknown date'}
              </small>

              <div className="row-actions">
                <button
                  type="button"
                  className="primary btn-sm"
                  onClick={() => approve(request)}
                  disabled={Boolean(approvingId)}
                >
                  {approvingId === request.id
                    ? 'Sending email…'
                    : 'Approve and email activation code'}
                </button>

                <button
                  type="button"
                  className="danger-outline btn-sm"
                  onClick={() => reject(request)}
                  disabled={Boolean(approvingId)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        ) : (
          <Empty text="There are no pending teacher registration requests." />
        )}
      </Panel>

      <Panel
        title={`Teachers (${teachers.length})`}
        actions={
          <button
            type="button"
            className="primary"
            onClick={() => setAdding(true)}
          >
            + Add teacher
          </button>
        }
      >
        {notice && <div className="error">{notice}</div>}

        {teachers.length ? (
          teachers.map((teacher) => (
            <div className="row" key={teacher.id}>
              <div className="row-main">
                <Avatar letter={initials(teacher)} />

                <div>
                  <b>{fullName(teacher)}</b>

                  <small>
                    {teacher.email} ·{' '}
                    {teacher.subject || 'No subject'}
                    {teacher.employeeId
                      ? ` · ${teacher.employeeId}`
                      : ''}
                  </small>

                  <small>
                    {sectionsOf(teacher.id)
                      .map((room) => room.name)
                      .join(', ') || 'No sections assigned'}
                  </small>
                </div>
              </div>

              <div className="row-actions">
                {teacher.mustChangePassword && (
                  <Badge tone="amber">
                    Awaiting first login
                  </Badge>
                )}

                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => reset(teacher)}
                >
                  Reset password
                </button>

                <button
                  type="button"
                  className="danger-outline btn-sm"
                  onClick={() => archive(teacher)}
                >
                  Archive
                </button>
              </div>
            </div>
          ))
        ) : (
          <Empty text="No active teachers yet." />
        )}
      </Panel>

      {adding && (
        <AddTeacherModal
          db={db}
          onClose={() => setAdding(false)}
          onSave={create}
        />
      )}

      {creds && (
        <CredentialsModal
          {...creds}
          onClose={() => setCreds(null)}
        />
      )}
    </>
  );
}

function AddTeacherModal({ db, onClose, onSave }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    employeeId: '',
    personalEmail: '',
    subject: '',
  });

  const [error, setError] = useState('');

  const update = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  function submit(event) {
    event.preventDefault();
    setError('');

    if (
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      setError('First and last name are required.');
      return;
    }

    if (
      !/^\S+@\S+\.\S+$/.test(
        form.personalEmail.trim()
      )
    ) {
      setError('Enter the teacher’s personal email.');
      return;
    }

    if (
      form.employeeId.trim() &&
      (db.teachers || []).some(
        (teacher) =>
          teacher.employeeId === form.employeeId.trim()
      )
    ) {
      setError('That employee ID already exists.');
      return;
    }

    onSave(form);
  }

  return (
    <Modal title="Add teacher" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid2">
          <label>
            First name
            <input
              autoFocus
              value={form.firstName}
              onChange={update('firstName')}
              required
            />
          </label>

          <label>
            Last name
            <input
              value={form.lastName}
              onChange={update('lastName')}
              required
            />
          </label>

          <label>
            Employee ID
            <input
              value={form.employeeId}
              onChange={update('employeeId')}
            />
          </label>

          <label>
            Subject
            <input
              value={form.subject}
              onChange={update('subject')}
            />
          </label>
        </div>

        <label>
          Personal email
          <input
            type="email"
            value={form.personalEmail}
            onChange={update('personalEmail')}
            required
          />
        </label>

        <p className="hint">
          This existing manual account-creation option remains available.
        </p>

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="primary">
            Create account
          </button>
        </div>
      </form>
    </Modal>
  );
}