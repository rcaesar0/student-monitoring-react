import React from 'react';
import { Panel, Empty, Badge } from './UI';
import { useApp } from '../context/AppContext';
import { fullName } from '../utils/helpers';
import { slotsOnDay, todayName, timeRange } from '../utils/schedule';

// Today's classes only. slots come from slotsOf() (the whole week); this picks the ones that meet today.
// Guardians also see the teacher's name and the child. The admin sets the times, nobody here edits them.
export default function SchedulePanel({ slots, showTeacher = false, showKids = false, title = "Today's schedule", emptyText = 'No class schedule for today.' }) {
  const { db } = useApp();
  const day = todayName();
  const today = slotsOnDay(slots, day);

  return (
    <Panel title={title} actions={<Badge tone="neutral">{day}</Badge>}>
      {today.length ? (
        today.map((s) => {
          const teacher = showTeacher ? db.teachers.find((t) => t.id === s.room.teacherId) : null;
          return (
            <div className="sched-item" key={s.id}>
              <span className="sched-time">{timeRange(s)}</span>
              <span className="sched-info">
                <b>{s.room.subject}</b>
                <small>
                  {s.room.name}
                  {teacher ? ` · ${fullName(teacher)}` : ''}
                  {showKids && s.kids && s.kids.length ? ` · ${s.kids.join(', ')}` : ''}
                </small>
              </span>
            </div>
          );
        })
      ) : (
        <Empty text={emptyText} />
      )}
    </Panel>
  );
}