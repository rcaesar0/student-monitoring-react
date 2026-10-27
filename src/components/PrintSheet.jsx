import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

// A full-screen white page for printing or saving as PDF. While it is open, printing shows only this page.
export default function PrintSheet({ title, onClose, children }) {
  useEffect(() => {
    document.body.classList.add('printing-sheet');
    return () => document.body.classList.remove('printing-sheet');
  }, []);

  return createPortal(
    <div className="print-portal">
      <div className="print-bar no-print">
        <button type="button" onClick={onClose}>Close</button>
        <button type="button" className="primary" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <div className="print-sheet">
        <header className="print-head">
          <img src="/logo-app.png" alt="" />
          <div><b>Student Monitoring</b><span>{title}</span></div>
        </header>
        {children}
        <footer className="print-foot">Generated {new Date().toLocaleString()}. For information only. The school’s official records are the final word.</footer>
      </div>
    </div>,
    document.body
  );
}