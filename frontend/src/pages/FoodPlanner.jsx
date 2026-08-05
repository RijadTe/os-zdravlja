// frontend/src/pages/FoodPlanner.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const FoodPlanner = () => {
  const { t, i18n } = useTranslation();
  
  // 🔥 STATE ZA DATUM
  const [todayDate, setTodayDate] = useState('');
  
  // 🔥 STATE ZA OBROKE
  const [meals, setMeals] = useState([]);
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('Ručak');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [moodBefore, setMoodBefore] = useState('');
  const [moodAfter, setMoodAfter] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🔥 UKUPNI BROJEVI
  const [totalCalories, setTotalCalories] = useState(0);
  const [totalProtein, setTotalProtein] = useState(0);
  const [totalCarbs, setTotalCarbs] = useState(0);
  const [totalFat, setTotalFat] = useState(0);
  const dailyGoal = 2200;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // ============================================================
  // 1. POSTAVI DATUM - FORMAT 05.08.2026.
  // ============================================================
  useEffect(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    setTodayDate(`${day}.${month}.${year}.`);
  }, []);

  // ============================================================
  // 2. DOHVATI OBROKE IZ BAZE
  // ============================================================
  useEffect(() => {
    const fetchMeals = async () => {
      const email = localStorage.getItem('userEmail');
      if (!email) return;

      try {
        const response = await fetch(`${API_URL}/api/obroci/${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          // Filtriraj samo današnje obroke
          const today = new Date().toISOString().split('T')[0];
          const todayMeals = data.data.filter(meal => meal.datum === today);
          setMeals(todayMeals);
          
          // Izračunaj ukupne vrijednosti
          let calcCalories = 0, calcProtein = 0, calcCarbs = 0, calcFat = 0;
          todayMeals.forEach(meal => {
            calcCalories += meal.kalorije || 0;
            calcProtein += meal.proteini || 0;
            calcCarbs += meal.ugljikohidrati || 0;
            calcFat += meal.masti || 0;
          });
          setTotalCalories(calcCalories);
          setTotalProtein(calcProtein);
          setTotalCarbs(calcCarbs);
          setTotalFat(calcFat);
        }
      } catch (error) {
        console.error('❌ Greška pri dohvatu obroka:', error);
      }
    };

    fetchMeals();
  }, []);

  // ============================================================
  // 3. DODAJ OBROK
  // ============================================================
  const handleAddMeal = async () => {
    if (!mealName.trim() || !calories) {
      alert('Molimo unesite naziv jela i kalorije.');
      return;
    }

    const email = localStorage.getItem('userEmail');
    if (!email) {
      alert('Morate biti prijavljeni.');
      return;
    }

    try {
      setLoading(true);
      
      const newMeal = {
        email: email,
        naziv: mealName,
        tip: mealType,
        kalorije: parseInt(calories) || 0,
        proteini: parseInt(protein) || 0,
        ugljikohidrati: parseInt(carbs) || 0,
        masti: parseInt(fat) || 0,
        raspolozenje_prije: moodBefore,
        raspolozenje_poslije: moodAfter,
        biljeska: note,
        datum: new Date().toISOString().split('T')[0]
      };

      const response = await fetch(`${API_URL}/api/obroci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeal)
      });

      const data = await response.json();
      
      if (data.success) {
        // Dodaj u listu
        setMeals([...meals, newMeal]);
        
        // Ažuriraj ukupne vrijednosti
        setTotalCalories(totalCalories + newMeal.kalorije);
        setTotalProtein(totalProtein + newMeal.proteini);
        setTotalCarbs(totalCarbs + newMeal.ugljikohidrati);
        setTotalFat(totalFat + newMeal.masti);
        
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
        alert('❌ Greška pri dodavanju obroka.');
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('Došlo je do greške. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 4. OBRISI OBROK
  // ============================================================
  const handleDeleteMeal = async (index) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovaj obrok?')) return;

    const mealToDelete = meals[index];
    const email = localStorage.getItem('userEmail');
    
    try {
      const response = await fetch(`${API_URL}/api/obroci/${mealToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedMeals = meals.filter((_, i) => i !== index);
        setMeals(updatedMeals);
        
        // Ponovno izračunaj ukupne vrijednosti
        let calcCalories = 0, calcProtein = 0, calcCarbs = 0, calcFat = 0;
        updatedMeals.forEach(meal => {
          calcCalories += meal.kalorije || 0;
          calcProtein += meal.proteini || 0;
          calcCarbs += meal.ugljikohidrati || 0;
          calcFat += meal.masti || 0;
        });
        setTotalCalories(calcCalories);
        setTotalProtein(calcProtein);
        setTotalCarbs(calcCarbs);
        setTotalFat(calcFat);
      }
    } catch (error) {
      console.error('❌ Greška:', error);
    }
  };

  // ============================================================
  // 5. MOOD EMOJI OPTIONS
  // ============================================================
  const moodOptions = [
    { emoji: '😊', label: 'Sretan', value: 'happy' },
    { emoji: '😐', label: 'Neutralan', value: 'neutral' },
    { emoji: '😢', label: 'Tužan', value: 'sad' },
    { emoji: '😡', label: 'Ljut', value: 'angry' },
    { emoji: '😴', label: 'Umoran', value: 'tired' },
    { emoji: '🤩', label: 'Uzbuđen', value: 'excited' },
    { emoji: '🧘', label: 'Opušten', value: 'relaxed' },
    { emoji: '🤔', label: 'Zamišljen', value: 'thoughtful' },
  ];

  // ============================================================
  // 6. RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* NASLOV */}
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          📊 {t('foodplanner.title', { defaultValue: 'Dnevnik ishrane' })}
        </h1>

        {/* TABOVI */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold">
            📝 {t('foodplanner.tabs.diary', { defaultValue: 'Dnevnik' })}
          </button>
          <button className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            📈 {t('foodplanner.tabs.analytics', { defaultValue: 'Analitika' })}
          </button>
          <button className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            📅 {t('foodplanner.tabs.plan', { defaultValue: 'Plan obroka' })}
          </button>
        </div>

        {/* ===== DNEVNIK ===== */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          
          {/* 🔥 DANAS SA PRAVIM DATUMOM - 05.08.2026. */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              📅 {t('foodplanner.diary.today', { defaultValue: 'Danas' })}
            </h2>
            <span className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
              {todayDate}
            </span>
          </div>

          {/* CILJ I UNOS */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                🎯 {t('foodplanner.diary.goal', { defaultValue: 'Dnevni cilj' })}
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {dailyGoal} kcal
              </p>
            </div>
            <div className={`p-4 rounded-xl text-center ${
              totalCalories > dailyGoal 
                ? 'bg-red-50 dark:bg-red-900/30' 
                : 'bg-green-50 dark:bg-green-900/30'
            }`}>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ✅ {t('foodplanner.diary.consumed', { defaultValue: 'Uneseno' })}
              </p>
              <p className={`text-2xl font-bold ${
                totalCalories > dailyGoal 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {totalCalories} kcal
              </p>
            </div>
          </div>

          {/* MAKRONUTRIJENTI */}
          <div className="grid grid-cols-3 gap-3 mb-4">
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

          {/* LISTA OBROKA */}
          {meals.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {meals.map((meal, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-white">{meal.naziv}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {meal.tip} {meal.raspolozenje_prije && `· ${meal.raspolozenje_prije}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 dark:text-white">{meal.kalorije} kcal</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      P:{meal.proteini || 0}g U:{meal.ugljikohidrati || 0}g M:{meal.masti || 0}g
                    </p>
                    <button 
                      onClick={() => handleDeleteMeal(index)}
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

        {/* ===== DODAJ OBROK ===== */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mt-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            ➕ {t('foodplanner.diary.add_meal', { defaultValue: 'Dodaj obrok' })}
          </h2>

          <div className="space-y-3">
            {/* Naziv jela */}
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder={t('foodplanner.diary.meal_name', { defaultValue: 'Naziv jela...' })}
              className="w-full border rounded-lg px-4 py-3 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />

            {/* Tip obroka */}
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

            {/* Nutritivne vrijednosti */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="🔥 Kalorije"
                className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
              />
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="🥩 Proteini (g)"
                className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
              />
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="🍞 Uglj. (g)"
                className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
              />
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="🧈 Masti (g)"
                className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
              />
            </div>

            {/* Raspoloženje PRIJE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                😊 {t('foodplanner.diary.mood_before', { defaultValue: 'Raspoloženje PRIJE obroka' })}
              </label>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setMoodBefore(mood.emoji)}
                    className={`px-3 py-2 rounded-xl transition ${
                      moodBefore === mood.emoji
                        ? 'bg-blue-500 text-white scale-105'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Raspoloženje POSLIJE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                😊 {t('foodplanner.diary.mood_after', { defaultValue: 'Raspoloženje POSLIJE obroka' })}
              </label>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setMoodAfter(mood.emoji)}
                    className={`px-3 py-2 rounded-xl transition ${
                      moodAfter === mood.emoji
                        ? 'bg-blue-500 text-white scale-105'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bilješka */}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('foodplanner.diary.note_placeholder', { defaultValue: '📝 Bilješka...' })}
              className="w-full border rounded-lg px-4 py-3 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />

            {/* Dugme */}
            <button
              onClick={handleAddMeal}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold transition"
            >
              {loading ? '⏳ Dodavanje...' : '➕ Dodaj obrok'}
            </button>
          </div>
        </div>

        {/* ===== PREMIUM LINK ===== */}
        <div className="mt-6 text-center">
          <Link to="/premium" className="text-yellow-500 hover:text-yellow-600 font-semibold">
            ⭐ Postani Premium za više funkcionalnosti!
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FoodPlanner;