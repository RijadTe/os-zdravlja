// frontend/src/pages/Community.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// 🔥 PROMIJENJENO - uklonjen /api sa kraja
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Community = () => {
  const { t } = useTranslation();
  const [objave, setObjave] = useState([]);
  const [loading, setLoading] = useState(true);
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
      // 🔥 PROMIJENJENO - dodan /api
      const res = await fetch(`${API_URL}/api/community/objave`);
      const data = await res.json();
      setObjave(data);
    } catch (error) {
      console.error('Greška:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id) => {
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      // 🔥 PROMIJENJENO - dodan /api
      await fetch(`${API_URL}/api/community/objave/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      fetchObjave();
    } catch (error) {
      console.error('Greška:', error);
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

      // 🔥 PROMIJENJENO - dodan /api
      await fetch(`${API_URL}/api/community/objave`, {
        method: 'POST',
        body: formData
      });

      setNovaObjava({ naziv: '', opis: '', sastojci: '', slika: null });
      fetchObjave();
    } catch (error) {
      console.error('Greška:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-lg dark:text-white">⏳ {t('community.loading')}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">📝 {t('community.title')}</h1>

      {/* Forma za novu objavu */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">➕ {t('community.share_recipe')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder={t('community.recipe_name')}
            value={novaObjava.naziv}
            onChange={(e) => setNovaObjava({ ...novaObjava, naziv: e.target.value })}
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            required
          />
          <textarea
            placeholder={t('community.description')}
            value={novaObjava.opis}
            onChange={(e) => setNovaObjava({ ...novaObjava, opis: e.target.value })}
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            rows="3"
          />
          <input
            type="text"
            placeholder={t('community.ingredients')}
            value={novaObjava.sastojci}
            onChange={(e) => setNovaObjava({ ...novaObjava, sastojci: e.target.value })}
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNovaObjava({ ...novaObjava, slika: e.target.files[0] })}
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            📤 {t('community.post_button')}
          </button>
        </form>
      </div>

      {/* Lista objava */}
      <div className="space-y-6">
        {objave.map(objava => (
          <div key={objava.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg dark:text-white">{objava.naziv}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  👤 {objava.korisnik_ime || t('community.unknown_user')} · {new Date(objava.created_at).toLocaleDateString('hr')}
                </p>
              </div>
              <button
                onClick={() => handleLike(objava.id)}
                className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition"
              >
                ❤️ {objava.lajkovi || 0}
              </button>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mt-2">{objava.opis}</p>
            {objava.sastojci?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {objava.sastojci.map((s, i) => (
                  <span key={i} className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                    {s}
                  </span>
                ))}
              </div>
            )}
            {objava.slika && (
              <img src={objava.slika} alt={objava.naziv} className="mt-3 w-full max-h-64 object-cover rounded-lg" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Community;