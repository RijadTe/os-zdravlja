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

  // 🔥 SVIH 7 JEZIKA (HR, EN, DE, FR, IT, ES, SL)
  const languages = [
    { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' }, // 🔥 DODATO
  ];

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setIsAlreadyLoggedIn(true);
      navigate('/');
    }
    
    const checkDarkMode = () => {
      const dark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark');
      setIsDarkMode(dark);
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
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

  if (isAlreadyLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 transition-all duration-300">
          
          {/* Logo & Header - SA PULSIRAJUĆIM LOGOM I ZASTAVAMA */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="relative">
                {/* Pulsirajući prstenovi */}
                <div className="absolute -inset-2 rounded-full border-2 border-emerald-400/30 animate-ping"></div>
                <div className="absolute -inset-4 rounded-full border-2 border-emerald-400/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute -inset-6 rounded-full border border-emerald-400/10 animate-ping" style={{ animationDelay: '1s' }}></div>
                
                {/* Logo sa pulsirajućim efektom */}
                <img 
                  src="https://i.postimg.cc/WbdznKdk/Green-Simple-Healthy-Food-Logo-20260817-003421-0000.png" 
                  alt="OS Zdravlja Logo"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain relative z-10 animate-pulse-slow"
                />
              </div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
              OS Zdravlja
            </h2>
            
            {/* 🔥 IZBOR JEZIKA SA ZASTAVAMA - SVIH 7 JEZIKA */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">🌍</span>
              <select 
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer min-w-[140px]"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="py-1">
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              🌿 {t('register.subtitle') || 'Pridružite se i otkrijte savršene recepte!'}
            </p>
            
            {/* 🔥 VEĆE UPOZORENJE - ISTAKNUTO */}
            <div className="mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 rounded-xl">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg sm:text-xl">⚠️</span>
                <p className="text-sm sm:text-base font-semibold text-amber-700 dark:text-amber-400">
                  {t('register.language_hint') || 'Odabrani jezik se ne može promijeniti nakon registracije.'}
                </p>
              </div>
            </div>
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
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all duration-300"
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
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all duration-300"
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
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all duration-300"
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
              
              {/* 🔥 SAMO BAR - BEZ TEKSTA */}
              <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    getPasswordStrength(formData.lozinka) === 0 ? 'w-0' :
                    getPasswordStrength(formData.lozinka) === 1 ? 'w-1/4 bg-red-400' :
                    getPasswordStrength(formData.lozinka) === 2 ? 'w-2/4 bg-yellow-400' :
                    getPasswordStrength(formData.lozinka) === 3 ? 'w-3/4 bg-green-400' :
                    getPasswordStrength(formData.lozinka) === 4 ? 'w-full bg-emerald-400' : 'w-0'
                  }`}
                />
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
                  className={`w-full px-4 py-3 pr-12 rounded-xl border bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all duration-300 ${
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
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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

          {/* Linkovi */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              🌿 {t('register.have_account')}{' '}
              <Link to="/login" className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors">
                {t('register.login_link')}
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;