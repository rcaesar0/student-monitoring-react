// Simple wallpaper-style looks for rooms: a base color with a small repeating pattern.
const tile = (size, inner) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${inner}</svg>`
  )}")`;

const leaf = (x, y, r, s = 1) =>
  `<g transform='translate(${x} ${y}) rotate(${r}) scale(${s})'><path d='M0 0C10 -4 20 4 20 16C8 18 -2 10 0 0Z'/><path d='M1 1L16 14' stroke='rgba(0,0,0,.12)' stroke-width='1' fill='none'/></g>`;

const flower = (x, y) =>
  [0, 72, 144, 216, 288]
    .map((a) => `<circle cx='${(x + 7 * Math.cos((a * Math.PI) / 180)).toFixed(1)}' cy='${(y + 7 * Math.sin((a * Math.PI) / 180)).toFixed(1)}' r='4.5'/>`)
    .join('') + `<circle cx='${x}' cy='${y}' r='3' fill='rgba(255,255,255,.3)'/>`;

export const ROOM_THEMES = {
  leaf: {
    label: 'Green leaves', color: '#3f8f4e',
    image: tile(64, `<g fill='rgba(255,255,255,.17)'>${leaf(6, 8, 10)}${leaf(40, 22, 120, 0.9)}${leaf(14, 44, -70, 0.8)}${leaf(46, 52, 200)}</g>`),
  },
  ocean: {
    label: 'Blue waves', color: '#2f7fd1',
    image: tile(40, `<g fill='none' stroke='rgba(255,255,255,.2)' stroke-width='2'><path d='M0 14Q10 6 20 14T40 14'/><path d='M0 32Q10 24 20 32T40 32'/></g>`),
  },
  sunset: {
    label: 'Orange stripes', color: '#e0703a',
    image: tile(24, `<g stroke='rgba(255,255,255,.16)' stroke-width='6'><path d='M0 24L24 0'/><path d='M-12 12L12 -12'/><path d='M12 36L36 12'/></g>`),
  },
  rose: {
    label: 'Pink flowers', color: '#d9588a',
    image: tile(56, `<g fill='rgba(255,255,255,.17)'>${flower(14, 14)}${flower(42, 42)}</g>`),
  },
  grape: {
    label: 'Purple diamonds', color: '#7a55c9',
    image: tile(32, `<path d='M16 4L28 16L16 28L4 16Z' fill='none' stroke='rgba(255,255,255,.2)' stroke-width='2'/>`),
  },
  sand: {
    label: 'Sandy dots', color: '#b8955a',
    image: tile(20, `<g fill='rgba(255,255,255,.3)'><circle cx='5' cy='5' r='1.6'/><circle cx='15' cy='15' r='1.6'/></g>`),
  },
  slate: {
    label: 'Gray grid', color: '#475569',
    image: tile(28, `<path d='M28 0V28H0' fill='none' stroke='rgba(255,255,255,.14)' stroke-width='1'/>`),
  },
};

export const DEFAULT_THEME = 'ocean';

export const roomStyle = (key) => {
  const t = ROOM_THEMES[key] || ROOM_THEMES[DEFAULT_THEME];
  return { backgroundColor: t.color, backgroundImage: t.image };
};