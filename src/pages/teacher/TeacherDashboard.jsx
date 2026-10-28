import React, { useState } from 'react';
import Shell from '../../components/Shell';
import { usePersistentState } from '../../utils/usePersistentState';
import ProfilePanel from '../../components/ProfilePanel';
import RoomPicker from '../../components/RoomPicker';
import Chat from '../../components/Chat';
import SchedulePanel from '../../components/SchedulePanel';
import SchoolPosts from '../../components/SchoolPosts';
import EarlyWarningPanel from '../../components/EarlyWarningPanel';
import { Panel, Empty, Badge } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { teacherAttention } from '../../utils/attention';
import { chatContacts } from '../../utils/chat';
import { slotsOf } from '../../utils/schedule';
import { roomStyle } from '../../utils/roomThemes';
import Icon from '../../components/Icon';
import RoomsTab from './RoomsTab';
import AttendanceTab from './AttendanceTab';
import GradesTab from './GradesTab';
import PostsTab from './PostsTab';
import ArchivedPosts from './ArchivedPosts';
import CalendarPanel from './CalendarPanel';
import RequestsTab from './RequestsTab';

// Requests open from the bell; Profile from the top-right menu.
const NAV = ['Dashboard', 'My Rooms', 'Attendance', 'Grades', 'Posts'];
// Pages opened from the top bar. They are not in the bottom nav, so they get a back arrow.
const OVERLAYS = ['Chat', 'Requests', 'Profile'];
const NEEDS_ROOM = ['My Rooms', 'Attendance', 'Grades', 'Posts'];

export default function TeacherDashboard() {
  const { db, user, logout, theme, toggleTheme } = useApp();
  // Remembered across a reload, so the teacher stays on the page they were on.
  const [view, setView] = usePersistentState(`sm_nav_teacher_${user.id}_view`, 'Dashboard', (v) => [...NAV, ...OVERLAYS].includes(v));
  const [roomId, setRoomId] = usePersistentState(`sm_nav_teacher_${user.id}_room`, '', (v) => typeof v === 'string');

  // Rooms are assigned by the admin. Teachers never create their own.
  const rooms = db.rooms.filter((r) => r.teacherId === user.id && r.status === 'Active');
  const room = rooms.find((r) => r.id === roomId) || rooms[0] || null;
  // One list of what still needs doing. The dashboard shows it and the red dots on the nav use it.
  const attention = teacherAttention(db, rooms);
  const has = (kind) => attention.some((x) => x.kind === kind);
  const badges = { Dashboard: attention.length > 0, Attendance: has('attendance'), Grades: has('grades') };

  const open = (nextView, nextRoomId) => {
    if (nextRoomId) setRoomId(nextRoomId);
    setView(nextView);
  };

  const needsRoom = NEEDS_ROOM.includes(view);

  return (
    <Shell {...{ user, logout, theme, toggleTheme, nav: NAV, view, setView, badges }} onBack={OVERLAYS.includes(view) ? () => setView('Dashboard') : undefined}>
      {needsRoom && rooms.length > 1 && (
        <div className="toolbar">
          <select value={room.id} onChange={(e) => setRoomId(e.target.value)}>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.subject}</option>)}
          </select>
        </div>
      )}

      {needsRoom && !room && (
        <Panel title={view}><Empty text="No section assigned to you yet. Please ask the administrator." /></Panel>
      )}

      {view === 'Dashboard' && <Overview rooms={rooms} attention={attention} open={open} />}
      {needsRoom && room && view === 'My Rooms' && <RoomsTab room={room} />}
      {needsRoom && room && view === 'Attendance' && <AttendanceTab room={room} />}
      {needsRoom && room && view === 'Grades' && <GradesTab room={room} />}
      {needsRoom && room && view === 'Posts' && <PostsHub room={room} />}
      {view === 'Requests' && <RequestsTab rooms={rooms} />}
      {view === 'Chat' && <Chat contacts={chatContacts(db, user)} />}
      {view === 'Profile' && <ProfilePanel />}
    </Shell>
  );
}

// Announcements, activities and the archive share one tab with a switch.
function PostsHub({ room }) {
  const [kind, setKind] = useState('announcements');
  return (
    <>
      <div className="role-switch">
        <button className={kind === 'announcements' ? 'selected' : ''} onClick={() => setKind('announcements')}>Announcements</button>
        <button className={kind === 'activities' ? 'selected' : ''} onClick={() => setKind('activities')}>Activities</button>
        <button className={kind === 'archive' ? 'selected' : ''} onClick={() => setKind('archive')}>Archive</button>
      </div>
      {kind === 'announcements' && <PostsTab key="a" room={room} collection="announcements" label="Announcement" />}
      {kind === 'activities' && <PostsTab key="b" room={room} collection="activities" label="Activity" />}
      {kind === 'archive' && <ArchivedPosts room={room} />}
    </>
  );
}

// The dashboard answers "what needs me today?" across all rooms. The tabs only show one room at a time.
// Order: things to do first (needs attention, schedule, early warning), then school news, then rooms and calendar.
// Room announcements are never shown here. They live in Posts, inside each room.
function Overview({ rooms, attention, open }) {
  const [picking, setPicking] = useState(null);

  return (
    <>
      <Panel title="Needs attention" actions={attention.length ? <Badge tone="red">{attention.length}</Badge> : null}>
        {attention.length ? (
          attention.map((x) => (
            <button className="attention-row" key={x.id} onClick={() => open(x.view, x.roomId)}>
              <span className={`attention-dot ${x.kind}`} />
              <span className="attention-text"><b>{x.text}</b><small>{x.sub}</small></span>
              <Icon name="chevron" size={18} />
            </button>
          ))
        ) : (
          <Empty text="All caught up. Nothing needs your attention right now." />
        )}
      </Panel>

      <SchedulePanel slots={slotsOf(rooms)} emptyText="No class schedule for today." />

      <EarlyWarningPanel rooms={rooms} />

      <SchoolPosts />

      <Panel title="My rooms">
        {rooms.length ? (
          <div className="rooms-box">
            <div className="room-list">
              {rooms.map((r) => (
                <div className="room-card2" key={r.id}>
                  <button className="room-banner" style={roomStyle(r.theme)} onClick={() => open('My Rooms', r.id)}>
                    <b>{r.name}</b>
                    <span>{r.subject}</span>
                  </button>
                  <div className="room-body">
                    <div className="room-detail"><small>Grade level</small><b>{r.gradeLevel}</b></div>
                    <div className="room-detail"><small>Subject</small><b>{r.subject}</b></div>
                    <button className="btn-sm" onClick={() => setPicking(r)}>Change color</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Empty text="No section assigned to you yet. Please ask the administrator." />
        )}
      </Panel>

      <CalendarPanel />

      {picking && <RoomPicker room={picking} onClose={() => setPicking(null)} />}
    </>
  );
}