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

  const resetWater = async () => {
    if (!email) return;
    if (!window.confirm('Jeste li sigurni da želite resetovati unos vode za danas?')) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_URL}/api/water/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, date: today })
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
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20">
          <span className="text-3xl">💧</span>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            {t('water.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pratite dnevni unos vode
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-700">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{water}ml</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Trenutno</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center border border-green-200 dark:border-green-700">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{goal}ml</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cilj</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-center border border-yellow-200 dark:border-yellow-700">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{Math.round(progress)}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Napredak</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center border border-purple-200 dark:border-purple-700">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{todayWater.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Unosa danas</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Napredak</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-400 to-emerald-400 h-4 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <button
            onClick={() => addWater(100)}
            disabled={loading}
            className="bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-3 rounded-xl transition border border-blue-200 dark:border-blue-700 disabled:opacity-50 font-medium"
          >
            100ml
          </button>
          <button
            onClick={() => addWater(200)}
            disabled={loading}
            className="bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-3 rounded-xl transition border border-blue-200 dark:border-blue-700 disabled:opacity-50 font-medium"
          >
            200ml
          </button>
          <button
            onClick={() => addWater(500)}
            disabled={loading}
            className="bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-3 rounded-xl transition border border-blue-200 dark:border-blue-700 disabled:opacity-50 font-medium"
          >
            500ml
          </button>
          <button
            onClick={() => addWater(1000)}
            disabled={loading}
            className="bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-3 rounded-xl transition border border-blue-200 dark:border-blue-700 disabled:opacity-50 font-medium"
          >
            1L
          </button>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetWater}
          className="w-full bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-xl transition border border-red-200 dark:border-red-700 text-sm font-medium flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          {t('water.reset')}
        </button>
      </div>
    </div>
  );
};

export default WaterTracker;