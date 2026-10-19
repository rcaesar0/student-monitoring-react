import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import Login from './auth/Login';
import Signup from './auth/Signup';
import ForgotPassword from './auth/ForgotPassword';

export default function AuthPage() {
  const { theme, toggleTheme } = useApp();
  const [page, setPage] = useState('login');

  return (
    <div className="auth-page">
      <div className="auth-wrap">
        <div className="auth-top">
          <button className="theme-float" onClick={toggleTheme} aria-label="Toggle theme">
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={20} />
          </button>
        </div>
        <div className="auth-card">
          <img src="/logo-app.png" className="auth-logo" alt="Student Monitoring logo" />
          <h1>Student Monitoring</h1>
          {page === 'login' && <Login go={setPage} />}
          {page === 'signup' && <Signup go={setPage} />}
          {page === 'forgot' && <ForgotPassword go={setPage} />}
        </div>
      </div>
    </div>
  );
}