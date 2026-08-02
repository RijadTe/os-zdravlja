// frontend/src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
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
      setError('⚠️ Molimo unesite i potvrdite lozinku.');
      setLoading(false);
      return;
    }

    if (lozinka !== lozinkaPotvrda) {
      setError('❌ Lozinke se ne podudaraju.');
      setLoading(false);
      return;
    }

    if (lozinka.length < 6) {
      setError('❌ Lozinka mora imati najmanje 6 karaktera.');
      setLoading(false);
      return;
    }

    try {
      // ✅ KORISTI BACKEND API
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', {
        token: token,
        lozinka: lozinka
      });

      setMessage(res.data.message || '✅ Lozinka je uspješno promijenjena!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('❌ Greška:', error);
      setError(error.response?.data?.error || '❌ Greška pri resetovanju lozinke.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
          🔐 Nova lozinka
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
          Unesite novu lozinku za vaš nalog.
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
              🔒 Nova lozinka *
            </label>
            <input
              type="password"
              value={lozinka}
              onChange={(e) => setLozinka(e.target.value)}
              placeholder="•••••••• (min 6 karaktera)"
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🔒 Potvrdi lozinku *
            </label>
            <input
              type="password"
              value={lozinkaPotvrda}
              onChange={(e) => setLozinkaPotvrda(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg"
          >
            {loading ? '⏳ Promjena...' : '🔐 Promijeni lozinku'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Sjetili ste se lozinke?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Prijavite se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;