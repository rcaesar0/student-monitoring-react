import React, { useState } from 'react';
import Shell from '../../components/Shell';
import { usePersistentState } from '../../utils/usePersistentState';
import ProfilePanel from '../../components/ProfilePanel';
import Chat from '../../components/Chat';
import { useApp } from '../../context/AppContext';
import { approvedChildren, roomsOfStudent } from '../../utils/selectors';
import { chatContacts } from '../../utils/chat';
import ChildrenTab from './ChildrenTab';
import { AttendanceView, GradesView, UpdatesView } from './ViewTabs';
import LinkChildTab from './LinkChildTab';

const LANDING = 'My Children';
// The bottom nav only exists inside a room the guardian opened. There is no Home item: use the back arrow.
const ROOM_NAV = ['Updates', 'Attendance', 'Grades'];
// Pages opened from the top bar. They have no bottom nav; the back arrow returns to where the guardian was.
const OVERLAYS = ['Chat', 'Profile', 'Link a Child'];

// Guardians are view-only. They see only children the school linked to them.
export default function GuardianDashboard() {
  const { db, user, logout, theme, toggleTheme } = useApp();
  const validPage = (p) => !!p && typeof p.roomId === 'string' && [LANDING, ...ROOM_NAV, ...OVERLAYS].includes(p.view);
  const [page, setPage] = usePersistentState(`sm_nav_guardian_${user.id}_page`, { view: LANDING, roomId: '' }, validPage);
  const [returnTo, setReturnTo] = usePersistentState(`sm_nav_guardian_${user.id}_back`, null, (p) => p === null || validPage(p));

  const kids = approvedChildren(db, user.id);
  const rooms = [...new Map(kids.flatMap((c) => roomsOfStudent(db, c.id)).map((r) => [r.id, r])).values()];
  const room = rooms.find((r) => r.id === page.roomId) || null;
  // If the room disappears (child unlinked, room closed) fall back to the landing page.
  const view = ROOM_NAV.includes(page.view) && !room ? LANDING : page.view;
  const inRoom = ROOM_NAV.includes(view) && !!room;
  const kidsInRoom = room ? kids.filter((c) => roomsOfStudent(db, c.id).some((r) => r.id === room.id)) : kids;

  // One function for the dock, bell, chat button and profile menu.
  function go(next, roomId) {
    if (OVERLAYS.includes(next)) {
      if (!OVERLAYS.includes(view)) setReturnTo({ view, roomId: page.roomId });
      return setPage({ view: next, roomId: page.roomId });
    }
    if (ROOM_NAV.includes(next)) {
      const target = roomId || page.roomId || (rooms.length === 1 ? rooms[0].id : '');
      return setPage(target ? { view: next, roomId: target } : { view: LANDING, roomId: '' });
    }
    setReturnTo(null);
    setPage({ view: LANDING, roomId: '' });
  }

  function back() {
    if (OVERLAYS.includes(view) && returnTo) setPage(returnTo);
    else setPage({ view: LANDING, roomId: '' });
    setReturnTo(null);
  }

  const showBack = view !== LANDING;
  const title = inRoom ? `${view} · ${room.subject}` : view;

  return (
    <Shell {...{ user, logout, theme, toggleTheme, view, title, setView: go }} nav={inRoom ? ROOM_NAV : []} onBack={showBack ? back : undefined}>
      {view === LANDING && <ChildrenTab kids={kids} goLink={() => go('Link a Child')} openRoom={(id, v = ROOM_NAV[0]) => go(v, id)} />}
      {view === 'Attendance' && <AttendanceView kids={kidsInRoom} room={room} />}
      {view === 'Grades' && <GradesView kids={kidsInRoom} room={room} />}
      {view === 'Updates' && <UpdatesView kids={kidsInRoom} room={room} />}
      {view === 'Link a Child' && <LinkChildTab />}
      {view === 'Chat' && <Chat contacts={chatContacts(db, user)} />}
      {view === 'Profile' && <ProfilePanel />}
    </Shell>
  );
}