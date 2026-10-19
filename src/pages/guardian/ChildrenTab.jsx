import React from 'react';
import { Panel, Empty, Badge } from '../../components/UI';
import SchedulePanel from '../../components/SchedulePanel';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { fullName, dateStr, dueInfo } from '../../utils/helpers';
import { roomsOfStudent, attendanceSummary } from '../../utils/selectors';
import { slotsOf } from '../../utils/schedule';
import { isPastDue } from '../../utils/autoArchive';
import { roomStyle } from '../../utils/roomThemes';

// Guardian landing page: today's classes, what is not done yet, then the rooms each child has joined.
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

  // Activities and announcements with a schedule that has not passed yet, soonest first. For viewing only.
  // The time is left out here: just the date and what it is.
  const today = dateStr();
  const notDone = [
    ...db.activities.map((x) => ({ ...x, kind: 'Activity' })),
    ...db.announcements.map((x) => ({ ...x, kind: 'Announcement' })),
  ]
    .filter((x) => x.status !== 'Archived' && x.dueDate && !isPastDue(x) && kidsByRoom.has(x.roomId))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 10)
    .map((x) => ({ ...x, info: dueInfo(x, today) }));

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

      {kids.length > 0 && (
        <SchedulePanel
          slots={slots} showTeacher showKids={kids.length > 1}
          emptyText="No class schedule for today."
        />
      )}

      {kids.length > 0 && (
        <Panel title="Tasks:" actions={notDone.length ? <Badge tone="neutral">{notDone.length}</Badge> : null}>
          {notDone.length ? (
            notDone.map((x) => {
              const room = db.rooms.find((r) => r.id === x.roomId);
              const names = kidsByRoom.get(x.roomId).map((c) => c.firstName).join(', ');
              return (
                <button className="due-row" key={`${x.kind}-${x.id}`} onClick={() => openRoom(x.roomId, 'Updates')}>
                  <span className="due-text">
                    <b>{x.title}</b>
                    <small>{x.kind} · {room?.subject} · {room?.name}{kids.length > 1 ? ` · ${names}` : ''}</small>
                  </span>
                  <Badge tone={x.info.tone}>{x.info.label}</Badge>
                </button>
              );
            })
          ) : (
            <Empty text="Nothing left to do right now." />
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
                  const t = db.teachers.find((x) => x.id === r.teacherId);
                  return (
                    <button className="room-mini" key={r.id} style={roomStyle(r.theme)} onClick={() => openRoom(r.id)}>
                      <b>{r.name}</b>
                      <span>{r.subject}</span>
                      {t && <small>{fullName(t)}</small>}
                      <span className="room-open">Open room <Icon name="chevron" size={14} /></span>
                    </button>
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