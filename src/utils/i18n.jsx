import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// English and Filipino. t('English text') gives the Filipino text when Filipino is chosen and a translation exists;
// anything without a translation stays in English. Add more pairs below to translate more of the app.
// The wording is a first draft: please have a Filipino speaker at the school review it.
const FIL = {
  // navigation and menus
  'Dashboard': 'Dashboard', 'My Rooms': 'Aking mga Silid', 'Attendance': 'Pagdalo', 'Grades': 'Mga Marka', 'Posts': 'Mga Post',
  'Students': 'Mga Mag-aaral', 'Sections': 'Mga Seksyon', 'Teachers': 'Mga Guro', 'Guardians': 'Mga Tagapag-alaga',
  'My Children': 'Aking mga Anak', 'Updates': 'Mga Update', 'Chat': 'Chat', 'Requests': 'Mga Kahilingan', 'Profile': 'Profile',
  'Messages': 'Mga Mensahe', 'Notifications': 'Mga Abiso', 'Edit profile': 'I-edit ang profile', 'Change password': 'Palitan ang password',
  'Dark mode': 'Madilim na mode', 'Light mode': 'Maliwanag na mode', 'Sign out': 'Mag-sign out', 'Language': 'Wika',
  'Chat logs': 'Mga chat log', 'Archives': 'Mga Naka-archive', 'School announcements': 'Mga anunsyo ng paaralan',
  'Activity log': 'Talaan ng aktibidad', 'Backup and restore': 'Backup at pagbabalik', 'Link a child': 'Mag-link ng anak',
  'Guardian portal': 'Portal ng Tagapag-alaga', 'Teacher portal': 'Portal ng Guro', 'Admin portal': 'Portal ng Admin',
  "You’re all caught up.": 'Wala ka nang kailangang tingnan.',
  // dashboards
  "Today's schedule": 'Iskedyul ngayong araw', 'No class schedule for today.': 'Walang klase ngayong araw.',
  'Not done yet': 'Hindi pa tapos', 'Nothing left to do right now.': 'Wala nang kailangang gawin sa ngayon.',
  'Needs attention': 'Kailangan ng pansin', 'All caught up. Nothing needs your attention right now.': 'Wala nang kailangang tugunan sa ngayon.',
  'My rooms': 'Aking mga silid', 'Calendar': 'Kalendaryo', 'Early warning': 'Maagang babala',
  'No students need a closer look right now.': 'Walang mag-aaral na kailangang bantayan sa ngayon.',
  'Announcements & Activities': 'Mga Anunsyo at Gawain', 'Announcements': 'Mga Anunsyo', 'Activities': 'Mga Gawain',
  'Archive': 'Archive', 'Done': 'Tapos na', 'Recent chats': 'Mga kamakailang chat', 'Start a new chat': 'Magsimula ng bagong chat',
  'No child linked yet.': 'Wala pang naka-link na anak.', 'Room code': 'Code ng silid', 'Reports': 'Mga Ulat',
  'Class schedule': 'Iskedyul ng klase', 'Enrolled students': 'Mga naka-enroll na mag-aaral', 'Link your child': 'I-link ang iyong anak',
  // profile
  'Profile picture': 'Larawan sa profile', 'Personal information': 'Personal na impormasyon', 'Contact': 'Contact',
  'Home address': 'Tirahan', 'Emergency contact': 'Contact sa oras ng emerhensiya', 'Notification settings': 'Mga setting ng abiso',
  'Terms and Agreement': 'Mga Tuntunin at Kasunduan', 'Save changes': 'I-save ang mga pagbabago',
  // sign in and sign up
  'Sign in': 'Mag-sign in', 'Sign In': 'Mag-sign in', 'Email or mobile number': 'Email o mobile number', 'Password': 'Password',
  'Forgot password?': 'Nakalimutan ang password?', 'Guardian sign up': 'Mag-sign up bilang tagapag-alaga',
  'Create your guardian account': 'Gumawa ng account bilang tagapag-alaga', 'About you': 'Tungkol sa iyo',
  'Contact & address': 'Contact at tirahan', 'Verify': 'I-verify', 'Back to sign in': 'Bumalik sa sign in',
  // common buttons
  'Continue': 'Magpatuloy', 'Back': 'Bumalik', 'Cancel': 'Kanselahin', 'Close': 'Isara', 'Delete': 'Burahin', 'Save': 'I-save',
  'Send': 'Ipadala', 'Edit': 'I-edit', 'Archive it': 'I-archive', 'Print': 'I-print', 'Today': 'Ngayon',
  'Delete chat': 'Burahin ang chat', 'Edit message': 'I-edit ang mensahe', 'Delete for me': 'Burahin para sa akin',
  'Delete for everyone': 'Burahin para sa lahat', 'Message': 'Mensahe',
};

const Ctx = createContext({ lang: 'en', setLang: () => {}, t: (s) => s });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('lang') || 'en'; } catch { return 'en'; }
  });
  const setLang = useCallback((l) => {
    try { localStorage.setItem('lang', l); } catch { /* ignore */ }
    document.documentElement.lang = l === 'fil' ? 'fil' : 'en';
    setLangState(l);
  }, []);
  const t = useCallback((s) => (lang === 'fil' && typeof s === 'string' && FIL[s]) || s, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx).t;
export const useLang = () => useContext(Ctx);

// <Tr>text</Tr> translates plain text and leaves anything else as it is.
export function Tr({ children }) {
  const t = useT();
  return typeof children === 'string' ? t(children) : children;
}