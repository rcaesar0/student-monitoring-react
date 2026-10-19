import React, { useEffect } from 'react';
import Icon from './Icon';

export const Empty = ({ text }) => (
  <div className="empty">
    <b>{text}</b>
  </div>
);

export const Stat = ({ title, value, icon, tone = 'blue' }) => (
  <div className={`stat tone-${tone}`}>
    {icon && <div className="stat-icon"><Icon name={icon} size={22} /></div>}
    <strong>{value}</strong>
    <span>{title}</span>
  </div>
);

export const Panel = ({ title, children, actions }) => (
  <section className="panel">
    <div className="panel-head">
      <h3>{title}</h3>
      {actions}
    </div>
    {children}
  </section>
);

export const Badge = ({ children, tone = 'blue' }) => (
  <span className={`badge badge-${tone}`}>{children}</span>
);

// Shows the profile photo when there is one, otherwise the first letter of the name.
export const Avatar = ({ letter, src, size = 38 }) => (
  <div className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
    {src ? <img src={src} alt="" /> : letter}
  </div>
);

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
