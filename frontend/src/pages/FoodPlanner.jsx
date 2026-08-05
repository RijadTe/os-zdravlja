// frontend/src/pages/FoodPlanner.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FoodPlanner = () => {
  const { t } = useTranslation();
  
  // ============================================================
  // STATE
  // ============================================================
  const [currentDate, setCurrentDate] = useState('');
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('Ručak');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [moodBefore, setMoodBefore] = useState('');
  const [moodAfter, setMoodAfter] = useState('');
  const [note, setNote] = useState('');
  
  // Statistika
  const [dailyGoal] = useState(2200);
  const [totalCalories, setTotalCalories] = useState(0);
  const [totalProtein, setTotalProtein] = useState(0);
  const [totalCarbs, setTotalCarbs] = useState(0);
  const [totalFat, setTotalFat] = useState(0);
  
  const [activeTab, setActiveTab] = useState('diary');
  const [isPremium, setIsPremium] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // ============================================================
  // 1. DOHVATI KORISNIKA I DATUM
  // ============================================================
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    setIsPremium(userData?.premium || false);

    // 🔥 POSTAVI TRENUTNI DATUM - NUMERIČKI (05.08.2026.)
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    setCurrentDate(`${day}.${month}.${year}.`);
  }, []);

  // ============================================================
  // 2. DOHVATI OBROKE IZ BAZE
  // ============================================================
  useEffect(() => {
    const fetchMeals = async () => {
      const email = user?.email || localStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/obroci/${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setMeals(data.data);
          calculateTotals(data.data);
        }
      } catch (error) {
        console.error('❌ Greška pri dohvatu obroka:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeals();
  }, [user]);

  // ============================================================
  // 3. IZRAČUNAJ UKUPNE VRIJEDNOSTI
  // ============================================================
  const calculateTotals = (mealList) => {
    let cal = 0, prot = 0, carb = 0, f = 0;
    
    mealList.forEach(meal => {
      cal += meal.kalorije || 0;
      prot += meal.proteini || 0;
      carb += meal.ugljikohidrati || 0;
      f += meal.masti || 0;
    });
    
    setTotalCalories(cal);
    setTotalProtein(prot);
    setTotalCarbs(carb);
    setTotalFat(f);
  };

  // ============================================================
  // 4. DODAJ OBROK
  // ============================================================
  const handleAddMeal = async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    
    if (!email) {
      alert(t('foodplanner.alerts.login_required', { defaultValue: '⚠️ Morate biti prijavljeni.' }));
      return;
    }

    if (!mealName.trim() || !calories) {
      alert(t('foodplanner.alerts.fill_fields', { defaultValue: '⚠️ Molimo unesite naziv i kalorije.' }));
      return;
    }

    try {
      const newMeal = {
        email: email,
        naziv: mealName.trim(),
        tip: mealType,
        kalorije: parseInt(calories) || 0,
        proteini: parseInt(protein) || 0,
        ugljikohidrati: parseInt(carbs) || 0,
        masti: parseInt(fat) || 0,
        raspolozenje_prije: moodBefore,
        raspolozenje_poslije: moodAfter,
        biljeska: note.trim(),
        datum: new Date().toISOString()
      };

      const response = await fetch(`${API_URL}/api/obroci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeal)
      });

      const data = await response.json();

      if (data.success) {
        // Osvježi listu
        const updatedMeals = [...meals, newMeal];
        setMeals(updatedMeals);
        calculateTotals(updatedMeals);
        
        // Resetuj formu
        setMealName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
        setMoodBefore('');
        setMoodAfter('');
        setNote('');
        
        alert('✅ Obrok uspješno dodan!');
      } else {
        alert(t('foodplanner.alerts.add_error', { defaultValue: '❌ Greška pri dodavanju obroka.' }));
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(t('foodplanner.alerts.add_error', { defaultValue: '❌ Greška pri dodavanju obroka.' }));
    }
  };

  // ============================================================
  // 5. OBRIŠI OBROK
  // ============================================================
  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm(t('foodplanner.alerts.delete_confirm', { defaultValue: 'Jeste li sigurni da želite obrisati ovaj obrok?' }))) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/obroci/${mealId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        const updatedMeals = meals.filter(m => m.id !== mealId);
        setMeals(updatedMeals);
        calculateTotals(updatedMeals);
      } else {
        alert(t('foodplanner.alerts.delete_error', { defaultValue: '❌ Greška pri brisanju obroka.' }));
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(t('foodplanner.alerts.delete_error', { defaultValue: '❌ Greška pri brisanju obroka.' }));
    }
  };

  // ============================================================
  // 6. GENERIŠI PDF
  // ============================================================
  const handleGeneratePDF = async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    
    if (!email) {
      alert('⚠️ Morate biti prijavljeni.');
      return;
    }

    if (meals.length === 0) {
      alert(t('foodplanner.alerts.no_meals', { defaultValue: '⚠️ Nema obroka za izvještaj.' }));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/pdf/izvjestaj/${encodeURIComponent(email)}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `izvjestaj-${currentDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Greška pri generisanju PDF-a:', error);
      alert(t('foodplanner.alerts.pdf_error', { defaultValue: '❌ Greška pri generisanju PDF-a.' }));
    }
  };

  // ============================================================
  // 7. RENDER - AKO NIJE PREMIUM
  // ============================================================
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl text-center border border-gray-200 dark:border-gray-700">
          <span className="text-6xl mb-4 block">🔒</span>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">
            {t('foodplanner.premium.title', { defaultValue: '📊 Dnevnik ishrane' })}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('foodplanner.premium.description', { defaultValue: 'Ova sekcija je dostupna samo za Premium korisnike.' })}
          </p>
          <Link 
            to="/premium" 
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full font-bold transition inline-block"
          >
            ⭐ {t('foodplanner.premium.button', { defaultValue: 'Postani Premium' })}
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // 8. RENDER - GLAVNI
  // ============================================================
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ===== NASLOV ===== */}
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          📊 {t('foodplanner.title', { defaultValue: 'Dnevnik ishrane' })}
        </h1>

        {/* ===== TABOVI ===== */}
        <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('diary')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'diary' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            📝 {t('foodplanner.tabs.diary', { defaultValue: 'Dnevnik' })}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'analytics' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            📈 {t('foodplanner.tabs.analytics', { defaultValue: 'Analitika' })}
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'plan' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            📅 {t('foodplanner.tabs.plan', { defaultValue: 'Plan obroka' })}
          </button>
        </div>

        {/* ===== TAB: DNEVNIK ===== */}
        {activeTab === 'diary' && (
          <>
            {/* DANAŠNJI SAŽETAK */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  📅 {t('foodplanner.diary.today', { defaultValue: 'Danas' })}
                </h2>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {currentDate || 'Učitavanje...'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    🎯 {t('foodplanner.diary.goal', { defaultValue: 'Dnevni cilj' })}
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {dailyGoal} kcal
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ✅ {t('foodplanner.diary.consumed', { defaultValue: 'Uneseno' })}
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {totalCalories} kcal
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-xl text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    🥩 {t('foodplanner.diary.protein', { defaultValue: 'Proteini' })}
                  </p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {totalProtein}g
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-xl text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    🍞 {t('foodplanner.diary.carbs', { defaultValue: 'Uglj.' })}
                  </p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {totalCarbs}g
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-xl text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    🧈 {t('foodplanner.diary.fat', { defaultValue: 'Masti' })}
                  </p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {totalFat}g
                  </p>
                </div>
              </div>
            </div>

            {/* LISTA OBROKA */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                📋 {t('foodplanner.diary.meals', { defaultValue: 'Obroci' })} ({meals.length})
              </h3>
              
              {loading ? (
                <p className="text-center text-gray-400 dark:text-gray-500 py-4">
                  {t('foodplanner.diary.loading', { defaultValue: '⏳ Učitavanje obroka...' })}
                </p>
              ) : meals.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {meals.map((meal, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white">{meal.naziv}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{meal.tip}</span>
                          {meal.raspolozenje_prije && (
                            <span>😊 Prije: {meal.raspolozenje_prije}</span>
                          )}
                          {meal.raspolozenje_poslije && (
                            <span>😊 Poslije: {meal.raspolozenje_poslije}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 dark:text-white">{meal.kalorije} kcal</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          P:{meal.proteini}g U:{meal.ugljikohidrati}g M:{meal.masti}g
                        </p>
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="text-red-500 hover:text-red-700 text-xs mt-1"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 dark:text-gray-500 py-4">
                  {t('foodplanner.diary.no_meals', { defaultValue: 'Još nema unesenih obroka za danas.' })}
                </p>
              )}
            </div>

            {/* DODAJ OBROK */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                ➕ {t('foodplanner.diary.add_meal', { defaultValue: 'Dodaj obrok' })}
              </h2>

              <div className="space-y-3">
                <input
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  placeholder={t('foodplanner.diary.meal_name', { defaultValue: 'Naziv jela...' })}
                  className="w-full border rounded-lg px-4 py-3 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />

                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full border rounded-lg px-4 py-3 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                  <option value="Doručak">🍳 {t('foodplanner.diary.breakfast', { defaultValue: 'Doručak' })}</option>
                  <option value="Ručak">🍲 {t('foodplanner.diary.lunch', { defaultValue: 'Ručak' })}</option>
                  <option value="Večera">🌙 {t('foodplanner.diary.dinner', { defaultValue: 'Večera' })}</option>
                  <option value="Užina">🍿 {t('foodplanner.diary.snack', { defaultValue: 'Užina' })}</option>
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={moodBefore}
                    onChange={(e) => setMoodBefore(e.target.value)}
                    className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
                  >
                    <option value="">😊 {t('foodplanner.diary.mood_before', { defaultValue: 'Raspoloženje PRIJE' })}</option>
                    <option value="Sretan">😊 Sretan</option>
                    <option value="Neutralan">😐 Neutralan</option>
                    <option value="Tužan">😢 Tužan</option>
                    <option value="Ljut">😡 Ljut</option>
                    <option value="Umoran">😴 Umoran</option>
                    <option value="Uzbuđen">🤩 Uzbuđen</option>
                    <option value="Opušten">🧘 Opušten</option>
                  </select>

                  <select
                    value={moodAfter}
                    onChange={(e) => setMoodAfter(e.target.value)}
                    className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
                  >
                    <option value="">😊 {t('foodplanner.diary.mood_after', { defaultValue: 'Raspoloženje POSLIJE' })}</option>
                    <option value="Sretan">😊 Sretan</option>
                    <option value="Neutralan">😐 Neutralan</option>
                    <option value="Tužan">😢 Tužan</option>
                    <option value="Ljut">😡 Ljut</option>
                    <option value="Umoran">😴 Umoran</option>
                    <option value="Uzbuđen">🤩 Uzbuđen</option>
                    <option value="Opušten">🧘 Opušten</option>
                  </select>
                </div>

                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('foodplanner.diary.note_placeholder', { defaultValue: '📝 Bilješka...' })}
                  className="w-full border rounded-lg px-4 py-3 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder={t('foodplanner.diary.calories', { defaultValue: 'Kalorije' })}
                    className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
                  />
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder={t('foodplanner.diary.protein_g', { defaultValue: 'Proteini (g)' })}
                    className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
                  />
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder={t('foodplanner.diary.carbs_g', { defaultValue: 'Uglj. (g)' })}
                    className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
                  />
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder={t('foodplanner.diary.fat_g', { defaultValue: 'Masti (g)' })}
                    className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
                  />
                </div>

                <button
                  onClick={handleAddMeal}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
                >
                  ➕ {t('foodplanner.diary.add_button', { defaultValue: 'Dodaj obrok' })}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== TAB: ANALITIKA ===== */}
        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              📈 {t('foodplanner.analytics.title', { defaultValue: 'Analitika' })}
            </h2>
            
            {meals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 dark:text-gray-500">
                  {t('foodplanner.analytics.no_data', { defaultValue: 'Nema dovoljno podataka za analitiku.' })}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {t('foodplanner.analytics.add_meals', { defaultValue: 'Unesite nekoliko obroka da vidite statistiku.' })}
                </p>
              </div>
            ) : (
              <>
                {/* Grafikon - placeholder */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4 h-48 flex items-center justify-center">
                  <p className="text-gray-400 dark:text-gray-500">
                    📊 {t('foodplanner.analytics.weekly_chart', { defaultValue: 'Sedmični unos kalorija' })}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4 h-32 flex items-center justify-center">
                  <p className="text-gray-400 dark:text-gray-500">
                    🥧 {t('foodplanner.analytics.macro_chart', { defaultValue: 'Makronutrijenti' })}
                  </p>
                </div>

                <button
                  onClick={handleGeneratePDF}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition"
                >
                  📄 {t('foodplanner.analytics.generate_pdf', { defaultValue: 'Generiši PDF izvještaj' })}
                </button>
              </>
            )}
          </div>
        )}

        {/* ===== TAB: PLAN OBROKA ===== */}
        {activeTab === 'plan' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              📅 {t('foodplanner.plan.title', { defaultValue: 'Plan obroka' })}
            </h2>
            
            <div className="text-center py-8">
              <p className="text-gray-400 dark:text-gray-500 mb-4">
                {t('foodplanner.plan.hint', { defaultValue: '💡 Plan se generiše na osnovu vaših namirnica u frižideru' })}
              </p>
              
              <button
                onClick={() => alert(t('foodplanner.plan.generating', { defaultValue: 'Generišem...' }))}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition"
              >
                {t('foodplanner.plan.generate', { defaultValue: 'Generiši sedmični plan' })}
              </button>

              <div className="mt-6 grid grid-cols-7 gap-1">
                {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map((day, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-center">
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{day}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">---</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodPlanner;