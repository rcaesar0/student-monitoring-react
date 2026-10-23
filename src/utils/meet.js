// Google Meet for classrooms. The teacher starts a meeting in Google Meet and shares its link with the room.
// Creating the link automatically needs a Google sign-in and a backend, so the teacher pastes it for now.
export const MEET_RE = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;
export const MEET_HOURS = 12;

// A shared meeting is "live" for 12 hours, then it disappears by itself.
export const isLive = (room) => !!room?.meet?.link && Date.now() - room.meet.at < MEET_HOURS * 3600000;

// Finds the meeting link in whatever the teacher pasted. Returns '' when it is not a Google Meet link.
export const meetLinkFrom = (text) => {
  const m = String(text || '').match(MEET_RE);
  return m ? m[0].toLowerCase() : '';
};