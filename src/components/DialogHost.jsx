import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { registerDialogHost } from '../utils/dialog';

const norm = (o) => (typeof o === 'string' ? { message: o } : o || {});

function Icon({ tone }) {
  const danger = tone === 'danger';
  return (
    <span className={`dlg-icon ${danger ? 'is-danger' : 'is-info'}`} aria-hidden="true">
      {danger ? (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" /><path d="M12 17h.01" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
      )}
    </span>
  );
}

// Draws the in-app confirm, notice and announcement-detail boxes. Mount it once, near the root of the app.
export default function DialogHost() {
  const [current, setCurrent] = useState(null); // { kind, opts, resolve }
  const queue = useRef([]);
  const active = useRef(null);

  const next = useCallback(() => {
    const item = queue.current.shift() || null;
    active.current = item;
    setCurrent(item);
  }, []);

  const push = useCallback((kind, opts) => new Promise((resolve) => {
    queue.current.push({ kind, opts: norm(opts), resolve });
    if (!active.current) next();
  }), [next]);

  useEffect(() => registerDialogHost({
    confirm: (o) => push('confirm', o),
    notice: (o) => push('notice', o),
    detail: (o) => push('detail', o),
  }), [push]);

  const close = useCallback((value) => {
    if (!active.current) return;
    active.current.resolve(value);
    next();
  }, [next]);

  useEffect(() => {
    if (!current) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(current.kind === 'confirm' ? false : undefined); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, close]);

  if (!current) return null;
  const { kind, opts } = current;
  const isConfirm = kind === 'confirm';
  const isDetail = kind === 'detail';
  const danger = isConfirm && opts.tone === 'danger';
  const dismiss = () => close(isConfirm ? false : undefined);

  if (isDetail) {
    const meta = (opts.meta || []).filter(([, v]) => v);
    return createPortal(
      <div className="dlg-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
        <div className="dlg-box dlg-detail" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
          <div className="dlg-detail-head">
            <h3 id="dlg-title" className="dlg-title">{opts.title || 'Announcement'}</h3>
            {opts.badge && <span className="dlg-badge">{opts.badge}</span>}
          </div>
          {meta.length > 0 && (
            <div className="dlg-meta">
              {meta.map(([label, value]) => (
                <span key={label}><small>{label}</small> {value}</span>
              ))}
            </div>
          )}
          {opts.body ? <div className="dlg-body">{opts.body}</div> : <div className="dlg-body is-empty">No further details.</div>}
          <div className="dlg-actions">
            <button type="button" autoFocus className="dlg-btn dlg-primary" onClick={dismiss}>Close</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="dlg-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="dlg-box" role={isConfirm ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="dlg-title">
        <Icon tone={danger ? 'danger' : 'info'} />
        {opts.title && <h3 id="dlg-title" className="dlg-title">{opts.title}</h3>}
        {opts.message && <p className="dlg-message">{opts.message}</p>}
        <div className="dlg-actions">
          {isConfirm && <button type="button" className="dlg-btn" onClick={() => close(false)}>{opts.cancelText || 'Cancel'}</button>}
          <button
            type="button" autoFocus
            className={`dlg-btn ${danger ? 'dlg-danger' : 'dlg-primary'}`}
            onClick={() => close(isConfirm ? true : undefined)}
          >
            {isConfirm ? opts.confirmText || 'Confirm' : opts.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}