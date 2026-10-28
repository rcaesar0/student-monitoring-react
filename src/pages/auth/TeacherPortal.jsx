import React from 'react';

export default function TeacherPortal({ go }) {
  return (
    <div className="teacher-portal">
      <button
        type="button"
        className="text-btn"
        onClick={() => go('login')}
      >
        ← Back to Sign In
      </button>

      <h2>Teacher Portal</h2>

      <p className="muted">
        Register for a teacher account or activate an account
        approved by the school administrator.
      </p>

      <button
        type="button"
        className="primary wide"
        onClick={() => go('teacher-register')}
      >
        Register as a Teacher
      </button>

      <button
        type="button"
        className="outline-btn wide"
        onClick={() => go('activate')}
      >
        Activate Teacher Account
      </button>
    </div>
  );
}