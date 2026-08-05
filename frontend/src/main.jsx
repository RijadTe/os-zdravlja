// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// 🔥 DODAJ OVO PRVO - i18n MORA BITI INICIJALIZIRAN PRIJE APPA!
import './i18n/index';
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
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </DarkModeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);