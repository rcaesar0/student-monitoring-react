import React, { useState } from 'react';
import { Panel, Empty } from '../../components/UI';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { dateStr, formatDate, formatTime } from '../../utils/helpers';
import { holidaysOf } from '../../utils/holidays';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MAX_TAGS = 2;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Month calendar of holidays and the teacher's own events. Post deadlines are not shown here.
export default function CalendarPanel() {
  const { db, repo, user } = useApp();
  const today = dateStr();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { y, m: m - 1 };
  });
  const [selected, setSelected] = useState(today);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');

  const events = (db.events || []).filter((e) => e.teacherId === user.id);
  const eventsOn = (d) => events.filter((e) => e.date === d).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const holidayCache = {};
  const holidaysOn = (d) => {
    const y = d.slice(0, 4);
    if (!holidayCache[y]) holidayCache[y] = holidaysOf(Number(y));
    return holidayCache[y][d] || [];
  };

  const tagsOn = (d) => [
    ...holidaysOn(d).map((t) => ({ t, kind: 'holiday' })),
    ...eventsOn(d).map((x) => ({ t: x.title, kind: 'mine' })),
  ];

  const firstDay = new Date(cursor.y, cursor.m, 1).getDay();
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  // Years offered in the picker: 5 back and 5 ahead of today, plus whatever year is open.
  const thisYear = Number(today.slice(0, 4));
  const years = [...new Set([...Array.from({ length: 11 }, (_, i) => thisYear - 5 + i), cursor.y])].sort((a, b) => a - b);

  const shift = (n) => setCursor((c) => {
    const d = new Date(c.y, c.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const goToday = () => {
    const [y, m] = today.split('-').map(Number);
    setCursor({ y, m: m - 1 });
    setSelected(today);
  };

  function addEvent(e) {
    e.preventDefault();
    if (!title.trim()) return;
    repo.add('events', { teacherId: user.id, title: title.trim(), date: selected, time });
    setTitle('');
    setTime('');
  }

  const dayHolidays = holidaysOn(selected);
  const dayEvents = eventsOn(selected);

  return (
    <Panel title="Calendar" actions={<button className="btn-sm" onClick={goToday}>Today</button>}>
      <div className="cal-head">
        <button className="icon-btn cal-prev" onClick={() => shift(-1)} aria-label="Previous month"><Icon name="chevron" size={18} /></button>
        <div className="cal-pick">
          <select value={cursor.m} onChange={(e) => setCursor({ ...cursor, m: Number(e.target.value) })} aria-label="Month">
            {MONTHS.map((name, i) => <option key={name} value={i}>{name}</option>)}
          </select>
          <select value={cursor.y} onChange={(e) => setCursor({ ...cursor, y: Number(e.target.value) })} aria-label="Year">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="icon-btn cal-next" onClick={() => shift(1)} aria-label="Next month"><Icon name="chevron" size={18} /></button>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((w) => <div className="cal-weekday" key={w}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`blank-${i}`} />;
          const k = keyOf(cursor.y, cursor.m, d);
          const tags = tagsOn(k);
          return (
            <button
              key={k} type="button"
              className={`cal-day ${k === today ? 'today' : ''} ${k === selected ? 'selected' : ''}`}
              onClick={() => setSelected(k)}
            >
              <span className="cal-num">{d}</span>
              {tags.slice(0, MAX_TAGS).map((tag, j) => (
                <span key={j} className={`cal-tag ${tag.kind}`} title={tag.t}>{tag.t}</span>
              ))}
              {tags.length > MAX_TAGS && <span className="cal-more">+{tags.length - MAX_TAGS} more</span>}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span><i className="holiday" /> Holidays</span>
        <span><i className="mine" /> My events</span>
      </div>

      <h4 className="mini-h">{formatDate(selected)}</h4>

      {dayHolidays.map((name) => (
        <div className="cal-event" key={name}>
          <span className="attention-text"><b>{name}</b><small>Holiday</small></span>
        </div>
      ))}

      {dayEvents.map((ev) => (
        <div className="cal-event" key={ev.id}>
          <span className="attention-text">
            <b>{ev.title}</b>
            <small>My event{ev.time ? ` · ${formatTime(ev.time)}` : ''}</small>
          </span>
          <button className="danger-outline btn-sm" onClick={() => repo.remove('events', ev.id)}>Delete</button>
        </div>
      ))}

      {!dayHolidays.length && !dayEvents.length && <Empty text="Nothing on this day." />}

      <form className="cal-add" onSubmit={addEvent}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a personal event" aria-label="Event title" />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time (optional)" />
        <button type="submit" className="primary">Add</button>
      </form>
    </Panel>
  );
}