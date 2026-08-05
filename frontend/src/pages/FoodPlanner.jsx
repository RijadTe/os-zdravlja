// frontend/src/pages/FoodPlanner.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// 🔥 MAPPING ZA DANE U SEDMICI
const dayMapping = {
  'Pon': 'mon', 'Uto': 'tue', 'Sri': 'wed', 'Čet': 'thu',
  'Pet': 'fri', 'Sub': 'sat', 'Ned': 'sun',
  'Mon': 'mon', 'Tue': 'tue', 'Wed': 'wed', 'Thu': 'thu',
  'Fri': 'fri', 'Sat': 'sat', 'Sun': 'sun',
  'Mo': 'mon', 'Di': 'tue', 'Mi': 'wed', 'Do': 'thu',
  'Fr': 'fri', 'Sa': 'sat', 'So': 'sun'
};

const FoodPlanner = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [obroci, setObroci] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingObroci, setLoadingObroci] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // 🔥 DNEVNI CILJ
  const [dailyGoal, setDailyGoal] = useState({
    kalorije: 2200,
    proteini: 150,
    ugljikohidrati: 250,
    masti: 70
  });
  const [editingGoal, setEditingGoal] = useState(false);
  
  // 🔥 RECEPTI - LAZY LOAD (NE DOHVAĆAJU SE ODMAH!)
  const [allRecipes, setAllRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecipeDropdown, setShowRecipeDropdown] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchingRecipes, setSearchingRecipes] = useState(false);
  const [recipesLoaded, setRecipesLoaded] = useState(false);
  const searchTimeoutRef = useRef(null);
  
  const [noviObrok, setNoviObrok] = useState({
    naziv: '',
    kalorije: '',
    proteini: '',
    ugljikohidrati: '',
    masti: '',
    tip: 'Ručak'
  });

  const [moodBefore, setMoodBefore] = useState('');
  const [moodAfter, setMoodAfter] = useState('');
  const [moodNote, setMoodNote] = useState('');

  const moodOptions = [
    { emoji: '😊', label: t('foodplanner.moods.happy') },
    { emoji: '😐', label: t('foodplanner.moods.neutral') },
    { emoji: '😞', label: t('foodplanner.moods.sad') },
    { emoji: '😡', label: t('foodplanner.moods.angry') },
    { emoji: '😴', label: t('foodplanner.moods.tired') },
    { emoji: '🤩', label: t('foodplanner.moods.excited') },
    { emoji: '😌', label: t('foodplanner.moods.relaxed') },
    { emoji: '🤔', label: t('foodplanner.moods.thoughtful') },
  ];

  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [fridgeItems, setFridgeItems] = useState([]);
  const [restrictions, setRestrictions] = useState([]);

  // ============================================================
  // HELPER FUNKCIJE ZA DATUM - BINARNI FORMAT (DD.MM.YYYY)
  // ============================================================
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatDateForAPI = (date) => {
    return date.toISOString().split('T')[0];
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // 🔥 FUNKCIJA ZA PREVOD DANA
  const getTranslatedDay = (dayName) => {
    const key = dayMapping[dayName];
    return key ? t(`foodplanner.plan.days.${key}`) : dayName;
  };

  // ============================================================
  // 🔥 FILTRIRAJ RECEPTE NA OSNOVU RESTRIKCIJA
  // ============================================================
  const filterRecipesByRestrictions = useCallback((recipes) => {
    if (!recipes || recipes.length === 0) return [];
    if (!restrictions || restrictions.length === 0) return recipes;
    
    return recipes.filter(recipe => {
      const alergeni = recipe.alergeni || [];
      return !restrictions.some(restriction => 
        alergeni.includes(restriction)
      );
    });
  }, [restrictions]);

  // ============================================================
  // 🔥 DOHVATI RECEPTE - SAMO KAD JE POTREBNO (LAZY LOAD)
  // ============================================================
  const fetchRecipes = useCallback(async () => {
    if (recipesLoaded) return;
    
    try {
      setSearchingRecipes(true);
      console.log('📡 Dohvatam recepte (prvi put)...');
      
      const res = await fetch(`${API_URL}/api/recepti`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setAllRecipes(data);
        const filtered = filterRecipesByRestrictions(data);
        setFilteredRecipes(filtered);
        setRecipesLoaded(true);
        console.log('✅ Dohvaćeno recepata:', data.length);
        console.log('✅ Filtrirano recepata (bez restrikcija):', filtered.length);
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu recepata:', error);
    } finally {
      setSearchingRecipes(false);
    }
  }, [filterRecipesByRestrictions, recipesLoaded]);

  // ============================================================
  // 🔥 SEARCH - SA DEBOUNCE (ČEKA 500ms NAKON PRESTANKA KUCANJA)
  // ============================================================
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowRecipeDropdown(true);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!value.trim()) {
      setShowRecipeDropdown(false);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      fetchRecipes();
    }, 500);
  };

  // ============================================================
  // 🔥 SEARCH REZULTATI - FILTRIRAJ LOKALNO
  // ============================================================
  const searchResults = useMemo(() => {
    if (!searchTerm.trim() || !recipesLoaded) return [];
    const term = searchTerm.toLowerCase();
    return filteredRecipes.filter(r => 
      r.naziv?.toLowerCase().includes(term)
    ).slice(0, 15);
  }, [filteredRecipes, searchTerm, recipesLoaded]);

  // ============================================================
  // DOHVATI PROFIL (BEZ RECEPATA!)
  // ============================================================
  useEffect(() => {
    const fetchProfile = async () => {
      const userData = JSON.parse(localStorage.getItem('user'));
      const email = localStorage.getItem('userEmail');
      
      if (userData) {
        setUser(userData);
      } else if (email) {
        setUser({ email: email });
      }

      if (email) {
        try {
          const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
          const data = await response.json();
          if (data.success && data.data) {
            console.log('✅ Profil dohvaćen za FoodPlanner:', data.data);
            setProfil(data.data);
            
            const restrikcije = data.data.izbjegava || [];
            setRestrictions(restrikcije);
            console.log('🔒 Restrikcije korisnika:', restrikcije);
          }
        } catch (error) {
          console.error('❌ Greška pri dohvatu profila:', error);
        }
      }

      const saved = localStorage.getItem('fridgeItems');
      if (saved) {
        try {
          setFridgeItems(JSON.parse(saved));
        } catch (e) {
          setFridgeItems([]);
        }
      }
    };

    fetchProfile();
  }, []);

  // ============================================================
  // DOHVATI OBROKE ZA ODABRANI DATUM
  // ============================================================
  const fetchObroci = useCallback(async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) {
      setLoadingObroci(false);
      return;
    }

    try {
      setLoadingObroci(true);
      const datum = formatDateForAPI(selectedDate);
      const res = await fetch(`${API_URL}/api/obroci/${email}?datum=${datum}`);
      const data = await res.json();
      setObroci(data || []);
    } catch (error) {
      console.error('❌ Greška pri dohvatu obroka:', error);
      setObroci([]);
    } finally {
      setLoadingObroci(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    if (user?.email || localStorage.getItem('userEmail')) {
      fetchObroci();
    }
  }, [user, fetchObroci, selectedDate]);

  // ============================================================
  // 🔥 ODABERI RECEPT IZ DROPDOWNA
  // ============================================================
  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setNoviObrok({
      naziv: recipe.naziv,
      kalorije: recipe.kalorije || '',
      proteini: recipe.proteini || '',
      ugljikohidrati: recipe.ugljikohidrati || '',
      masti: recipe.masti || '',
      tip: noviObrok.tip
    });
    setSearchTerm(recipe.naziv);
    setShowRecipeDropdown(false);
  };

  // ============================================================
  // DODAJ OBROK (U BAZU)
  // ============================================================
  const handleDodajObrok = useCallback(async (e) => {
    e.preventDefault();
    
    if (!noviObrok.naziv || !noviObrok.kalorije) {
      alert(t('foodplanner.alerts.fill_fields'));
      return;
    }

    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) {
      alert(t('foodplanner.alerts.login_required'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/obroci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          naziv: noviObrok.naziv,
          kalorije: parseFloat(noviObrok.kalorije) || 0,
          proteini: parseFloat(noviObrok.proteini) || 0,
          ugljikohidrati: parseFloat(noviObrok.ugljikohidrati) || 0,
          masti: parseFloat(noviObrok.masti) || 0,
          tip: noviObrok.tip || 'Ručak',
          mood_before: moodBefore || '😐',
          mood_after: moodAfter || '😐',
          mood_note: moodNote || '',
          datum: formatDateForAPI(selectedDate)
        })
      });
      const data = await res.json();

      setObroci(prev => [data, ...prev]);
      setNoviObrok({ naziv: '', kalorije: '', proteini: '', ugljikohidrati: '', masti: '', tip: 'Ručak' });
      setSelectedRecipe(null);
      setSearchTerm('');
      setShowRecipeDropdown(false);
      setMoodBefore('');
      setMoodAfter('');
      setMoodNote('');
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(t('foodplanner.alerts.add_error'));
    } finally {
      setLoading(false);
    }
  }, [noviObrok, moodBefore, moodAfter, moodNote, user, t, selectedDate]);

  // ============================================================
  // IZBRIŠI OBROK
  // ============================================================
  const handleDeleteObrok = useCallback(async (id) => {
    if (!window.confirm(t('foodplanner.alerts.delete_confirm'))) return;

    try {
      await fetch(`${API_URL}/api/obroci/${id}`, { method: 'DELETE' });
      setObroci(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(t('foodplanner.alerts.delete_error'));
    }
  }, [t]);

  // ============================================================
  // IZRAČUNAJ UKUPNO
  // ============================================================
  const ukupno = useMemo(() => {
    return obroci.reduce((acc, obrok) => ({
      kalorije: acc.kalorije + (obrok.kalorije || 0),
      proteini: acc.proteini + (obrok.proteini || 0),
      ugljikohidrati: acc.ugljikohidrati + (obrok.ugljikohidrati || 0),
      masti: acc.masti + (obrok.masti || 0)
    }), { kalorije: 0, proteini: 0, ugljikohidrati: 0, masti: 0 });
  }, [obroci]);

  // ============================================================
  // PROGRESS ZA SVAKI MAKRO
  // ============================================================
  const progress = {
    kalorije: Math.min((ukupno.kalorije / dailyGoal.kalorije) * 100, 100),
    proteini: Math.min((ukupno.proteini / dailyGoal.proteini) * 100, 100),
    ugljikohidrati: Math.min((ukupno.ugljikohidrati / dailyGoal.ugljikohidrati) * 100, 100),
    masti: Math.min((ukupno.masti / dailyGoal.masti) * 100, 100)
  };

  // ============================================================
  // 🔥 WEEKLY PLAN - BIRA RECEPTE IZ BAZE (NE AI GENERIŠE)
  // ============================================================
  const generateWeeklyPlan = async () => {
    setLoadingPlan(true);
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      
      // 🔥 PROMIJENJEN ENDPOINT: /api/weekly-plan (bira iz baze)
      const res = await fetch(`${API_URL}/api/weekly-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          sastojci: fridgeItems,
          kalorije: dailyGoal.kalorije,
          proteini: dailyGoal.proteini,
          ugljikohidrati: dailyGoal.ugljikohidrati,
          masti: dailyGoal.masti,
          restrikcije: restrictions,
          datum: formatDateForAPI(selectedDate)
        })
      });
      
      const data = await res.json();
      console.log('📡 Weekly Plan (iz baze):', data);
      setWeeklyPlan(data);
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(t('foodplanner.alerts.plan_error'));
      // Fallback plan - hard-coded
      setWeeklyPlan({
        dani: [
          { naziv: 'Pon', dorucak: 'Ovsena kaša', rucak: 'Pileća prsa', vecera: 'Losos' },
          { naziv: 'Uto', dorucak: 'Jaja', rucak: 'Salata', vecera: 'Tofu' },
          { naziv: 'Sri', dorucak: 'Smoothie', rucak: 'Riba', vecera: 'Krompir' },
          { naziv: 'Čet', dorucak: 'Palenta', rucak: 'Piletina', vecera: 'Povrće' },
          { naziv: 'Pet', dorucak: 'Musli', rucak: 'Burger', vecera: 'Pizza' },
          { naziv: 'Sub', dorucak: 'Palačinke', rucak: 'Ćevapi', vecera: 'Riba' },
          { naziv: 'Ned', dorucak: 'Kajgana', rucak: 'Pečenje', vecera: 'Salata' },
        ]
      });
    } finally {
      setLoadingPlan(false);
    }
  };

  // ============================================================
  // GRAFIKONI
  // ============================================================
  const lineData = useMemo(() => {
    const labels = [];
    const dataPoints = [];
    const goalData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('hr', { weekday: 'short' }));
      
      const dayMeals = obroci.filter(o => o.datum === formatDateForAPI(date));
      const totalCal = dayMeals.reduce((sum, m) => sum + (m.kalorije || 0), 0);
      dataPoints.push(totalCal);
      goalData.push(dailyGoal.kalorije);
    }
    
    return {
      labels: labels,
      datasets: [
        {
          label: t('foodplanner.chart.calories'),
          data: dataPoints,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: t('foodplanner.chart.goal'),
          data: goalData,
          borderColor: 'rgb(239, 68, 68)',
          borderDash: [5, 5],
          pointRadius: 0,
        },
      ],
    };
  }, [obroci, selectedDate, dailyGoal.kalorije]);

  const doughnutData = useMemo(() => ({
    labels: [t('foodplanner.chart.protein'), t('foodplanner.chart.carbs'), t('foodplanner.chart.fat')],
    datasets: [{
      data: [
        Math.round((ukupno.proteini / (ukupno.proteini + ukupno.ugljikohidrati + ukupno.masti || 1)) * 100),
        Math.round((ukupno.ugljikohidrati / (ukupno.proteini + ukupno.ugljikohidrati + ukupno.masti || 1)) * 100),
        Math.round((ukupno.masti / (ukupno.proteini + ukupno.ugljikohidrati + ukupno.masti || 1)) * 100)
      ],
      backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b'],
      borderWidth: 0,
    }],
  }), [ukupno, t]);

  // ============================================================
  // PDF IZVJEŠTAJ
  // ============================================================
  const generatePDF = async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) {
      alert(t('foodplanner.alerts.login_required'));
      return;
    }

    if (obroci.length === 0) {
      alert(t('foodplanner.alerts.no_meals'));
      return;
    }

    try {
      setLoading(true);
      const datum = formatDateForAPI(selectedDate);
      window.open(`${API_URL}/api/pdf/izvjestaj/${encodeURIComponent(email)}?datum=${datum}`, '_blank');
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(t('foodplanner.alerts.pdf_error'));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER - NIJE PREMIUM
  // ============================================================
  if (!user?.premium) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center dark:bg-gray-900 dark:text-white">
        <h1 className="text-3xl font-bold mb-4">{t('foodplanner.premium.title')}</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {t('foodplanner.premium.description')}
        </p>
        <Link to="/premium" className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full font-semibold transition inline-block">
          ⭐ {t('foodplanner.premium.button')}
        </Link>
      </div>
    );
  }

  // ============================================================
  // RENDER - GLAVNI UI
  // ============================================================
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">{t('foodplanner.title')}</h1>

      {/* TABOVI */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {[t('foodplanner.tabs.diary'), t('foodplanner.tabs.analytics'), t('foodplanner.tabs.plan')].map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 font-semibold transition whitespace-nowrap ${
              activeTab === index
                ? 'border-b-2 border-blue-500 text-blue-500 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: DNEVNIK */}
      {/* ============================================================ */}
      {activeTab === 0 && (
        <div>
          <div className="mb-6">
            {/* KALENDAR NAVIGACIJA */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-xl font-bold dark:text-white">
                📅 {formatDate(selectedDate)}
              </h2>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousDay}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
                >
                  ◀
                </button>
                <button
                  onClick={goToToday}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition ${
                    formatDateForAPI(selectedDate) === formatDateForAPI(new Date())
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  📍 {t('foodplanner.diary.today')}
                </button>
                <button
                  onClick={goToNextDay}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
                >
                  ▶
                </button>
              </div>
            </div>
            
            {/* DNEVNI CILJ */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold dark:text-white">🎯 {t('foodplanner.diary.goal')}</span>
                <button
                  onClick={() => setEditingGoal(!editingGoal)}
                  className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
                >
                  {editingGoal ? '💾 ' + t('common.save') : '✏️ ' + t('common.edit')}
                </button>
              </div>
              
              {editingGoal ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">🔥 {t('foodplanner.diary.calories')}</label>
                    <input
                      type="number"
                      value={dailyGoal.kalorije}
                      onChange={(e) => setDailyGoal({...dailyGoal, kalorije: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">🥩 {t('foodplanner.diary.protein')}</label>
                    <input
                      type="number"
                      value={dailyGoal.proteini}
                      onChange={(e) => setDailyGoal({...dailyGoal, proteini: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">🍞 {t('foodplanner.diary.carbs')}</label>
                    <input
                      type="number"
                      value={dailyGoal.ugljikohidrati}
                      onChange={(e) => setDailyGoal({...dailyGoal, ugljikohidrati: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">🧈 {t('foodplanner.diary.fat')}</label>
                    <input
                      type="number"
                      value={dailyGoal.masti}
                      onChange={(e) => setDailyGoal({...dailyGoal, masti: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-center">
                    <span className="text-gray-500 dark:text-gray-400">🔥</span>
                    <span className="font-bold dark:text-white ml-1">{dailyGoal.kalorije} kcal</span>
                  </div>
                  <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-center">
                    <span className="text-gray-500 dark:text-gray-400">🥩</span>
                    <span className="font-bold dark:text-white ml-1">{dailyGoal.proteini}g</span>
                  </div>
                  <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-center">
                    <span className="text-gray-500 dark:text-gray-400">🍞</span>
                    <span className="font-bold dark:text-white ml-1">{dailyGoal.ugljikohidrati}g</span>
                  </div>
                  <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-center">
                    <span className="text-gray-500 dark:text-gray-400">🧈</span>
                    <span className="font-bold dark:text-white ml-1">{dailyGoal.masti}g</span>
                  </div>
                </div>
              )}
            </div>

            {/* PROGRESS BAR */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold dark:text-white">{t('foodplanner.diary.consumed')}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(ukupno.kalorije)} / {dailyGoal.kalorije} kcal
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    progress.kalorije > 100 ? 'bg-red-500' : 'bg-blue-600'
                  }`} 
                  style={{ width: `${Math.min(progress.kalorije, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="text-blue-500">🥩</span>
                  <span>{Math.round(ukupno.proteini)}/{dailyGoal.proteini}g</span>
                  <span className="text-xs">({Math.round(progress.proteini)}%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-500">🍞</span>
                  <span>{Math.round(ukupno.ugljikohidrati)}/{dailyGoal.ugljikohidrati}g</span>
                  <span className="text-xs">({Math.round(progress.ugljikohidrati)}%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">🧈</span>
                  <span>{Math.round(ukupno.masti)}/{dailyGoal.masti}g</span>
                  <span className="text-xs">({Math.round(progress.masti)}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 🔥 FORMA ZA UNOS - SA LAZY LOAD RECEPTIMA */}
          <form onSubmit={handleDodajObrok} className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
            <h3 className="font-bold dark:text-white mb-2">{t('foodplanner.diary.add_meal')}</h3>
            
            {/* 🔥 PRETRAGA RECEPATA - SAMO LUPA 🔍 */}
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="🔍"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchTerm.trim()) {
                    setShowRecipeDropdown(true);
                  }
                }}
                className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              
              {/* 🔥 INDIKATOR PRETRAGE */}
              {searchingRecipes && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}
              
              {/* 🔥 DROPDOWN REZULTATI */}
              {showRecipeDropdown && (
                <>
                  {searchResults.length > 0 ? (
                    <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map(recipe => (
                        <button
                          key={recipe.id}
                          type="button"
                          onClick={() => handleSelectRecipe(recipe)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex justify-between items-center border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          <div className="flex flex-col items-start">
                            <span className="dark:text-white font-medium">{recipe.naziv}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {recipe.vrsta || 'Općenito'} • {recipe.vrijeme || '30 min'}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-blue-500">{recipe.kalorije} kcal</span>
                        </button>
                      ))}
                    </div>
                  ) : searchTerm && !searchingRecipes && recipesLoaded ? (
                    <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
                      ❌ Nema recepata za "{searchTerm}" (provjeri restrikcije)
                    </div>
                  ) : searchTerm && searchingRecipes ? (
                    <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
                      ⏳ Pretražujem recepte...
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                placeholder={t('foodplanner.diary.meal_name')}
                value={noviObrok.naziv}
                onChange={(e) => setNoviObrok({...noviObrok, naziv: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                required
              />
              <select
                value={noviObrok.tip}
                onChange={(e) => setNoviObrok({...noviObrok, tip: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option value="Doručak">🌅 {t('foodplanner.diary.breakfast')}</option>
                <option value="Ručak">☀️ {t('foodplanner.diary.lunch')}</option>
                <option value="Večera">🌙 {t('foodplanner.diary.dinner')}</option>
                <option value="Užina">🍿 {t('foodplanner.diary.snack')}</option>
              </select>
            </div>

            {/* EMOJI UNOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('foodplanner.diary.mood_before')}</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {moodOptions.map(m => (
                    <button
                      key={m.emoji}
                      type="button"
                      onClick={() => setMoodBefore(m.emoji)}
                      className={`p-1.5 rounded-lg text-lg transition ${
                        moodBefore === m.emoji ? 'bg-blue-500 text-white scale-110' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('foodplanner.diary.mood_after')}</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {moodOptions.map(m => (
                    <button
                      key={m.emoji}
                      type="button"
                      onClick={() => setMoodAfter(m.emoji)}
                      className={`p-1.5 rounded-lg text-lg transition ${
                        moodAfter === m.emoji ? 'bg-green-500 text-white scale-110' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <input
              type="text"
              placeholder={t('foodplanner.diary.note_placeholder')}
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 mb-2"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input
                type="number"
                placeholder={t('foodplanner.diary.calories')}
                value={noviObrok.kalorije}
                onChange={(e) => setNoviObrok({...noviObrok, kalorije: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                required
              />
              <input
                type="number"
                placeholder={t('foodplanner.diary.protein')}
                value={noviObrok.proteini}
                onChange={(e) => setNoviObrok({...noviObrok, proteini: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <input
                type="number"
                placeholder={t('foodplanner.diary.carbs')}
                value={noviObrok.ugljikohidrati}
                onChange={(e) => setNoviObrok({...noviObrok, ugljikohidrati: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <input
                type="number"
                placeholder={t('foodplanner.diary.fat')}
                value={noviObrok.masti}
                onChange={(e) => setNoviObrok({...noviObrok, masti: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>
            
            <button type="submit" disabled={loading} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50">
              {loading ? t('foodplanner.diary.sending') : t('foodplanner.diary.add_button')}
            </button>
          </form>

          {/* LISTA OBROKA */}
          {loadingObroci ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">{t('foodplanner.diary.loading')}</p>
            </div>
          ) : obroci.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-4xl mb-2">🍽️</p>
              <p>{t('foodplanner.diary.no_meals')}</p>
              <p className="text-sm">{t('foodplanner.diary.add_first')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {obroci.map(obrok => (
                <div key={obrok.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold dark:text-white">{obrok.naziv}</h4>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                          {obrok.tip}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{obrok.vrijeme}</span>
                        <span className="text-lg">{obrok.mood_before || '😐'} → {obrok.mood_after || '😐'}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        🥩 {obrok.proteini || 0}g · 🍞 {obrok.ugljikohidrati || 0}g · 🧈 {obrok.masti || 0}g
                        {obrok.mood_note && <span className="ml-2 text-xs text-gray-400">📝 {obrok.mood_note}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-700 dark:text-white">{obrok.kalorije} kcal</span>
                      <button
                        onClick={() => handleDeleteObrok(obrok.id)}
                        className="text-red-400 hover:text-red-600 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ANALITIKA */}
      {/* ============================================================ */}
      {activeTab === 1 && (
        <div>
          <h2 className="text-xl font-bold mb-4 dark:text-white">{t('foodplanner.analytics.title')}</h2>
          
          {obroci.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-4xl mb-2">📊</p>
              <p>{t('foodplanner.analytics.no_data')}</p>
              <p className="text-sm">{t('foodplanner.analytics.add_meals')}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h3 className="font-semibold text-center dark:text-white mb-2">{t('foodplanner.analytics.weekly_chart')}</h3>
                <Line 
                  data={lineData} 
                  options={{ 
                    responsive: true, 
                    plugins: { 
                      legend: { 
                        labels: { color: document.documentElement.classList.contains('dark') ? '#fff' : '#000' } 
                      } 
                    } 
                  }} 
                />
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h3 className="font-semibold text-center dark:text-white mb-2">{t('foodplanner.analytics.macro_chart')}</h3>
                <Doughnut 
                  data={doughnutData} 
                  options={{ 
                    responsive: true, 
                    plugins: { 
                      legend: { 
                        labels: { color: document.documentElement.classList.contains('dark') ? '#fff' : '#000' } 
                      } 
                    } 
                  }} 
                />
                <div className="flex justify-center gap-4 mt-2 text-sm">
                  <span className="text-blue-500">🥩 {t('foodplanner.chart.protein')}</span>
                  <span className="text-green-500">🍞 {t('foodplanner.chart.carbs')}</span>
                  <span className="text-yellow-500">🧈 {t('foodplanner.chart.fat')}</span>
                </div>
              </div>
            </div>
          )}
          
          <button 
            onClick={generatePDF}
            disabled={loading}
            className="mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
          >
            {loading ? '⏳ ' + t('foodplanner.analytics.generating') : '📄 ' + t('foodplanner.analytics.generate_pdf')}
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: PLAN OBROKA - SA PREVODOM DANA */}
      {/* ============================================================ */}
      {activeTab === 2 && (
        <div>
          <h2 className="text-xl font-bold mb-4 dark:text-white">{t('foodplanner.plan.title')}</h2>
          
          <button
            onClick={generateWeeklyPlan}
            disabled={loadingPlan}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition mb-4 flex items-center gap-2 disabled:opacity-50"
          >
            {loadingPlan ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('foodplanner.plan.generating')}
              </>
            ) : (
              '🤖 ' + t('foodplanner.plan.generate') + ` (${dailyGoal.kalorije} kcal)`
            )}
          </button>

          {weeklyPlan ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
              {weeklyPlan.dani?.map((dan, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-sm dark:text-white">{getTranslatedDay(dan.naziv)}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">🌅 {dan.dorucak}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">☀️ {dan.rucak}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">🌙 {dan.vecera}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((dayKey) => (
                <div key={dayKey} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-sm dark:text-white">{t(`foodplanner.plan.days.${dayKey}`)}</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">🌅 ---</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">☀️ ---</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">🌙 ---</p>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
            🤖 Plan bira recepte iz baze (Cilj: {dailyGoal.kalorije} kcal, {dailyGoal.proteini}g proteina)
            {restrictions.length > 0 && ` 🔒 Restrikcije: ${restrictions.join(', ')}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default FoodPlanner;