
import React from 'react';
import { Panel, Empty, Badge } from '../../components/UI';
import { AttachmentList } from '../../components/Attachments';
import { useApp } from '../../context/AppContext';
import { fullName, formatDate, dueInfo, dateStr } from '../../utils/helpers';
import { attendanceSummary, roomsOfStudent } from '../../utils/selectors';
import {
  studentGrade,
  quarterGrades,
  isReleasedTo,
  groupOf,
  categoryOf,
  conductedOf,
  quarterOf,
  fmt,
} from '../../utils/grading';
import { isDone } from '../../utils/autoArchive';
import ChildReportButton from '../../components/ChildReport';
import { GRADING, QUARTERS } from '../../config';
import { useOpenPost, cardProps } from '../../utils/postDetail';

const STATUS_TONE = {
  Present: 'green',
  Late: 'orange',
  Absent: 'red',
  Excused: 'blue',
};

export function AttendanceView({ kids, room }) {
  const { db } = useApp();

  if (!kids.length) {
    return (
      <Panel title="Attendance">
        <Empty text="No linked children." />
      </Panel>
    );
  }

  return kids.map((child) => {
    const sum = attendanceSummary(db, child.id, room?.id);

    const recent = (db.attendance || [])
      .filter(
        (a) =>
          a.studentId === child.id &&
          (!room || a.roomId === room.id)
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);

    return (
      <Panel key={child.id} title={fullName(child)}>
        <div className="pill-row">
          <Badge tone="green">{sum.present} present</Badge>
          <Badge tone="orange">{sum.late} late</Badge>
          <Badge tone="red">{sum.absent} absent</Badge>

          {sum.excused > 0 && (
            <Badge tone="blue">{sum.excused} excused</Badge>
          )}

          {sum.rate !== null && (
            <Badge tone="blue">{sum.rate}% attendance</Badge>
          )}
        </div>

        {recent.length ? (
          recent.map((record) => (
            <div className="mini-row" key={record.id}>
              <span>
                {formatDate(record.date)}
                <small>
                  {db.rooms.find((r) => r.id === record.roomId)?.subject}
                </small>
              </span>

              <Badge tone={STATUS_TONE[record.status] || 'neutral'}>
                {record.status}
              </Badge>
            </div>
          ))
        ) : (
          <p className="muted">No attendance recorded yet.</p>
        )}
      </Panel>
    );
  });
}

export function DashboardAttendanceView({ kids }) {
  const { db } = useApp();

  if (!kids.length) {
    return (
      <Panel title="Attendance">
        <Empty text="No linked children." />
      </Panel>
    );
  }

  return kids.map((child) => {
    const byDate = (db.attendance || [])
      .filter((record) => record.studentId === child.id)
      .reduce((groups, record) => {
        if (!groups[record.date]) groups[record.date] = [];
        groups[record.date].push(record);
        return groups;
      }, {});

    const dates = Object.keys(byDate).sort((a, b) =>
      b.localeCompare(a)
    );

    return (
      <Panel key={child.id} title={fullName(child)}>
        {dates.length ? (
          dates.map((date) => {
            const records = byDate[date];
            const count = (status) =>
              records.filter((record) => record.status === status).length;

            return (
              <div className="dashboard-attendance-date" key={date}>
                <h4>{formatDate(date)}</h4>

                <div className="dashboard-attendance-counts">
                  <span>
                    Present <b>{count('Present')}</b>
                  </span>
                  <span>
                    Absent <b>{count('Absent')}</b>
                  </span>
                  <span>
                    Late <b>{count('Late')}</b>
                  </span>

                  {count('Excused') > 0 && (
                    <span>
                      Excused <b>{count('Excused')}</b>
                    </span>
                  )}
                </div>

                <small className="muted">
                  {records.length} subject attendance record
                  {records.length === 1 ? '' : 's'}
                </small>
              </div>
            );
          })
        ) : (
          <Empty text="No attendance recorded yet." />
        )}
      </Panel>
    );
  });
}

// Dashboard Grades: all four quarters are displayed in one bordered table.

