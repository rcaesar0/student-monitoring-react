import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { IDLE_MINUTES } from './security';

// Signs the person out after IDLE_MINUTES without a tap, key press or scroll, so a phone or a shared computer
// left open does not stay signed in. The sign-in page then explains why. Other people's changes arriving from the
// shared database do not count as activity.
export function useIdleLogout() {
  const { user, logout } = useApp();
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    if (!user) return undefined;
    let last = Date.now();
    const touch = () => { last = Date.now(); };
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    // A timer that checks the clock also works after a laptop sleeps or a phone pauses the page.
    const timer = setInterval(() => {
      if (Date.now() - last > IDLE_MINUTES * 60000) {
        try { sessionStorage.setItem('idle-logout', '1'); } catch { /* ignore */ }
        logoutRef.current();
      }
    }, 20000);
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}