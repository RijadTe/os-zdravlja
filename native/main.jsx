// frontend/src/main.jsx

import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';
import i18n from './i18n';
import App from './App';
import './index.css';
import { DarkModeProvider } from './context/DarkModeContext';

// 🔥 PWA - Service Worker registracija
import { 
  registerServiceWorker, 
  checkOnlineStatus, 
  watchOnlineStatus 
} from './registerServiceWorker';

// 🔥 LAZY LOAD ZA ERROR FALLBACK (smanjuje početni bundle)
const ErrorFallback = lazy(() => import('./components/ErrorFallback'));

// 🔥 QUERY CLIENT SA BOLJIM OPCIJAMA
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minuta
      gcTime: 1000 * 60 * 30, // 30 minuta (zamjena za cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// 🔥 GLOBALNI LOADING KOMPONENTA
const GlobalLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
    <div className="text-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">🍽️</span>
        </div>
      </div>
      <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium animate-pulse">
        ⏳ Učitavanje...
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Pripremamo vaše iskustvo
      </p>
    </div>
  </div>
);

// 🔥 ERROR HANDLER ZA QUERY
const queryErrorHandler = (error) => {
  console.error('❌ Query error:', error);
  // Opcija: logiraj grešku na server
  // if (import.meta.env.PROD) {
  //   fetch('/api/log-error', { 
  //     method: 'POST', 
  //     body: JSON.stringify({ error: error.message, stack: error.stack }) 
  //   });
  // }
};

// 🔥 POSTAVI GLOBALNI ERROR HANDLER
queryClient.setDefaultOptions({
  queries: {
    onError: queryErrorHandler,
  },
  mutations: {
    onError: queryErrorHandler,
  },
});

// 🔥 ZA BRŽI START - PRELOAD KRITIČNIH RUTA
const preloadCriticalRoutes = () => {
  // Preload samo ako je korisnik već prijavljen
  const user = localStorage.getItem('user');
  if (user) {
    // Preload profile i home
    import('./pages/HomeKonacno');
    import('./pages/Profile');
  }
};

// Pokreni preload nakon što se aplikacija učita
if (typeof window !== 'undefined') {
  setTimeout(preloadCriticalRoutes, 1000);
}

// 🔥 REGISTRIRAJ SERVICE WORKER (samo u produkciji)
registerServiceWorker();

// 🔥 PROVJERI ONLINE STATUS
checkOnlineStatus();
watchOnlineStatus();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Resetiraj stanje aplikacije
        window.location.href = '/';
      }}
      onError={(error, errorInfo) => {
        console.error('❌ Global error:', error, errorInfo);
        // Logiraj na server u produkciji
        if (import.meta.env.PROD) {
          // fetch('/api/log-error', { 
          //   method: 'POST', 
          //   body: JSON.stringify({ 
          //     error: error.message, 
          //     stack: error.stack,
          //     componentStack: errorInfo.componentStack 
          //   }) 
          // });
        }
      }}
    >
      <Suspense fallback={<GlobalLoader />}>
        <HelmetProvider>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              <DarkModeProvider>
                <HashRouter>
                  <App />
                </HashRouter>
              </DarkModeProvider>
            </QueryClientProvider>
          </I18nextProvider>
        </HelmetProvider>
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);