export function GradesView({ kids, room }) {
  const { db } = useApp();

  if (!kids.length) {
    return (
      <Panel title="Grades">
        <Empty text="No linked children." />
      </Panel>
    );
  }

  return (
    <>
      {kids.map((child) => {
        const rooms = room ? [room] : roomsOfStudent(db, child.id);

        // Get the section name from the child's enrolled subject rooms.
        const sectionName = rooms[0]?.name || 'Not assigned';

        return (
          <Panel
            key={child.id}
            title={fullName(child)}
            actions={
              rooms.length ? (
                <ChildReportButton
                  child={child}
                  rooms={rooms}
                  quarter={1}
                />
              ) : null
            }
          >
            <p className="guardian-grade-section">
              Section: {sectionName}
            </p>

            <div className="guardian-grade-table-wrap">
              <table className="guardian-grade-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    {QUARTERS.map((q) => (
                      <th key={q}>Quarter {q}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rooms.map((subjectRoom) => {
                    const grades = quarterGrades(
                      db,
                      subjectRoom.id,
                      child.id,
                      true
                    );

                    return (
                      <tr key={subjectRoom.id}>
                        <td>
                          <strong>{subjectRoom.subject}</strong>
                        </td>

                        {QUARTERS.map((q) => {
                          const grade = grades.find(
                            (item) =>
                              String(item.quarter) === String(q)
                          );

                          return (
                            <td
                              key={q}
                              className="guardian-grade-value"
                            >
                              {grade?.final == null
                                ? '—'
                                : fmt(grade.final)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {!rooms.length && (
                    <tr>
                      <td colSpan={QUARTERS.length + 1}>
                        Not enrolled in a section yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}
    </>
  );
}

function RoomGrades({ room, student, quarter }) {
  const { db } = useApp();
  const { weights, groupLabels } = GRADING;

  const released = (db.assessments || [])
    .filter(
      (assessment) =>
        assessment.roomId === room.id &&
        quarterOf(assessment) === quarter &&
        isReleasedTo(db, assessment, student.id)
    )
    .sort((a, b) =>
      conductedOf(a).localeCompare(conductedOf(b))
    );

  const scoreOf = (assessment) =>
    db.grades.find(
      (grade) => grade.id === `${assessment.id}_${student.id}`
    )?.score;

  const grade = studentGrade(
    db,
    room.id,
    student.id,
    true,
    quarter
  );

  const byQuarter = quarterGrades(
    db,
    room.id,
    student.id,
    true
  );

  return (
    <div className="room-grades">
      <h4 className="mini-h">
        {room.subject} <small>{room.name}</small>
      </h4>

      {released.length ? (
        <>
          {['classStanding', 'examQuiz'].map((group) => {
            const entries = released.filter(
              (assessment) => groupOf(assessment) === group
            );

            if (!entries.length) return null;

            return (
              <div key={group} className="grade-group">
                <div className="grade-group-head">
                  <b>
                    {groupLabels[group]} ({weights[group]}%)
                  </b>
                  <span>{fmt(grade[group])}</span>
                </div>

                {entries.map((assessment) => (
                  <div className="mini-row" key={assessment.id}>
                    <span>
                      {assessment.title}
                      <small>
                        {categoryOf(assessment)} · Conducted{' '}
                        {formatDate(conductedOf(assessment))}
                      </small>
                    </span>

                    <b>
                      {scoreOf(assessment) ?? '—'} / {assessment.total}
                    </b>
                  </div>
                ))}
              </div>
            );
          })}

          {grade.final !== null && (
            <div className="overall-grade">
              <div>
                <small>
                  {grade.complete
                    ? `Overall grade · Quarter ${quarter}`
                    : `Grade so far · Quarter ${quarter}`}
                </small>
                <b>{fmt(grade.final)}</b>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="muted">
          No released grades for Quarter {quarter} yet.
        </p>
      )}

      {byQuarter.some((item) => item.final !== null) && (
        <div className="quarter-row">
          {byQuarter.map((item) => (
            <div
              key={item.quarter}
              className={`quarter-cell ${
                item.quarter === quarter ? 'on' : ''
              }`}
            >
              <small>Q{item.quarter}</small>
              <b>{item.final === null ? '—' : fmt(item.final)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeacherNotes({ kids, roomIds }) {
  const { db, repo, user } = useApp();

  const cutoff = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return dateStr(d);
  })();

  const notes = (db.alerts || [])
    .filter(
      (alert) =>
        alert.kind === 'risk' &&
        roomIds.has(alert.roomId) &&
        kids.some((child) => child.id === alert.studentId) &&
        alert.date >= cutoff &&
        (alert.status || 'Notified') !== 'Resolved'
    )
    .sort((a, b) => (b.at || 0) - (a.at || 0));

  if (!notes.length) return null;

  const acknowledge = (alert) =>
    repo.update('alerts', alert.id, {
      status: 'Acknowledged',
      ackAt: dateStr(),
      ackBy: user.id,
    });

  return (
    <Panel title="Message from the teacher">
      {notes.map((alert) => {
        const child = kids.find((item) => item.id === alert.studentId);
        const teacher = db.teachers.find(
          (item) => item.id === alert.teacherId
        );

        const seen = (alert.status || 'Notified') === 'Acknowledged';

        return (
          <div className="list-card" key={alert.id}>
            <div className="row-actions spread">
              <b>About {child?.firstName || 'your child'}</b>
              <small>
                {formatDate(alert.date)}
                {teacher ? ` · ${fullName(teacher)}` : ''}
              </small>
            </div>

            {alert.message ? (
              <p style={{ whiteSpace: 'pre-line' }}>{alert.message}</p>
            ) : (
              <ul className="reasons">
                {(alert.reasons || []).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}

            {seen ? (
              <small>
                You marked this as seen on {formatDate(alert.ackAt)}.
              </small>
            ) : (
              <button
                className="primary btn-sm"
                onClick={() => acknowledge(alert)}
              >
                I’ve seen this
              </button>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

export function UpdatesView({ kids, room }) {
  const { db } = useApp();
  const openPost = useOpenPost();
  const [tab, setTab] = React.useState('current');

  const roomIds = room
    ? new Set([room.id])
    : new Set(
        kids.flatMap((child) =>
          roomsOfStudent(db, child.id).map((item) => item.id)
        )
      );

  const all = [
    ...(db.announcements || []).map((item) => ({
      ...item,
      kind: 'Announcement',
    })),
    ...(db.activities || []).map((item) => ({
      ...item,
      kind: 'Activity',
    })),
  ].filter((item) => roomIds.has(item.roomId));

  const current = all
    .filter((item) => !isDone(item) && item.status !== 'Archived')
    .sort((a, b) => b.date.localeCompare(a.date));

  const done = all
    .filter(isDone)
    .sort((a, b) =>
      (b.dueDate || '').localeCompare(a.dueDate || '')
    );

  const posts = tab === 'current' ? current : done;

  return (
    <>
      <TeacherNotes kids={kids} roomIds={roomIds} />

      <div className="role-switch">
        <button
          className={tab === 'current' ? 'selected' : ''}
          onClick={() => setTab('current')}
        >
          Current ({current.length})
        </button>

        <button
          className={tab === 'done' ? 'selected' : ''}
          onClick={() => setTab('done')}
        >
          Done ({done.length})
        </button>
      </div>

      <Panel
        title={
          tab === 'current'
            ? 'Class announcements & activities'
            : 'Done'
        }
      >
        {posts.length ? (
          posts.map((post) => (
            <div
              className={`list-card clickable ${
                tab === 'done' ? 'is-done' : ''
              }`}
              key={`${post.kind}-${post.id}`}
              {...cardProps(() =>
                openPost(post, {
                  badge:
                    post.kind === 'Announcement'
                      ? 'Class announcement'
                      : post.kind,
                  room: db.rooms.find(
                    (item) => item.id === post.roomId
                  )?.name,
                })
              )}
            >
              <div className="row-actions spread">
                <b>{post.title}</b>

                <Badge
                  tone={
                    tab === 'done'
                      ? 'neutral'
                      : post.kind === 'Activity'
                        ? 'amber'
                        : 'blue'
                  }
                >
                  {tab === 'done'
                    ? 'Done'
                    : post.kind === 'Announcement'
                      ? 'Class announcement'
                      : post.kind}
                </Badge>
              </div>

              <small>
                {formatDate(post.date)} ·{' '}
                {db.rooms.find((item) => item.id === post.roomId)?.name}
              </small>

              {post.dueDate && (
                <div className="due-line">
                  <Badge tone="neutral">
                    {tab === 'done'
                      ? `Was scheduled ${formatDate(post.dueDate)}`
                      : dueInfo(post).label}
                  </Badge>
                </div>
              )}

              {post.body && <p>{post.body}</p>}
              <AttachmentList files={post.attachments} />
            </div>
          ))
        ) : (
          <Empty
            text={
              tab === 'current'
                ? 'Nothing posted yet.'
                : 'Nothing is done yet.'
            }
          />
        )}
      </Panel>
    </>
  );
}

export function ScoresView({ kids, room }) {
  const { db } = useApp();
  const [quarter, setQuarter] = React.useState(1);

  if (!room) {
    return (
      <Panel title="Scores">
        <Empty text="Open a subject room to view its scores." />
      </Panel>
    );
  }

  if (!kids.length) {
    return (
      <Panel title="Scores">
        <Empty text="No linked children." />
      </Panel>
    );
  }

  const categories = [
    {
      title: 'Assessments/Activities',
      matches: (assessment) =>
        ![
          'Quiz',
          'Quizzes',
          'Exam',
          'Examination',
          'Examinations',
        ].includes(String(categoryOf(assessment)).trim()),
    },
    {
      title: 'Quizzes',
      matches: (assessment) =>
        ['Quiz', 'Quizzes'].includes(
          String(categoryOf(assessment)).trim()
        ),
    },
    {
      title: 'Examinations',
      matches: (assessment) =>
        ['Exam', 'Examination', 'Examinations'].includes(
          String(categoryOf(assessment)).trim()
        ),
    },
  ];

  return (
    <>
      <div
        className="role-switch quarter-switch"
        role="tablist"
        aria-label="Quarter"
      >
        {QUARTERS.map((q) => (
          <button
            key={q}
            type="button"
            className={String(quarter) === String(q) ? 'selected' : ''}
            onClick={() => setQuarter(q)}
            role="tab"
            aria-selected={String(quarter) === String(q)}
          >
            Quarter {q}
          </button>
        ))}
      </div>

      {kids.map((child) => {
        const assessments = (db.assessments || [])
          .filter(
            (assessment) =>
              assessment.roomId === room.id &&
              quarterOf(assessment) === quarter &&
              isReleasedTo(db, assessment, child.id)
          )
          .sort((a, b) =>
            conductedOf(a).localeCompare(conductedOf(b))
          );

        const scoreOf = (assessment) =>
          db.grades.find(
            (grade) => grade.id === `${assessment.id}_${child.id}`
          )?.score;

        return (
          <Panel
            key={child.id}
            title={`${room.subject} · Quarter ${quarter}`}
          >
            {categories.map((category) => {
              const entries = assessments.filter(category.matches);

              return (
                <section className="score-category" key={category.title}>
                  <h3>{category.title}</h3>

                  {entries.length ? (
                    entries.map((assessment) => (
                      <div className="mini-row" key={assessment.id}>
                        <span>
                          {assessment.title}
                          <small>
                            {categoryOf(assessment)} · Conducted{' '}
                            {formatDate(conductedOf(assessment))}
                          </small>
                        </span>

                        <b>
                          {scoreOf(assessment) ?? '—'} / {assessment.total}
                        </b>
                      </div>
                    ))
                  ) : (
                    <p className="muted">
                      No scores available in this category.
                    </p>
                  )}
                </section>
              );
            })}
          </Panel>
        );
      })}
    </>
  );
}
