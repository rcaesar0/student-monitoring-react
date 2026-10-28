import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import LanguageSwitch from '../components/LanguageSwitch';
import Login from './auth/Login';
import Signup from './auth/Signup';
import ForgotPassword from './auth/ForgotPassword';
import TeacherPortal from './auth/TeacherPortal';
import TeacherRegistration from './auth/TeacherRegistration';
import TeacherActivation from './auth/TeacherActivation';
import { useT } from '../utils/i18n';

export default function AuthPage() {
  const { theme, toggleTheme } = useApp();
  const [page, setPage] = useState('login');
  const t = useT();

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-brand">
          <img
            src="/logo-app.png"
            className="auth-logo"
            alt="Student Monitoring logo"
          />
          <h1>Student Monitoring</h1>
          <p>
            {t(
              'See attendance, grades and updates for your child, all in one place.'
            )}
          </p>
        </div>

        <div className="auth-wrap">
          <div className="auth-top">
            <LanguageSwitch />

            <button
              type="button"
              className="theme-float"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <Icon
                name={theme === 'light' ? 'moon' : 'sun'}
                size={20}
              />
            </button>
          </div>

          <div className="auth-card">
            {page === 'login' && <Login go={setPage} />}
            {page === 'signup' && <Signup go={setPage} />}
            {page === 'forgot' && <ForgotPassword go={setPage} />}
            {page === 'teacher' && <TeacherPortal go={setPage} />}
            {page === 'teacher-register' && (
              <TeacherRegistration go={setPage} />
            )}
            {page === 'activate' && (
              <TeacherActivation go={setPage} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}