import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

// True while the guardian has the "Link your child" page open.
export const linkPage = { open: false };

// When one of this guardian's requests gets approved while they are on the link page,
// take them to the home page, where the child now appears.
export function useGoHomeOnApproval(user, setView) {
  const { db } = useApp();
  const count = user.role === 'Guardian'
    ? db.guardianLinks.filter((l) => l.guardianId === user.id && l.status === 'Approved').length
    : 0;
  const before = useRef(count);

  useEffect(() => {
    if (count > before.current && linkPage.open) setView('My Children');
    before.current = count;
  }, [count, setView]);
}