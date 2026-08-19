// frontend/src/pages/MicroNutrients.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MicroNutrients = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [nutrients, setNutrients] = useState({
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    iron: 0,
    magnesium: 0,
    calcium: 0,
    zinc: 0
  });

  const email = localStorage.getItem('userEmail');

  useEffect(() => {
    const fetchNutrients = async () => {
      if (!email) return;
      
      try {
        const response = await fetch(`${API_URL}/api/micro-nutrients/${email}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const today = new Date().toISOString().split('T')[0];
          const todayEntry = data.data.find(n => n.datum === today);
          
          if (todayEntry) {
            setNutrients({
              vitaminA: todayEntry.vitamin_a || 0,
              vitaminC: todayEntry.vitamin_c || 0,
              vitaminD: todayEntry.vitamin_d || 0,
              iron: todayEntry.zelezo || 0,
              magnesium: todayEntry.magnezij || 0,
              calcium: todayEntry.kalcij || 0,
              zinc: todayEntry.cink || 0
            });
          }
        }
      } catch (error) {
        console.error('❌ Greška:', error);
      }
    };

    fetchNutrients();
  }, [email]);

  const handleChange = (key, value) => {
    setNutrients(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleSave = async () => {
    if (!email) {
      alert(t('micro_nutrients.errors.login_required') || '❌ Niste prijavljeni!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/micro-nutrients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          date: new Date().toISOString().split('T')[0],
          vitaminA: nutrients.vitaminA,
          vitaminC: nutrients.vitaminC,
          vitaminD: nutrients.vitaminD,
          iron: nutrients.iron,
          magnesium: nutrients.magnesium,
          calcium: nutrients.calcium,
          zinc: nutrients.zinc
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(t('micro_nutrients.success') || '✅ Mikronutrijenti uspješno sačuvani!');
      } else {
        alert(t('micro_nutrients.errors.save_failed') || '❌ Greška pri čuvanju!');
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(t('micro_nutrients.errors.save_failed') || '❌ Greška pri čuvanju!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/20">
          <span className="text-3xl">📊</span>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            {t('micro_nutrients.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('micro_nutrients.subtitle') || 'Unesite dnevni unos mikronutrijenata'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">🥕</span> {t('micro_nutrients.vitamin_a')}
            </label>
            <input
              type="number"
              value={nutrients.vitaminA}
              onChange={(e) => handleChange('vitaminA', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">🍊</span> {t('micro_nutrients.vitamin_c')}
            </label>
            <input
              type="number"
              value={nutrients.vitaminC}
              onChange={(e) => handleChange('vitaminC', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">☀️</span> {t('micro_nutrients.vitamin_d')}
            </label>
            <input
              type="number"
              value={nutrients.vitaminD}
              onChange={(e) => handleChange('vitaminD', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">🥩</span> {t('micro_nutrients.iron')}
            </label>
            <input
              type="number"
              value={nutrients.iron}
              onChange={(e) => handleChange('iron', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">🥜</span> {t('micro_nutrients.magnesium')}
            </label>
            <input
              type="number"
              value={nutrients.magnesium}
              onChange={(e) => handleChange('magnesium', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">🥛</span> {t('micro_nutrients.calcium')}
            </label>
            <input
              type="number"
              value={nutrients.calcium}
              onChange={(e) => handleChange('calcium', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">🦪</span> {t('micro_nutrients.zinc')}
            </label>
            <input
              type="number"
              value={nutrients.zinc}
              onChange={(e) => handleChange('zinc', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3.5 rounded-xl font-semibold transition disabled:opacity-50 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              {t('micro_nutrients.saving') || 'Čuvanje...'}
            </>
          ) : (
            <>
              <span>💾</span>
              {t('common.save')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MicroNutrients;