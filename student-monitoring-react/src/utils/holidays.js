// Philippine holidays and observances shown on the teacher's calendar.
const pad = (n) => String(n).padStart(2, '0');
const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

const FIXED = [
  [1, 1, "New Year's Day"],
  [2, 14, "Valentine's Day"],
  [2, 25, 'EDSA People Power Anniversary'],
  [4, 9, 'Araw ng Kagitingan'],
  [5, 1, 'Labor Day'],
  [6, 12, 'Independence Day'],
  [8, 21, 'Ninoy Aquino Day'],
  [10, 5, "World Teachers' Day"],
  [11, 1, "All Saints' Day"],
  [11, 2, "All Souls' Day"],
  [11, 30, 'Bonifacio Day'],
  [12, 8, 'Feast of the Immaculate Conception'],
  [12, 24, 'Christmas Eve'],
  [12, 25, 'Christmas Day'],
  [12, 30, 'Rizal Day'],
  [12, 31, 'Last Day of the Year'],
];

// Easter Sunday (Gregorian calendar).
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

// Returns { 'YYYY-MM-DD': ['Holiday name', ...] } for one year.
export function holidaysOf(year) {
  const map = {};
  const add = (k, name) => {
    if (!map[k]) map[k] = [];
    map[k].push(name);
  };

  FIXED.forEach(([m, d, name]) => add(key(year, m, d), name));

  const e = easter(year);
  const shift = (n) => {
    const d = new Date(e);
    d.setDate(d.getDate() + n);
    return key(d.getFullYear(), d.getMonth() + 1, d.getDate());
  };
  add(shift(-3), 'Maundy Thursday');
  add(shift(-2), 'Good Friday');

  // National Heroes Day: last Monday of August.
  const heroes = new Date(year, 8, 0);
  while (heroes.getDay() !== 1) heroes.setDate(heroes.getDate() - 1);
  add(key(year, 8, heroes.getDate()), 'National Heroes Day');

  return map;
}