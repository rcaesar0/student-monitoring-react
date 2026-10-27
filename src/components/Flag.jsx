import React from 'react';

// Small flags drawn as pictures (the flag emojis do not show on Windows, only the letters PH and US).
// lang: 'fil' = Philippines, 'en' = United States.
export default function Flag({ lang, width = 26 }) {
  const ph = lang === 'fil';
  const stripe = 20 / 13;
  return (
    <span className="flag" style={{ width, height: Math.round((width * 2) / 3) }} role="img" aria-label={ph ? 'Philippine flag' : 'United States flag'}>
      <svg viewBox="0 0 30 20" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
        {ph ? (
          <>
            <rect width="30" height="10" fill="#0038A8" />
            <rect y="10" width="30" height="10" fill="#CE1126" />
            <path d="M0 0 L17.3 10 L0 20 Z" fill="#fff" />
            <circle cx="5.4" cy="10" r="2.3" fill="#FCD116" />
            <circle cx="2.2" cy="3.6" r="1.1" fill="#FCD116" />
            <circle cx="2.2" cy="16.4" r="1.1" fill="#FCD116" />
            <circle cx="13" cy="10" r="1.1" fill="#FCD116" />
          </>
        ) : (
          <>
            {Array.from({ length: 13 }, (_, i) => (
              <rect key={i} y={i * stripe} width="30" height={stripe + 0.05} fill={i % 2 === 0 ? '#B22234' : '#fff'} />
            ))}
            <rect width="12.5" height={stripe * 7} fill="#3C3B6E" />
            {Array.from({ length: 12 }, (_, i) => (
              <circle key={i} cx={2 + (i % 4) * 2.9} cy={2 + Math.floor(i / 4) * 3.2} r="0.6" fill="#fff" />
            ))}
          </>
        )}
      </svg>
    </span>
  );
}