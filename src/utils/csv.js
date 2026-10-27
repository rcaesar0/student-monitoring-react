
const cell = (value) => {
  let text =
    value === null || value === undefined ? '' : String(value);

  // Prevent spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) {
    text = `'${text}`;
  }

  // Escape CSV values containing commas, quotes, or line breaks.
  return /[",\n\r]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
};

export function downloadCsv(filename, rows) {
  const content =
    '\ufeff' +
    rows.map((row) => row.map(cell).join(',')).join('\r\n');

  downloadBlob(
    filename,
    new Blob([content], { type: 'text/csv;charset=utf-8' })
  );
}

export function downloadJson(filename, data) {
  downloadBlob(
    filename,
    new Blob([JSON.stringify(data)], {
      type: 'application/json;charset=utf-8',
    })
  );
}

// Download a blank student CSV template.
export function downloadStudentTemplate() {
  downloadCsv('student-template.csv', [
    ['firstName', 'middleName', 'lastName', 'lrn', 'birthdate', 'grade'],
    ['', '', '', '', '', ''],
  ]);
}

// Parse CSV text into student objects.
export function parseStudents(text) {
  if (!text || !text.trim()) return [];

  const input = text.replace(/^\uFEFF/, '');
  const rows = [];

  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Handle Windows, Unix, and old Mac line endings.
      if (char === '\r' && input[i + 1] === '\n') {
        i++;
      }

      row.push(field.trim());

      if (row.some((value) => value !== '')) {
        rows.push(row);
      }

      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  // Include the final row when the file has no trailing newline.
  row.push(field.trim());

  if (row.some((value) => value !== '')) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) =>
    header.trim().toLowerCase()
  );

  const required = [
    'firstname',
    'lastname',
    'lrn',
    'birthdate',
    'grade',
  ];

  // Reject files that do not contain the required column names.
  if (!required.every((header) => headers.includes(header))) {
    return [];
  }

  return rows.slice(1).map((values) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });

    const gradeValue = (record.grade || '').trim();
    const gradeNumber = gradeValue.match(/\d+/)?.[0];

    return {
      firstName: record.firstname || '',
      middleName: record.middlename || '',
      lastName: record.lastname || '',
      lrn: record.lrn || '',
      birthdate: record.birthdate || '',
      grade: gradeNumber ? `Grade ${gradeNumber}` : gradeValue,
    };
  });
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);

  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  });

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
