// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    lozinka: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.email || !formData.lozinka) {
      setError('❌ Email i lozinka su obavezni.');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Prijava sa Supabase...');
      
      // 🔥 KORISTI SUPABASE ZA PRIJAVU (NE axios!)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.lozinka
      });

      if (error) {
        console.error('❌ Auth greška:', error);
        if (error.message.includes('Invalid login credentials')) {
          setError('❌ Pogrešan email ili lozinka.');
        } else {
          setError('❌ ' + error.message);
        }
        setLoading(false);
        return;
      }

      console.log('✅ Prijava uspješna:', data.user?.id);

      // ✅ SAČUVAJ KORISNIKA U LOCALSTORAGE
      const userData = {
        id: data.user?.id || '',
        email: data.user?.email || formData.email,
        ime: data.user?.user_metadata?.ime || '',
        premium: false
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('userName', userData.ime || '');
      
      // Sačuvaj i Supabase session
      if (data.session) {
        localStorage.setItem('supabase_session', JSON.stringify(data.session));
      }

      console.log('👤 Sačuvan user:', userData);

      // 🔥 DOHVATI PROFIL IZ BAZE
      const { data: profile, error: profileError } = await supabase
        .from('profili')
        .select('*')
        .eq('email', formData.email)
        .maybeSingle();

      if (profileError) {
        console.warn('⚠️ Greška pri dohvatu profila:', profileError);
      }

      if (profile) {
        console.log('📋 Profil dohvaćen:', profile);
        // Ažuriraj localStorage sa premium statusom
        const updatedUser = { ...userData, premium: profile.premium || false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setSuccess('✅ Prijava uspješna! Preusmjeravam...');

      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (err) {
      console.error('❌ Greška:', err);
      setError('❌ Došlo je do greške. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
          🔐 Prijava
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
          Dobrodošli nazad! Prijavite se za nastavak.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-300 p-3 rounded-xl mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              📧 Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="vas@email.com"
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🔒 Lozinka *
            </label>
            <input
              type="password"
              name="lozinka"
              value={formData.lozinka}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm">
              <input
                type="checkbox"
                name="rememberMe"
                className="w-4 h-4 accent-blue-500"
              />
              Zapamti me
            </label>
            <Link to="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Zaboravili ste lozinku?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg"
          >
            {loading ? '⏳ Prijava...' : '🔑 Prijavi se'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Nemaš nalog?{' '}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Registruj se
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

export default Login;