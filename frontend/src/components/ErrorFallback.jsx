// frontend/src/components/ErrorFallback.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const { t } = useTranslation();
  
  // 🔥 KOPIRAJ GREŠKU U CLIPBOARD ZA LAKŠE REPORTIRANJE
  const copyError = () => {
    const errorText = `
      Greška: ${error?.message || 'Nepoznata greška'}
      Stack: ${error?.stack || 'Nema stack trace'}
      Vrijeme: ${new Date().toISOString()}
    `;
    navigator.clipboard?.writeText(errorText);
    alert('📋 Greška je kopirana u clipboard!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-red-200 dark:border-red-800">
        <div className="text-6xl mb-4">😵</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {t('common.error') || 'Nešto je pošlo po zlu'}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          {error?.message || t('common.error')}
        </p>
        
        {/* 🔥 DUGME ZA KOPIRANJE GREŠKE (samo u dev modu) */}
        {import.meta.env.DEV && (
          <button
            onClick={copyError}
            className="mb-3 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline"
          >
            📋 Kopiraj grešku
          </button>
        )}
        
        <div className="flex flex-col gap-2">
          <button
            onClick={resetErrorBoundary}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            🔄 {t('common.retry') || 'Pokušaj ponovo'}
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-semibold transition"
          >
            🏠 {t('common.back') || 'Idi na početnu'}
          </button>
        </div>
        
        {/* 🔥 TEHNIČKI DETALJI (samo u dev modu) */}
        {import.meta.env.DEV && error?.stack && (
          <details className="mt-4 text-left">
            <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer">
              Tehnički detalji
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-40 text-gray-700 dark:text-gray-300">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorFallback;