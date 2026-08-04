// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // 🔥 DODAJ OVO!
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { DarkModeProvider } from './context/DarkModeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minuta
      cacheTime: 1000 * 60 * 30, // 30 minuta
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
        <BrowserRouter> {/* 🔥 OVAJ WRAPER JE KLJUČAN! */}
          <App />
        </BrowserRouter>
      </DarkModeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);