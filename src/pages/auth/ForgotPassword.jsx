import React from 'react';

export default function ForgotPassword({ go }) {
  return (
    <div>
      <h2>Forgot your password?</h2>
      <p className="muted">
        Please ask the school administrator to reset it. You will receive a temporary password
        and will be asked to choose a new one when you sign in.
      </p>
      <div className="info">Online self-service reset (by email) arrives when Firebase is connected.</div>
      <button type="button" className="primary wide" onClick={() => go('login')}>Back to sign in</button>
    </div>
  );
}
