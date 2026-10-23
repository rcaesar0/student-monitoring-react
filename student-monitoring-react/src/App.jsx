import React from 'react';
import { useApp } from './context/AppContext';
import Splash from './components/Splash';
import AuthPage from './pages/AuthPage';
import ChangePassword from './pages/auth/ChangePassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import GuardianDashboard from './pages/guardian/GuardianDashboard';

export default function App() {
  const { user } = useApp();

  let screen;
  if (!user) screen = <AuthPage />;
  // Accounts issued by the school start with a temporary password and must change it first.
  else if (user.mustChangePassword) screen = <ChangePassword />;
  else if (user.role === 'Admin') screen = <AdminDashboard />;
  else if (user.role === 'Teacher') screen = <TeacherDashboard />;
  else screen = <GuardianDashboard />;

  return (
    <>
      {screen}
      <Splash />
    </>
  );
}
