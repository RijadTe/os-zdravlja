// frontend/src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Praćenje dark mode promjena
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
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔥 DOHVATI PROFIL IZ BAZE
  const fetchUserProfile = async (email) => {
    try {
      console.log('📡 Dohvatam profil iz baze za:', email);
      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
      
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

      const profile = await fetchUserProfile(formData.email);
      
      if (!profile) {
        console.log('⚠️ Profil ne postoji u bazi - preusmjeravam na registraciju');
        await supabase.auth.signOut();
        setError('❌ Vaš profil je izbrisan iz baze.\n\n📝 Molimo da se ponovno registrujete.\n🔒 Ne možete se prijaviti sa starim podacima.');
        setTimeout(() => {
          navigate('/register');
        }, 2000);
        setLoading(false);
        return;
      }

      console.log('✅ Profil postoji u bazi, nastavljam sa prijavom');

      const selectedLanguage = profile?.preferred_language || i18n.language || 'hr';
      localStorage.setItem('preferredLanguage', selectedLanguage);

      const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30);
      const now = Math.floor(Date.now() / 1000);

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
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 transition-all duration-300">
          
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img 
                src="https://i.postimg.cc/WbdznKdk/Green-Simple-Healthy-Food-Logo-20260817-003421-0000.png" 
                alt="OS Zdravlja Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
              />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
              OS Zdravlja
            </h2>
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">🌐</span>
              <select 
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
              >
                <option value="hr">Hrvatski</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              🔐 {t('login.subtitle') || 'Prijavite se i nastavite sa zdravim receptima!'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4 text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-300 p-3 rounded-xl mb-4 text-sm">
              {success}
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                📧 {t('login.email_label')} *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all duration-300"
                placeholder={t('login.email_placeholder') || 'vas@email.com'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                🔒 {t('login.password_label')} *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="lozinka"
                  value={formData.lozinka}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all duration-300"
                  placeholder={t('login.password_placeholder') || '••••••'}
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
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  defaultChecked={true}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 focus:ring-2 focus:ring-offset-2 cursor-pointer"
                />
                {t('login.remember_me') || 'Zapamti me'}
              </label>
              <Link to="/forgot-password" className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors">
                {t('login.forgot_password') || 'Zaboravili ste lozinku?'}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {!loading ? (
                <>
                  🔐 {t('login.button.login')}
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
                  {t('login.button.loading')}
                </span>
              )}
            </button>
          </form>

          {/* Linkovi */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              🌿 {t('login.no_account')}{' '}
              <Link to="/register" className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors">
                {t('login.register_link')}
              </Link>
            </p>
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              🌿 Vrati se na početnu
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;