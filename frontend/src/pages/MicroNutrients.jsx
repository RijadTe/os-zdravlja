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

  // 🔥 DOHVATI DANAŠNJE MIKRONUTRIJENTE IZ BAZE
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

  // 🔥 SAČUVAJ MIKRONUTRIJENTE U BAZU
  const handleSave = async () => {
    if (!email) {
      alert('❌ Niste prijavljeni!');
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
        alert('✅ Mikronutrijenti uspješno sačuvani!');
      } else {
        alert('❌ Greška pri čuvanju!');
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('❌ Greška pri čuvanju!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">📊 {t('micro_nutrients.title')}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-white">
              🥕 Vitamin A (μg)
            </label>
            <input
              type="number"
              value={nutrients.vitaminA}
              onChange={(e) => handleChange('vitaminA', e.target.value)}
              className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-white">
              🍊 Vitamin C (mg)
            </label>
            <input
              type="number"
              value={nutrients.vitaminC}
              onChange={(e) => handleChange('vitaminC', e.target.value)}
              className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-white">
              ☀️ Vitamin D (μg)
            </label>
            <input
              type="number"
              value={nutrients.vitaminD}
              onChange={(e) => handleChange('vitaminD', e.target.value)}
              className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-white">
              🥩 Željezo (mg)
            </label>
            <input
              type="number"
              value={nutrients.iron}
              onChange={(e) => handleChange('iron', e.target.value)}
              className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-white">
              🥜 Magnezij (mg)
            </label>
            <input
              type="number"
              value={nutrients.magnesium}
              onChange={(e) => handleChange('magnesium', e.target.value)}
              className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-white">
              🥛 Kalcij (mg)
            </label>
            <input
              type="number"
              value={nutrients.calcium}
              onChange={(e) => handleChange('calcium', e.target.value)}
              className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-white">
              🥩 Cink (mg)
            </label>
            <input
              type="number"
              value={nutrients.zinc}
              onChange={(e) => handleChange('zinc', e.target.value)}
              className="w-full border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
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

export default MicroNutrients;