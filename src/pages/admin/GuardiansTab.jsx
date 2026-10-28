import React, { useState } from 'react';
import { Panel, Empty, Badge, Avatar } from '../../components/UI';
import CredentialsModal from '../../components/CredentialsModal';
import UndoBar from '../../components/UndoBar';
import { useApp } from '../../context/AppContext';
import { fullName, initials, makeTempPassword, formatDate, dateStr } from '../../utils/helpers';
import { showPhone } from '../../utils/phone';
import { confirmDialog } from '../../utils/dialog';

const TONE = { Approved: 'green', Pending: 'amber', Declined: 'red', Revoked: 'red' };

export default function GuardiansTab() {
  const { db, repo } = useApp();
  const [creds, setCreds] = useState(null);
  const [undo, setUndo] = useState(null); // { id, name }
  const guardians = db.guardians.filter((g) => g.status === 'Active');

  const linksOf = (gid) => db.guardianLinks.filter((l) => l.guardianId === gid);
  const studentOf = (id) => db.students.find((s) => s.id === id);
  const signIn = (g) => g.email || showPhone(g.phone) || '—';
  const approve = (l) => repo.update('guardianLinks', l.id, { status: 'Approved', approvedAt: dateStr() });
  const restore = (l) => repo.update('guardianLinks', l.id, { status: 'Approved' });

  function reset(g) {
    const password = makeTempPassword();
    repo.update('guardians', g.id, { password, mustChangePassword: true, failedLogins: 0, lockedLoginUntil: 0 });
    setCreds({
      title: 'Password reset',
      lines: [['Sign-in', signIn(g)], ['Temporary password', password]],
      note: 'The guardian will be asked to set a new password at next sign-in.',
    });
  }

  // Moves the guardian to the Archives page. A short Undo bar brings them back.
  function archive(g) {
    repo.update('guardians', g.id, { status: 'Archived' });
    setUndo({ id: g.id, name: fullName(g) });
  }

  function undoArchive() {
    if (!undo) return;
    repo.update('guardians', undo.id, { status: 'Active' });
    setUndo(null);
  }

  // Removes the account for good, together with its links to children.
  async function remove(g) {
    const links = linksOf(g.id);
    const ok = await confirmDialog({
      title: `Delete ${fullName(g)}?`,
      message: links.length
        ? `This removes the account and its ${links.length} link${links.length === 1 ? '' : 's'} to children for good. To keep it for later, use Archive instead.`
        : 'This removes the account for good. To keep it for later, use Archive instead.',
      confirmText: 'Delete', tone: 'danger',
    });
    if (!ok) return;
    links.forEach((l) => repo.remove('guardianLinks', l.id));
    repo.remove('guardians', g.id);
  }

  async function revoke(l, s) {
    const ok = await confirmDialog({
      title: 'Revoke this link?',
      message: `The guardian will no longer see ${s ? fullName(s) : 'this student'}. You can restore it later here or from Archives.`,
      confirmText: 'Revoke', tone: 'danger',
    });
    if (ok) repo.update('guardianLinks', l.id, { status: 'Revoked' });
  }

  return (
    <>
      <Panel title={`Guardians (${guardians.length})`}>
        {guardians.length ? (
          guardians.map((g) => (
            <div className="guardian-block" key={g.id}>
              <div className="row">
                <div className="row-main">
                  <Avatar letter={initials(g)} />
                  <div><b>{fullName(g)}</b><small>{signIn(g)}</small></div>
                </div>
                <div className="row-actions">
                  <button className="btn-sm" onClick={() => reset(g)}>Reset password</button>
                  <button className="btn-sm" onClick={() => archive(g)}>Archive</button>
                  <button className="danger-outline btn-sm" onClick={() => remove(g)}>Delete</button>
                </div>
              </div>
              {linksOf(g.id).map((l) => {
                const s = studentOf(l.studentId);
                const how = l.withCode ? 'entered the link code' : l.viaAdmin ? 'no code, used the birthdate' : 'sent to the teacher';
                return (
                  <div className="link-row" key={l.id}>
                    <span>
                      {s ? fullName(s) : 'Unknown student'}
                      <small>{how} · {formatDate(l.createdAt)}</small>
                    </span>
                    <div className="row-actions">
                      <Badge tone={TONE[l.status]}>{l.status}</Badge>
                      {l.status === 'Pending' && <button className="btn-sm" onClick={() => approve(l)}>Approve</button>}
                      {l.status === 'Pending' && <button className="danger-outline btn-sm" onClick={() => repo.update('guardianLinks', l.id, { status: 'Declined' })}>Decline</button>}
                      {l.status === 'Approved' && (
                        <button className="danger-outline btn-sm" onClick={() => revoke(l, s)}>Revoke</button>
                      )}
                      {l.status === 'Revoked' && <button className="btn-sm" onClick={() => restore(l)}>Restore</button>}
                    </div>
                  </div>
                );
              })}
              {!linksOf(g.id).length && <small className="link-row">No children linked yet.</small>}
            </div>
          ))
        ) : (
          <Empty text="No guardians have signed up yet." />
        )}
      </Panel>

      {undo && (
        <UndoBar
          key={undo.id}
          message={`${undo.name} moved to Archives`}
          onUndo={undoArchive}
          onClose={() => setUndo(null)}
        />
      )}

      {creds && <CredentialsModal {...creds} onClose={() => setCreds(null)} />}
    </>
  );
}