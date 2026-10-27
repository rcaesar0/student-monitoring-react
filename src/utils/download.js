// Downloads a table as a CSV file that opens correctly in Excel (UTF-8 with a byte order mark).
// A cell that starts with = + - or @ is prefixed with ' so a spreadsheet never runs it as a formula.
const cell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(filename, rows) {
  const text = `\ufeff${rows.map((r) => r.map(cell).join(',')).join('\r\n')}`;
  downloadBlob(filename, new Blob([text], { type: 'text/csv;charset=utf-8' }));
}

export function downloadJson(filename, data) {
  downloadBlob(filename, new Blob([JSON.stringify(data)], { type: 'application/json' }));
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}