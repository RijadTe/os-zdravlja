// frontend/src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  
  // 🔥 BEDŽEVI - FIKSNI NAZIVI NA HRVATSKOM (NE PREVODE SE)
  const [badges, setBadges] = useState([
    { id: 1, name: 'Prvi recept', icon: '🥇', earned: true },
    { id: 2, name: '3 dana zaredom', icon: '🥈', earned: false },
    { id: 3, name: '10 recepata', icon: '🥉', earned: false },
  ]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        // 1. Provjeri Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ Korisnik prijavljen (Supabase):', session.user.email);
          setUser(session.user);
          localStorage.setItem('user', JSON.stringify(session.user));
          localStorage.setItem('userEmail', session.user.email);
          localStorage.setItem('userName', session.user.user_metadata?.ime || '');
          
          // Dohvati profil
          await fetchProfile(session.user.email);
          return;
        }
        
        // 2. Provjeri localStorage (fallback)
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
        console.error('❌ Greška:', error);
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate]);

  // ============================================================
  // 📊 DOHVATI PROFIL
  // ============================================================
  const fetchProfile = async (email) => {
    try {
      console.log('📧 Dohvatam profil za:', email);
      const res = await fetch(`${API_URL}/profil/${encodeURIComponent(email)}`);
      const data = await res.json();
      console.log('📊 Profil dohvaćen:', data);
      
      if (data.success) {
        setProfile(data.data);
      } else {
        console.error('❌ Profil nije pronađen');
        await createProfile(email);
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu profila:', error);
      if (error.message.includes('404')) {
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
      const res = await fetch(`${API_URL}/profil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          ime: user?.ime || user?.user_metadata?.ime || t('profile.default_name'),
          premium: false,
          kviz_zavrsen: false,
          vrsta: [],
          izbjegava: [],
          preferencije: []
        })
      });
      const data = await res.json();
      
      if (data.success) {
        console.log('✅ Profil kreiran:', data.data);
        setProfile(data.data);
      }
    } catch (error) {
      console.error('❌ Greška pri kreiranju profila:', error);
    }
  };

  // ============================================================
  // 🗑️ IZBRIŠI SVE PODATKE
  // ============================================================
  const handleDeleteData = async () => {
    if (!window.confirm(t('profile.delete_confirm'))) return;
    
    setDeleting(true);
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      await fetch(`${API_URL}/profil/${email}/delete`, { method: 'DELETE' });
      localStorage.clear();
      navigate('/login');
    } catch (error) {
      alert(t('profile.delete_error'));
      setDeleting(false);
    }
  };

  // ============================================================
  // 🚪 ODJAVA
  // ============================================================
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('❌ Greška pri odjavi:', error);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
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

      {/* ===== BEDŽEVI - FIKSNI NAZIVI NA HRVATSKOM ===== */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">{t('profile.badges.title')}</h2>
        <div className="flex flex-wrap gap-4">
          {badges.map(badge => (
            <div
              key={badge.id}
              className={`flex flex-col items-center p-4 rounded-xl border-2 ${
                badge.earned
                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30'
                  : 'border-gray-200 dark:border-gray-600 opacity-50'
              }`}
            >
              <span className="text-3xl">{badge.icon}</span>
              <span className="text-sm font-semibold mt-1 text-gray-800 dark:text-white">
                {badge.name}
              </span>
              {badge.earned ? (
                <span className="text-xs text-green-500">{t('profile.badges.earned')}</span>
              ) : (
                <span className="text-xs text-gray-400">{t('profile.badges.locked')}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== PREFERENCIJE ===== */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">{t('profile.preferences')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.preferences_types')}</p>
            <p className="font-semibold">{profile.vrsta?.length ? profile.vrsta.join(', ') : t('profile.not_selected')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.restrictions')}</p>
            <p className="font-semibold">{profile.izbjegava?.length ? profile.izbjegava.join(', ') : t('profile.none')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.preferences')}</p>
            <p className="font-semibold">{profile.preferencije?.length ? profile.preferencije.join(', ') : t('profile.not_selected')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.time')}</p>
            <p className="font-semibold">{profile.vrijeme || t('profile.not_selected')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.skill')}</p>
            <p className="font-semibold">{profile.tezina || t('profile.not_selected')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.calories')}</p>
            <p className="font-semibold">{profile.kalorije || t('profile.not_selected')}</p>
          </div>
        </div>
      </div>

      {/* ===== DUGMAD ===== */}
      <div className="mt-8 flex flex-wrap gap-4">
        {/* 🔄 PAMETNO DUGME ZA KVIZ */}
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