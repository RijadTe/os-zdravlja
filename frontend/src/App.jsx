// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient';
import './i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  // 🔥 DODANO - i18n spreman
  const [i18nReady, setI18nReady] = useState(false);

  // ============================================================
  // 🔥 i18n - PROVJERA DA LI JE SPREMAN (BEZ ČEKANJA!)
  // ============================================================
  useEffect(() => {
    // Provjeri da li je i18n već inicijaliziran
    if (i18n.isInitialized) {
      console.log('✅ i18n već inicijaliziran!');
      setI18nReady(true);
    } else {
      // Ako nije, čekaj event
      const handleInitialized = () => {
        console.log('✅ i18n inicijaliziran!');
        setI18nReady(true);
      };
      i18n.on('initialized', handleInitialized);
      
      // Fallback - ako se inicijalizacija dogodila prije nego smo stigli
      setTimeout(() => {
        if (i18n.isInitialized) {
          setI18nReady(true);
        }
      }, 100);
      
      return () => {
        i18n.off('initialized', handleInitialized);
      };
    }
  }, [i18n]);

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
  // 🔥 DOHVATI PROFIL IZ BAZE
  // ============================================================
  const fetchUserProfile = useCallback(async (email) => {
    if (!email) return null;
    
    try {
      console.log('📡 Dohvatam profil iz baze za:', email);
      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
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
  }, []);

  // ============================================================
  // 🔐 PROVJERA KORISNIKA - PERMANENTNA PRIJAVA (30 DANA)
  // ============================================================
  const checkAndSetUser = useCallback(async (userData) => {
    if (!userData?.email) {
      setUser(null);
      return null;
    }

    // 🔥 PROVJERI DA LI JE TOKEN ISTEKAO (30 DANA)
    const tokenExpiry = userData.expires_at || userData.exp;
    if (tokenExpiry) {
      const now = Math.floor(Date.now() / 1000);
      if (tokenExpiry < now) {
        console.log('⏰ Token istekao nakon 30 dana, brišem sesiju...');
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('remember_me');
        setUser(null);
        return null;
      }
    }

    // 🔥 DOHVATI PROFIL IZ BAZE
    const profile = await fetchUserProfile(userData.email);
    
    // 🔥 ZADRŽI POSTOJEĆI expires_at (NE MIJENJAJ GA)
    const updatedUser = {
      ...userData,
      premium: profile?.premium || false,
      kviz_zavrsen: profile?.kviz_zavrsen || false,
      vrsta: profile?.vrsta || [],
      izbjegava: profile?.izbjegava || [],
      preferencije: profile?.preferencije || [],
      vrijeme: profile?.vrijeme || '',
      tezina: profile?.tezina || '',
      kalorije: profile?.kalorije || '',
      // ⬅️ ZADRŽI ORIGINALNI expires_at
    };
    
    // 🔥 SPREMI U LOCALSTORAGE
    localStorage.setItem('user', JSON.stringify(updatedUser));
    if (updatedUser.email) {
      localStorage.setItem('userEmail', updatedUser.email);
    }
    
    setUser(updatedUser);
    return updatedUser;
  }, [fetchUserProfile]);

  // ============================================================
  // 🔄 AUTO-REFRESH SESSIONA - SVAKIH 30 MINUTA
  // ============================================================
  const refreshSession = useCallback(async () => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    
    try {
      const parsed = JSON.parse(storedUser);
      if (!parsed?.email) return;
      
      console.log('🔄 Auto-refresh sessiona...');
      
      // 🔥 DOHVATI SVJEŽI PROFIL IZ BAZE
      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(parsed.email)}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // 🔥 OSVJEŽI USER PODATKE (ZADRŽI expires_at)
        const updatedUser = {
          ...parsed,
          ime: data.data.ime || parsed.ime,
          premium: data.data.premium || false,
          kviz_zavrsen: data.data.kviz_zavrsen || false,
          vrsta: data.data.vrsta || [],
          izbjegava: data.data.izbjegava || [],
          preferencije: data.data.preferencije || [],
          vrijeme: data.data.vrijeme || '',
          tezina: data.data.tezina || '',
          kalorije: data.data.kalorije || '',
          // 🔥 PRODUŽI EXPIRATION (JOŠ 30 DANA)
          expires_at: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
          last_refresh: Math.floor(Date.now() / 1000)
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        console.log('✅ Session osvježen, traje do:', new Date(updatedUser.expires_at * 1000).toLocaleString());
      }
    } catch (error) {
      console.error('❌ Greška pri refresh sessiona:', error);
    }
  }, []);

  // ============================================================
  // 🔐 SUPABASE AUTH - GLAVNA LOGIKA
  // ============================================================
  useEffect(() => {
    let isMounted = true;
    let authInterval = null;
    let refreshInterval = null;

    const initAuth = async () => {
      try {
        setLoading(true);
        console.log('🔍 Inicijalizacija auth-a...');

        // 1. PROVJERI LOCALSTORAGE
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed?.email) {
              console.log('📦 Korisnik iz localStorage:', parsed.email);
              
              // 🔥 PROVJERI EXPIRATION
              const expiry = parsed.expires_at || parsed.exp;
              if (expiry) {
                const now = Math.floor(Date.now() / 1000);
                if (expiry < now) {
                  console.log('⏰ Session istekao, brišem...');
                  localStorage.removeItem('user');
                  localStorage.removeItem('userEmail');
                  localStorage.removeItem('remember_me');
                  if (isMounted) {
                    setUser(null);
                    setAuthChecked(true);
                    setLoading(false);
                  }
                  return;
                }
              }
              
              await checkAndSetUser(parsed);
              if (isMounted) {
                setAuthChecked(true);
                setLoading(false);
              }
              return;
            }
          } catch (e) {
            console.error('❌ Greška pri parsiranju usera:', e);
            localStorage.removeItem('user');
          }
        }

        // 2. PROVJERI SUPABASE SESSION
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Greška pri dohvatu session-a:', sessionError);
        }

        if (session?.user) {
          console.log('✅ Korisnik prijavljen preko Supabase:', session.user.email);
          
          // 🔥 30 DANA EXPIRATION
          const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30);
          
          const userObj = {
            id: session.user.id,
            email: session.user.email,
            ime: session.user.user_metadata?.ime || '',
            premium: false,
            expires_at: expiresAt,
            remember_me: true
          };
          
          await checkAndSetUser(userObj);
        } else {
          console.log('ℹ️ Nema prijavljenog korisnika');
          if (isMounted) {
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('remember_me');
          }
        }
      } catch (error) {
        console.error('❌ Greška pri auth inicijalizaciji:', error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setAuthChecked(true);
          setLoading(false);
        }
      }
    };

    // 🔥 POKRENI AUTH
    initAuth();

    // 🔥 PROVJERAVAJ SESSION SVAKIH 5 MINUTA (SAMO EXPIRATION)
    authInterval = setInterval(async () => {
      if (!isMounted) return;
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed?.email) {
            // Provjeri expiration
            const expiry = parsed.expires_at || parsed.exp;
            if (expiry) {
              const now = Math.floor(Date.now() / 1000);
              if (expiry < now) {
                console.log('⏰ Session istekao, brišem...');
                localStorage.removeItem('user');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('remember_me');
                if (isMounted) {
                  setUser(null);
                  navigate('/login');
                }
                return;
              }
            }
          }
        } catch (e) {
          console.error('❌ Greška pri provjeri sessiona:', e);
        }
      }
    }, 5 * 60 * 1000); // 5 minuta

    // 🔥 AUTO-REFRESH SESSIONA SVAKIH 30 MINUTA
    refreshInterval = setInterval(() => {
      if (isMounted) {
        refreshSession();
      }
    }, 30 * 60 * 1000); // 30 minuta

    // 🔥 REFRESH KAD SE TAB VRATI U FOKUS
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        console.log('👁️ Tab u fokusu, refresh sessiona...');
        refreshSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ============================================================
    // 🔥 SUPABASE AUTH LISTENER
    // ============================================================
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth event:', event);
      
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ Korisnik se prijavio:', session.user.email);
        
        // 🔥 30 DANA EXPIRATION
        const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30);
        
        const userObj = {
          id: session.user.id,
          email: session.user.email,
          ime: session.user.user_metadata?.ime || '',
          premium: false,
          expires_at: expiresAt,
          remember_me: true
        };
        
        await checkAndSetUser(userObj);
        navigate('/');
        
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 Korisnik se odjavio');
        if (isMounted) {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('remember_me');
          navigate('/login');
        }
        
      } else if (event === 'USER_UPDATED') {
        console.log('📝 Korisnik ažuriran');
        if (session?.user) {
          const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30);
          const userObj = {
            id: session.user.id,
            email: session.user.email,
            ime: session.user.user_metadata?.ime || '',
            premium: false,
            expires_at: expiresAt,
            remember_me: true
          };
          await checkAndSetUser(userObj);
        }
      }
    });

    // ============================================================
    // 🧹 CLEANUP
    // ============================================================
    return () => {
      isMounted = false;
      if (authInterval) {
        clearInterval(authInterval);
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      subscription.unsubscribe();
      console.log('🧹 Čišćenje auth listenera');
    };
  }, [checkAndSetUser, navigate, refreshSession]);

  // ============================================================
  // 🔄 OSVJEŽAVANJE KORISNIKA (POZIVI IZ DRUGIH DIJELOVA)
  // ============================================================
  const refreshUser = useCallback(async () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email) {
          await checkAndSetUser(parsed);
        }
      } catch (error) {
        console.error('❌ Greška pri osvježavanju:', error);
      }
    }
  }, [checkAndSetUser]);

  // ============================================================
  // 🖥️ RENDER - SA i18n READY PROVJEROM (BEZ VJEČNOG LOADINGA)
  // ============================================================
  
  // 🔥 AKO i18n NIJE SPREMAN - PRIKAŽI LOADING (SAMO 100ms)
  if (!i18nReady) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Učitavanje...</p>
        </div>
      </div>
    );
  }

  // 🔥 AKO SE AUTH UČITAVA
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // 🔥 KORISTI user IZ STATE-A
  const currentUser = user;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* HEADER */}
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

      {/* GLAVNI SADRŽAJ */}
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