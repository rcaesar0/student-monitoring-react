import React, { useState } from 'react';
import { Modal } from './UI';

// Shows generated login details once, so the admin can hand them to the user.
export default function CredentialsModal({ title, lines, note, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = lines.map(([k, v]) => `${k}: ${v}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard unavailable: the text is still selectable */
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="cred-box">
        {lines.map(([k, v]) => (
          <div key={k} className="cred-line">
            <span>{k}</span>
            <code>{v}</code>
          </div>
        ))}
      </div>
      {note && <p className="hint">{note}</p>}
      <div className="form-actions">
        <button onClick={copy}>{copied ? 'Copied' : 'Copy details'}</button>
        <button className="primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
