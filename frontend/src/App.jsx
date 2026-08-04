// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient';
import './i18n/index';

// Komponente
import HomeKonacno from './pages/HomeKonacno';
import Quiz from './pages/Quiz';
import HealthyChef from './pages/HealthyChef';
import AIChef from './pages/AIChef';
import Recipes from './pages/Recipes';
import RecipeDetails from './pages/RecipeDetails';
import FoodPlanner from './pages/FoodPlanner';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Premium from './pages/Premium';
import PremiumSuccess from './pages/PremiumSuccess';
import PremiumCancel from './pages/PremiumCancel';
import Community from './pages/Community';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Footer from './components/Footer';
import NotificationBell from './components/NotificationBell';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  const { t } = useTranslation(); // 🔥 SAMO `t`
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🌙 TAMNA TEMA
  // ============================================================
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ============================================================
  // 🔐 SUPABASE AUTH - PROVJERA KORISNIKA
  // ============================================================
  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        console.log('🔍 Provjera korisnika...');

        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData?.email) {
          console.log('✅ Korisnik iz localStorage:', userData.email);
          setUser(userData);
          setLoading(false);
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Greška pri dohvatu session-a:', sessionError);
        }

        if (session?.user) {
          console.log('✅ Korisnik prijavljen preko Supabase:', session.user.email);
          
          const userObj = {
            id: session.user.id,
            email: session.user.email,
            ime: session.user.user_metadata?.ime || '',
            premium: session.user.user_metadata?.premium || false
          };
          
          setUser(userObj);
          localStorage.setItem('user', JSON.stringify(userObj));
          localStorage.setItem('userEmail', session.user.email);
          localStorage.setItem('userName', session.user.user_metadata?.ime || '');
          
          try {
            const { data: profile } = await supabase
              .from('profili')
              .select('*')
              .eq('email', session.user.email)
              .maybeSingle();
            
            if (profile) {
              console.log('📋 Profil dohvaćen:', profile);
              const updatedUser = { 
                ...userObj, 
                premium: profile.premium || false,
                kviz_zavrsen: profile.kviz_zavrsen || false,
                vrsta: profile.vrsta || [],
                izbjegava: profile.izbjegava || [],
                preferencije: profile.preferencije || []
              };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          } catch (profileError) {
            console.warn('⚠️ Greška pri dohvatu profila:', profileError);
          }
          
        } else {
          console.log('ℹ️ Nema prijavljenog korisnika');
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
        }
      } catch (error) {
        console.error('❌ Greška pri provjeri korisnika:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth event:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ Korisnik se prijavio:', session.user.email);
        
        const userObj = {
          id: session.user.id,
          email: session.user.email,
          ime: session.user.user_metadata?.ime || '',
          premium: session.user.user_metadata?.premium || false
        };
        
        setUser(userObj);
        localStorage.setItem('user', JSON.stringify(userObj));
        localStorage.setItem('userEmail', session.user.email);
        localStorage.setItem('userName', session.user.user_metadata?.ime || '');
        
        try {
          const { data: profile } = await supabase
            .from('profili')
            .select('*')
            .eq('email', session.user.email)
            .maybeSingle();
          
          if (profile) {
            const updatedUser = { 
              ...userObj, 
              premium: profile.premium || false,
              kviz_zavrsen: profile.kviz_zavrsen || false
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (error) {
          console.warn('⚠️ Greška pri dohvatu profila:', error);
        }
        
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 Korisnik se odjavio');
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('supabase_session');
      } else if (event === 'USER_UPDATED') {
        console.log('📝 Korisnik ažuriran');
        if (session?.user) {
          const userObj = {
            id: session.user.id,
            email: session.user.email,
            ime: session.user.user_metadata?.ime || '',
            premium: session.user.user_metadata?.premium || false
          };
          setUser(userObj);
          localStorage.setItem('user', JSON.stringify(userObj));
          localStorage.setItem('userEmail', session.user.email);
          localStorage.setItem('userName', session.user.user_metadata?.ime || '');
        }
      }
    });

    return () => {
      console.log('🧹 Čišćenje auth subscription-a');
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // 🔄 OSVJEŽAVANJE KORISNIKA
  // ============================================================
  const refreshUser = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData?.email) {
        const { data: profile } = await supabase
          .from('profili')
          .select('*')
          .eq('email', userData.email)
          .maybeSingle();
        
        if (profile) {
          const updatedUser = { 
            ...userData, 
            premium: profile.premium || false,
            kviz_zavrsen: profile.kviz_zavrsen || false
          };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('❌ Greška pri osvježavanju korisnika:', error);
    }
  };

  // ============================================================
  // 🖥️ RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const currentUser = user || JSON.parse(localStorage.getItem('user'));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* ===== HEADER ===== */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
            <Link 
              to="/" 
              className="flex-shrink-0 text-base sm:text-xl md:text-2xl font-extrabold text-blue-600 dark:text-blue-400 hover:opacity-80 transition"
            >
              OS Zdravlja
            </Link>

            <nav className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <Link 
                to="/community" 
                className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-xl sm:text-2xl md:text-3xl text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                aria-label={t('nav.community')}
              >
                📝
              </Link>

              {currentUser ? (
                <Link 
                  to="/profile" 
                  className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-xl sm:text-2xl md:text-3xl text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 relative"
                  aria-label={t('nav.profile')}
                >
                  👤
                  {currentUser.premium && (
                    <span className="absolute -top-0.5 -right-0.5 text-[8px] sm:text-[10px]">⭐</span>
                  )}
                </Link>
              ) : (
                <Link 
                  to="/login" 
                  className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-xl sm:text-2xl md:text-3xl text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  aria-label={t('nav.login')}
                >
                  🔑
                </Link>
              )}

              <Link 
                to="/quiz" 
                className="hidden lg:flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-xl sm:text-2xl md:text-3xl text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                aria-label={t('nav.quiz')}
              >
                🧠
              </Link>

              <div className="flex items-center">
                {currentUser && <NotificationBell />}
              </div>

              <LanguageSwitcher />

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-xl sm:text-2xl md:text-3xl"
                aria-label={darkMode ? t('common.light') : t('common.dark')}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* ===== GLAVNI SADRŽAJ ===== */}
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-4 md:py-6">
        <Routes>
          <Route path="/" element={<HomeKonacno />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/ai-chef" element={<AIChef />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/:id" element={<RecipeDetails />} />
          <Route path="/healthy-chef" element={<HealthyChef />} />
          <Route path="/healthy-chef/:kategorijaId" element={<HealthyChef />} />
          <Route path="/healthy-chef/:kategorijaId/:fazaId" element={<HealthyChef />} />
          <Route path="/food-planner" element={<FoodPlanner />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} /> 
          <Route path="/premium" element={<Premium />} />
          <Route path="/premium-success" element={<PremiumSuccess />} />
          <Route path="/premium-cancel" element={<PremiumCancel />} />
          <Route path="/community" element={<Community />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
        <Footer />
      </div>
    </div>
  );
}

export default App;