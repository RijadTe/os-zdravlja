// frontend/src/pages/MicroNutrients.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================
// 1. DEFINICIJA NUTRIJENATA SA SVG IKONAMA I labelKey
// ============================================================
const NUTRIENT_DEFS = [
  { 
    id: 'vitaminA', 
    key: 'vitaminA',
    dbKey: 'vitamin_a',
    labelKey: 'micro_nutrients.vitamin_a',  // ← DODANO ZA PRIJEVOD
    unit: 'µg', 
    target: 900,
    icon: 'vitamin-a',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`
  },
  { 
    id: 'vitaminC', 
    key: 'vitaminC',
    dbKey: 'vitamin_c',
    labelKey: 'micro_nutrients.vitamin_c',  // ← DODANO ZA PRIJEVOD
    unit: 'mg', 
    target: 90,
    icon: 'vitamin-c',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></svg>`
  },
  { 
    id: 'vitaminD', 
    key: 'vitaminD',
    dbKey: 'vitamin_d',
    labelKey: 'micro_nutrients.vitamin_d',  // ← DODANO ZA PRIJEVOD
    unit: 'µg', 
    target: 15,
    icon: 'vitamin-d',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>`
  },
  { 
    id: 'iron', 
    key: 'iron',
    dbKey: 'zelezo',
    labelKey: 'micro_nutrients.iron',  // ← DODANO ZA PRIJEVOD
    unit: 'mg', 
    target: 14,
    icon: 'iron',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 18c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6z"/><path d="M12 8v4l2 2"/></svg>`
  },
  { 
    id: 'magnesium', 
    key: 'magnesium',
    dbKey: 'magnezij',
    labelKey: 'micro_nutrients.magnesium',  // ← DODANO ZA PRIJEVOD
    unit: 'mg', 
    target: 400,
    icon: 'magnesium',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>`
  },
  { 
    id: 'calcium', 
    key: 'calcium',
    dbKey: 'kalcij',
    labelKey: 'micro_nutrients.calcium',  // ← DODANO ZA PRIJEVOD
    unit: 'mg', 
    target: 1000,
    icon: 'calcium',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`
  },
  { 
    id: 'zinc', 
    key: 'zinc',
    dbKey: 'cink',
    labelKey: 'micro_nutrients.zinc',  // ← DODANO ZA PRIJEVOD
    unit: 'mg', 
    target: 11,
    icon: 'zinc',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`
  }
];

// ============================================================
// 2. POMOĆNE FUNKCIJE
// ============================================================
const getCurrentWeekday = () => {
  const today = new Date().getDay();
  return today === 0 ? 6 : today - 1;
};

const getDateForWeekday = (weekOffset = 0, dayOffset = 0) => {
  const now = new Date();
  const currentDay = now.getDay();
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday - (weekOffset * 7) + dayOffset);
  return monday.toISOString().split('T')[0];
};

// ============================================================
// 3. GLAVNA KOMPONENTA
// ============================================================
const MicroNutrients = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('daily');
  const [selectedNutrient, setSelectedNutrient] = useState('vitaminA');
  const [weeklyData, setWeeklyData] = useState({});
  const [weeklyDates, setWeeklyDates] = useState([]);
  
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

  // ============================================================
  // 4. INICIJALIZACIJA TJEDNIH DATUMA
  // ============================================================
  useEffect(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(getDateForWeekday(0, i));
    }
    setWeeklyDates(dates);

    const initWeekly = {};
    NUTRIENT_DEFS.forEach(n => {
      initWeekly[n.id] = [0, 0, 0, 0, 0, 0, 0];
    });
    setWeeklyData(initWeekly);
  }, []);

  // ============================================================
  // 5. DOHVAĆANJE PODATAKA IZ SUABASE
  // ============================================================
  useEffect(() => {
    const fetchAllNutrients = async () => {
      if (!email) return;
      
      try {
        setLoading(true);
        
        const response = await fetch(`${API_URL}/api/micro-nutrients/${email}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const allEntries = result.data;
          
          // 5a. DANAŠNJE VRIJEDNOSTI
          const today = new Date().toISOString().split('T')[0];
          const todayEntry = allEntries.find(n => n.datum === today);
          
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

          // 5b. TJEDNI PODACI
          const newWeekly = {};
          NUTRIENT_DEFS.forEach(n => {
            newWeekly[n.id] = [0, 0, 0, 0, 0, 0, 0];
          });

          weeklyDates.forEach((date, index) => {
            const entry = allEntries.find(n => n.datum === date);
            if (entry) {
              NUTRIENT_DEFS.forEach(n => {
                const value = entry[n.dbKey] || 0;
                const pct = Math.min((value / n.target) * 100, 100);
                newWeekly[n.id][index] = Math.min(pct, 100);
              });
            }
          });

          setWeeklyData(newWeekly);
        }
      } catch (error) {
        console.error('❌ Greška:', error);
      } finally {
        setLoading(false);
      }
    };

    if (weeklyDates.length > 0) {
      fetchAllNutrients();
    }
  }, [email, weeklyDates]);

  // ============================================================
  // 6. HANDLER ZA PROMJENU
  // ============================================================
  const handleChange = (key, value) => {
    const numValue = parseFloat(value) || 0;
    setNutrients(prev => ({ ...prev, [key]: numValue }));
  };

  // ============================================================
  // 7. SPREMANJE U SUABASE
  // ============================================================
  const handleSave = async () => {
    if (!email) {
      alert(t('micro_nutrients.errors.login_required') || '❌ Niste prijavljeni!');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${API_URL}/api/micro-nutrients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          date: today,
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
        // Ažuriraj tjedne podatke
        const todayIndex = getCurrentWeekday();
        const newWeekly = { ...weeklyData };
        
        NUTRIENT_DEFS.forEach(n => {
          const value = nutrients[n.key] || 0;
          const pct = Math.min((value / n.target) * 100, 100);
          newWeekly[n.id][todayIndex] = Math.min(pct, 100);
        });
        
        setWeeklyData(newWeekly);
        
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

  // ============================================================
  // 8. RENDER - DNEVNI PRIKAZ (RESPONSIVE + SVG IKONE + PRIJEVODI)
  // ============================================================
  const renderDaily = () => {
    return NUTRIENT_DEFS.map((n, index) => {
      const value = nutrients[n.key] || 0;
      const pct = Math.min((value / n.target) * 100, 100);
      const pctRounded = Math.round(pct);

      let barColor = 'bg-emerald-500';
      if (pct < 30) barColor = 'bg-red-500';
      else if (pct < 60) barColor = 'bg-yellow-500';
      else if (pct < 100) barColor = 'bg-emerald-500';
      else barColor = 'bg-emerald-600';

      let statusIcon = '⭕';
      let statusColor = 'text-gray-400';
      if (pct === 0) {
        statusIcon = '⭕';
        statusColor = 'text-gray-400';
      } else if (pct < 30) {
        statusIcon = '❌';
        statusColor = 'text-red-500';
      } else if (pct < 60) {
        statusIcon = '⚠️';
        statusColor = 'text-yellow-500';
      } else if (pct < 100) {
        statusIcon = '✅';
        statusColor = 'text-emerald-500';
      } else {
        statusIcon = '🌟';
        statusColor = 'text-emerald-600';
      }

      const iconColors = {
        'vitamin-a': 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        'vitamin-c': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
        'vitamin-d': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        'iron': 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
        'magnesium': 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
        'calcium': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
        'zinc': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
      };

      return (
        <div
          key={n.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition cursor-pointer border border-gray-100 dark:border-gray-700"
          onClick={(e) => {
            if (e.target.tagName !== 'INPUT') {
              setSelectedNutrient(n.id);
              setView('weekly');
            }
          }}
        >
          {/* SVG IKONA */}
          <div className={`w-12 h-12 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColors[n.icon]}`}>
            <span 
              className="w-6 h-6"
              dangerouslySetInnerHTML={{ __html: n.svg }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <span className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-200">
                {t(n.labelKey)}  {/* ← KORISTI PRIJEVOD */}
              </span>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleChange(n.key, e.target.value)}
                  className="w-14 sm:w-16 px-1.5 sm:px-2 py-1 text-xs sm:text-sm text-center border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="0"
                  min="0"
                  step="0.1"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{n.unit}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">/ {n.target}</span>
                <span className={`text-xs font-semibold min-w-[32px] sm:min-w-[36px] text-right ${statusColor}`}>
                  {pctRounded}%
                </span>
                <span className="text-sm">{statusIcon}</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      );
    });
  };

  // ============================================================
  // 9. RENDER - TJEDNI GRAF (RESPONSIVE + SVG IKONE + PRIJEVODI)
  // ============================================================
  const renderWeekly = () => {
    const days = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
    const todayIndex = getCurrentWeekday();
    
    const data = weeklyData[selectedNutrient] || [0, 0, 0, 0, 0, 0, 0];
    const nutrient = NUTRIENT_DEFS.find(n => n.id === selectedNutrient);
    
    if (!nutrient) return null;

    let totalPct = 0;
    const bars = days.map((day, index) => {
      const pct = Math.min(data[index] || 0, 100);
      totalPct += pct;
      
      let barColor = 'bg-emerald-500';
      if (pct < 30) barColor = 'bg-red-500';
      else if (pct < 60) barColor = 'bg-yellow-500';
      else if (pct < 100) barColor = 'bg-emerald-500';
      else barColor = 'bg-emerald-600';

      const isToday = index === todayIndex;

      return (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {day} {isToday && '👈'}
            </span>
            <span className="text-gray-500 dark:text-gray-400">{Math.round(pct)}%</span>
          </div>
          <div className="w-full h-2 sm:h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    });

    const avg = Math.round(totalPct / 7);
    let avgText = '💪 Pokušaj bolje!';
    let avgColor = 'text-red-500';
    if (avg >= 80) { avgText = '🎉 Odlično!'; avgColor = 'text-emerald-500'; }
    else if (avg >= 50) { avgText = '👍 Dobro!'; avgColor = 'text-yellow-500'; }

    const iconColors = {
      'vitamin-a': 'text-amber-600 dark:text-amber-400',
      'vitamin-c': 'text-emerald-600 dark:text-emerald-400',
      'vitamin-d': 'text-blue-600 dark:text-blue-400',
      'iron': 'text-red-600 dark:text-red-400',
      'magnesium': 'text-orange-600 dark:text-orange-400',
      'calcium': 'text-cyan-600 dark:text-cyan-400',
      'zinc': 'text-indigo-600 dark:text-indigo-400'
    };

    return (
      <div>
        <button
          onClick={() => setView('daily')}
          className="mb-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex items-center gap-1"
        >
          ← {t('common.back') || 'Natrag'}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${iconColors[selectedNutrient]} bg-gray-100 dark:bg-gray-800`}>
            <span className="w-6 h-6" dangerouslySetInnerHTML={{ __html: nutrient.svg }} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
              {t(nutrient.labelKey)}  {/* ← KORISTI PRIJEVOD */}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {t('micro_nutrients.weekly_average') || 'Tjedni prosjek'}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {bars}
        </div>

        <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            {t('micro_nutrients.weekly_average_label') || 'Prosjek tjedna'}:
            <span className={`font-bold ml-1 ${avgColor}`}>{avg}%</span>
            <span className="ml-2">{avgText}</span>
          </p>
        </div>
      </div>
    );
  };

  // ============================================================
  // 10. GLAVNI RENDER
  // ============================================================
  if (loading && Object.keys(weeklyData).length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t('common.loading') || 'Učitavanje...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
      {/* HEADER - RESPONSIVE */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/20">
          <span className="text-2xl sm:text-3xl">📊</span>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            {t('micro_nutrients.title')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {t('micro_nutrients.subtitle') || 'Unesite dnevni unos mikronutrijenata'}
          </p>
        </div>
      </div>

      {/* VIEW TOGGLE - RESPONSIVE */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('daily')}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
            view === 'daily'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          📊 {t('micro_nutrients.daily_view') || 'Dnevni prikaz'}
        </button>
        <button
          onClick={() => setView('weekly')}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
            view === 'weekly'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          📈 {t('micro_nutrients.weekly_view') || 'Tjedni prikaz'}
        </button>
      </div>

      {/* KARTICA - RESPONSIVE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6">
        {view === 'daily' ? (
          <>
            <div className="space-y-2 sm:space-y-3">
              {renderDaily()}
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3 sm:py-3.5 rounded-xl font-semibold transition disabled:opacity-50 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
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
          </>
        ) : (
          renderWeekly()
        )}
      </div>
    </div>
  );
};

export default MicroNutrients;