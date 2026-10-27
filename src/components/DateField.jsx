import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { dateStr, formatDate } from '../utils/helpers';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parts = (s) => { const [y, m, d] = String(s).split('-').map(Number); return { y, m: m - 1, d }; };

// Keeps an event inside the calendar so a parent Modal never sees it
// (React events bubble through portals to the parent component tree).
const contain = (e) => e.stopPropagation();

// A date box with a calendar: pick the month and the year from lists, then tap the day.
// It replaces <input type="date">. Same value ('YYYY-MM-DD') and the same onChange(e) with e.target.value.
// min and max (also 'YYYY-MM-DD') disable days.
export default function DateField({ value, onChange, min, max, placeholder = 'Select date', required = false, disabled = false, className = '', 'aria-label': ariaLabel }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  // A native <dialog> opened with showModal() makes everything outside it inert.
  // If the date box sits inside one, the calendar must be mounted inside it too.
  const mountTarget = () => (btnRef.current && btnRef.current.closest('dialog')) || document.body;

  return (
    <>
      <button
        ref={btnRef}
        type="button" className={`datefield ${value ? '' : 'empty'} ${className}`} disabled={disabled}
        onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={ariaLabel || placeholder}
      >
        <span>{value ? formatDate(value) : placeholder}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 3v3M16 3v3" />
        </svg>
      </button>
      {open && (
        <Calendar
          value={value} min={min} max={max} required={required} container={mountTarget()}
          onClose={() => setOpen(false)}
          onPick={(v) => { onChange({ target: { value: v } }); setOpen(false); }}
        />
      )}
    </>
  );
}

function Calendar({ value, min, max, required, container, onClose, onPick }) {
  const today = dateStr();
  const start = value || (max && today > max ? max : min && today < min ? min : today);
  const [cursor, setCursor] = useState(() => { const p = parts(start); return { y: p.y, m: p.m }; });

  // Escape closes only the calendar. Capture phase + stopPropagation keeps the
  // parent Modal's own Escape handler from closing the whole form as well.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // Which years the list offers: around the allowed range, and always the year being shown.
  const thisYear = Number(today.slice(0, 4));
  const minY = min ? parts(min).y : null;
  const maxY = max ? parts(max).y : null;
  let from = thisYear - 60;
  let to = thisYear + 5;
  if (minY && maxY) { from = minY; to = maxY; } else if (minY) { from = minY; to = minY + 10; } else if (maxY) { from = maxY - 30; to = maxY; }
  const years = [];
  for (let y = Math.min(from, cursor.y); y <= Math.max(to, cursor.y); y += 1) years.push(y);

  const shift = (n) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const first = new Date(cursor.y, cursor.m, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(cursor.y, cursor.m, 1 - first + i);
    const k = keyOf(d.getFullYear(), d.getMonth(), d.getDate());
    return { k, day: d.getDate(), inMonth: d.getMonth() === cursor.m, off: (min && k < min) || (max && k > max) };
  });
  const todayOff = (min && today < min) || (max && today > max);

  return createPortal(
    <div
      className="dp-backdrop"
      // Inline so the calendar always sits above any Modal, even if the CSS is missing or outranked.
      style={{ position: 'fixed', inset: 0, zIndex: 2147483000 }}
      onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
      onClick={contain} onKeyDown={contain} onKeyUp={contain} onFocus={contain}
    >
      <div
        className="dp-card" role="dialog" aria-label="Choose a date"
        onMouseDown={contain} onClick={contain} onTouchStart={contain}
      >
        <div className="dp-head">
          <button type="button" className="dp-nav" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <select value={cursor.m} onChange={(e) => setCursor({ ...cursor, m: Number(e.target.value) })} aria-label="Month">
            {MONTHS.map((name, i) => <option key={name} value={i}>{name}</option>)}
          </select>
          <select value={cursor.y} onChange={(e) => setCursor({ ...cursor, y: Number(e.target.value) })} aria-label="Year">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" className="dp-nav" onClick={() => shift(1)} aria-label="Next month">›</button>
        </div>
        <div className="dp-grid">
          {WEEKDAYS.map((w) => <span key={w} className="dp-wd">{w}</span>)}
          {cells.map((c) => (
            <button
              key={c.k} type="button" disabled={!!c.off} onClick={() => onPick(c.k)}
              className={`dp-day ${c.inMonth ? '' : 'out'} ${c.k === today ? 'today' : ''} ${c.k === value ? 'selected' : ''}`}
            >
              {c.day}
            </button>
          ))}
        </div>
        <div className="dp-foot">
          {!required && value ? <button type="button" className="text-btn" onClick={() => onPick('')}>Clear</button> : <span />}
          <button type="button" className="text-btn" disabled={!!todayOff} onClick={() => onPick(today)}>Today</button>
          <button type="button" className="btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    container
  );
}