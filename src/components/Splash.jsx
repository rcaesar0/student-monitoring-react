import React, { useEffect, useState } from 'react';

// Logo-only loading screen shown once when the app opens (no text, no loading bar).
const SHOW_MS = 1500;
const FADE_MS = 450;

export default function Splash() {
  const [phase, setPhase] = useState('show'); // show -> leave -> gone

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('leave'), SHOW_MS);
    const t2 = setTimeout(() => setPhase('gone'), SHOW_MS + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'gone') return null;
  return (
    <div className={`splash ${phase === 'leave' ? 'leave' : ''}`} role="presentation">
      <img src="/logo-app.png" alt="Student Monitoring" />
    </div>
  );
}
