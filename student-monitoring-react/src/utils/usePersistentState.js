import { useEffect, useState } from 'react';

// Like useState, but the value survives a page reload (it is kept in this browser tab).
//   key: a unique name, e.g. 'sm_nav_teacher_t-1_view'
//   initial: the starting value, or a function that returns it
//   isValid: optional check; a saved value that fails it is ignored (for example a page that no longer exists)
export function usePersistentState(key, initial, isValid = () => true) {
  const [value, setValue] = useState(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw !== null) {
        const saved = JSON.parse(raw);
        if (isValid(saved)) return saved;
      }
    } catch { /* storage unavailable or damaged: start fresh */ }
    return typeof initial === 'function' ? initial() : initial;
  });

  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);

  return [value, setValue];
}