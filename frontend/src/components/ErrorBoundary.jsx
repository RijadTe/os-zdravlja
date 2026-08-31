// frontend/src/components/ErrorBoundary.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ ErrorBoundary:', error, errorInfo);
    // Opcija: logiraj grešku na server
    // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ error, errorInfo }) });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

// Fallback UI komponenta
const ErrorFallback = ({ error, onReset }) => {
  const { t } = useTranslation();
  
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
        <button
          onClick={onReset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition"
        >
          🔄 {t('common.retry') || 'Pokušaj ponovo'}
        </button>
      </div>
    </div>
  );
};

export default ErrorBoundary;