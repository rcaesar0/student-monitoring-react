# Student Monitoring (React + Vite)

A single-school, Google-Classroom-style app with three roles: **Admin**, **Teacher**, **Guardian**.
Guardians are view-only: they see attendance, released grades, activities and announcements for their own child.

## Run in VS Code
1. Install **Node.js 18+**.
2. Open this folder in VS Code (`File > Open Folder`).
3. In the terminal: `npm install` then `npm run dev` (opens http://localhost:5173).
4. On a phone on the same Wi-Fi, open the "Network" address Vite prints.

## Demo accounts
| Role     | Email                | Password    |
|----------|----------------------|-------------|
| Admin    | admin@school.local   | admin123    |
| Teacher  | teacher@school.local | teacher123  |
| Guardian | guardian@gmail.com   | guardian123 |

Link-a-child demo (guardian): room code `MATH6A`, LRN `100000000001`, birthdate `2014-03-14`.
To reset all data, clear the site's localStorage in browser DevTools.

## Layout
- Floating, blurred bottom nav with only the everyday pages (icon + label).
- Top right: notification bell and the profile menu (Edit profile, dark/light mode, Sign out).
- Teacher: guardian requests open from the bell. Admin: Archives is in the profile menu.
- Profile picture: choose, crop, pick a filter, save. Stored as a small image on the user record
  (move it to Firebase Storage when Firebase is connected).
- Grade levels are limited to Grade 1 to Grade 6 (`GRADE_LEVELS` in `src/config.js`).

## How it works
**Admin sets up the school.** Students (add or CSV import) → Teachers (generates a school
account + temporary password) → Sections (assign a teacher, enroll students).

**Teacher** sees only the sections assigned to them, with students already listed. They take
attendance, enter grades (Draft until Released), post activities/announcements, share the room
code, and approve guardian requests. First login forces a password change.

**Guardian** signs up, then links a child with *room code + child's LRN + birthdate*. The teacher
approves. Linking happens once per child; the guardian then sees all of that child's classes.
Five wrong attempts lock the form for 15 minutes.

## Project structure
```
src/
  config.js            school settings (domain, limits)
  context/             app state + the repo layer (add/set/update/remove)
  data/seed.js         demo data (one object per future Firestore collection)
  services/            storage (localStorage), auth, firebase (not yet used)
  utils/               helpers.js, selectors.js
  components/          Shell, UI, ProfilePanel, CredentialsModal
  pages/auth|admin|teacher|guardian
firestore.rules        security rules for the Firebase step
```

## Next step: Firebase
All pages talk to data only through `repo` in `context/AppContext.jsx`, so connecting Firestore
means re-implementing that one block. Fill `.env` (see `.env.example`), then use `firestore.rules`.
Teacher/guardian account creation and the child-linking check should become Cloud Functions.
