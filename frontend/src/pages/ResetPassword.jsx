// frontend/src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lozinka, setLozinka] = useState('');
  const [lozinkaPotvrda, setLozinkaPotvrda] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState(null);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // 🔥 DOHVATI TOKEN IZ HASH FRAGMENTA (#)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    console.log('🔍 URL:', window.location.href);
    console.log('🔍 Hash:', window.location.hash);
    console.log('🔍 Access token:', accessToken ? '✅' : '❌');
    console.log('🔍 Type:', type);

    if (accessToken) {
      setToken(accessToken);
      setIsValidToken(true);
      
      // Spremi token za kasnije (ako korisnik osvježi stranicu)
      localStorage.setItem('reset_access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('reset_refresh_token', refreshToken);
      }
      
      console.log('✅ Token dohvaćen iz URL-a');
    } else {
      // 🔥 POKUŠAJ IZ LOCALSTORAGE (ako je već spremljen)
      const savedToken = localStorage.getItem('reset_access_token');
      if (savedToken) {
        setToken(savedToken);
        setIsValidToken(true);
        console.log('✅ Token dohvaćen iz localStorage');
      } else {
        console.log('❌ Nema tokena u URL-u');
        setError('❌ Link za resetovanje lozinke nije ispravan. Molimo zatražite novi link.');
        setIsValidToken(false);
      }
    }

    // Očisti hash iz URL-a (da ne bude ružno)
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!token) {
      setError('❌ Token nije pronađen. Molimo zatražite novi link za resetovanje.');
      setLoading(false);
      return;
    }

    if (!lozinka || !lozinkaPotvrda) {
      setError(t('resetpassword.errors.fields_required'));
      setLoading(false);
      return;
    }

    if (lozinka !== lozinkaPotvrda) {
      setError(t('resetpassword.errors.passwords_match'));
      setLoading(false);
      return;
    }

    if (lozinka.length < 6) {
      setError(t('resetpassword.errors.password_length'));
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Slanje zahtjeva za reset...');
      
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          lozinka: lozinka
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage(data.message || t('resetpassword.success.message'));
        
        // Očisti token iz localStorage
        localStorage.removeItem('reset_access_token');
        localStorage.removeItem('reset_refresh_token');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || t('resetpassword.errors.general'));
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      setError(t('resetpassword.errors.general'));
    } finally {
      setLoading(false);
    }
  };

  // Ako nema tokena, prikaži poruku
  if (!isValidToken && !token) {
    return (
      <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6">
          <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
            🔐 {t('resetpassword.title')}
          </h1>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4">
            ❌ Link za resetovanje lozinke nije ispravan.
            <br />
            <br />
            Molimo zatražite novi link na stranici za zaboravljenu lozinku.
          </div>
          <div className="text-center">
            <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              🔑 Zatraži novi link
            </Link>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link to="/login" className="block text-center text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
              ⬅️ {t('resetpassword.back_to_login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
          🔐 {t('resetpassword.title')}
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
          {t('resetpassword.subtitle')}
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4 whitespace-pre-line">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-300 p-3 rounded-xl mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🔒 {t('resetpassword.new_password_label')} *
            </label>
            <input
              type="password"
              value={lozinka}
              onChange={(e) => setLozinka(e.target.value)}
              placeholder={t('resetpassword.new_password_placeholder')}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
              minLength={6}
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('resetpassword.password_hint', 'Najmanje 6 karaktera')}
            </p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🔒 {t('resetpassword.confirm_password_label')} *
            </label>
            <input
              type="password"
              value={lozinkaPotvrda}
              onChange={(e) => setLozinkaPotvrda(e.target.value)}
              placeholder={t('resetpassword.confirm_password_placeholder')}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('resetpassword.button.loading')}
              </span>
            ) : (
              '🔐 ' + t('resetpassword.button.reset')
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('resetpassword.remembered')}{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              {t('resetpassword.login_link')}
            </Link>
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link to="/" className="block text-center text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
            ⬅️ {t('resetpassword.back_home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;