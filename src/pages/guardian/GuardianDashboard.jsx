
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
import {
  AttendanceView,
  DashboardAttendanceView,
  GradesView,
  UpdatesView,
  ScoresView,
} from './ViewTabs';
import LinkChildTab from './LinkChildTab';

const LANDING = 'My Children';

const ROOM_VIEWS = ['Announcements', 'Room Attendance', 'Scores'];
const OVERLAYS = ['Chat', 'Profile', 'Link a Child'];

export default function GuardianDashboard() {
  const { db, user, logout, theme, toggleTheme } = useApp();

  const validViews = [
    LANDING,
    'My Child',
    'Attendance',
    'Grades',
    ...ROOM_VIEWS,
    ...OVERLAYS,
  ];

  const validPage = (page) =>
    !!page &&
    typeof page.roomId === 'string' &&
    validViews.includes(page.view);

  const [page, setPage] = usePersistentState(
    `sm_nav_guardian_${user.id}_page`,
    { view: LANDING, roomId: '' },
    validPage
  );

  const [returnTo, setReturnTo] = usePersistentState(
    `sm_nav_guardian_${user.id}_back`,
    null,
    (value) => value === null || validPage(value)
  );

  const [childId, setChildId] = useState('');

  const kids = approvedChildren(db, user.id);
  const view = page.view;

  const inRoom = ROOM_VIEWS.includes(view) && !!page.roomId;
  const isOverlay = OVERLAYS.includes(view);

  const childKids = kids.filter(
    (child) => !childId || child.id === childId
  );

  const rooms = [
    ...new Map(
      childKids
        .flatMap((child) => roomsOfStudent(db, child.id))
        .map((room) => [room.id, room])
    ).values(),
  ];

  const room = rooms.find((item) => item.id === page.roomId) || null;

  const kidsInRoom = room
    ? childKids.filter((child) =>
        roomsOfStudent(db, child.id).some(
          (item) => item.id === room.id
        )
      )
    : childKids;

  const homeLabel = kids.length === 1 ? 'My Child' : 'My Children';

  const dashboardNav = [homeLabel, 'Attendance', 'Grades'];

  function go(next, roomId) {
    if (OVERLAYS.includes(next)) {
      if (!isOverlay) {
        setReturnTo({ view, roomId: page.roomId });
      }

      setPage({ view: next, roomId: page.roomId });
      return;
    }

    setReturnTo(null);

    if (next === 'My Child' || next === 'My Children') {
      setPage({ view: LANDING, roomId: '' });
      return;
    }

    if (next === 'Attendance') {
      setPage({ view: 'Attendance', roomId: '' });
      return;
    }

    if (next === 'Grades') {
      setPage({ view: 'Grades', roomId: '' });
      return;
    }

    if (ROOM_VIEWS.includes(next)) {
      setPage({
        view: next,
        roomId: roomId !== undefined ? roomId : page.roomId,
      });
      return;
    }

    setPage({ view: LANDING, roomId: '' });
  }

  function back() {
    if (isOverlay && returnTo) {
      setPage(returnTo);
    } else {
      setPage({ view: LANDING, roomId: '' });
    }

    setReturnTo(null);
  }

  const title = inRoom && room
    ? `${room.subject} · ${room.name}`
    : isOverlay
      ? view
      : view === LANDING
        ? homeLabel
        : view;

  // Shell compares its view prop against nav labels to determine the active item.
  // The stored landing page is always "My Children", so normalize it for one child.
  const shellView = view === LANDING ? homeLabel : view;

  return (
    <Shell
      user={user}
      logout={logout}
      theme={theme}
      toggleTheme={toggleTheme}
      view={shellView}
      title={title}
      setView={go}
      nav={inRoom || isOverlay ? [] : dashboardNav}
      onBack={inRoom || isOverlay ? back : undefined}
    >
      {view === LANDING && (
        <ChildrenTab
          kids={kids}
          goLink={() => go('Link a Child')}
          openRoom={(id) => go('Announcements', id)}
        />
      )}

      {view === 'Attendance' && !inRoom && (
        <DashboardAttendanceView
          kids={kids.filter((child) => !childId || child.id === childId)}
        />
      )}

      {view === 'Grades' && !inRoom && (
        <GradesView
          kids={kids.filter((child) => !childId || child.id === childId)}
          room={null}
        />
      )}

      {inRoom && room && view === 'Announcements' && (
        <UpdatesView kids={kidsInRoom} room={room} />
      )}

      {inRoom && room && view === 'Room Attendance' && (
        <AttendanceView kids={kidsInRoom} room={room} />
      )}

      {inRoom && room && view === 'Scores' && (
        <ScoresView kids={kidsInRoom} room={room} />
      )}

      {view === 'Link a Child' && <LinkChildTab />}

      {view === 'Chat' && (
        <Chat contacts={chatContacts(db, user)} />
      )}

      {view === 'Profile' && <ProfilePanel />}
    </Shell>
  );
}
