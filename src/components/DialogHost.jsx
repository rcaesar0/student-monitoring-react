import React, { useEffect, useRef, useState } from 'react';
import { registerDialogHost } from '../utils/dialog';

const norm = (o) => (typeof o === 'string' ? { message: o } : o || {});

// Draws the message boxes asked for with confirmDialog() and noticeDialog(). Put it once in main.jsx.
export default function DialogHost() {
  const [dlg, setDlg] = useState(null); // { kind, opts, resolve }
  const current = useRef(null);
  current.current = dlg;

  useEffect(() => registerDialogHost({
    confirm: (o) => new Promise((resolve) => { current.current?.resolve(false); setDlg({ kind: 'confirm', opts: norm(o), resolve }); }),
    notice: (o) => new Promise((resolve) => { current.current?.resolve(true); setDlg({ kind: 'notice', opts: norm(o), resolve }); }),
  }), []);

  const close = (result) => {
    if (!current.current) return;
    current.current.resolve(result);
    setDlg(null);
  };

  useEffect(() => {
    if (!dlg) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(dlg.kind === 'notice'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dlg]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dlg) return null;
  const { kind, opts } = dlg;
  const danger = opts.tone === 'danger';
  const confirm = kind === 'confirm';

  return (
    <div className="dialog-backdrop" onMouseDown={() => close(!confirm)}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onMouseDown={(e) => e.stopPropagation()}>
        <span className={`dialog-icon ${danger ? 'danger' : ''}`} aria-hidden="true">
          {danger ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v5M12 18h.01" /></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
          )}
        </span>
        <h3 id="dlg-title">{opts.title || (confirm ? 'Are you sure?' : 'Notice')}</h3>
        {opts.message && <p className="dialog-text">{opts.message}</p>}
        <div className="dialog-actions">
          {confirm && <button type="button" autoFocus={danger} onClick={() => close(false)}>{opts.cancelText || 'Cancel'}</button>}
          <button type="button" autoFocus={!danger} className={danger ? 'danger-solid' : 'primary'} onClick={() => close(true)}>
            {opts.confirmText || (confirm ? 'Confirm' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
}