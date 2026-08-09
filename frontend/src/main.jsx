// frontend/src/main.jsx
import React, { Suspense } from 'react';  // ← DODAJ Suspense
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';  // ← DODAJ
import i18n from './i18n';  // ← DODAJ
import App from './App';
import './index.css';
import { DarkModeProvider } from './context/DarkModeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">⏳ Učitavanje...</p>
        </div>
      </div>
    }>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <DarkModeProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </DarkModeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </Suspense>
  </React.StrictMode>
);