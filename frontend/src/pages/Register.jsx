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
  const [isAlreadyLoggedIn, setIsAlreadyLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Provjera da li je korisnik već prijavljen
    const user = localStorage.getItem('user');
    if (user) {
      setIsAlreadyLoggedIn(true);
      navigate('/');
    }
    
    // Učitaj sačuvanu temu
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) setDarkMode(savedTheme === 'dark');
  }, [navigate]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔥 GOOGLE REGISTRACIJA
  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (signInError) {
        console.error('❌ Google greška:', signInError);
        setError('Greška pri Google registraciji: ' + signInError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Google OAuth započet:', data);
      
    } catch (error) {
      console.error('❌ Greška:', error);
      setError('Došlo je do greške. Pokušajte ponovo.');
      setLoading(false);
    }
  };

  // 🔥 APPLE REGISTRACIJA
  const handleAppleRegister = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        console.error('❌ Apple greška:', signInError);
        setError('Greška pri Apple registraciji: ' + signInError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Apple OAuth započet:', data);
      
    } catch (error) {
      console.error('❌ Greška:', error);
      setError('Došlo je do greške. Pokušajte ponovo.');
      setLoading(false);
    }
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

      // Provjera da li email već postoji
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

      // Kreiranje korisnika u Supabase Auth
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

      // Zaključaj jezik
      const selectedLanguage = i18n.language || 'hr';
      localStorage.setItem('preferredLanguage', selectedLanguage);
      localStorage.setItem('languageLocked', 'true');

      console.log('🌍 Jezik zaključan na:', selectedLanguage);

      // Kreiranje profila - prvo preko API-ja
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
          // Fallback - direktan Supabase insert
          const { error: profileError } = await supabase
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

          if (profileError && profileError.code !== '23505') {
            console.error('❌ Greška pri kreiranju profila (fallback):', profileError);
            setError(t('register.errors.profile_create') + profileError.message);
            setLoading(false);
            return;
          }
        }
      } catch (apiError) {
        console.warn('⚠️ Greška pri API pozivu, koristim Supabase fallback:', apiError);
        const { error: profileError } = await supabase
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

        if (profileError && profileError.code !== '23505') {
          console.error('❌ Greška pri kreiranju profila (fallback):', profileError);
          setError(t('register.errors.profile_create') + profileError.message);
          setLoading(false);
          return;
        }
      }

      // Spremanje korisničkih podataka
      const userData = {
        id: authData.user?.id || '',
        email: formData.email,
        ime: formData.ime,
        premium: false,
        preferred_language: selectedLanguage,
        languageLocked: true
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

  const getPasswordStrength = (password) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (password) => {
    const levels = ['Slaba', 'Okej', 'Dobra', 'Jaka', 'Odlična'];
    return levels[getPasswordStrength(password)] || 'Slaba';
  };

  if (isAlreadyLoggedIn) {
    return null;
  }

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden font-sans antialiased ${darkMode ? 'dark' : 'light'}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-950 dark:from-emerald-950 dark:via-teal-900 dark:to-emerald-950 light:from-emerald-50 light:via-teal-50 light:to-green-50 transition-all duration-1000">
        <div className="absolute top-[-15%] left-[-15%] w-[45rem] h-[45rem] bg-emerald-500/20 dark:bg-emerald-500/20 light:bg-emerald-300/25 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[40rem] h-[40rem] bg-teal-500/20 dark:bg-teal-500/20 light:bg-teal-300/25 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[60%] -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-emerald-400/10 dark:bg-emerald-400/10 light:bg-emerald-300/15 rounded-full blur-3xl"></div>
        
        <div className="hidden sm:block absolute inset-0 opacity-10">
          <svg className="absolute top-[10%] left-[5%] w-16 h-16 text-emerald-400 animate-leaf-spin" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8 6 4 10 4 14c0 4 4 6 8 6s8-2 8-6c0-4-4-8-8-12z"/>
            <path d="M12 20c-4 0-8-2-8-6 0-3 2-6 4-8 1-1 3-2 4-2s3 1 4 2c2 2 4 5 4 8 0 4-4 6-8 6z" opacity="0.5"/>
          </svg>
          <svg className="absolute bottom-[15%] right-[8%] w-20 h-20 text-teal-400 animate-leaf-spin" style={{ animationDuration: '25s' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8 6 4 10 4 14c0 4 4 6 8 6s8-2 8-6c0-4-4-8-8-12z"/>
            <path d="M12 20c-4 0-8-2-8-6 0-3 2-6 4-8 1-1 3-2 4-2s3 1 4 2c2 2 4 5 4 8 0 4-4 6-8 6z" opacity="0.5"/>
          </svg>
        </div>
        
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
      </div>

      {/* Dark Mode Toggle */}
      <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50">
        <div className="bg-white/5 backdrop-blur-2xl rounded-full p-1 shadow-xl border border-emerald-400/15">
          <div 
            className={`toggle-switch ${darkMode ? 'active' : ''}`}
            onClick={toggleDarkMode}
          >
            <div className="toggle-knob">
              {darkMode ? '🌙' : '☀️'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-3 sm:p-4">
        <div className="w-full max-w-md animate-fade-in-up px-0 sm:px-0">
          <div className="bg-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 transition-all duration-500 hover:shadow-emerald-500/20 border border-emerald-400/15">
            
            {/* Logo & Header */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="logo-container animate-float animate-logo-glow mx-auto">
                <div className="logo-ring"></div>
                <div className="logo-ring"></div>
                <img 
                  src="https://i.postimg.cc/WbdznKdk/Green-Simple-Healthy-Food-Logo-20260817-003421-0000.png" 
                  alt="OS Zdravlja Logo"
                  className="relative z-10"
                />
              </div>
              
              <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-emerald-900'}`}>
                <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">OS Zdravlja</span>
              </h2>
              
              <div className="flex items-center justify-center gap-2 mt-2 sm:mt-3">
                <span className={`text-xs sm:text-sm transition-colors ${darkMode ? 'text-emerald-200/60' : 'text-emerald-600/60'}`}>🌐</span>
                <select 
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                  className={`text-xs sm:text-sm bg-transparent border rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 transition-colors cursor-pointer ${darkMode ? 'border-emerald-400/20 text-emerald-200/80' : 'border-emerald-300 text-emerald-700'}`}
                >
                  <option value="hr">Hrvatski</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              
              <p className={`mt-1 sm:mt-2 text-sm sm:text-base font-light transition-colors ${darkMode ? 'text-emerald-200/80' : 'text-emerald-700/80'}`}>
                🌿 {t('register.subtitle') || 'Pridružite se i otkrijte savršene recepte!'}
              </p>
              
              <p className={`text-[10px] sm:text-xs mt-1 sm:mt-2 transition-colors ${darkMode ? 'text-emerald-300/50' : 'text-emerald-500/60'}`}>
                ⚠️ {t('register.language_hint') || 'Odabrani jezik se ne može promijeniti nakon registracije.'}
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50/90 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50/90 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-300 p-3 rounded-xl mb-4 text-sm">
                {success}
              </div>
            )}

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
              <button 
                onClick={handleGoogleRegister}
                disabled={loading}
                className="social-btn flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border transition-all duration-300 active:scale-[0.97] hover:scale-[1.02] bg-white/5 border-emerald-400/20 hover:bg-emerald-400/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M5.3 10.7L2.6 8.5c-.4-.3-.6-.8-.4-1.3L4.7 2.6c.2-.4.6-.6 1-.6h12.6c.4 0 .8.2 1 .6l2.5 4.6c.2.5 0 1-.4 1.3l-2.7 2.2-6.2 5.1c-.3.3-.8.3-1.1 0l-6.2-5.1z"/>
                  <path fill="#FBBC04" d="M12 14.3L5.3 10.7 12 7.1l6.7 3.6L12 14.3z"/>
                  <path fill="#34A853" d="M12 14.3v6.9c0 .6-.5 1.1-1.1 1.1-.2 0-.5-.1-.7-.2L5.3 17.3c-.4-.3-.6-.8-.4-1.3l.4-3.6 6.7 1.9z"/>
                  <path fill="#4285F4" d="M21.4 8.5l-2.7 2.2L12 14.3l6.7 1.9.4 3.6c.2.5 0 1-.4 1.3l-4.9 3.5c-.2.1-.4.2-.7.2-.6 0-1.1-.5-1.1-1.1v-6.9l-6.7-3.6-2.7-2.2c-.4-.3-.6-.8-.4-1.3L4.7 2.6c.2-.4.6-.6 1-.6h12.6c.4 0 .8.2 1 .6l2.5 4.6c.2.5 0 1-.4 1.3z"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium text-white">Google</span>
              </button>
              
              <button 
                onClick={handleAppleRegister}
                disabled={loading}
                className="social-btn flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border transition-all duration-300 active:scale-[0.97] hover:scale-[1.02] bg-white/5 border-emerald-400/20 hover:bg-emerald-400/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.7 12.4c-.1-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.5-.8 3-.8s1.9.8 3.1.8 2.1-1.1 2.9-2.3c.9-1.1 1.3-2.3 1.3-2.3-.1-.1-2.5-.9-2.5-3.7zM15.4 3.8c.7-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.5 2.8-1.3z"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium text-white">Apple</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${darkMode ? 'border-emerald-400/20' : 'border-emerald-300'}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-3 sm:px-4 backdrop-blur-sm text-xs sm:text-sm transition-colors ${darkMode ? 'text-emerald-200/40' : 'text-emerald-600/60'}`}>
                  🌱 {t('register.or_email') || 'ili registrujte se sa emailom'}
                </span>
              </div>
            </div>

            {/* Register Form */}
            <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
              <div className="group">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ml-1 transition-colors ${darkMode ? 'text-emerald-200/80' : 'text-emerald-700/80'}`}>
                  📧 {t('register.email_label')} *
                </label>
                <div className="relative">
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors group-focus-within:text-emerald-400 ${darkMode ? 'text-emerald-300/60' : 'text-emerald-400/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border transition-all duration-300 input-focus text-base ${darkMode ? 'bg-white/5 border-emerald-400/20 text-white placeholder:text-emerald-200/40' : 'bg-white border-emerald-300 text-emerald-900 placeholder:text-emerald-400/60'}`}
                    placeholder={t('register.email_placeholder') || 'vas@email.com'}
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ml-1 transition-colors ${darkMode ? 'text-emerald-200/80' : 'text-emerald-700/80'}`}>
                  👤 {t('register.name_label')} *
                </label>
                <div className="relative">
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors group-focus-within:text-emerald-400 ${darkMode ? 'text-emerald-300/60' : 'text-emerald-400/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  <input
                    type="text"
                    name="ime"
                    value={formData.ime}
                    onChange={handleChange}
                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border transition-all duration-300 input-focus text-base ${darkMode ? 'bg-white/5 border-emerald-400/20 text-white placeholder:text-emerald-200/40' : 'bg-white border-emerald-300 text-emerald-900 placeholder:text-emerald-400/60'}`}
                    placeholder={t('register.name_placeholder') || 'Marko Marković'}
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ml-1 transition-colors ${darkMode ? 'text-emerald-200/80' : 'text-emerald-700/80'}`}>
                  🔒 {t('register.password_label')} * <span className="text-[10px] sm:text-xs opacity-60">(min 6)</span>
                </label>
                <div className="relative">
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors group-focus-within:text-emerald-400 ${darkMode ? 'text-emerald-300/60' : 'text-emerald-400/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="lozinka"
                    value={formData.lozinka}
                    onChange={handleChange}
                    className={`w-full pl-9 sm:pl-10 pr-9 sm:pr-12 py-2.5 sm:py-3 rounded-xl border transition-all duration-300 input-focus text-base ${darkMode ? 'bg-white/5 border-emerald-400/20 text-white placeholder:text-emerald-200/40' : 'bg-white border-emerald-300 text-emerald-900 placeholder:text-emerald-400/60'}`}
                    placeholder="••••••"
                    minLength="6"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 transition-colors active:scale-90 ${darkMode ? 'text-emerald-300/60 hover:text-emerald-300' : 'text-emerald-400/60 hover:text-emerald-600'}`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {!showPassword ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </>
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      )}
                    </svg>
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-emerald-400/20 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${getPasswordStrength(formData.lozinka) >= 1 ? 'bg-red-400 w-1/4' : 'w-0'}`}></div>
                    <div className={`h-full rounded-full transition-all duration-500 ${getPasswordStrength(formData.lozinka) >= 2 ? 'bg-yellow-400 w-2/4' : 'w-0'}`}></div>
                    <div className={`h-full rounded-full transition-all duration-500 ${getPasswordStrength(formData.lozinka) >= 3 ? 'bg-green-400 w-3/4' : 'w-0'}`}></div>
                    <div className={`h-full rounded-full transition-all duration-500 ${getPasswordStrength(formData.lozinka) >= 4 ? 'bg-emerald-400 w-full' : 'w-0'}`}></div>
                  </div>
                  <span className={`text-[10px] sm:text-xs transition-colors min-w-[40px] sm:min-w-[60px] text-right ${darkMode ? 'text-emerald-200/50' : 'text-emerald-500/60'}`}>
                    {getPasswordStrengthText(formData.lozinka)}
                  </span>
                </div>
              </div>

              <div className="group">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ml-1 transition-colors ${darkMode ? 'text-emerald-200/80' : 'text-emerald-700/80'}`}>
                  ✅ {t('register.confirm_password_label')} *
                </label>
                <div className="relative">
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors group-focus-within:text-emerald-400 ${darkMode ? 'text-emerald-300/60' : 'text-emerald-400/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="lozinkaPotvrda"
                    value={formData.lozinkaPotvrda}
                    onChange={handleChange}
                    className={`w-full pl-9 sm:pl-10 pr-9 sm:pr-12 py-2.5 sm:py-3 rounded-xl border transition-all duration-300 input-focus text-base ${darkMode ? 'bg-white/5 text-white placeholder:text-emerald-200/40' : 'bg-white text-emerald-900 placeholder:text-emerald-400/60'} ${
                      formData.lozinkaPotvrda && formData.lozinkaPotvrda === formData.lozinka ? 'border-emerald-400' : 
                      formData.lozinkaPotvrda && formData.lozinkaPotvrda !== formData.lozinka ? 'border-red-400' : 'border-emerald-400/20'
                    }`}
                    placeholder="••••••"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 transition-colors active:scale-90 ${darkMode ? 'text-emerald-300/60 hover:text-emerald-300' : 'text-emerald-400/60 hover:text-emerald-600'}`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {!showConfirmPassword ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </>
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      )}
                    </svg>
                  </button>
                </div>
                {formData.lozinkaPotvrda && formData.lozinkaPotvrda === formData.lozinka && (
                  <div className="mt-1 text-[10px] sm:text-xs text-emerald-400 flex items-center gap-1">✅ Lozinke se podudaraju</div>
                )}
                {formData.lozinkaPotvrda && formData.lozinkaPotvrda !== formData.lozinka && (
                  <div className="mt-1 text-[10px] sm:text-xs text-red-400 flex items-center gap-1">❌ Lozinke se ne podudaraju</div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 sm:py-3.5 px-4 shimmer-btn text-white font-semibold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.97] hover:scale-[1.02] animate-glow text-sm sm:text-base mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || (formData.lozinkaPotvrda && formData.lozinkaPotvrda !== formData.lozinka)}
              >
                {!loading ? (
                  <>
                    🌱 {t('register.button.register')}
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                    </svg>
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    {t('register.button.loading')}
                  </span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 sm:mt-8 text-center space-y-2">
              <p className={`text-xs sm:text-sm transition-colors ${darkMode ? 'text-emerald-200/60' : 'text-emerald-600/60'}`}>
                🌿 {t('register.have_account')}{' '}
                <Link to="/login" className={`font-medium transition-colors ${darkMode ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-600 hover:text-emerald-700'}`}>
                  {t('register.login_link')}
                </Link>
              </p>
              <Link to="/" className={`inline-flex items-center gap-1 text-[10px] sm:text-xs transition-colors ${darkMode ? 'text-emerald-300/40 hover:text-emerald-200/60' : 'text-emerald-400/60 hover:text-emerald-600/80'}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                🌿 Vrati se na početnu
              </Link>
            </div>

            <div className={`mt-4 sm:mt-6 pt-3 sm:pt-4 border-t text-center ${darkMode ? 'border-emerald-400/10' : 'border-emerald-300/30'}`}>
              <p className={`text-[10px] sm:text-xs transition-colors ${darkMode ? 'text-emerald-300/40' : 'text-emerald-500/60'}`}>
                🥑 Hrana je lijek • Zdravo tijelo • Sretan um
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        .light {
          --bg-primary: #f0faf7;
          --bg-secondary: #ffffff;
          --text-primary: #064e3b;
          --text-secondary: #065f46;
          --card-bg: rgba(255, 255, 255, 0.8);
          --card-border: rgba(5, 150, 105, 0.2);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.1); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(52, 211, 153, 0.25); }
          50% { box-shadow: 0 0 40px rgba(52, 211, 153, 0.5); }
        }
        
        @keyframes leaf-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes logo-glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(52, 211, 153, 0.3)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 40px rgba(52, 211, 153, 0.6)); transform: scale(1.02); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .animate-leaf-spin { animation: leaf-spin 20s linear infinite; }
        .animate-logo-glow { animation: logo-glow 3s ease-in-out infinite; }
        
        .shimmer-btn {
          background: linear-gradient(90deg, #34d399, #059669, #34d399);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        
        .toggle-switch {
          position: relative;
          width: 50px;
          height: 26px;
          background: #1a4a3a;
          border-radius: 30px;
          cursor: pointer;
          transition: 0.3s;
          flex-shrink: 0;
        }
        
        .toggle-switch.active { background: #34d399; }
        
        .toggle-switch .toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }
        
        .toggle-switch.active .toggle-knob { left: 27px; }
        
        .social-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          -webkit-tap-highlight-color: transparent;
        }
        
        .social-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(52, 211, 153, 0.1);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        
        .social-btn:hover::before {
          width: 300px;
          height: 300px;
        }
        
        .input-focus:focus {
          outline: none;
          border-color: #34d399;
          box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2);
        }
        
        .logo-container {
          width: clamp(80px, 20vw, 120px);
          height: clamp(80px, 20vw, 120px);
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .logo-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 0 30px rgba(52, 211, 153, 0.2));
          transition: all 0.4s ease;
        }
        
        .logo-ring {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 2px solid rgba(52, 211, 153, 0.1);
          animation: spin 10s linear infinite;
          pointer-events: none;
        }
        
        .logo-ring:nth-child(2) {
          inset: -20px;
          border-color: rgba(52, 211, 153, 0.05);
          animation-duration: 15s;
          animation-direction: reverse;
        }
        
        @media (max-width: 480px) {
          .logo-container { width: 70px; height: 70px; }
          h2 { font-size: 1.5rem !important; }
          .social-btn { padding: 8px 10px !important; font-size: 12px !important; }
          .social-btn svg { width: 16px !important; height: 16px !important; }
          input { padding: 10px 10px 10px 36px !important; font-size: 16px !important; }
          .toggle-switch { width: 40px; height: 22px; }
          .toggle-switch .toggle-knob { width: 16px; height: 16px; font-size: 8px; }
          .toggle-switch.active .toggle-knob { left: 21px; }
        }
      `}</style>
    </div>
  );
};

export default Register;