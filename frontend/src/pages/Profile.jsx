// frontend/src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';

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

  // ============================================================
  // 🌍 MAPIRANJE ZA PREVOD PREFERENCIJA - RADI SA i18n!
  // ============================================================
  const translateValue = (value, type) => {
    if (!value) return t('profile.not_selected');
    
    // 🔥 MAPIRANJE - KLJUČEVI SU VREDNOSTI IZ BAZE (HRVATSKI)
    // 🔥 VREDNOSTI SE DOHVAĆAJU PREKO i18n
    const getTranslation = (key, fallback) => {
      // Pokušaj prvo sa quiz opcijama
      const quizKey = `quiz.options.${type}.${getIndexForKey(key, type)}`;
      const translated = t(quizKey);
      if (translated !== quizKey) {
        return translated;
      }
      return fallback || key;
    };
    
    // Pomoćna funkcija za pronalaženje indeksa
    const getIndexForKey = (key, type) => {
      const lists = {
        vrsta: ['Slano', 'Deserti', 'Dijetalni recepti', 'Napitki', 'Svejedno'],
        restrikcije: ['Bez restrikcija', 'Bez glutena', 'Bez laktoze', 'Bez šećera', 'Veganski', 'Bez orašastih plodova'],
        preferencije: ['Visokoproteinski', 'Bogat vlaknima', 'Bogat ugljikohidratima', 'Svejedno'],
        vrijeme: ['Kratko (15-30 min)', 'Srednje (30-45 min)', 'Duže (45-60+ min)'],
        tezina: ['Početnik', 'Srednji', 'Profesionalac'],
        kalorije: ['Nisko (do 300 kcal)', 'Umjereno (300-500 kcal)', 'Srednje (500-700 kcal)', 'Visoko (900+ kcal)']
      };
      
      const list = lists[type] || [];
      const index = list.indexOf(key);
      // Ako nije pronađeno, pokušaj case-insensitive
      if (index === -1) {
        const lowerKey = key.toLowerCase().trim();
        return list.findIndex(item => item.toLowerCase().trim() === lowerKey);
      }
      return index;
    };
    
    // 🔥 AKO JE NIZ (array) - ZA VRSTA, RESTRIKCIJE, PREFERENCIJE
    if (Array.isArray(value)) {
      const translated = value.map(v => {
        const index = getIndexForKey(v, type);
        if (index !== -1) {
          const quizKey = `quiz.options.${type}.${index}`;
          const translatedText = t(quizKey);
          if (translatedText !== quizKey) {
            return translatedText;
          }
        }
        // Ako nije pronađen prijevod, vrati original
        console.warn(`⚠️ Nema prijevoda za ${type}: "${v}"`);
        return v;
      });
      return translated.join(', ');
    }
    
    // 🔥 ZA STRING VRIJEDNOSTI (vrijeme, tezina, kalorije)
    const index = getIndexForKey(value, type);
    if (index !== -1) {
      const quizKey = `quiz.options.${type}.${index}`;
      const translated = t(quizKey);
      if (translated !== quizKey) {
        return translated;
      }
    }
    
    console.warn(`⚠️ Nema prijevoda za ${type}: "${value}"`);
    return value;
  };

  // ============================================================
  // 🔥 DOHVATI BEDŽEVE IZ BAZE
  // ============================================================
  const fetchBadges = async (email) => {
    try {
      setBadgesLoading(true);
      console.log('🏆 Dohvatam bedževe za:', email);
      
      const response = await fetch(`${API_URL}/api/badges/${encodeURIComponent(email)}`);
      
      if (response.status === 404) {
        console.log('ℹ️ Nema bedževa za korisnika');
        setBadges([]);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.badges) {
        console.log(`✅ Dohvaćeno ${data.badges.length} bedževa`);
        setBadges(data.badges);
      } else {
        setBadges([]);
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu bedževa:', error);
      setBadges([]);
    } finally {
      setBadgesLoading(false);
    }
  };

  // ============================================================
  // 📊 DOHVATI PROFIL - SA RATE LIMIT FALLBACKOM!
  // ============================================================
  const fetchProfile = async (email) => {
    try {
      console.log('📧 Dohvatam profil za:', email);
      
      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
      
      if (response.status === 429) {
        console.warn('⚠️ Rate limit (429) - koristim podatke iz localStorage');
        const storedUser = JSON.parse(localStorage.getItem('user'));
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
          console.log('✅ Profil dohvaćen iz localStorage (fallback)');
        }
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📊 Profil dohvaćen:', data);
      
      if (data.success && data.data) {
        setProfile(data.data);
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
          storedUser.premium = data.data.premium || false;
          storedUser.profile = data.data;
          storedUser.preferred_language = data.data.preferred_language || 'hr';
          localStorage.setItem('user', JSON.stringify(storedUser));
        }
        
        await fetchBadges(email);
      } else {
        console.error('❌ Profil nije pronađen');
        await createProfile(email);
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu profila:', error);
      const storedUser = JSON.parse(localStorage.getItem('user'));
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
        console.log('✅ Profil dohvaćen iz localStorage (fallback)');
      } else {
        await createProfile(email);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🆕 KREIRAJ PROFIL
  // ============================================================
  const createProfile = async (email) => {
    try {
      console.log('🆕 Kreiram profil za:', email);
      
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
        console.log('✅ Profil kreiran:', data.data);
        setProfile(data.data);
        await fetchBadges(email);
      }
    } catch (error) {
      console.error('❌ Greška pri kreiranju profila:', error);
    }
  };

  // ============================================================
  // 🔐 AUTH - SA DOHVATOM PREMIUM STATUSA IZ BAZE!
  // ============================================================
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ Korisnik prijavljen (Supabase):', session.user.email);
          
          const email = session.user.email;
          
          let premiumStatus = false;
          let profileData = null;
          
          try {
            const profileResponse = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
            
            if (profileResponse.ok) {
              const profileResult = await profileResponse.json();
              if (profileResult.success && profileResult.data) {
                premiumStatus = profileResult.data.premium || false;
                profileData = profileResult.data;
                console.log('✅ Premium status iz baze:', premiumStatus);
              }
            }
          } catch (profileError) {
            console.warn('⚠️ Greška pri dohvatu profila:', profileError);
          }
          
          const supabaseUser = {
            id: session.user.id,
            email: session.user.email,
            ime: session.user.user_metadata?.ime || '',
            premium: premiumStatus,
            profile: profileData,
            preferred_language: profileData?.preferred_language || 'hr'
          };
          
          setUser(supabaseUser);
          localStorage.setItem('user', JSON.stringify(supabaseUser));
          localStorage.setItem('userEmail', session.user.email);
          localStorage.setItem('userName', session.user.user_metadata?.ime || '');
          
          if (profileData) {
            setProfile(profileData);
            await fetchBadges(email);
            setLoading(false);
          } else {
            await fetchProfile(session.user.email);
          }
          return;
        }
        
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData) {
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
  }, [navigate]);

  // ============================================================
  // 🔥 OSVJEŽI BEDŽEVE KADA SE JEZIK PROMIJENI
  // ============================================================
  useEffect(() => {
    if (profile?.email) {
      fetchBadges(profile.email);
    }
  }, [i18n.language]);

  // ============================================================
  // 🗑️ IZBRIŠI SVE PODATKE
  // ============================================================
  const handleDeleteData = async () => {
    if (!window.confirm(
      '⚠️ Jeste li sigurni da želite izbrisati SVE svoje podatke?\n\n' +
      '🗑️ Ova radnja je NEPOVRATNA!\n' +
      '📝 Nakon brisanja, morat ćete se ponovno registrirati.\n' +
      '🔒 Nećete se moći prijaviti sa starim podacima.\n\n' +
      'Želite li nastaviti?'
    )) {
      return;
    }
    
    setDeleting(true);
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      
      if (!email) {
        alert('❌ Niste prijavljeni. Molimo prijavite se.');
        setDeleting(false);
        return;
      }

      console.log('🗑️ Brišem profil za:', email);
      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}/delete`, { 
        method: 'DELETE' 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Greška pri brisanju profila');
      }

      const result = await response.json();
      console.log('✅ Profil izbrisan:', result);

      localStorage.clear();

      try {
        await supabase.auth.signOut();
        console.log('🚪 Korisnik odjavljen iz Supabase');
      } catch (signOutError) {
        console.warn('⚠️ Greška pri odjavi:', signOutError);
      }

      alert(
        '🗑️ Vaš profil je uspješno izbrisan iz baze korisnika.\n\n' +
        '📝 Molimo da se ponovno izvršite registraciju.\n' +
        '🔒 Ne možete se prijaviti sa starim podacima.\n\n' +
        '✅ Svi vaši podaci su sigurno obrisani.\n' +
        'Hvala na razumijevanju!'
      );

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
    if (!window.confirm('Jeste li sigurni da se želite odjaviti?')) {
      return;
    }

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
    
    navigate('/login');
  };

  // ============================================================
  // 🖥️ RENDER - LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="text-center py-12 dark:text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4">{t('profile.loading')}</p>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - NEMA PROFILA
  // ============================================================
  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
          <p className="text-yellow-800 dark:text-yellow-200 text-lg">{t('profile.not_found')}</p>
          <Link to="/quiz" className="mt-4 inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition">
            🧠 {t('profile.take_quiz')}
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - GLAVNI UI
  // ============================================================
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      {/* ===== KORISNIČKI PODACI ===== */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-3xl text-white">
            {profile.ime?.charAt(0) || '👤'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.ime || t('profile.default_name')}</h1>
            <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>
            {profile.premium ? (
              <span className="inline-block mt-1 bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full font-semibold">
                ⭐ {t('profile.premium')}
              </span>
            ) : (
              <Link to="/premium" className="inline-block mt-1 text-yellow-600 dark:text-yellow-400 text-sm hover:underline">
                {t('profile.become_premium')} →
              </Link>
            )}
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          🌍 {t('profile.language')}: {profile.preferred_language === 'hr' ? 'Hrvatski' : profile.preferred_language === 'en' ? 'English' : 'Deutsch'}
        </div>
      </div>

      {/* ===== NAPREDAK ===== */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">{t('profile.progress')}</h2>
        <div className="flex items-center gap-4">
          <div className="text-4xl">🍳</div>
          <div>
            <p className="text-2xl font-bold">{profile.skuhano_recepata || 0}</p>
            <p className="text-gray-500 dark:text-gray-400">{t('profile.recipes_cooked')}</p>
          </div>
          <div className="ml-8 text-sm text-gray-500 dark:text-gray-400">
            <p>✅ {t('profile.quiz')}: {profile.kviz_zavrsen ? t('profile.completed') : t('profile.not_completed')}</p>
          </div>
        </div>
      </div>

      {/* ===== 🔥 BEDŽEVI IZ BAZE SA PRIJEVODIMA ===== */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">
          🏆 {t('profile.badges.title')}
          {badgesLoading && (
            <span className="ml-2 text-sm text-gray-400 animate-pulse">⏳ Učitavanje...</span>
          )}
        </h2>
        
        {badgesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : badges.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-4xl mb-2">🏆</p>
            <p>{t('profile.no_badges') || 'Još nema osvojenih bedževa.'}</p>
            <p className="text-sm mt-1">
              {t('profile.badges_hint') || 'Objavljujte recepte i skupljajte lajkove da osvojite bedževe!'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {badges.map((badge) => {
              const badgeData = badge.badge || badge;
              // 🔥 Dohvati opis iz prijevoda ili koristi onaj iz baze
              const description = t(`profile.badges.descriptions.${badgeData.kljuc}`, { 
                defaultValue: badgeData.opis || '' 
              });
              
              return (
                <div
                  key={badge.id}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 min-w-[100px] max-w-[140px]"
                >
                  <span className="text-3xl">{badgeData.ikona || '🏆'}</span>
                  <span className="text-sm font-semibold mt-1 text-gray-800 dark:text-white text-center">
                    {badgeData.naziv || badgeData.name}
                  </span>
                  {/* 🔥 PRIKAZ OPISA */}
                  {description && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-0.5 leading-tight">
                      {description}
                    </span>
                  )}
                  <span className="text-xs text-green-500 mt-0.5">
                    {t('profile.badges.earned')} 🎉
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(badge.osvojeno_na || badge.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* 🔥 PRIKAZ SVIH DOSTUPNIH BEDŽEVA (ZAKLJUČANIH) */}
        {!badgesLoading && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              🔒 {t('profile.badges.available') || 'Dostupni bedževi:'}
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'first_recipe', icon: '🏆', name: t('profile.badges.first_recipe') },
                { key: 'three_recipes', icon: '🥉', name: '3 recepta' },
                { key: 'ten_recipes', icon: '🥈', name: '10 recepata' },
                { key: 'twenty_recipes', icon: '🥇', name: '20 recepata' },
                { key: 'popular_recipe', icon: '⭐', name: '10 lajkova' },
                { key: 'super_popular', icon: '🌟', name: '50 lajkova' },
              ].map((availableBadge) => {
                const hasBadge = badges.some(b => 
                  (b.badge?.kljuc || b.kljuc) === availableBadge.key
                );
                
                // 🔥 Dohvati opis za dostupni bedž
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

      {/* ===== PREFERENCIJE - SA PREVODOM ===== */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">{t('profile.preferences')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.preferences_types')}</p>
            <p className="font-semibold">
              {profile.vrsta?.length 
                ? translateValue(profile.vrsta, 'vrsta') 
                : t('profile.not_selected')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.restrictions')}</p>
            <p className="font-semibold">
              {profile.izbjegava?.length 
                ? translateValue(profile.izbjegava, 'restrikcije') 
                : t('profile.none')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.preferences')}</p>
            <p className="font-semibold">
              {profile.preferencije?.length 
                ? translateValue(profile.preferencije, 'preferencije') 
                : t('profile.not_selected')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.time')}</p>
            <p className="font-semibold">
              {profile.vrijeme 
                ? translateValue(profile.vrijeme, 'vrijeme') 
                : t('profile.not_selected')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.skill')}</p>
            <p className="font-semibold">
              {profile.tezina 
                ? translateValue(profile.tezina, 'tezina') 
                : t('profile.not_selected')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.calories')}</p>
            <p className="font-semibold">
              {profile.kalorije 
                ? translateValue(profile.kalorije, 'kalorije') 
                : t('profile.not_selected')}
            </p>
          </div>
        </div>
      </div>

      {/* ===== DUGMAD ===== */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          to="/quiz"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2"
        >
          <span>🔄</span>
          {profile.kviz_zavrsen ? t('profile.edit_filters') : t('profile.take_quiz')}
        </Link>
        
        {!profile.premium && (
          <Link
            to="/premium"
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-full text-sm font-semibold transition"
          >
            ⭐ {t('profile.become_premium')}
          </Link>
        )}
        
        <button
          onClick={handleDeleteData}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition disabled:opacity-50"
        >
          {deleting ? t('profile.deleting') : t('profile.delete_data')}
        </button>
        
        <button
          onClick={handleLogout}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition"
        >
          🚪 {t('profile.logout')}
        </button>
      </div>
    </div>
  );
};

export default Profile;