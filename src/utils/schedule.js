import { formatTime } from './helpers';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Name of today's weekday (JavaScript counts Sunday as 0).
export const todayName = (d = new Date()) => WEEKDAYS[(d.getDay() + 6) % 7];

export const timeRange = (s) => `${formatTime(s.start)} – ${formatTime(s.end)}`;

// Every weekly class time of the given rooms, in week order. Each item: { id, day, start, end, room }.
export const slotsOf = (rooms) =>
  rooms
    .flatMap((room) => (room.schedule || []).map((s) => ({ ...s, room })))
    .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.start.localeCompare(b.start));

// Only the class times that fall on the given day (default: today), earliest first.
export const slotsOnDay = (slots, day = todayName()) => slots.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start));

// Two times on the same day overlap when each starts before the other ends.
export const overlaps = (a, b) => a.day === b.day && a.start < b.end && a.end > b.start;