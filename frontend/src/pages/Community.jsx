// frontend/src/pages/Community.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Community = () => {
  const { t } = useTranslation();
  const [objave, setObjave] = useState([]); // 🔥 UVJEK NIZ
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [novaObjava, setNovaObjava] = useState({
    naziv: '',
    opis: '',
    sastojci: '',
    slika: null
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchObjave();
  }, []);

  const fetchObjave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_URL}/api/community/objave`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // 🔥 OSIGURAJ DA JE objave UVJEK NIZ!
      if (Array.isArray(data)) {
        setObjave(data);
      } else if (data && Array.isArray(data.objave)) {
        setObjave(data.objave);
      } else if (data && Array.isArray(data.data)) {
        setObjave(data.data);
      } else {
        console.warn('⚠️ API nije vratio niz, postavljam prazan niz:', data);
        setObjave([]);
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu objava:', error);
      setError(error.message);
      setObjave([]); // 🔥 UVJEK POSTAVI NA PRAZAN NIZ
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id) => {
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      await fetch(`${API_URL}/api/community/objave/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      fetchObjave();
    } catch (error) {
      console.error('Greška pri lajkanju:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert(t('community.alerts.login_required'));
      return;
    }

    try {
      const formData = new FormData();
      const email = user?.email || localStorage.getItem('userEmail');
      formData.append('email', email);
      formData.append('naziv', novaObjava.naziv);
      formData.append('opis', novaObjava.opis);
      formData.append('sastojci', novaObjava.sastojci);
      if (novaObjava.slika) formData.append('slika', novaObjava.slika);

      const res = await fetch(`${API_URL}/api/community/objave`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      setNovaObjava({ naziv: '', opis: '', sastojci: '', slika: null });
      fetchObjave();
    } catch (error) {
      console.error('Greška pri objavi:', error);
      alert('❌ Došlo je do greške pri objavi. Pokušajte ponovo.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">⏳ {t('community.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">❌ Greška: {error}</p>
        <button 
          onClick={fetchObjave}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
        >
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">📝 {t('community.title')}</h1>

      {/* Forma za novu objavu - SAMO AKO JE KORISNIK PRIJAVLJEN */}
      {user ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">➕ {t('community.share_recipe')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder={t('community.recipe_name')}
              value={novaObjava.naziv}
              onChange={(e) => setNovaObjava({ ...novaObjava, naziv: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            />
            <textarea
              placeholder={t('community.description')}
              value={novaObjava.opis}
              onChange={(e) => setNovaObjava({ ...novaObjava, opis: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              rows="3"
            />
            <input
              type="text"
              placeholder={t('community.ingredients')}
              value={novaObjava.sastojci}
              onChange={(e) => setNovaObjava({ ...novaObjava, sastojci: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            
            {/* 🔥 FILE INPUT - SAMO FOTOAPARAT IKONA */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNovaObjava({ ...novaObjava, slika: e.target.files[0] })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {novaObjava.slika ? (
                  <span className="text-green-500 text-sm">✅ {novaObjava.slika.name}</span>
                ) : (
                  <span className="text-3xl">📸</span>
                )}
              </label>
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              📤 {t('community.post_button')}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 text-center mb-8">
          <p className="text-yellow-800 dark:text-yellow-200">
            🔒 {t('community.alerts.login_required')}
          </p>
          <Link to="/login" className="inline-block mt-2 text-blue-600 dark:text-blue-400 hover:underline">
            {t('login.title')} →
          </Link>
        </div>
      )}

      {/* Lista objava */}
      {!objave || objave.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-gray-500 dark:text-gray-400">
            {t('community.no_posts') || 'Nema objava u zajednici.'}
          </p>
          {user && (
            <p className="text-sm text-gray-400 mt-2">
              Budite prvi koji će podijeliti recept! 🍽️
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {objave.map((objava, index) => (
            <div 
              key={objava.id || index} 
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg dark:text-white">{objava.naziv || 'Bez naslova'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    👤 {objava.korisnik_ime || objava.author || t('community.unknown_user')} · 
                    {objava.created_at && ` ${new Date(objava.created_at).toLocaleDateString('hr')}`}
                  </p>
                </div>
                <button
                  onClick={() => handleLike(objava.id)}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition"
                >
                  ❤️ {objava.lajkovi || 0}
                </button>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mt-2">{objava.opis || objava.description || ''}</p>
              {objava.sastojci && objava.sastojci.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.isArray(objava.sastojci) ? (
                    objava.sastojci.map((s, i) => (
                      <span key={i} className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                      {objava.sastojci}
                    </span>
                  )}
                </div>
              )}
              {objava.slika && (
                <img src={objava.slika} alt={objava.naziv} className="mt-3 w-full max-h-64 object-cover rounded-lg" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Community;