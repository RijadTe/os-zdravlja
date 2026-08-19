// frontend/src/pages/WaterTracker.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const WaterTracker = () => {
  const { t } = useTranslation();
  const [water, setWater] = useState(0);
  const [goal, setGoal] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [todayWater, setTodayWater] = useState([]);

  const email = localStorage.getItem('userEmail');

  // 🔥 DOHVATI DANAŠNJI UNOS VODE IZ BAZE
  useEffect(() => {
    const fetchWater = async () => {
      if (!email) return;
      
      try {
        const response = await fetch(`${API_URL}/api/water/${email}`);
        const data = await response.json();
        
        if (data.success) {
          const today = new Date().toISOString().split('T')[0];
          const todayEntries = data.data.filter(w => w.datum === today);
          const total = todayEntries.reduce((sum, w) => sum + w.kolicina_ml, 0);
          setWater(total);
          setTodayWater(todayEntries);
          
          // Dohvati cilj iz profila
          const profileRes = await fetch(`${API_URL}/api/profil/${email}`);
          const profileData = await profileRes.json();
          if (profileData.success && profileData.data?.cilj_voda) {
            setGoal(profileData.data.cilj_voda);
          }
        }
      } catch (error) {
        console.error('❌ Greška pri dohvatu vode:', error);
      }
    };

    fetchWater();
  }, [email]);

  // 🔥 DODAJ VODU U BAZU
  const addWater = async (amount) => {
    if (!email) {
      alert('❌ Niste prijavljeni!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/water`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          amount: amount,
          date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setWater(prev => prev + amount);
        setTodayWater(prev => [...prev, { kolicina_ml: amount }]);
      } else {
        alert('❌ Greška pri dodavanju vode!');
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('❌ Greška pri dodavanju vode!');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 RESET VODE
  const resetWater = async () => {
    if (!email) return;
    if (!window.confirm('Jeste li sigurni da želite resetovati unos vode za danas?')) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_URL}/api/water/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          date: today
        })
      });

      setWater(0);
      setTodayWater([]);
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('❌ Greška pri resetovanju!');
    }
  };

  const progress = Math.min((water / goal) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">💧 {t('water.title')}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">💧</div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {water} ml
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('water.goal')}: {goal} ml
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {todayWater.length} unosa danas
          </p>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-400 to-emerald-400 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
          {Math.round(progress)}% {t('water.completed')}
        </p>

        <div className="grid grid-cols-4 gap-3">
          <button 
            onClick={() => addWater(100)} 
            disabled={loading}
            className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-3 rounded-xl transition disabled:opacity-50"
          >
            100ml
          </button>
          <button 
            onClick={() => addWater(200)} 
            disabled={loading}
            className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-3 rounded-xl transition disabled:opacity-50"
          >
            200ml
          </button>
          <button 
            onClick={() => addWater(500)} 
            disabled={loading}
            className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-3 rounded-xl transition disabled:opacity-50"
          >
            500ml
          </button>
          <button 
            onClick={() => addWater(1000)} 
            disabled={loading}
            className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-3 rounded-xl transition disabled:opacity-50"
          >
            1L
          </button>
        </div>

        <button 
          onClick={resetWater}
          className="w-full mt-4 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 p-2 rounded-xl transition text-sm"
        >
          🔄 {t('water.reset')}
        </button>
      </div>
    </div>
  );
};

export default WaterTracker;