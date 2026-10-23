import React, { useState } from 'react';
import { Panel, Empty, Badge } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { fullName } from '../../utils/helpers';

const when = (t) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Read-only view of every teacher and guardian conversation, so the school can review them if needed.
export default function ChatLogsTab() {
  const { db } = useApp();
  const [open, setOpen] = useState(null);
  const messages = db.messages || [];

  const people = [...db.teachers, ...db.guardians];
  const nameOf = (id) => { const x = people.find((p) => p.id === id); return x ? fullName(x) : 'Unknown'; };
  const roleOf = (id) => (db.teachers.some((t) => t.id === id) ? 'Teacher' : 'Guardian');

  const threads = [...new Set(messages.map((m) => m.thread))]
    .map((key) => {
      const list = messages.filter((m) => m.thread === key).sort((a, b) => a.at - b.at);
      return { key, list, last: list[list.length - 1] };
    })
    .sort((a, b) => b.last.at - a.last.at);

  return (
    <Panel title={`Chat logs (${threads.length})`}>
      <p className="hint">Read only. Conversations between teachers and guardians can be reviewed by the school administrator.</p>
      {threads.length ? threads.map((t) => {
        const a = t.last.from;
        const b = t.last.to;
        const isOpen = open === t.key;
        return (
          <div className="list-card" key={t.key}>
            <button className="chat-log-head" onClick={() => setOpen(isOpen ? null : t.key)}>
              <span>
                <b>{nameOf(a)} <small>({roleOf(a)})</small> ↔ {nameOf(b)} <small>({roleOf(b)})</small></b>
                <small>Last message {when(t.last.at)}</small>
              </span>
              <Badge tone="blue">{t.list.length}</Badge>
            </button>
            {isOpen && (
              <div className="chat-log-body">
                {t.list.map((m) => (
                  <div className="mini-row" key={m.id}>
                    <span><b>{nameOf(m.from)}</b> <small>{when(m.at)}</small><br />{m.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }) : <Empty text="No conversations yet." />}
    </Panel>
  );
}