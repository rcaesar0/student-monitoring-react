import React, { useState } from 'react';
import { Panel, Empty } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { formatTime, fullName } from '../../utils/helpers';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const overlaps = (a, b) => a.day === b.day && a.start < b.end && b.start < a.end;
const makeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// The weekly class schedule of one section (admin only). Saved on the room as
// room.schedule = [{ id, day, start, end }, ...], so teacher and guardian screens read the same list.
export default function RoomSchedulePanel({ room }) {
  const { db, repo } = useApp();
  const [days, setDays] = useState([]);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:00');
  const [error, setError] = useState('');

  const schedule = [...(room.schedule || [])].sort(
    (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start.localeCompare(b.start)
  );
  const teacher = db.teachers.find((t) => t.id === room.teacherId);

  const toggleDay = (d) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  function add(e) {
    e.preventDefault();
    if (!days.length) return setError('Choose at least one day.');
    if (!start || !end) return setError('Set the start and end time.');
    if (end <= start) return setError('The end time must be after the start time.');

    const entries = days.map((day) => ({ id: makeId(), day, start, end }));

    // The same section cannot have two classes at the same time.
    const clash = entries.find((n) => schedule.some((o) => overlaps(n, o)));
    if (clash) return setError(`${clash.day} already has a class that overlaps ${formatTime(start)} to ${formatTime(end)}.`);

    // The same teacher cannot be in two sections at once.
    for (const other of db.rooms.filter((r) => r.id !== room.id && r.status === 'Active' && r.teacherId === room.teacherId)) {
      const hit = entries.find((n) => (other.schedule || []).some((o) => overlaps(n, o)));
      if (hit) return setError(`${teacher ? fullName(teacher) : 'This teacher'} already teaches ${other.name} on ${hit.day} at that time.`);
    }

    repo.update('rooms', room.id, { schedule: [...(room.schedule || []), ...entries] });
    setDays([]);
    setError('');
  }

  const remove = (id) => repo.update('rooms', room.id, { schedule: (room.schedule || []).filter((x) => x.id !== id) });

  return (
    <Panel title="Class schedule">
      {schedule.length ? (
        schedule.map((s) => (
          <div className="row" key={s.id}>
            <div><b>{s.day}</b><small>{formatTime(s.start)} – {formatTime(s.end)}</small></div>
            <button className="danger-outline btn-sm" onClick={() => remove(s.id)}>Remove</button>
          </div>
        ))
      ) : (
        <Empty text="No schedule yet. Add the days and time this subject meets." />
      )}

      <form onSubmit={add} className="sched-form">
        <span className="field-title">Add a class time</span>
        <div className="chip-row">
          {DAYS.map((d) => (
            <button type="button" key={d} className={`chip ${days.includes(d) ? 'on' : ''}`} onClick={() => toggleDay(d)}>{d.slice(0, 3)}</button>
          ))}
        </div>
        <div className="grid2">
          <label>Starts<input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label>Ends<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>
        <p className="hint">Pick several days to give them the same time, for example Monday to Friday.</p>
        {error && <div className="error" role="alert">{error}</div>}
        <button type="submit" className="primary">Add to schedule</button>
      </form>
    </Panel>
  );
}