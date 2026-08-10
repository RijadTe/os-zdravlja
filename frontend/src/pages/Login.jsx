// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Login = () => {
  const { t, i18n } = useTranslation();
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

  // 🔥 DOHVATI PROFIL IZ BAZE
  const fetchUserProfile = async (email) => {
    try {
      console.log('📡 Dohvatam profil iz baze za:', email);
      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
      
      // 🔥 Ako je 404, profil ne postoji
      if (response.status === 404) {
        console.log('ℹ️ Profil ne postoji u bazi');
        return null;
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('✅ Profil dohvaćen:', data.data);
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Greška pri dohvatu profila:', error);
      return null;
    }
  };

  // 🔥 KREIRAJ PROFIL AKO NE POSTOJI
  const createProfile = async (email, ime) => {
    try {
      console.log('📝 Kreiram novi profil za:', email);
      const response = await fetch(`${API_URL}/api/profil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          ime: ime || 'Korisnik',
          premium: false,
          kviz_zavrsen: false,
          vrsta: [],
          izbjegava: [],
          preferencije: [],
          vrijeme: '',
          tezina: '',
          kalorije: '',
          preferred_language: i18n.language || 'hr'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('✅ Profil kreiran');
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Greška pri kreiranju profila:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.email || !formData.lozinka) {
      setError(t('login.errors.required'));
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Prijava sa Supabase...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.lozinka
      });

      if (error) {
        console.error('❌ Auth greška:', error);
        if (error.message.includes('Invalid login credentials')) {
          setError(t('login.errors.invalid'));
        } else {
          setError('❌ ' + error.message);
        }
        setLoading(false);
        return;
      }

      console.log('✅ Prijava uspješna:', data.user?.id);

      // 🔥 PROVJERI DA LI PROFIL POSTOJI U BAZI
      const profile = await fetchUserProfile(formData.email);
      
      // 🔥 AKO PROFIL NE POSTOJI (404) - PREUSMJERI NA REGISTRACIJU
      if (!profile) {
        console.log('⚠️ Profil ne postoji u bazi - preusmjeravam na registraciju');
        
        // Odjavi korisnika iz Supabase
        await supabase.auth.signOut();
        
        setError(
          '❌ Vaš profil je izbrisan iz baze.\n\n' +
          '📝 Molimo da se ponovno registrujete.\n' +
          '🔒 Ne možete se prijaviti sa starim podacima.'
        );
        
        // Preusmjeri na registraciju nakon 2 sekunde
        setTimeout(() => {
          navigate('/register');
        }, 2000);
        
        setLoading(false);
        return;
      }

      // 🔥 PROFIL POSTOJI - NASTAVI SA PRIJAVOM
      console.log('✅ Profil postoji u bazi, nastavljam sa prijavom');

      // 🔥 SPREMI PREFERRED LANGUAGE (iz profila ili default)
      const selectedLanguage = profile?.preferred_language || i18n.language || 'hr';
      localStorage.setItem('preferredLanguage', selectedLanguage);

      // 🔥 EXPIRATION - 30 DANA
      const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30);
      const now = Math.floor(Date.now() / 1000);

      // 🔥 KREIRAJ USER OBJEKAT
      const userData = {
        id: data.user?.id || '',
        email: data.user?.email || formData.email,
        ime: data.user?.user_metadata?.ime || profile?.ime || 'Korisnik',
        premium: profile?.premium || false,
        kviz_zavrsen: profile?.kviz_zavrsen || false,
        preferred_language: selectedLanguage,
        vrsta: profile?.vrsta || [],
        izbjegava: profile?.izbjegava || [],
        preferencije: profile?.preferencije || [],
        vrijeme: profile?.vrijeme || '',
        tezina: profile?.tezina || '',
        kalorije: profile?.kalorije || '',
        expires_at: expiresAt,
        login_time: now,
        remember_me: true
      };
      
      // 🔥 SPREMI U LOCALSTORAGE
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('userName', userData.ime || '');
      localStorage.setItem('remember_me', 'true');
      
      if (data.session) {
        localStorage.setItem('supabase_session', JSON.stringify(data.session));
      }

      console.log('👤 Sačuvan user:', userData);
      console.log('⏰ Session traje do:', new Date(expiresAt * 1000).toLocaleString());
      console.log('🌍 Odabrani jezik:', selectedLanguage);
      console.log('✅ PERMANENTNA PRIJAVA - korisnik ostaje prijavljen');

      setSuccess(t('login.success'));

      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (err) {
      console.error('❌ Greška:', err);
      setError(t('login.errors.general'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
          🔐 {t('login.title')}
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
          {t('login.subtitle')}
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4 whitespace-pre-line">
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
              📧 {t('login.email_label')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('login.email_placeholder')}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🔒 {t('login.password_label')} *
            </label>
            <input
              type="password"
              name="lozinka"
              value={formData.lozinka}
              onChange={handleChange}
              placeholder={t('login.password_placeholder')}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm">
              <input
                type="checkbox"
                name="rememberMe"
                defaultChecked={true}
                className="w-4 h-4 accent-blue-500"
              />
              {t('login.remember_me')}
            </label>
            <Link to="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              {t('login.forgot_password')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg"
          >
            {loading ? t('login.button.loading') : t('login.button.login')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('login.no_account')}{' '}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              {t('login.register_link')}
            </Link>
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link to="/" className="block text-center text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
            ⬅️ {t('login.back_home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;