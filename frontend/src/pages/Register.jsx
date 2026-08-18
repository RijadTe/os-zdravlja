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
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Provjera da li je korisnik već prijavljen
    const user = localStorage.getItem('user');
    if (user) {
      setIsAlreadyLoggedIn(true);
      navigate('/');
    }
    
    // Praćenje dark mode promjena
    const checkDarkMode = () => {
      const dark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark');
      setIsDarkMode(dark);
    };
    
    checkDarkMode();
    
    // Observer za promjene na document elementu
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, [navigate]);

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

      const selectedLanguage = i18n.language || 'hr';
      localStorage.setItem('preferredLanguage', selectedLanguage);
      localStorage.setItem('languageLocked', 'true');

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
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:from-emerald-950 dark:via-teal-900 dark:to-emerald-950 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border border-emerald-200/30 dark:border-emerald-400/10 transition-all duration-300">
          
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-4xl sm:text-5xl">🌿</span>
              </div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-emerald-800 dark:text-white">
              OS Zdravlja
            </h2>
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-sm text-emerald-600 dark:text-emerald-300/60">🌐</span>
              <select 
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="text-sm bg-transparent border border-emerald-300/50 dark:border-emerald-400/20 rounded-lg px-3 py-1 text-emerald-700 dark:text-emerald-200/80 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 cursor-pointer"
              >
                <option value="hr">Hrvatski</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300/70">
              🌿 {t('register.subtitle') || 'Pridružite se i otkrijte savršene recepte!'}
            </p>
            
            <p className="text-[10px] mt-1 text-emerald-500/60 dark:text-emerald-300/40">
              ⚠️ {t('register.language_hint') || 'Odabrani jezik se ne može promijeniti nakon registracije.'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-300 p-3 rounded-xl mb-4 text-sm">
              {success}
            </div>
          )}

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button 
              onClick={handleGoogleRegister}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.3 10.7L2.6 8.5c-.4-.3-.6-.8-.4-1.3L4.7 2.6c.2-.4.6-.6 1-.6h12.6c.4 0 .8.2 1 .6l2.5 4.6c.2.5 0 1-.4 1.3l-2.7 2.2-6.2 5.1c-.3.3-.8.3-1.1 0l-6.2-5.1z"/>
                <path fill="#FBBC04" d="M12 14.3L5.3 10.7 12 7.1l6.7 3.6L12 14.3z"/>
                <path fill="#34A853" d="M12 14.3v6.9c0 .6-.5 1.1-1.1 1.1-.2 0-.5-.1-.7-.2L5.3 17.3c-.4-.3-.6-.8-.4-1.3l.4-3.6 6.7 1.9z"/>
                <path fill="#4285F4" d="M21.4 8.5l-2.7 2.2L12 14.3l6.7 1.9.4 3.6c.2.5 0 1-.4 1.3l-4.9 3.5c-.2.1-.4.2-.7.2-.6 0-1.1-.5-1.1-1.1v-6.9l-6.7-3.6-2.7-2.2c-.4-.3-.6-.8-.4-1.3L4.7 2.6c.2-.4.6-.6 1-.6h12.6c.4 0 .8.2 1 .6l2.5 4.6c.2.5 0 1-.4 1.3z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Google</span>
            </button>
            
            <button 
              onClick={handleAppleRegister}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.7 12.4c-.1-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.5-.8 3-.8s1.9.8 3.1.8 2.1-1.1 2.9-2.3c.9-1.1 1.3-2.3 1.3-2.3-.1-.1-2.5-.9-2.5-3.7zM15.4 3.8c.7-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.5 2.8-1.3z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Apple</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                🌱 {t('register.or_email') || 'ili registrujte se sa emailom'}
              </span>
            </div>
          </div>

          {/* Register Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                📧 {t('register.email_label')} *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all duration-300"
                placeholder={t('register.email_placeholder') || 'vas@email.com'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                👤 {t('register.name_label')} *
              </label>
              <input
                type="text"
                name="ime"
                value={formData.ime}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all duration-300"
                placeholder={t('register.name_placeholder') || 'Marko Marković'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                🔒 {t('register.password_label')} * <span className="text-xs opacity-60">(min 6)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="lozinka"
                  value={formData.lozinka}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all duration-300"
                  placeholder="••••••"
                  minLength="6"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${getPasswordStrength(formData.lozinka) >= 1 ? 'bg-red-400 w-1/4' : 'w-0'}`}></div>
                  <div className={`h-full rounded-full transition-all duration-500 ${getPasswordStrength(formData.lozinka) >= 2 ? 'bg-yellow-400 w-2/4' : 'w-0'}`}></div>
                  <div className={`h-full rounded-full transition-all duration-500 ${getPasswordStrength(formData.lozinka) >= 3 ? 'bg-green-400 w-3/4' : 'w-0'}`}></div>
                  <div className={`h-full rounded-full transition-all duration-500 ${getPasswordStrength(formData.lozinka) >= 4 ? 'bg-emerald-400 w-full' : 'w-0'}`}></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[45px] text-right">
                  {getPasswordStrengthText(formData.lozinka)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ✅ {t('register.confirm_password_label')} *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="lozinkaPotvrda"
                  value={formData.lozinkaPotvrda}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-transparent transition-all duration-300 ${
                    formData.lozinkaPotvrda && formData.lozinkaPotvrda === formData.lozinka 
                      ? 'border-emerald-400 dark:border-emerald-400' 
                      : formData.lozinkaPotvrda && formData.lozinkaPotvrda !== formData.lozinka 
                        ? 'border-red-400 dark:border-red-400' 
                        : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="••••••"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="mt-1 text-xs text-emerald-500 dark:text-emerald-400 flex items-center gap-1">✅ Lozinke se podudaraju</div>
              )}
              {formData.lozinkaPotvrda && formData.lozinkaPotvrda !== formData.lozinka && (
                <div className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">❌ Lozinke se ne podudaraju</div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              disabled={loading || (formData.lozinkaPotvrda && formData.lozinkaPotvrda !== formData.lozinka)}
            >
              {!loading ? (
                <>
                  🌱 {t('register.button.register')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  {t('register.button.loading')}
                </span>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              🌿 {t('register.have_account')}{' '}
              <Link to="/login" className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors">
                {t('register.login_link')}
              </Link>
            </p>
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              🌿 Vrati se na početnu
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              🥑 Hrana je lijek • Zdravo tijelo • Sretan um
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              © 2026 OS Zdravlja – Operativni sistem za tvoje zdravlje
            </p>
            <div className="flex justify-center gap-4 text-[10px] text-gray-400 dark:text-gray-500">
              <Link to="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                Pravila privatnosti
              </Link>
              <Link to="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                Uvjeti korištenja
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;