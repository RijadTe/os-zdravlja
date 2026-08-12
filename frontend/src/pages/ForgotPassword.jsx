// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!email) {
      setError(t('forgotpassword.errors.email_required'));
      setLoading(false);
      return;
    }

    // Validacija email formata
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('forgotpassword.errors.invalid_email'));
      setLoading(false);
      return;
    }

    try {
      console.log('📧 Slanje zahtjeva za reset lozinke na:', email);
      
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      console.log('📦 Odgovor sa servera:', data);
      
      if (data.success) {
        setMessage(data.message || t('forgotpassword.success.message'));
        setEmail(''); // Očisti email polje
        
        // Automatski preusmjeri na login nakon 5 sekundi
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } else {
        setError(data.error || t('forgotpassword.errors.general'));
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      setError(t('forgotpassword.errors.general'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
          🔑 {t('forgotpassword.title')}
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
          {t('forgotpassword.subtitle')}
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4 whitespace-pre-line">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-300 p-3 rounded-xl mb-4">
            <div className="flex items-start gap-2">
              <span className="text-lg">✅</span>
              <div>
                <p className="font-semibold">{message}</p>
                <p className="text-sm mt-1 text-green-600 dark:text-green-400">
                  {t('forgotpassword.check_spam', 'Provjerite i spam/junk folder ako ne vidite email.')}
                </p>
                <p className="text-sm mt-2 text-green-600 dark:text-green-400">
                  ⏳ Preusmjeravam na stranicu za prijavu za 5 sekundi...
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              📧 {t('forgotpassword.email_label')} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('forgotpassword.email_placeholder', 'vas@email.com')}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
              disabled={loading || !!message}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!message}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('forgotpassword.button.sending')}
              </>
            ) : message ? (
              '✅ ' + t('forgotpassword.button.sent')
            ) : (
              '📧 ' + t('forgotpassword.button.send')
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('forgotpassword.remembered')}{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              {t('forgotpassword.login_link')}
            </Link>
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link to="/" className="block text-center text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
            ⬅️ {t('forgotpassword.back_home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;