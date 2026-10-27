// Notification sounds made with the browser's own audio, so no sound files are needed.
let ctx = null;
let unlocked = false; // true once the person has tapped or typed on the page

const getCtx = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
};

// Browsers only allow sound after the person has tapped or typed on the page once.
// Until then nothing is created, so the browser does not complain.
const unlock = () => {
  unlocked = true;
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
};
if (typeof window !== 'undefined') {
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
}

function note(c, { freq, at = 0, dur = 0.3, type = 'sine', vol = 0.25, to }) {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const SOUNDS = [
  { id: 'chime', label: 'Chime', notes: [{ freq: 880, dur: 0.35 }, { freq: 1318.5, at: 0.18, dur: 0.55 }] },
  { id: 'bell', label: 'Bell', notes: [{ freq: 1046.5, dur: 1.0, type: 'triangle' }, { freq: 2093, dur: 0.6, vol: 0.08 }] },
  { id: 'pop', label: 'Pop', notes: [{ freq: 700, to: 250, dur: 0.12, vol: 0.35 }] },
  {
    id: 'marimba', label: 'Marimba',
    notes: [
      { freq: 523.25, dur: 0.25, type: 'triangle' },
      { freq: 659.25, at: 0.12, dur: 0.25, type: 'triangle' },
      { freq: 783.99, at: 0.24, dur: 0.4, type: 'triangle' },
    ],
  },
  { id: 'ding', label: 'Soft ding', notes: [{ freq: 1175, dur: 0.6 }] },
  { id: 'alert', label: 'Alert', notes: [{ freq: 740, dur: 0.14, type: 'square', vol: 0.1 }, { freq: 740, at: 0.22, dur: 0.14, type: 'square', vol: 0.1 }] },
  { id: 'off', label: 'No sound', notes: [] },
];

export const DEFAULT_SOUND = 'chime';

export function playSound(id) {
  if (!unlocked) return; // before the first tap or key press the browser refuses sound
  const sound = SOUNDS.find((s) => s.id === id) || SOUNDS[0];
  const c = getCtx();
  if (!c || !sound.notes.length) return;
  const go = () => sound.notes.forEach((n) => note(c, n));
  if (c.state === 'suspended') c.resume().then(go).catch(() => {});
  else go();
}