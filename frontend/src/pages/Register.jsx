// frontend/src/pages/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Register = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    ime: '',
    lozinka: '',
    lozinkaPotvrda: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🔥 DODAJ - provjeri da li je korisnik već prijavljen
  const [isAlreadyLoggedIn, setIsAlreadyLoggedIn] = useState(false);

  // 🔥 DODAJ - provjera da li je korisnik već prijavljen
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setIsAlreadyLoggedIn(true);
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.email || !formData.ime || !formData.lozinka || !formData.lozinkaPotvrda) {
      setError(t('register.errors.all_fields'));
      setLoading(false);
      return;
    }

    if (formData.lozinka !== formData.lozinkaPotvrda) {
      setError(t('register.errors.passwords_match'));
      setLoading(false);
      return;
    }

    if (formData.lozinka.length < 6) {
      setError(t('register.errors.password_length'));
      setLoading(false);
      return;
    }

    try {
      console.log('📝 Registracija sa Supabase...');

      const { data: existingUser, error: checkError } = await supabase
        .from('profili')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Greška pri provjeri:', checkError);
      }

      if (existingUser) {
        console.log('⚠️ Email već postoji:', formData.email);
        setError(t('register.errors.email_exists'));
        setLoading(false);
        return;
      }

      console.log('✅ Email slobodan:', formData.email);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.lozinka,
        options: {
          data: {
            ime: formData.ime
          }
        }
      });

      if (authError) {
        console.error('❌ Auth greška:', authError);
        if (authError.message.includes('already registered')) {
          setError(t('register.errors.email_exists'));
        } else {
          setError('❌ ' + authError.message);
        }
        setLoading(false);
        return;
      }

      console.log('✅ Auth korisnik kreiran:', authData.user?.id);

      // 🔥 ZAKLJUČAJ JEZIK - KORISTI TRENUTNI JEZIK IZ i18n
      const selectedLanguage = i18n.language || 'hr';
      
      // 🔥 SPREMI JEZIK U LOCALSTORAGE (ZA CIJELU APLIKACIJU)
      localStorage.setItem('preferredLanguage', selectedLanguage);
      localStorage.setItem('languageLocked', 'true'); // 🔥 DODAJ - zaključaj jezik

      console.log('🌍 Jezik zaključan na:', selectedLanguage);

      try {
        console.log('📡 Kreiram profil preko API-ja...');
        const response = await fetch(`${API_URL}/api/profil`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: authData.user?.id,
            email: formData.email,
            ime: formData.ime,
            premium: false,
            kviz_zavrsen: false,
            vrsta: [],
            izbjegava: [],
            preferencije: [],
            preferred_language: selectedLanguage
          })
        });

        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Profil kreiran preko API-ja:', result.data);
        } else {
          console.warn('⚠️ Profil nije kreiran preko API-ja:', result);
          const { data: profileData, error: profileError } = await supabase
            .from('profili')
            .insert([{
              id: authData.user?.id,
              email: formData.email,
              ime: formData.ime,
              premium: false,
              kviz_zavrsen: false,
              vrsta: [],
              izbjegava: [],
              preferencije: [],
              preferred_language: selectedLanguage,
              created_at: new Date().toISOString()
            }])
            .select();

          if (profileError) {
            console.error('❌ Greška pri kreiranju profila (fallback):', profileError);
            if (profileError.code !== '23505') {
              setError(t('register.errors.profile_create') + profileError.message);
              setLoading(false);
              return;
            }
          }
        }
      } catch (apiError) {
        console.warn('⚠️ Greška pri API pozivu, koristim Supabase fallback:', apiError);
        const { data: profileData, error: profileError } = await supabase
          .from('profili')
          .insert([{
            id: authData.user?.id,
            email: formData.email,
            ime: formData.ime,
            premium: false,
            kviz_zavrsen: false,
            vrsta: [],
            izbjegava: [],
            preferencije: [],
            preferred_language: selectedLanguage,
            created_at: new Date().toISOString()
          }])
          .select();

        if (profileError) {
          console.error('❌ Greška pri kreiranju profila (fallback):', profileError);
          if (profileError.code !== '23505') {
            setError(t('register.errors.profile_create') + profileError.message);
            setLoading(false);
            return;
          }
        }
      }

      const userData = {
        id: authData.user?.id || '',
        email: formData.email,
        ime: formData.ime,
        premium: false,
        preferred_language: selectedLanguage,
        languageLocked: true // 🔥 DODAJ
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('userName', formData.ime);
      
      if (authData.session) {
        localStorage.setItem('supabase_session', JSON.stringify(authData.session));
      }

      console.log('👤 Sačuvan user:', userData);
      console.log('🌍 Jezik zaključan:', selectedLanguage);

      setSuccess(t('register.success'));

      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('❌ Greška:', error);
      setError(t('register.errors.general') + error.message);
    } finally {
      setLoading(false);
    }
  };

  const languageFlags = {
    hr: '🇭🇷',
    en: '🇬🇧',
    de: '🇩🇪'
  };

  const languageNames = {
    hr: 'Hrvatski',
    en: 'English',
    de: 'Deutsch'
  };

  // 🔥 Ako je već prijavljen, ne prikazuj registraciju
  if (isAlreadyLoggedIn) {
    return null;
  }

  return (
    <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6">
        {/* 🔥 IZBOR JEZIKA - PRIJE REGISTRACIJE */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 px-5 py-2.5 rounded-full shadow-sm">
            <span className="text-lg">🌍</span>
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-gray-700 dark:text-gray-200 font-semibold text-base cursor-pointer py-1 px-2"
              style={{ minWidth: '140px' }}
            >
              <option value="hr">{languageFlags.hr} {languageNames.hr}</option>
              <option value="en">{languageFlags.en} {languageNames.en}</option>
              <option value="de">{languageFlags.de} {languageNames.de}</option>
            </select>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
          👋 {t('register.title')}
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
          {t('register.subtitle')}
        </p>

        {/* 🔥 DODAJ - OBAVIJEST O JEZIKU */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4 text-center">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            🌍 {t('register.language_hint') || 'Odabrani jezik se ne može promijeniti nakon registracije.'}
          </p>
        </div>

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
              📧 {t('register.email_label')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('register.email_placeholder')}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              👤 {t('register.name_label')} *
            </label>
            <input
              type="text"
              name="ime"
              value={formData.ime}
              onChange={handleChange}
              placeholder={t('register.name_placeholder')}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🔒 {t('register.password_label')} *
            </label>
            <input
              type="password"
              name="lozinka"
              value={formData.lozinka}
              onChange={handleChange}
              placeholder={t('register.password_placeholder')}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🔒 {t('register.confirm_password_label')} *
            </label>
            <input
              type="password"
              name="lozinkaPotvrda"
              value={formData.lozinkaPotvrda}
              onChange={handleChange}
              placeholder={t('register.confirm_password_placeholder')}
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg"
          >
            {loading ? t('register.button.loading') : t('register.button.register')}
          </button>
        </form>

        <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
          {t('register.have_account')}{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            {t('register.login_link')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;