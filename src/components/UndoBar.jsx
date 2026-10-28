import React, { useEffect, useRef } from 'react';

// A small bar at the bottom of the screen after an action that can be reversed (for example Archive).
// The thin line at the bottom runs down like a loading bar. When it ends, the bar goes away.
// Give it a key (such as the post id) so a new action restarts the timer.
export default function UndoBar({ message, onUndo, onClose, seconds = 6 }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const t = setTimeout(() => closeRef.current(), seconds * 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div className="undo-bar" role="status" aria-live="polite" style={{ '--undo-secs': `${seconds}s` }}>
      <span>{message}</span>
      <button type="button" className="undo-btn" onClick={onUndo}>Undo</button>
      <i aria-hidden="true" />
    </div>
  );
}