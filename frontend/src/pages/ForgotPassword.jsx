// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
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
      setError('⚠️ Molimo unesite vaš email.');
      setLoading(false);
      return;
    }

    try {
      // ✅ KORISTI BACKEND API, NE SUPABASE DIREKTNO!
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: email
      });

      setMessage(res.data.message || '✅ Link za resetovanje lozinke je poslan na vaš email.');
      setTimeout(() => {
        navigate('/login');
      }, 4000);
    } catch (error) {
      console.error('❌ Greška:', error);
      setError(error.response?.data?.error || '❌ Greška pri slanju linka. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
          🔑 Zaboravili ste lozinku?
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
          Unesite vaš email i poslat ćemo vam link za resetovanje lozinke.
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
              📧 Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.com"
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg"
          >
            {loading ? '⏳ Slanje...' : '📧 Pošalji link'}
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

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link to="/" className="block text-center text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
            ⬅️ Vrati se na početnu
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;