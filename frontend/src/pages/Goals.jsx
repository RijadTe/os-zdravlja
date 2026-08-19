// frontend/src/pages/Goals.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Goals = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState({
    weight: '',
    bodyFat: '',
    water: '',
    steps: ''
  });

  const email = localStorage.getItem('userEmail');

  useEffect(() => {
    const fetchGoals = async () => {
      if (!email) return;
      
      try {
        const response = await fetch(`${API_URL}/api/profil/${email}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setGoals({
            weight: data.data.cilj_tezina || '',
            bodyFat: data.data.cilj_masti || '',
            water: data.data.cilj_voda || '',
            steps: data.data.cilj_koraci || ''
          });
        }
      } catch (error) {
        console.error('❌ Greška:', error);
      }
    };

    fetchGoals();
  }, [email]);

  const handleSave = async () => {
    if (!email) {
      alert(t('goals.errors.login_required') || '❌ Niste prijavljeni!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...goals })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(t('goals.success') || '✅ Ciljevi uspješno sačuvani!');
      } else {
        alert(t('goals.errors.save_failed') || '❌ Greška pri čuvanju ciljeva!');
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(t('goals.errors.save_failed') || '❌ Greška pri čuvanju ciljeva!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/20">
          <span className="text-3xl">🎯</span>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            {t('goals.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('goals.subtitle') || 'Postavite i pratite svoje ciljeve'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">⚖️</span> {t('goals.weight')}
            </label>
            <input
              type="number"
              value={goals.weight}
              onChange={(e) => setGoals({...goals, weight: e.target.value})}
              placeholder={t('goals.weight_placeholder') || 'npr. 75 kg'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              min="0"
              step="0.1"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">🧊</span> {t('goals.body_fat')}
            </label>
            <input
              type="number"
              value={goals.bodyFat}
              onChange={(e) => setGoals({...goals, bodyFat: e.target.value})}
              placeholder={t('goals.body_fat_placeholder') || 'npr. 15%'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              min="0"
              step="0.1"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">💧</span> {t('goals.water')}
            </label>
            <input
              type="number"
              value={goals.water}
              onChange={(e) => setGoals({...goals, water: e.target.value})}
              placeholder={t('goals.water_placeholder') || 'npr. 2000 ml'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              min="0"
              step="0.1"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="text-xl">🚶</span> {t('goals.steps')}
            </label>
            <input
              type="number"
              value={goals.steps}
              onChange={(e) => setGoals({...goals, steps: e.target.value})}
              placeholder={t('goals.steps_placeholder') || 'npr. 10000 koraka'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
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
              {t('goals.saving') || 'Čuvanje...'}
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

export default Goals;