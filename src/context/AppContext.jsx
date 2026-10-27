import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadDatabase, saveDatabase, withDefaults, loadSession, saveSession, clearSession } from '../services/storage';
import { fetchRemote, sendInit, sendOp } from '../services/sync';
import { roleCollection } from '../services/auth';
import { uid, fullName } from '../utils/helpers';
import { describeChange } from '../utils/audit';

const AppContext = createContext(null);
const POLL_MS = 2000;

export function AppProvider({ children }) {
  const [db, setDb] = useState(loadDatabase);
  const [session, setSession] = useState(loadSession);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  // connecting | online | offline (connected before, now unreachable) | local (never reached the server)
  const [syncState, setSyncState] = useState('connecting');

  const dbRef = useRef(db);
  dbRef.current = db;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const sync = useRef({ connected: false, version: 0, seq: 0, outbox: [], flushing: false });
  const trigger = useRef(() => {});

  useEffect(() => saveDatabase(db), [db]);
  useEffect(() => (session ? saveSession(session) : clearSession()), [session]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    let stop = false;
    let running = false;
    let timer;
    const s = sync.current;

    // Sends queued changes in order. A failed send keeps them for the next try.
    async function flush() {
      if (s.flushing) return;
      s.flushing = true;
      try {
        while (s.outbox.length) {
          try {
            await sendOp(s.outbox[0]);
            s.outbox.shift();
          } catch (e) {
            if (e.status === 409) { // the server lost its data: upload this device's copy again
              s.connected = false;
              s.outbox = [];
              return;
            }
            throw e;
          }
        }
      } finally {
        s.flushing = false;
      }
    }
    sync.current.flush = flush;

    async function tick() {
      if (running || stop) return;
      running = true;
      try {
        if (!s.connected) {
          const r = await fetchRemote();
          if (r.db) {
            setDb(withDefaults(r.db));
            s.version = r.version;
          } else {
            const init = await sendInit(dbRef.current);
            setDb(withDefaults(init.db));
            s.version = init.version;
          }
          s.connected = true;
        } else {
          if (s.outbox.length) await flush();
          if (!s.outbox.length && !s.flushing) {
            const seq = s.seq;
            const r = await fetchRemote(s.version);
            if (r.same) s.version = r.version;
            else if (!r.db) s.connected = false;
            else if (!s.outbox.length && seq === s.seq) {
              setDb(withDefaults(r.db));
              s.version = r.version;
            }
          }
        }
        if (!stop) setSyncState('online');
      } catch {
        if (!stop) setSyncState(s.connected ? 'offline' : 'local');
      }
      running = false;
      if (!stop) timer = setTimeout(tick, POLL_MS);
    }

    // Phones pause background pages, so refresh as soon as the page is visible or back online.
    trigger.current = () => { clearTimeout(timer); tick(); };
    const wake = () => { if (!document.hidden) trigger.current(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);

    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
    };
  }, []);

    // The data layer. Pages only call these functions. Each one updates this screen at once
  // and queues the same change for the shared database so other devices get it.
  // Important changes (accounts, links, grade releases, announcements) are also written to the Activity log.
  const repo = useMemo(() => {
    const push = (op) => {
      const s = sync.current;
      s.seq += 1;
      if (!s.connected) return;
      s.outbox.push(op);
      if (s.flush) s.flush().catch(() => {});
    };

    // Called before the change is applied, so removed items can still be looked up by name.
    const audit = (action, col, id, extra) => {
      let text = null;
      try { text = describeChange({ action, col, id, db: dbRef.current, ...extra }); } catch { text = null; }
      if (!text) return;
      const who = sessionRef.current;
      const person = who ? (dbRef.current[roleCollection(who.role)] || []).find((x) => x.id === who.id) : null;
      const entry = { at: Date.now(), role: who ? who.role : 'Guest', actorId: who ? who.id : '', actor: person ? (fullName(person).trim() || 'Administrator') : 'Guest', text };
      const newId = uid();
      setDb((d) => ({ ...d, audit: [...(d.audit || []), { ...entry, id: newId }] }));
      push({ type: 'add', col: 'audit', id: newId, data: entry });
    };

    return {
      add: (col, data, id) => {
        const newId = id || uid();
        audit('add', col, newId, { data });
        setDb((d) => ({ ...d, [col]: [...(d[col] || []), { ...data, id: newId }] }));
        push({ type: 'add', col, id: newId, data });
        return newId;
      },
      set: (col, id, data) => {
        audit('set', col, id, { data });
        setDb((d) => ({ ...d, [col]: [...(d[col] || []).filter((x) => x.id !== id), { ...data, id }] }));
        push({ type: 'set', col, id, data });
      },
      update: (col, id, patch) => {
        audit('update', col, id, { patch });
        setDb((d) => ({ ...d, [col]: (d[col] || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        push({ type: 'update', col, id, patch });
      },
      remove: (col, id) => {
        audit('remove', col, id, {});
        setDb((d) => ({ ...d, [col]: (d[col] || []).filter((x) => x.id !== id) }));
        push({ type: 'remove', col, id });
      },
      // Replaces everything with a backup file (Admin > Backup and restore).
      replaceAll: (newDb) => {
        setDb(withDefaults(newDb));
        push({ type: 'replaceAll', db: newDb });
      },
    };
  }, []);

  const user = useMemo(() => {
    if (!session) return null;
    const u = (db[roleCollection(session.role)] || []).find((x) => x.id === session.id);
    return u && u.status !== 'Archived' ? { ...u, role: session.role } : null;
  }, [session, db]);

  const value = {
    db,
    repo,
    user,
    syncState,
    syncNow: () => trigger.current(),
    login: setSession,
    logout: () => setSession(null),
    theme,
    toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);