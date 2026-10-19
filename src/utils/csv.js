import { normalizeGrade } from './helpers';

// Reads CSV text properly: quoted values, commas inside quotes, and a leading BOM from Excel.
export function parseCsv(text) {
  const s = String(text || '').replace(/^\ufeff/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

// Columns: firstName, middleName, lastName, lrn, birthdate, grade (header row required).
export function parseStudents(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.toLowerCase().replace(/[\s_]/g, ''));
  return rows.slice(1).map((cells) => {
    const r = {};
    head.forEach((h, i) => { r[h] = cells[i] || ''; });
    return {
      firstName: r.firstname || '', middleName: r.middlename || '', lastName: r.lastname || '',
      lrn: r.lrn || '', birthdate: r.birthdate || '', grade: normalizeGrade(r.grade || r.gradelevel),
    };
  });
}

export function downloadStudentTemplate() {
  const csv = [
    'firstName,middleName,lastName,lrn,birthdate,grade',
    'Juan,Santos,Dela Cruz,300000000001,2014-04-21,Grade 6',
    'Maria,,Reyes,300000000002,2015-01-09,Grade 5',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students_template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}