import React from 'react';
import { Panel, Empty, Badge } from '../../components/UI';
import SchedulePanel from '../../components/SchedulePanel';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { fullName, dateStr, dueInfo } from '../../utils/helpers';
import { roomsOfStudent, attendanceSummary } from '../../utils/selectors';
import { slotsOf } from '../../utils/schedule';
import { isPastDue } from '../../utils/autoArchive';
import { isLive } from '../../utils/meet';
import { roomStyle } from '../../utils/roomThemes';

// Guardian landing page: live classes, class schedule, what is coming up, then the rooms each child has joined.
// Tapping a room opens it (and only then does the bottom nav appear).
export default function ChildrenTab({ kids, goLink, openRoom }) {
  const { db, repo, user } = useApp();
  const pending = db.guardianLinks.filter((l) => l.guardianId === user.id && l.status === 'Pending');

  // Declined or removed requests stay visible until the guardian dismisses them.
  const notes = db.guardianLinks.filter((l) => l.guardianId === user.id && (l.status === 'Declined' || l.status === 'Revoked') && !l.dismissed);

  function unlink(child) {
    if (!window.confirm(`Unlink ${fullName(child)} from your account? You can link again later with the room code.`)) return;
    db.guardianLinks.filter((l) => l.guardianId === user.id && l.studentId === child.id).forEach((l) => repo.remove('guardianLinks', l.id));
  }

  // Which of this guardian's children are in each room.
  const kidsByRoom = new Map();
  kids.forEach((c) => roomsOfStudent(db, c.id).forEach((r) => kidsByRoom.set(r.id, [...(kidsByRoom.get(r.id) || []), c])));

  // Weekly class times of those rooms, with the teacher's name and the child.
  const allRooms = [...kidsByRoom.keys()].map((id) => db.rooms.find((r) => r.id === id)).filter(Boolean);
  const slots = slotsOf(allRooms).map((s) => ({ ...s, kids: kidsByRoom.get(s.room.id).map((c) => c.firstName) }));
  const liveRooms = allRooms.filter(isLive);
  const teacherOf = (room) => db.teachers.find((x) => x.id === room.teacherId);

  // Scheduled activities that have not passed yet, soonest first. For viewing only.
  const today = dateStr();
  const upcoming = db.activities
    .filter((x) => x.status !== 'Archived' && x.dueDate && !isPastDue(x) && kidsByRoom.has(x.roomId))
    .sort((a, b) => `${a.dueDate} ${a.dueTime || ''}`.localeCompare(`${b.dueDate} ${b.dueTime || ''}`))
    .slice(0, 10)
    .map((x) => ({ ...x, info: dueInfo({ ...x, kind: 'Activity' }, today) }));

  return (
    <>
      {pending.map((l) => {
        const s = db.students.find((x) => x.id === l.studentId);
        return (
          <div className="info pending-note" key={l.id}>
            {l.viaAdmin ? 'Waiting for the school office to approve your request for' : 'Waiting for the teacher to approve your request for'} <b>{s ? fullName(s) : 'your child'}</b>.
          </div>
        );
      })}

      {notes.map((l) => {
        const s = db.students.find((x) => x.id === l.studentId);
        return (
          <div className="error pending-note note-row" key={l.id}>
            <span>
              {l.status === 'Declined'
                ? <>The teacher declined your request for <b>{s ? fullName(s) : 'your child'}</b>. You can ask again from Link a child.</>
                : <>Your link to <b>{s ? fullName(s) : 'your child'}</b> was removed by the school. Please contact the administrator.</>}
            </span>
            <button className="btn-sm" onClick={() => repo.update('guardianLinks', l.id, { dismissed: true })}>Dismiss</button>
          </div>
        );
      })}

      {liveRooms.length > 0 && (
        <Panel title="Live class" actions={<Badge tone="green">Live</Badge>}>
          {liveRooms.map((r) => {
            const t = teacherOf(r);
            return (
              <div className="live-row" key={r.id}>
                <span className="due-text">
                  <b>{r.subject}</b>
                  <small>{r.name}{t ? ` · ${fullName(t)}` : ''}</small>
                </span>
                <a className="join-live" href={r.meet.link} target="_blank" rel="noopener noreferrer">Join on Google Meet</a>
              </div>
            );
          })}
        </Panel>
      )}

      {kids.length > 0 && (
        <SchedulePanel
          slots={slots} showTeacher showKids={kids.length > 1}
          emptyText="No class schedule yet. The teacher adds the class times."
        />
      )}

      {kids.length > 0 && (
        <Panel title="Upcoming schedule" actions={upcoming.length ? <Badge tone="neutral">{upcoming.length}</Badge> : null}>
          {upcoming.length ? (
            upcoming.map((x) => {
              const room = db.rooms.find((r) => r.id === x.roomId);
              const names = kidsByRoom.get(x.roomId).map((c) => c.firstName).join(', ');
              return (
                <button className="due-row" key={x.id} onClick={() => openRoom(x.roomId, 'Updates')}>
                  <span className="due-text">
                    <b>{x.title}</b>
                    <small>{room?.subject} · {room?.name}{kids.length > 1 ? ` · ${names}` : ''}</small>
                  </span>
                  <Badge tone={x.info.tone}>{x.info.label}</Badge>
                </button>
              );
            })
          ) : (
            <Empty text="Nothing scheduled right now." />
          )}
        </Panel>
      )}

      {kids.length ? (
        kids.map((c) => {
          const rooms = roomsOfStudent(db, c.id);
          const sum = attendanceSummary(db, c.id);
          return (
            <Panel key={c.id} title={fullName(c)} actions={<div className="row-actions"><Badge tone="blue">{c.grade || 'Student'}</Badge><button className="danger-outline btn-sm" onClick={() => unlink(c)}>Unlink</button></div>}>
              <div className="child-head">
                <b>Attendance: {sum.rate === null ? 'No records yet' : `${sum.rate}%`}</b>
                <small>{sum.present} present · {sum.late} late · {sum.absent} absent{sum.excused ? ` · ${sum.excused} excused` : ''}</small>
              </div>
              <h4 className="mini-h">Rooms</h4>
              <div className="room-list">
                {rooms.map((r) => {
                  const t = teacherOf(r);
                  return (
                    <div className="room-wrap" key={r.id}>
                      <button className="room-mini" style={roomStyle(r.theme)} onClick={() => openRoom(r.id)}>
                        <b>{r.name}</b>
                        <span>{r.subject}</span>
                        {t && <small>{fullName(t)}</small>}
                        <span className="room-open">Open room <Icon name="chevron" size={14} /></span>
                      </button>
                      {isLive(r) && (
                        <a className="join-live join-room" href={r.meet.link} target="_blank" rel="noopener noreferrer">Join class on Google Meet</a>
                      )}
                    </div>
                  );
                })}
                {!rooms.length && <p className="muted">Not enrolled in a room yet.</p>}
              </div>
            </Panel>
          );
        })
      ) : (
        <Panel title="My Children">
          <Empty text="No child linked yet." />
          <button className="primary wide" onClick={goLink}>Link a child</button>
        </Panel>
      )}
      {kids.length > 0 && <button className="wide" onClick={goLink}>+ Link another child</button>}
    </>
  );
}