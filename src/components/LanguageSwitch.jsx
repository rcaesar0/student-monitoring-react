import React, { useEffect, useRef, useState } from 'react';
import Flag from './Flag';
import { useLang } from '../utils/i18n';

const NAMES = { fil: 'Filipino', en: 'English' };

// Language selector for the sign-in screens: a rectangular button with the flag and the name of the language,
// and a small menu to choose Filipino (Philippine flag) or English (U.S. flag).
export default function LanguageSwitch() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const key = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', outside);
    document.addEventListener('touchstart', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('touchstart', outside);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const pick = (l) => { setLang(l); setOpen(false); };

  return (
    <div className="lang-wrap" ref={ref}>
      <button type="button" className="lang-btn" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label="Language">
        <Flag lang={lang} />
        <span>{NAMES[lang] || NAMES.en}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul className="lang-menu" role="listbox">
          {['fil', 'en'].map((l) => (
            <li key={l}>
              <button type="button" role="option" aria-selected={lang === l} className={lang === l ? 'on' : ''} onClick={() => pick(l)}>
                <Flag lang={l} />
                <span>{NAMES[l]}</span>
                {lang === l && <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}