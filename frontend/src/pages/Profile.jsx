// frontend/src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
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
          ime: user?.ime || user?.user_metadata?.ime || 'Korisnik',
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
    if (!window.confirm('⚠️ Jeste li sigurni? Ova radnja je nepovratna!')) return;
    
    setDeleting(true);
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      await fetch(`${API_URL}/profil/${email}/delete`, { method: 'DELETE' });
      localStorage.clear();
      navigate('/login');
    } catch (error) {
      alert('❌ Greška pri brisanju podataka.');
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
        <p className="mt-4">⏳ Učitavanje profila...</p>
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
          <p className="text-yellow-800 dark:text-yellow-200 text-lg">⚠️ Profil nije pronađen.</p>
          <Link to="/quiz" className="mt-4 inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition">
            🧠 Popuni kviz
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
            <h1 className="text-2xl font-bold">{profile.ime || 'Korisnik'}</h1>
            <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>
            {profile.premium ? (
              <span className="inline-block mt-1 bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full font-semibold">
                ⭐ Premium
              </span>
            ) : (
              <Link to="/premium" className="inline-block mt-1 text-yellow-600 dark:text-yellow-400 text-sm hover:underline">
                Postani Premium →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ===== NAPREDAK ===== */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">📊 Napredak</h2>
        <div className="flex items-center gap-4">
          <div className="text-4xl">🍳</div>
          <div>
            <p className="text-2xl font-bold">{profile.skuhano_recepata || 0}</p>
            <p className="text-gray-500 dark:text-gray-400">skuhanih recepata</p>
          </div>
          <div className="ml-8 text-sm text-gray-500 dark:text-gray-400">
            <p>✅ Kviz: {profile.kviz_zavrsen ? 'Završen' : 'Nije završen'}</p>
          </div>
        </div>
      </div>

      {/* ===== BEDŽEVI ===== */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">🏆 Osvojeni bedževi</h2>
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
              <span className="text-sm font-semibold mt-1">{badge.name}</span>
              {badge.earned ? (
                <span className="text-xs text-green-500">✅ Osvojeno</span>
              ) : (
                <span className="text-xs text-gray-400">🔒 Zaključano</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== PREFERENCIJE ===== */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">🍽️ Moje preferencije</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Vrsta</p>
            <p className="font-semibold">{profile.vrsta?.length ? profile.vrsta.join(', ') : 'Nije odabrano'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Restrikcije</p>
            <p className="font-semibold">{profile.izbjegava?.length ? profile.izbjegava.join(', ') : 'Nema'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Preferencije</p>
            <p className="font-semibold">{profile.preferencije?.length ? profile.preferencije.join(', ') : 'Nije odabrano'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Vrijeme</p>
            <p className="font-semibold">{profile.vrijeme || 'Nije odabrano'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Vještina</p>
            <p className="font-semibold">{profile.tezina || 'Nije odabrano'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kalorije</p>
            <p className="font-semibold">{profile.kalorije || 'Nije odabrano'}</p>
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
          {profile.kviz_zavrsen ? 'Izmijeni filtere' : 'Popuni kviz'}
        </Link>
        
        {!profile.premium && (
          <Link
            to="/premium"
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-full text-sm font-semibold transition"
          >
            ⭐ Postani Premium
          </Link>
        )}
        
        <button
          onClick={handleDeleteData}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition disabled:opacity-50"
        >
          {deleting ? '⏳ Brisanje...' : '🗑️ Izbriši sve podatke'}
        </button>
        
        <button
          onClick={handleLogout}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition"
        >
          🚪 Odjavi se
        </button>
      </div>
    </div>
  );
};

export default Profile;