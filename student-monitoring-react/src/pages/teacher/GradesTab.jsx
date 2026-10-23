import React, { useEffect, useState } from 'react';
import { Panel, Empty, Modal, Badge } from '../../components/UI';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { fullName, dateStr, formatDate } from '../../utils/helpers';
import { rosterOf } from '../../utils/selectors';
import { GRADING, QUARTERS, DEFAULT_QUARTER } from '../../config';
import { computeGrade, groupOf, categoryOf, conductedOf, quarterOf, fmt, remarkOf } from '../../utils/grading';

// Gradebook for one section, one quarter at a time.
// Table view: every student with every assessment as a column (best on a computer).
// By assessment view: pick one quiz or activity and score the students in a list (best on a phone).
// Activities posted under Posts are added here automatically. Quizzes and exams are added here.
export default function GradesTab({ room }) {
  const { db, repo } = useApp();
  const [quarter, setQuarter] = useState(DEFAULT_QUARTER);
  const [mode, setMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 700 ? 'assess' : 'table'));
  const [pickedId, setPickedId] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | assessment
  const [managing, setManaging] = useState(null); // null | assessment

  const students = rosterOf(db, room.id);
  const releases = db.releases || [];
  const all = db.assessments
    .filter((a) => a.roomId === room.id && quarterOf(a) === quarter)
    .sort((a, b) => conductedOf(a).localeCompare(conductedOf(b)));
  const groups = [
    ['classStanding', all.filter((a) => groupOf(a) === 'classStanding')],
    ['examQuiz', all.filter((a) => groupOf(a) === 'examQuiz')],
  ];
  const ordered = groups.flatMap(([, list]) => list);
  const picked = ordered.find((a) => a.id === pickedId) || ordered[0] || null;
  const { weights, groupLabels, passing } = GRADING;

  const scoreOf = (a, s) => db.grades.find((g) => g.id === `${a.id}_${s.id}`)?.score;
  const results = students.map((s) => ({ s, ...computeGrade(all, (a) => scoreOf(a, s)) }));

  const partlyOut = (a) => !a.released && releases.some((r) => r.assessmentId === a.id);
  const everythingReleased = all.length > 0 && all.every((a) => a.released);

  // Releasing is per assessment: guardians see the scores of released assessments only.
  function releaseEveryone() {
    const pending = all.filter((a) => !a.released);
    if (!pending.length) return;
    if (!window.confirm(`Release ${pending.length} assessment${pending.length > 1 ? 's' : ''} to the guardians of all students?`)) return;
    pending.forEach((a) => repo.update('assessments', a.id, { released: true, releasedAt: dateStr() }));
  }

  function toggleRelease(a) {
    if (a.released) {
      repo.update('assessments', a.id, { released: false, releasedAt: '' });
      releases.filter((r) => r.assessmentId === a.id).forEach((r) => repo.remove('releases', r.id));
    } else {
      repo.update('assessments', a.id, { released: true, releasedAt: dateStr() });
    }
    setManaging(null);
  }

  function setScore(a, s, score) {
    const id = `${a.id}_${s.id}`;
    if (score === undefined) return repo.remove('grades', id);
    repo.set('grades', id, { assessmentId: a.id, studentId: s.id, roomId: room.id, score });
  }

  function removeAssessment(a) {
    if (!window.confirm(`Delete "${a.title}" and all its scores?`)) return;
    db.grades.filter((g) => g.assessmentId === a.id).forEach((g) => repo.remove('grades', g.id));
    releases.filter((r) => r.assessmentId === a.id).forEach((r) => repo.remove('releases', r.id));
    repo.remove('assessments', a.id);
    setManaging(null);
  }

  // Downloads this quarter's gradebook as a CSV file (opens in Excel).
  function exportCsv() {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const num = (n) => (n === null || n === undefined ? '' : Math.round(n * 10) / 10);
    const head = ['Student', ...ordered.map((a) => `${a.title} (/${a.total})`), groupLabels.classStanding, groupLabels.examQuiz, 'Final grade', 'Remarks'];
    const rows = results.map((r) => [
      fullName(r.s),
      ...ordered.map((a) => scoreOf(a, r.s) ?? ''),
      num(r.classStanding), num(r.examQuiz), num(r.final), r.final === null ? '' : r.complete ? remarkOf(r.final) : 'Incomplete',
    ]);
    const csv = [head, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${room.name} - ${room.subject} - Quarter ${quarter}.csv`.replace(/[\\/:*?"<>|]/g, '');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const finals = results.map((r) => r.final).filter((v) => v !== null);
  const avg = finals.length ? finals.reduce((n, v) => n + v, 0) / finals.length : null;
  const statusText = (a) => (a.released ? 'Released' : partlyOut(a) ? 'Partly released' : 'Draft');

  return (
    <>
      <Panel title="Gradebook">
        <div className="role-switch quarter-switch" role="tablist" aria-label="Quarter">
          {QUARTERS.map((q) => (
            <button key={q} className={quarter === q ? 'selected' : ''} onClick={() => setQuarter(q)} role="tab" aria-selected={quarter === q}>
              Quarter {q}
            </button>
          ))}
        </div>

        <p className="hint grade-formula">
          Final grade = {weights.classStanding}% {groupLabels.classStanding} + {weights.examQuiz}% {groupLabels.examQuiz}.
          A grade is marked incomplete until the quarter has both class standing and exam or quiz scores.
          Activities you post appear here automatically.
        </p>

        <div className="grade-bar">
          {students.length > 0 ? (
            <div className="pill-row">
              <Badge tone="blue">Class average {fmt(avg)}</Badge>
              <Badge tone="green">Highest {fmt(finals.length ? Math.max(...finals) : null)}</Badge>
              <Badge tone="orange">Lowest {fmt(finals.length ? Math.min(...finals) : null)}</Badge>
              <Badge tone="red">{finals.filter((v) => v < passing).length} below {passing}</Badge>
            </div>
          ) : <span />}
          <div className="row-actions">
            <button className="btn-sm" onClick={() => setEditing('new')}>Add quiz or exam</button>
            <button className="btn-sm" disabled={!ordered.length || !students.length} onClick={exportCsv}>Export CSV</button>
            <button className="primary btn-sm" disabled={!all.length || everythingReleased} onClick={releaseEveryone}>
              {everythingReleased ? 'All released' : 'Release all'}
            </button>
          </div>
        </div>

        {ordered.length > 0 && (
          <div className="role-switch view-switch">
            <button className={mode === 'assess' ? 'selected' : ''} onClick={() => setMode('assess')}>By assessment</button>
            <button className={mode === 'table' ? 'selected' : ''} onClick={() => setMode('table')}>Table</button>
          </div>
        )}

        {!students.length ? (
          <Empty text="No students in this section." />
        ) : !ordered.length ? (
          <Empty text={`No assessments in Quarter ${quarter} yet. Post an activity or add a quiz or exam to start grading.`} />
        ) : mode === 'assess' && picked ? (
          <div className="assess-pick">
            <select value={picked.id} onChange={(e) => setPickedId(e.target.value)} aria-label="Assessment">
              {ordered.map((a) => <option key={a.id} value={a.id}>{a.title} · {categoryOf(a)} · / {a.total}</option>)}
            </select>
            <div className="assess-meta">
              <label className="assess-date">
                <small>Date conducted</small>
                <input
                  type="date"
                  value={conductedOf(picked)}
                  onChange={(e) => e.target.value && repo.update('assessments', picked.id, { conductedDate: e.target.value })}
                />
              </label>
              <span className={`status-pill ${picked.released ? 'on' : ''}`}>{statusText(picked)}</span>
              <button className="icon-btn" onClick={() => setManaging(picked)} aria-label={`Options for ${picked.title}`}>
                <Icon name="more" size={18} />
              </button>
            </div>
            {students.map((s) => {
              const sc = scoreOf(picked, s);
              return (
                <div className="row" key={s.id}>
                  <div className="row-main"><b>{fullName(s)}</b></div>
                  <div className="score-entry">
                    <ScoreCell value={sc} total={picked.total} onCommit={(v) => setScore(picked, s, v)} />
                    <small>/ {picked.total}</small>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table gradebook">
              <thead>
                <tr>
                  <th rowSpan={2} className="sticky-col">Student</th>
                  {groups.map(([key, list]) => list.length > 0 && (
                    <th key={key} colSpan={list.length} className={`group-head ${key}`}>{groupLabels[key]} ({weights[key]}%)</th>
                  ))}
                  <th colSpan={3} className="group-head result">Result</th>
                </tr>
                <tr>
                  {ordered.map((a) => (
                    <th key={a.id} className="assess-head">
                      <div className="assess-top">
                        <div>
                          <div className="assess-title">{a.title}</div>
                          <small>{categoryOf(a)} · / {a.total}</small>
                        </div>
                        <button className="icon-btn" onClick={() => setManaging(a)} aria-label={`Options for ${a.title}`}>
                          <Icon name="more" size={16} />
                        </button>
                      </div>
                      <label className="assess-date">
                        <small>Date conducted</small>
                        <input
                          type="date"
                          value={conductedOf(a)}
                          onChange={(e) => e.target.value && repo.update('assessments', a.id, { conductedDate: e.target.value })}
                          aria-label={`Date conducted for ${a.title}`}
                        />
                      </label>
                      <span className={`status-pill ${a.released ? 'on' : ''}`}>{statusText(a)}</span>
                    </th>
                  ))}
                  <th>{groupLabels.classStanding}<small>{weights.classStanding}%</small></th>
                  <th>{groupLabels.examQuiz}<small>{weights.examQuiz}%</small></th>
                  <th>Final grade</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.s.id}>
                    <td className="sticky-col"><b>{fullName(r.s)}</b></td>
                    {ordered.map((a) => (
                      <td key={a.id}>
                        <ScoreCell value={scoreOf(a, r.s)} total={a.total} onCommit={(v) => setScore(a, r.s, v)} />
                      </td>
                    ))}
                    <td>{fmt(r.classStanding)}</td>
                    <td>{fmt(r.examQuiz)}</td>
                    <td className="final-cell">
                      <b>{fmt(r.final)}</b>
                      {r.final !== null && (r.complete
                        ? <small className={r.final >= passing ? 'pass' : 'fail'}>{remarkOf(r.final)}</small>
                        : <small>Incomplete</small>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="hint">Leave a score empty if the work is not graded yet. Enter 0 for work that was not handed in. Guardians only see assessments you release, and they get a notification when you do.</p>
      </Panel>

      {managing && (
        <Modal title={managing.title} onClose={() => setManaging(null)}>
          <small>{categoryOf(managing)} · / {managing.total} · Quarter {quarterOf(managing)} · Conducted {formatDate(conductedOf(managing))} · {statusText(managing)}</small>
          <div className="manage-actions">
            <button className="primary wide" onClick={() => toggleRelease(managing)}>
              {managing.released ? 'Hide from guardians' : 'Release to all guardians'}
            </button>
            <button className="wide" onClick={() => { setEditing(managing); setManaging(null); }}>Edit</button>
            <button className="danger-outline wide" onClick={() => removeAssessment(managing)}>Delete</button>
          </div>
        </Modal>
      )}

      {editing && (
        <AssessmentModal
          initial={editing === 'new' ? null : editing}
          defaultQuarter={quarter}
          onClose={() => setEditing(null)}
          onSave={(f) => {
            const data = { title: f.title.trim(), category: f.category, total: Number(f.total), conductedDate: f.conductedDate, quarter: Number(f.quarter) };
            if (editing === 'new') repo.add('assessments', { ...data, roomId: room.id, released: false, date: dateStr() });
            else repo.update('assessments', editing.id, data);
            if (Number(f.quarter) !== quarter) setQuarter(Number(f.quarter));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

// One score box. Keeps what you type (so 7.5 works) and saves valid numbers immediately.
function ScoreCell({ value, total, onCommit }) {
  const show = (v) => (v === undefined ? '' : String(v));
  const [text, setText] = useState(show(value));

  useEffect(() => {
    if (!(text === '' && value === undefined) && Number(text) !== value) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function change(e) {
    const raw = e.target.value;
    if (raw === '') { setText(''); return onCommit(undefined); }
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    if (n > total) { setText(String(total)); return onCommit(total); }
    setText(raw);
    onCommit(n);
  }

  return <input className="cell" type="number" min="0" max={total} step="any" value={text} onChange={change} aria-label="Score" />;
}

function AssessmentModal({ initial, defaultQuarter, onClose, onSave }) {
  const [f, setF] = useState({
    title: initial?.title || '',
    category: initial ? categoryOf(initial) : 'Quiz',
    total: initial?.total ?? 10,
    conductedDate: initial ? conductedOf(initial) : dateStr(),
    quarter: initial ? quarterOf(initial) : defaultQuarter,
  });
  const [error, setError] = useState('');
  const { groupLabels, categories, weights } = GRADING;

  function submit(e) {
    e.preventDefault();
    if (!f.title.trim()) return setError('Give the assessment a title.');
    if (!(Number(f.total) > 0)) return setError('Total points must be more than 0.');
    if (!f.conductedDate) return setError('Pick the date it was conducted.');
    onSave(f);
  }

  return (
    <Modal title={initial ? 'Edit assessment' : 'Add quiz or exam'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid2">
          <label>Title<input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Quiz 1" /></label>
          <label>Total points<input type="number" min="1" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></label>
        </div>
        <div className="grid2">
          <label>
            Date conducted
            <input type="date" value={f.conductedDate} onChange={(e) => setF({ ...f, conductedDate: e.target.value })} />
          </label>
          <label>
            Quarter
            <select value={f.quarter} onChange={(e) => setF({ ...f, quarter: e.target.value })}>
              {QUARTERS.map((q) => <option key={q} value={q}>Quarter {q}</option>)}
            </select>
          </label>
        </div>
        <label>
          Type
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {Object.keys(groupLabels).map((g) => (
              <optgroup key={g} label={`${groupLabels[g]} (${weights[g]}%)`}>
                {Object.keys(categories).filter((c) => categories[c] === g).map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">{initial ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </Modal>
  );
}