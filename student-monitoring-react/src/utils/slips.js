import { showCode } from './linkCodes';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Opens the print dialog with one slip per child, to hand to the parent.
// items: [{ name, grade, section, lrn, code }]
export function printSlips(items, school = 'Student Monitoring') {
  const slips = items.map((i) => `
    <div class="slip">
      <div class="school">${esc(school)}</div>
      <div class="name">${esc(i.name)}</div>
      <div class="meta">${esc(i.grade)}${i.section ? ` · ${esc(i.section)}` : ''}</div>
      <div class="line"><span>LRN</span><b>${esc(i.lrn)}</b></div>
      <div class="line"><span>Link code</span><b class="code">${esc(showCode(i.code))}</b></div>
      <ol>
        <li>Open the Student Monitoring app and sign up as a guardian.</li>
        <li>Tap <b>Link a child</b>.</li>
        <li>Enter the LRN and the link code above.</li>
      </ol>
      <div class="warn">Keep this slip private. Do not share the code.</div>
    </div>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Link slips</title><style>
    @page { margin: 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; color: #111; }
    .sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
    .slip { border: 1.5px dashed #555; border-radius: 6px; padding: 10px 12px; page-break-inside: avoid; break-inside: avoid; }
    .school { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #555; }
    .name { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .meta { font-size: 12px; color: #444; margin-bottom: 8px; }
    .line { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; border-bottom: 1px solid #ddd; font-size: 13px; }
    .code { font-size: 22px; letter-spacing: 3px; font-family: 'Courier New', monospace; }
    ol { font-size: 12px; padding-left: 18px; margin: 8px 0 6px; line-height: 1.5; }
    .warn { font-size: 11px; color: #666; }
  </style></head><body><div class="sheet">${slips}</div></body></html>`;

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 2000);
  }, 250);
}