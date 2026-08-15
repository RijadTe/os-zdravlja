// frontend/src/pages/Profile.jsx

{
      <SEO 
        title="Profil"
        description="Vaš profil – pregledajte svoje preferencije, osvojene bedževe i napredak na OS Zdravlja."
        url="https://os-zdravlja.vercel.app/profile"
      />
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';
import SEO from '../components/SEO';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [badges, setBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [badgesVisible, setBadgesVisible] = useState(false);
  const badgesRef = useRef(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ============================================================
  // 🌍 MAPIRANJE ZA PREVOD PREFERENCIJA
  // ============================================================
  const translateValue = useCallback((value, type) => {
    if (!value) return t('profile.not_selected');
    
    const maps = {
      vrsta: {
        'Deserti': t('quiz.options.vrsta.0'),
        'Slano': t('quiz.options.vrsta.1'),
        'Dijetalni recepti': t('quiz.options.vrsta.2'),
        'Napitki': t('quiz.options.vrsta.3'),
        'Svejedno': t('quiz.options.vrsta.4')
      },
      restrikcije: {
        'Bez restrikcija': t('quiz.options.restrikcije.0'),
        'Bez glutena': t('quiz.options.restrikcije.1'),
        'Bez laktoze': t('quiz.options.restrikcije.2'),
        'Bez šećera': t('quiz.options.restrikcije.3'),
        'Veganski': t('quiz.options.restrikcije.4'),
        'Bez orašastih plodova': t('quiz.options.restrikcije.5')
      },
      preferencije: {
        'Visokoproteinski': t('quiz.options.preferencije.0'),
        'Bogat vlaknima': t('quiz.options.preferencije.1'),
        'Bogat ugljikohidratima': t('quiz.options.preferencije.2'),
        'Svejedno': t('quiz.options.preferencije.3')
      },
      vrijeme: {
        'Kratko (15-30 min)': t('quiz.options.vrijeme.0'),
        'Srednje (30-45 min)': t('quiz.options.vrijeme.1'),
        'Duže (45-60+ min)': t('quiz.options.vrijeme.2')
      },
      tezina: {
        'Početnik': t('quiz.options.tezina.0'),
        'Srednji': t('quiz.options.tezina.1'),
        'Profesionalac': t('quiz.options.tezina.2')
      },
      kalorije: {
        // 🔥 POPRAVLJENO - dodane sve varijante
        'Nisko': t('quiz.options.kalorije.0') || 'Nisko',
        'Nisko (do 300 kcal)': t('quiz.options.kalorije.0') || 'Nisko',
        'Umjereno': t('quiz.options.kalorije.1') || 'Umjereno',
        'Umjereno (300-500 kcal)': t('quiz.options.kalorije.1) || 'Umjereno',
        'Srednje': t('quiz.options.kalorije.2') || 'Srednje',
        'Srednje (500-700 kcal)': t('quiz.options.kalorije.2') || 'Srednje',
        'Visoko': t('quiz.options.kalorije.3') || 'Visoko',
        'Visoko (900+ kcal)': t('quiz.options.kalorije.3') || 'Visoko'
      }
    };

    const map = maps[type];
    if (!map) return value;
    
    if (Array.isArray(value)) {
      return value.map(v => {
        if (map[v] !== undefined) return map[v];
        const trimmed = v.replace(/^Bez /, '');
        if (map[trimmed] !== undefined) return map[trimmed];
        return v;
      }).join(', ');
    }
    
    if (map[value] !== undefined) return map[value];
    const trimmed = value.replace(/^Bez /, '');
    if (map[trimmed] !== undefined) return map[trimmed];
    
    return value;
  }, [t]);

  // ============================================================
  // 🔥 DOHVATI BEDŽEVE IZ BAZE (sa cachingom)
  // ============================================================
  const fetchBadges = useCallback(async (email) => {
    if (!email) return;
    
    // 🔥 PROVJERI sessionStorage PRVO (brže)
    const sessionKey = `badges_session_${email}`;
    const sessionCached = sessionStorage.getItem(sessionKey);
    if (sessionCached) {
      try {
        const parsed = JSON.parse(sessionCached);
        setBadges(parsed.badges || []);
        setBadgesLoading(false);
        return;
      } catch (e) {}
    }
    
    // 🔥 ONDA localStorage
    const cacheKey = `badges_${email}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const cacheTime = parsed._timestamp || 0;
        if (Date.now() - cacheTime < 300000) {
          setBadges(parsed.badges || []);
          setBadgesLoading(false);
          // Spremi i u sessionStorage za brži pristup
          sessionStorage.setItem(sessionKey, JSON.stringify({ badges: parsed.badges }));
          return;
        }
      } catch (e) {}
    }
    
    try {
      setBadgesLoading(true);
      const response = await fetch(`${API_URL}/api/badges/${encodeURIComponent(email)}`);
      
      if (response.status === 404) {
        setBadges([]);
        setBadgesLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      if (data.success && data.badges) {
        setBadges(data.badges);
        // Spremi u oba cache-a
        localStorage.setItem(cacheKey, JSON.stringify({
          badges: data.badges,
          _timestamp: Date.now()
        }));
        sessionStorage.setItem(sessionKey, JSON.stringify({ badges: data.badges }));
      } else {
        setBadges([]);
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu bedževa:', error);
      setBadges([]);
    } finally {
      setBadgesLoading(false);
    }
  }, []);

  // ============================================================
  // 🔥 POZADINSKO OSVJEŽAVANJE PROFILA (uvijek u pozadini)
  // ============================================================
  const refreshProfileInBackground = useCallback(async (email) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    try {
      const [profileRes, badgesRes] = await Promise.all([
        fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`),
        fetch(`${API_URL}/api/badges/${encodeURIComponent(email)}`).catch(() => ({ ok: false }))
      ]);
      
      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.success && data.data) {
          setProfile(data.data);
          // 🔥 Ažuriraj SAMO sessionStorage (ne localStorage!)
          sessionStorage.setItem('user_profile', JSON.stringify(data.data));
          
          // 🔥 Ažuriraj i user_session
          const sessionUser = sessionStorage.getItem('user_session');
          if (sessionUser) {
            try {
              const parsed = JSON.parse(sessionUser);
              parsed.profile = data.data;
              parsed.premium = data.data.premium || false;
              sessionStorage.setItem('user_session', JSON.stringify(parsed));
            } catch (e) {}
          }
        }
      }
      
      if (badgesRes.ok) {
        const data = await badgesRes.json();
        if (data.success && data.badges) {
          setBadges(data.badges);
          const cacheKey = `badges_${email}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            badges: data.badges,
            _timestamp: Date.now()
          }));
          sessionStorage.setItem(`badges_session_${email}`, JSON.stringify({ badges: data.badges }));
        }
      }
    } catch (error) {
      console.error('❌ Pozadinsko osvježavanje:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // ============================================================
  // 📊 DOHVATI PROFIL - SAMO IZ SESSION STORAGE
  // ============================================================
  const getCachedProfile = useCallback((email) => {
    // 🔥 SAMO sessionStorage (brže i bez konflikta)
    const sessionProfile = sessionStorage.getItem('user_profile');
    if (sessionProfile) {
      try {
        const parsed = JSON.parse(sessionProfile);
        if (parsed.email === email) {
          return parsed;
        }
      } catch (e) {}
    }
    
    // 🔥 VIŠE NE KORISTIMO localStorage za profil!
    return null;
  }, []);

  // ============================================================
  // 📊 DOHVATI PROFIL (SAMO sessionStorage)
  // ============================================================
  const fetchProfile = useCallback(async (email) => {
    if (!email) return;
    
    // 🔥 PRVO PROVJERI sessionStorage
    const sessionProfile = sessionStorage.getItem('user_profile');
    if (sessionProfile) {
      try {
        const parsed = JSON.parse(sessionProfile);
        if (parsed.email === email) {
          setProfile(parsed);
          setLoading(false);
          // 🔥 U POZADINI OSVJEŽI (uvijek, ali bez čekanja)
          refreshProfileInBackground(email);
          return;
        }
      } catch (e) {}
    }
    
    // Ako nema session cache-a, čekamo API
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
      
      if (response.status === 429) {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser) {
          const fallbackProfile = {
            ime: storedUser.ime || 'Korisnik',
            email: storedUser.email || email,
            premium: storedUser.premium || false,
            kviz_zavrsen: storedUser.kviz_zavrsen || false,
            vrsta: storedUser.vrsta || [],
            izbjegava: storedUser.izbjegava || [],
            preferencije: storedUser.preferencije || [],
            vrijeme: storedUser.vrijeme || '',
            tezina: storedUser.tezina || '',
            kalorije: storedUser.kalorije || '',
            skuhano_recepata: storedUser.skuhano_recepata || 0,
            preferred_language: storedUser.preferred_language || 'hr'
          };
          setProfile(fallbackProfile);
          sessionStorage.setItem('user_profile', JSON.stringify(fallbackProfile));
        }
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setProfile(data.data);
        // 🔥 SPREMI SAMO U SESSION STORAGE
        sessionStorage.setItem('user_profile', JSON.stringify(data.data));
        
        // 🔥 AŽURIRAJ I USER U SESSION STORAGE
        const sessionUser = sessionStorage.getItem('user_session');
        if (sessionUser) {
          try {
            const parsed = JSON.parse(sessionUser);
            parsed.profile = data.data;
            parsed.premium = data.data.premium || false;
            sessionStorage.setItem('user_session', JSON.stringify(parsed));
          } catch (e) {}
        }
        
        // Badges iz cache-a
        const cacheKey = `badges_${email}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - (parsed._timestamp || 0) < 300000) {
              setBadges(parsed.badges || []);
              setBadgesLoading(false);
            }
          } catch (e) {}
        }
      } else {
        await createProfile(email);
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu profila:', error);
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser) {
        const fallbackProfile = {
          ime: storedUser.ime || 'Korisnik',
          email: storedUser.email || email,
          premium: storedUser.premium || false,
          kviz_zavrsen: storedUser.kviz_zavrsen || false,
          vrsta: storedUser.vrsta || [],
          izbjegava: storedUser.izbjegava || [],
          preferencije: storedUser.preferencije || [],
          vrijeme: storedUser.vrijeme || '',
          tezina: storedUser.tezina || '',
          kalorije: storedUser.kalorije || '',
          skuhano_recepata: storedUser.skuhano_recepata || 0,
          preferred_language: storedUser.preferred_language || 'hr'
        };
        setProfile(fallbackProfile);
        sessionStorage.setItem('user_profile', JSON.stringify(fallbackProfile));
      } else {
        await createProfile(email);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshProfileInBackground]);

  // ============================================================
  // 🆕 KREIRAJ PROFIL
  // ============================================================
  const createProfile = useCallback(async (email) => {
    try {
      const preferredLanguage = localStorage.getItem('preferredLanguage') || 'hr';
      
      const res = await fetch(`${API_URL}/api/profil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          ime: user?.ime || user?.user_metadata?.ime || t('profile.default_name'),
          premium: false,
          kviz_zavrsen: false,
          vrsta: [],
          izbjegava: [],
          preferencije: [],
          preferred_language: preferredLanguage
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setProfile(data.data);
        sessionStorage.setItem('user_profile', JSON.stringify(data.data));
      }
    } catch (error) {
      console.error('❌ Greška pri kreiranju profila:', error);
    }
  }, [user, t]);

  // ============================================================
  // 🔐 AUTH (optimizirano)
  // ============================================================
  useEffect(() => {
    const checkUser = async () => {
      try {
        // 🔥 PRVO IZ sessionStorage (najbrže)
        const sessionUser = sessionStorage.getItem('user_session');
        if (sessionUser) {
          try {
            const parsed = JSON.parse(sessionUser);
            if (parsed?.email && parsed?.profile) {
              setUser(parsed);
              setProfile(parsed.profile);
              setLoading(false);
              // U pozadini osvježi
              refreshProfileInBackground(parsed.email);
              return;
            }
          } catch (e) {}
        }
        
        // 🔥 ONDA IZ localStorage - SAMO za user podatke
        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (cachedUser?.email) {
          setUser(cachedUser);
          setLoading(false);
          sessionStorage.setItem('user_session', JSON.stringify(cachedUser));
          
          // 🔥 Pokušaj dohvatiti profil iz sessionStorage
          const sessionProfile = sessionStorage.getItem('user_profile');
          if (sessionProfile) {
            try {
              const parsed = JSON.parse(sessionProfile);
              if (parsed.email === cachedUser.email) {
                setProfile(parsed);
                return;
              }
            } catch (e) {}
          }
          
          // Ako nema profila u sessionStorage, dohvati iz baze
          await fetchProfile(cachedUser.email);
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const email = session.user.email;
          
          const supabaseUser = {
            id: session.user.id,
            email: session.user.email,
            ime: session.user.user_metadata?.ime || '',
            premium: false,
            profile: null,
            preferred_language: 'hr'
          };
          
          setUser(supabaseUser);
          localStorage.setItem('user', JSON.stringify(supabaseUser));
          localStorage.setItem('userEmail', session.user.email);
          sessionStorage.setItem('user_session', JSON.stringify(supabaseUser));
          
          await fetchProfile(email);
          return;
        }
        
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData?.email) {
          navigate('/login');
          return;
        }
        
        setUser(userData);
        const email = localStorage.getItem('userEmail') || userData?.email;
        if (email) {
          await fetchProfile(email);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Greška pri provjeri korisnika:', error);
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate, fetchProfile, refreshProfileInBackground]);

  // ============================================================
  // 🔥 LAZY LOAD BADGES
  // ============================================================
  useEffect(() => {
    if (!badgesRef.current || badgesVisible) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setBadgesVisible(true);
        if (profile?.email) {
          fetchBadges(profile.email);
        }
      }
    }, { threshold: 0.1, rootMargin: '100px' });
    
    observer.observe(badgesRef.current);
    return () => observer.disconnect();
  }, [profile, fetchBadges, badgesVisible]);

  // ============================================================
  // 🔥 OSVJEŽI BEDŽEVE KADA SE JEZIK PROMIJENI
  // ============================================================
  useEffect(() => {
    if (profile?.email && badgesVisible) {
      fetchBadges(profile.email);
    }
  }, [i18n.language, profile, fetchBadges, badgesVisible]);

  // ============================================================
  // 🔥 OSVJEŽI CACHE KADA SE PROFIL PROMIJENI
  // ============================================================
  useEffect(() => {
    if (profile && profile.email) {
      // Ažuriraj sessionStorage sa novim podacima
      sessionStorage.setItem('user_profile', JSON.stringify(profile));
      
      // Ažuriraj i user_session
      const sessionUser = sessionStorage.getItem('user_session');
      if (sessionUser) {
        try {
          const parsed = JSON.parse(sessionUser);
          parsed.profile = profile;
          parsed.premium = profile.premium || false;
          parsed.vrsta = profile.vrsta || [];
          parsed.izbjegava = profile.izbjegava || [];
          parsed.preferencije = profile.preferencije || [];
          parsed.vrijeme = profile.vrijeme || '';
          parsed.tezina = profile.tezina || '';
          parsed.kalorije = profile.kalorije || '';
          parsed.kviz_zavrsen = profile.kviz_zavrsen || false;
          sessionStorage.setItem('user_session', JSON.stringify(parsed));
        } catch (e) {}
      }
      
      console.log('✅ Cache profila ažuriran (sessionStorage)');
    }
  }, [profile]);

  // ============================================================
  // 🗑️ IZBRIŠI SVE PODATKE
  // ============================================================
  const handleDeleteData = async () => {
    if (!window.confirm(
      '⚠️ Jeste li sigurni da želite izbrisati SVE svoje podatke?\n\n' +
      '🗑️ Ova radnja je NEPOVRATNA!\n' +
      '📝 Nakon brisanja, morat ćete se ponovno registrirati.\n' +
      '🔒 Nećete se moći prijaviti sa starim podacima.'
    )) return;
    
    setDeleting(true);
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      if (!email) {
        alert('❌ Niste prijavljeni.');
        setDeleting(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}/delete`, { 
        method: 'DELETE' 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Greška pri brisanju profila');
      }

      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
      navigate('/register');
      
    } catch (error) {
      console.error('❌ Greška pri brisanju:', error);
      alert('❌ Došlo je do greške prilikom brisanja profila.\n\n' + error.message);
      setDeleting(false);
    }
  };

  // ============================================================
  // 🚪 ODJAVA
  // ============================================================
  const handleLogout = async () => {
    if (!window.confirm('Jeste li sigurni da se želite odjaviti?')) return;
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('❌ Greška pri odjavi:', error);
    }
    
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('supabase_session');
    sessionStorage.clear();
    navigate('/login');
  };

  // ============================================================
  // 🖥️ RENDER - LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - NEMA PROFILA
  // ============================================================
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 max-w-md text-center shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          <p className="text-4xl mb-4">👤</p>
          <p className="text-gray-800 dark:text-white text-lg font-semibold">{t('profile.not_found')}</p>
          <Link to="/quiz" className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg shadow-blue-500/25">
            🧠 {t('profile.take_quiz')}
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - GLAVNI UI
  // ============================================================
  const isPremium = profile.premium || false;
  const isQuizCompleted = profile.kviz_zavrsen || false;
  const cookedCount = profile.skuhano_recepata || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* ===== SEO ===== */}
        <SEO 
          title={t('profile.seo_title')}
          description={t('profile.seo_description')}
          url="https://os-zdravlja.vercel.app/profile"
        />

        {/* ===== HERO ===== */}
        <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 shadow-2xl overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/10 rounded-full blur-2xl"></div>
          
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl text-white border-2 border-white/30 shadow-xl">
                {profile.ime?.charAt(0) || '👤'}
              </div>
              {isPremium && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 border-2 border-white">
                  <span className="text-xs">⭐</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {profile.ime || t('profile.default_name')}
                </h1>
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 bg-yellow-400/20 backdrop-blur-sm text-yellow-200 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-400/30">
                    ⭐ {t('profile.premium')}
                  </span>
                ) : (
                  <Link to="/premium" className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm text-white/80 px-3 py-1 rounded-full text-xs font-semibold hover:bg-white/20 transition border border-white/10">
                    ⭐ {t('profile.become_premium')}
                  </Link>
                )}
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2 text-white/70 text-sm mt-1">
                <span>📧</span>
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2 text-white/60 text-xs mt-1">
                <span>✨</span>
                <span>🌍 {t('profile.language')}: {
                  profile.preferred_language === 'hr' ? 'Hrvatski' : 
                  profile.preferred_language === 'en' ? 'English' : 'Deutsch'
                }</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== STATS ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-lg border border-white/20 backdrop-blur-sm hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-400/30">👨‍🍳</div>
              <div>
                <p className="text-white/80 text-xs font-medium">{t('profile.stats.recipes_cooked')}</p>
                <p className="text-white text-xl font-bold">{cookedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 shadow-lg border border-white/20 backdrop-blur-sm hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/30">🏆</div>
              <div>
                <p className="text-white/80 text-xs font-medium">{t('profile.stats.badges_earned')}</p>
                <p className="text-white text-xl font-bold">{badges.length}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-4 shadow-lg border border-white/20 backdrop-blur-sm hover:scale-[1.02] transition-transform ${
            isQuizCompleted 
              ? 'bg-gradient-to-br from-green-500 to-green-600' 
              : 'bg-gradient-to-br from-orange-500 to-orange-600'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                isQuizCompleted ? 'bg-green-400/30' : 'bg-orange-400/30'
              }`}>
                {isQuizCompleted ? '✅' : '⏳'}
              </div>
              <div>
                <p className="text-white/80 text-xs font-medium">{t('profile.quiz')}</p>
                <p className="text-white text-lg font-bold">
                  {isQuizCompleted ? t('profile.stats.quiz_completed') : t('profile.stats.quiz_not_completed')}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-4 shadow-lg border border-white/20 backdrop-blur-sm hover:scale-[1.02] transition-transform ${
            isPremium 
              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' 
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                isPremium ? 'bg-yellow-400/30' : 'bg-gray-400/30'
              }`}>
                {isPremium ? '👑' : '🔓'}
              </div>
              <div>
                <p className="text-white/80 text-xs font-medium">{t('profile.stats.status')}</p>
                <p className="text-white text-lg font-bold">
                  {isPremium ? t('profile.stats.status_premium') : t('profile.stats.status_free')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== BADGES - LAZY LOAD ===== */}
        <div ref={badgesRef} className="mt-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🏆</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {t('profile.badges.title')}
            </h2>
            {badgesLoading && badgesVisible && (
              <div className="ml-auto">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
            {!badgesLoading && badgesVisible && (
              <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">
                {badges.length} / 6
              </span>
            )}
          </div>

          {!badgesVisible ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-sm">{t('profile.badges.scroll_hint')}</p>
            </div>
          ) : badgesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : badges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-gray-500 dark:text-gray-400">{t('profile.no_badges')}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {t('profile.badges_hint')}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {badges.map((badge) => {
                const badgeData = badge.badge || badge;
                const description = t(`profile.badges.descriptions.${badgeData.kljuc}`, { 
                  defaultValue: badgeData.opis || '' 
                });
                return (
                  <div
                    key={badge.id}
                    className="relative flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 border-2 border-amber-400 dark:border-amber-500 shadow-lg shadow-amber-500/20 min-w-[100px] max-w-[130px] hover:scale-105 transition-transform"
                  >
                    <div className="absolute -top-2 -right-2">
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">
                        ✅
                      </span>
                    </div>
                    <span className="text-4xl">{badgeData.ikona || '🏆'}</span>
                    <span className="text-xs font-semibold mt-1 text-center text-gray-800 dark:text-white">
                      {badgeData.naziv || badgeData.name}
                    </span>
                    {description && (
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center mt-0.5 leading-tight">
                        {description}
                      </span>
                    )}
                    <span className="text-[9px] text-green-500 mt-0.5 font-medium">
                      {t('profile.badges.earned')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available badges - samo ako su vidljivi */}
          {badgesVisible && !badgesLoading && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <span>🔒</span>
                {t('profile.badges.available')}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'first_recipe', icon: '🏆', name: t('profile.badges.available_list.first_recipe') },
                  { key: 'three_recipes', icon: '🥉', name: t('profile.badges.available_list.three_recipes') },
                  { key: 'ten_recipes', icon: '🥈', name: t('profile.badges.available_list.ten_recipes') },
                  { key: 'twenty_recipes', icon: '🥇', name: t('profile.badges.available_list.twenty_recipes') },
                  { key: 'popular_recipe', icon: '⭐', name: t('profile.badges.available_list.ten_likes') },
                  { key: 'super_popular', icon: '🌟', name: t('profile.badges.available_list.fifty_likes') },
                ].map((availableBadge) => {
                  const hasBadge = badges.some(b => 
                    (b.badge?.kljuc || b.kljuc) === availableBadge.key
                  );
                  const description = t(`profile.badges.descriptions.${availableBadge.key}`, { 
                    defaultValue: '' 
                  });
                  return (
                    <div
                      key={availableBadge.key}
                      className={`flex flex-col items-center px-3 py-1.5 rounded-full border ${
                        hasBadge
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{availableBadge.icon}</span>
                        <span className="text-xs font-medium">{availableBadge.name}</span>
                        {hasBadge ? (
                          <span className="text-[10px] text-green-500">✅</span>
                        ) : (
                          <span className="text-[10px]">🔒</span>
                        )}
                      </div>
                      {description && (
                        <span className="text-[8px] text-gray-400 dark:text-gray-500 text-center mt-0.5 leading-tight max-w-[120px]">
                          {description}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ===== PREFERENCES ===== */}
        <div className="mt-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">👤</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {t('profile.preferences')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">🍽️ {t('profile.preferences_types')}</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.vrsta?.length ? (
                  profile.vrsta.map((v, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      🍽️ {translateValue(v, 'vrsta')}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">{t('profile.not_selected')}</span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">🚫 {t('profile.restrictions')}</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.izbjegava?.length ? (
                  profile.izbjegava.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                      🚫 {translateValue(r, 'restrikcije')}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">{t('profile.none')}</span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">💪 {t('profile.preferences')}</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.preferencije?.length ? (
                  profile.preferencije.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                      💪 {translateValue(p, 'preferencije')}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">{t('profile.not_selected')}</span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">⚙️ {t('profile.other_filters')}</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.vrijeme && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                    ⏱️ {translateValue(profile.vrijeme, 'vrijeme')}
                  </span>
                )}
                {profile.tezina && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                    👨‍🍳 {translateValue(profile.tezina, 'tezina')}
                  </span>
                )}
                {profile.kalorije && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                    🔥 {translateValue(profile.kalorije, 'kalorije')}
                  </span>
                )}
                {!profile.vrijeme && !profile.tezina && !profile.kalorije && (
                  <span className="text-sm text-gray-400 dark:text-gray-500">{t('profile.not_selected')}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== ACTIONS ===== */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/quiz"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg shadow-blue-500/25 hover:shadow-xl"
          >
            <span>✏️</span>
            {isQuizCompleted ? t('profile.edit_filters') : t('profile.take_quiz')}
          </Link>

          {!isPremium && (
            <Link
              to="/premium"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg shadow-yellow-500/25 hover:shadow-xl"
            >
              <span>👑</span>
              {t('profile.become_premium')}
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-xl font-semibold transition"
          >
            <span>🚪</span>
            {t('profile.logout')}
          </button>

          <button
            onClick={handleDeleteData}
            disabled={deleting}
            className="inline-flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-6 py-3 rounded-xl font-semibold transition border border-red-200 dark:border-red-800/30 disabled:opacity-50"
          >
            <span>🗑️</span>
            {deleting ? t('profile.deleting') : t('profile.delete_data')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;