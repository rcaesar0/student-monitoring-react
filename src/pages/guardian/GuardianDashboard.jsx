import React, { useState } from 'react';
import Shell from '../../components/Shell';
import { usePersistentState } from '../../utils/usePersistentState';
import ProfilePanel from '../../components/ProfilePanel';
import Chat from '../../components/Chat';
import { useApp } from '../../context/AppContext';
import { approvedChildren, roomsOfStudent } from '../../utils/selectors';
import { chatContacts } from '../../utils/chat';
import { fullName } from '../../utils/helpers';
import ChildrenTab from './ChildrenTab';
import { AttendanceView, GradesView, UpdatesView } from './ViewTabs';
import LinkChildTab from './LinkChildTab';

const LANDING = 'My Children';
// The bottom bar is always there. Updates, Attendance and Grades cover all children and rooms,
// and the filters at the top narrow them down to one child or one room.
const ROOM_VIEWS = ['Updates', 'Attendance', 'Grades'];
const NAV = [LANDING, ...ROOM_VIEWS];
// Pages opened from the top bar. They have no bottom bar; the back arrow returns to where the guardian was.
const OVERLAYS = ['Chat', 'Profile', 'Link a Child'];

// Guardians are view-only. They see only children the school linked to them.
export default function GuardianDashboard() {
  const { db, user, logout, theme, toggleTheme } = useApp();
  const validPage = (p) => !!p && typeof p.roomId === 'string' && [...NAV, ...OVERLAYS].includes(p.view);
  const [page, setPage] = usePersistentState(`sm_nav_guardian_${user.id}_page`, { view: LANDING, roomId: '' }, validPage);
  const [returnTo, setReturnTo] = usePersistentState(`sm_nav_guardian_${user.id}_back`, null, (p) => p === null || validPage(p));
  const [childId, setChildId] = useState(''); // '' = all children

  const kids = approvedChildren(db, user.id);
  const view = page.view;
  const isRoomView = ROOM_VIEWS.includes(view);

  // Narrow by child first, then by room. An old room or child that no longer applies simply means "all".
  const childKids = kids.filter((c) => !childId || c.id === childId);
  const rooms = [...new Map(childKids.flatMap((c) => roomsOfStudent(db, c.id)).map((r) => [r.id, r])).values()];
  const room = rooms.find((r) => r.id === page.roomId) || null;
  const kidsInView = room ? childKids.filter((c) => roomsOfStudent(db, c.id).some((r) => r.id === room.id)) : childKids;

  // One function for the bottom bar, bell, chat button and profile menu.
  function go(next, roomId) {
    if (OVERLAYS.includes(next)) {
      if (!OVERLAYS.includes(view)) setReturnTo({ view, roomId: page.roomId });
      return setPage({ view: next, roomId: page.roomId });
    }
    setReturnTo(null);
    if (ROOM_VIEWS.includes(next)) return setPage({ view: next, roomId: roomId !== undefined ? roomId : page.roomId });
    return setPage({ view: LANDING, roomId: '' });
  }

  function back() {
    if (OVERLAYS.includes(view) && returnTo) setPage(returnTo);
    else setPage({ view: LANDING, roomId: '' });
    setReturnTo(null);
  }

  const title = isRoomView && room ? `${view} · ${room.subject}` : view;
  const showFilters = isRoomView && (kids.length > 1 || rooms.length > 1);

  return (
    <Shell {...{ user, logout, theme, toggleTheme, view, title, setView: go }} nav={OVERLAYS.includes(view) ? [] : NAV} onBack={OVERLAYS.includes(view) ? back : undefined}>
      {showFilters && (
        <div className="toolbar">
          {kids.length > 1 && (
            <select value={childId} onChange={(e) => setChildId(e.target.value)} aria-label="Child">
              <option value="">All children</option>
              {kids.map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}
            </select>
          )}
          {rooms.length > 1 && (
            <select value={room ? room.id : ''} onChange={(e) => setPage({ view, roomId: e.target.value })} aria-label="Room">
              <option value="">All rooms</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.subject} · {r.name}</option>)}
            </select>
          )}
        </div>
      )}

      {view === LANDING && <ChildrenTab kids={kids} goLink={() => go('Link a Child')} openRoom={(id, v = 'Updates') => go(v, id)} />}
      {view === 'Attendance' && <AttendanceView kids={kidsInView} room={room} />}
      {view === 'Grades' && <GradesView kids={kidsInView} room={room} />}
      {view === 'Updates' && <UpdatesView kids={kidsInView} room={room} />}
      {view === 'Link a Child' && <LinkChildTab />}
      {view === 'Chat' && <Chat contacts={chatContacts(db, user)} />}
      {view === 'Profile' && <ProfilePanel />}
    </Shell>
  );
}