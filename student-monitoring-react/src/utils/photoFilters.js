// Photo filters. Each filter is a few numbers; the same numbers drive both the live preview
// (as a CSS filter) and the saved picture (pixel math), so what you see is what you save.
export const FILTERS = [
  { key: 'none', label: 'Original', p: {} },
  { key: 'mono', label: 'Mono', p: { contrast: 1.1, gray: 1 } },
  { key: 'vintage', label: 'Vintage', p: { contrast: 1.05, sepia: 0.85 } },
  { key: 'warm', label: 'Warm', p: { bright: 1.05, sepia: 0.25, sat: 1.3 } },
  { key: 'vivid', label: 'Vivid', p: { contrast: 1.1, sat: 1.6 } },
  { key: 'soft', label: 'Soft', p: { bright: 1.1, contrast: 0.85, sat: 0.8 } },
  { key: 'punch', label: 'Punch', p: { bright: 0.95, contrast: 1.3, sat: 0.9 } },
];

export function cssFilter(p) {
  const parts = [];
  if (p.bright) parts.push(`brightness(${p.bright})`);
  if (p.contrast) parts.push(`contrast(${p.contrast})`);
  if (p.gray) parts.push(`grayscale(${p.gray})`);
  if (p.sepia) parts.push(`sepia(${p.sepia})`);
  if (p.sat) parts.push(`saturate(${p.sat})`);
  return parts.join(' ') || 'none';
}

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// Same order and formulas as the CSS filter functions.
export function applyFilter(data, p) {
  const gs = 1 - Math.min(1, p.gray || 0);
  const ss = 1 - Math.min(1, p.sepia || 0);
  const sat = p.sat;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    if (p.bright) { r = clamp(r * p.bright); g = clamp(g * p.bright); b = clamp(b * p.bright); }
    if (p.contrast) {
      r = clamp((r - 127.5) * p.contrast + 127.5);
      g = clamp((g - 127.5) * p.contrast + 127.5);
      b = clamp((b - 127.5) * p.contrast + 127.5);
    }
    if (p.gray) {
      const nr = (0.2126 + 0.7874 * gs) * r + (0.7152 - 0.7152 * gs) * g + (0.0722 - 0.0722 * gs) * b;
      const ng = (0.2126 - 0.2126 * gs) * r + (0.7152 + 0.2848 * gs) * g + (0.0722 - 0.0722 * gs) * b;
      const nb = (0.2126 - 0.2126 * gs) * r + (0.7152 - 0.7152 * gs) * g + (0.0722 + 0.9278 * gs) * b;
      r = clamp(nr); g = clamp(ng); b = clamp(nb);
    }
    if (p.sepia) {
      const nr = (0.393 + 0.607 * ss) * r + (0.769 - 0.769 * ss) * g + (0.189 - 0.189 * ss) * b;
      const ng = (0.349 - 0.349 * ss) * r + (0.686 + 0.314 * ss) * g + (0.168 - 0.168 * ss) * b;
      const nb = (0.272 - 0.272 * ss) * r + (0.534 - 0.534 * ss) * g + (0.131 + 0.869 * ss) * b;
      r = clamp(nr); g = clamp(ng); b = clamp(nb);
    }
    if (sat) {
      const nr = (0.213 + 0.787 * sat) * r + (0.715 - 0.715 * sat) * g + (0.072 - 0.072 * sat) * b;
      const ng = (0.213 - 0.213 * sat) * r + (0.715 + 0.285 * sat) * g + (0.072 - 0.072 * sat) * b;
      const nb = (0.213 - 0.213 * sat) * r + (0.715 - 0.715 * sat) * g + (0.072 + 0.928 * sat) * b;
      r = clamp(nr); g = clamp(ng); b = clamp(nb);
    }
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
}
