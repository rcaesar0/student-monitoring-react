import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { LanguageProvider } from './utils/i18n';
import ErrorBoundary from './components/ErrorBoundary';
import DialogHost from './components/DialogHost';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
    <LanguageProvider>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
      <DialogHost />
    </ErrorBoundary>
  </LanguageProvider>
);
