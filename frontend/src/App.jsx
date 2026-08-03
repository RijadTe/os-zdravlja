// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
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

function App() {
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

        // 1. Prvo provjeri localStorage (brže)
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData?.email) {
          console.log('✅ Korisnik iz localStorage:', userData.email);
          setUser(userData);
          setLoading(false);
          return;
        }

        // 2. Ako nema u localStorage, pitaj Supabase
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
  // 🛡️ SIGURNOSNA ZAŠTITA (15 NIVOA) - UKLJUČENA!
  // ============================================================
  useEffect(() => {
    // ============================================================
    // NIVO 1: Onemogući desni klik
    // ============================================================
    const disableRightClick = (e) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('contextmenu', disableRightClick);

    // ============================================================
    // NIVO 2-6: Onemogući tipke za developer alate
    // ============================================================
    const disableKeys = (e) => {
      // F12 - DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+U - View Source
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I - Inspect
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      // Ctrl+S - Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+C - Inspect Element
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener('keydown', disableKeys);

    // ============================================================
    // NIVO 7: Dodatna zaštita - onemogući drag and drop
    // ============================================================
    const disableDrag = (e) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('dragstart', disableDrag);
    document.addEventListener('drop', disableDrag);

    // ============================================================
    // NIVO 8: Onemogući copy/paste
    // ============================================================
    const disableCopy = (e) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('copy', disableCopy);
    document.addEventListener('cut', disableCopy);
    document.addEventListener('paste', disableCopy);

    // ============================================================
    // NIVO 9: Onemogući selektovanje teksta
    // ============================================================
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    });

    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableKeys);
      document.removeEventListener('dragstart', disableDrag);
      document.removeEventListener('drop', disableDrag);
      document.removeEventListener('copy', disableCopy);
      document.removeEventListener('cut', disableCopy);
      document.removeEventListener('paste', disableCopy);
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Učitavanje...</p>
        </div>
      </div>
    );
  }

  const currentUser = user || JSON.parse(localStorage.getItem('user'));

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 md:h-20">
              <Link to="/" className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                🏥 OS Zdravlja
              </Link>

              <nav className="flex items-center gap-4 sm:gap-6 md:gap-10 text-sm font-semibold">
                <Link to="/" className="flex flex-col items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                  <span className="text-xl md:text-3xl">🏠</span>
                  <span className="text-[10px] md:text-xs">Početna</span>
                </Link>

                <Link to="/community" className="flex flex-col items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                  <span className="text-xl md:text-3xl">📝</span>
                  <span className="text-[10px] md:text-xs">Zajednica</span>
                </Link>

                {currentUser ? (
                  <Link to="/profile" className="flex flex-col items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                    <span className="text-xl md:text-3xl">👤</span>
                    <span className="text-[10px] md:text-xs flex items-center gap-1">
                      Profil {currentUser.premium && <span className="text-yellow-500 text-[8px] md:text-[10px]">⭐</span>}
                    </span>
                  </Link>
                ) : (
                  <Link to="/login" className="flex flex-col items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                    <span className="text-xl md:text-3xl">🔑</span>
                    <span className="text-[10px] md:text-xs">Prijava</span>
                  </Link>
                )}

                <Link to="/quiz" className="flex flex-col items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                  <span className="text-xl md:text-3xl">🧠</span>
                  <span className="text-[10px] md:text-xs">Kviz</span>
                </Link>

                {/* 🔔 NOTIFIKACIJE - DODANO! */}
                {currentUser && <NotificationBell />}

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="flex flex-col items-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <span className="text-xl md:text-3xl">{darkMode ? '☀️' : '🌙'}</span>
                  <span className="text-[10px] md:text-xs">{darkMode ? 'Svijetlo' : 'Tamno'}</span>
                </button>
              </nav>
            </div>
          </div>
        </header>

        <div className="container mx-auto max-w-7xl p-4 md:p-6">
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
    </BrowserRouter>
  );
}

export default App;