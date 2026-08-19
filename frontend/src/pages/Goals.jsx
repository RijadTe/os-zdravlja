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

  // 🔥 DOHVATI POSTOJEĆE CILJEVE IZ BAZE
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

  // 🔥 SAČUVAJ CILJEVE U BAZU
  const handleSave = async () => {
    if (!email) {
      alert('❌ Niste prijavljeni!');
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
        alert('✅ Ciljevi uspješno sačuvani!');
      } else {
        alert('❌ Greška pri čuvanju ciljeva!');
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('❌ Greška pri čuvanju ciljeva!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">🎯 {t('goals.title')}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-white">
            ⚖️ {t('goals.weight')}
          </label>
          <input
            type="number"
            value={goals.weight}
            onChange={(e) => setGoals({...goals, weight: e.target.value})}
            placeholder="npr. 75 kg"
            className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-white">
            🧊 {t('goals.body_fat')}
          </label>
          <input
            type="number"
            value={goals.bodyFat}
            onChange={(e) => setGoals({...goals, bodyFat: e.target.value})}
            placeholder="npr. 15%"
            className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-white">
            💧 {t('goals.water')}
          </label>
          <input
            type="number"
            value={goals.water}
            onChange={(e) => setGoals({...goals, water: e.target.value})}
            placeholder="npr. 2000 ml"
            className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-white">
            🚶 {t('goals.steps')}
          </label>
          <input
            type="number"
            value={goals.steps}
            onChange={(e) => setGoals({...goals, steps: e.target.value})}
            placeholder="npr. 10000 koraka"
            className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl transition font-semibold disabled:opacity-50"
        >
          {loading ? '⏳ Čuvanje...' : '💾 ' + t('common.save')}
        </button>
      </div>
    </div>
  );
};

export default Goals;