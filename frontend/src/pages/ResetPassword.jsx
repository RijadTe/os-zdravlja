// frontend/src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// 🔥 PROMIJENJENO - uklonjen /api sa kraja
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

  useEffect(() => {
    // Dohvati token iz URL-a
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

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
      // 🔥 PROMIJENJENO - koristi API_URL sa /api
      const res = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token: token,
        lozinka: lozinka
      });

      setMessage(res.data.message || t('resetpassword.success.message'));
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('❌ Greška:', error);
      setError(error.response?.data?.error || t('resetpassword.errors.general'));
    } finally {
      setLoading(false);
    }
  };

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
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4">
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
            />
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
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg"
          >
            {loading ? t('resetpassword.button.loading') : t('resetpassword.button.reset')}
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
      </div>
    </div>
  );
};

export default ResetPassword;