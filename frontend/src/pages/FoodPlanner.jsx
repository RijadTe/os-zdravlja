// frontend/src/pages/FoodPlanner.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import SEO from '../components/SEO';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================
// MAPPING ZA DANE U SEDMICI
// ============================================================
const dayMapping = {
  'Pon': 'mon', 'Uto': 'tue', 'Sri': 'wed', 'Čet': 'thu',
  'Pet': 'fri', 'Sub': 'sat', 'Ned': 'sun',
  'Mon': 'mon', 'Tue': 'tue', 'Wed': 'wed', 'Thu': 'thu',
  'Fri': 'fri', 'Sat': 'sat', 'Sun': 'sun',
  'Mo': 'mon', 'Di': 'tue', 'Mi': 'wed', 'Do': 'thu',
  'Fr': 'fri', 'Sa': 'sat', 'So': 'sun'
};

// ============================================================
// MAPPING ZA TIP OBROKA → i18n KEY
// ============================================================
const tipToKey = {
  'Doručak': 'foodplanner.diary.breakfast',
  'Ručak': 'foodplanner.diary.lunch',
  'Večera': 'foodplanner.diary.dinner',
  'Užina': 'foodplanner.diary.snack'
};

// ============================================================
// PLACEHOLDER SLIKE PO TIPU OBROKA
// ============================================================
const PLACEHOLDER_IMAGES = {
  dorucak: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
  rucak:   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  vecera:  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop'
};

// ============================================================
// MEAL CARD KOMPONENTA
// ============================================================
const MealCard = ({ meal, type, icon, label, onClick, t }) => {
  const isEmpty = !meal || meal === '---';
  const isObject = meal && typeof meal === 'object';
  const naziv = isObject ? meal.naziv : (meal?.replace('✨', '').replace('🤖', '').trim() || '');
  const isAI = isObject ? meal._ai === true : (typeof meal === 'string' && meal.includes('✨'));
  const kalorije = isObject ? (meal.kalorije || 0) : 0;
  const slika = isObject && meal.slika ? meal.slika : PLACEHOLDER_IMAGES[type];

  if (isEmpty) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 flex flex-col items-center justify-center min-h-[200px]">
        <span className="text-4xl mb-2 opacity-30">{icon}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">{label}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">— {t('foodplanner.plan.not_filled')}</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onClick(meal, type)}
      className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all text-left hover:-translate-y-1 flex flex-col"
    >
      <div className="relative h-32 overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img
          src={slika}
          alt={naziv}
          onError={(e) => { e.target.src = PLACEHOLDER_IMAGES[type]; }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-2 py-1">
          <span className="text-sm">{icon}</span>
          <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 uppercase">
            {label}
          </span>
        </div>

        {isAI && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
            <span>✨</span> AI
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-2 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition flex-1">
          {naziv}
        </p>

        <div className="flex items-center justify-between mt-auto">
          {isObject && kalorije > 0 ? (
            <span className="text-xs text-orange-500 dark:text-orange-400 font-semibold">
              🔥 {kalorije} kcal
            </span>
          ) : (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
          )}
          <span className="text-xs text-emerald-500 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition">
            {t('foodplanner.plan.view') || 'Vidi'} →
          </span>
        </div>
      </div>
    </button>
  );
};

// ============================================================
// GLAVNA KOMPONENTA
// ============================================================
const FoodPlanner = () => {
  const { t, i18n } = useTranslation();
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

  // 🔥 RECEPTI - LAZY LOAD
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

  // 🔥 6 EMOJIJA - MANJE ZA MOBITEL
  const moodOptions = [
    { emoji: '😊', label: t('foodplanner.moods.happy') },
    { emoji: '😐', label: t('foodplanner.moods.neutral') },
    { emoji: '😞', label: t('foodplanner.moods.sad') },
    { emoji: '😡', label: t('foodplanner.moods.angry') },
    { emoji: '😴', label: t('foodplanner.moods.tired') },
    { emoji: '🤩', label: t('foodplanner.moods.excited') },
  ];

  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [fridgeItems, setFridgeItems] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);

  // 🔥 State za spremanje u dnevnik
  const [savingToDiary, setSavingToDiary] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ============================================================
  // HELPER FUNKCIJE ZA DATUM
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

  const getTranslatedDay = (dayName) => {
    const key = dayMapping[dayName];
    return key ? t(`foodplanner.plan.days.${key}`) : dayName;
  };

  // ============================================================
  // UKUPNO PO TIPU OBROKA
  // ============================================================
  const ukupnoPoTipu = useMemo(() => {
    const rezultat = {
      'Doručak': { kalorije: 0, proteini: 0, ugljikohidrati: 0, masti: 0, broj: 0 },
      'Ručak': { kalorije: 0, proteini: 0, ugljikohidrati: 0, masti: 0, broj: 0 },
      'Večera': { kalorije: 0, proteini: 0, ugljikohidrati: 0, masti: 0, broj: 0 },
      'Užina': { kalorije: 0, proteini: 0, ugljikohidrati: 0, masti: 0, broj: 0 }
    };

    obroci.forEach(obrok => {
      const tip = obrok.tip || 'Ručak';
      if (rezultat[tip]) {
        rezultat[tip].kalorije += obrok.kalorije || 0;
        rezultat[tip].proteini += obrok.proteini || 0;
        rezultat[tip].ugljikohidrati += obrok.ugljikohidrati || 0;
        rezultat[tip].masti += obrok.masti || 0;
        rezultat[tip].broj += 1;
      }
    });

    return rezultat;
  }, [obroci]);

  // ============================================================
  // FILTRIRAJ RECEPTE NA OSNOVU RESTRIKCIJA
  // ============================================================
  const filterRecipesByRestrictions = useCallback((recipes) => {
    if (!recipes || recipes.length === 0) return [];
    if (!restrictions || restrictions.length === 0) return recipes;

    const hasNoRestrictions = restrictions.some(r =>
      r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen' ||
      r === 'Aucune restriction' || r === 'Sin restricciones' || r === 'Nessuna restrizione' || r === 'Brez omejitev'
    );

    if (hasNoRestrictions) return recipes;

    return recipes.filter(recipe => {
      const izbjegava = recipe.izbjegava || [];
      return restrictions.every(r => izbjegava.includes(r));
    });
  }, [restrictions]);

  // ============================================================
  // DOHVATI RECEPTE - LAZY LOAD
  // ============================================================
  const fetchRecipes = useCallback(async () => {
    if (recipesLoaded) return;

    try {
      setSearchingRecipes(true);
      const res = await fetch(`${API_URL}/api/recepti`);
      const data = await res.json();
      const recipesArray = Array.isArray(data) ? data : (data.data || []);

      if (recipesArray.length > 0) {
        setAllRecipes(recipesArray);
        const filtered = filterRecipesByRestrictions(recipesArray);
        setFilteredRecipes(filtered);
        setRecipesLoaded(true);
        console.log('✅ Dohvaćeno recepata:', recipesArray.length);
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu recepata:', error);
    } finally {
      setSearchingRecipes(false);
    }
  }, [filterRecipesByRestrictions, recipesLoaded]);

  // ============================================================
  // SEARCH - SA DEBOUNCE
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

  const searchResults = useMemo(() => {
    if (!searchTerm.trim() || !recipesLoaded) return [];
    const term = searchTerm.toLowerCase();
    return filteredRecipes.filter(r =>
      r.naziv?.toLowerCase().includes(term)
    ).slice(0, 15);
  }, [filteredRecipes, searchTerm, recipesLoaded]);

  // ============================================================
  // DOHVATI PROFIL - UVIJEK SVIEŽI S BACKENDA
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
            setProfil(data.data);
            setUser(data.data);
            
            localStorage.setItem('user', JSON.stringify(data.data));
            
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
  // DOHVATI SPREMLJENI PLAN
  // ============================================================
  useEffect(() => {
    const fetchSavedPlan = async () => {
      const email = user?.email || localStorage.getItem('userEmail');
      if (!email) return;

      try {
        const res = await fetch(`${API_URL}/api/weekly-plan/${encodeURIComponent(email)}`);
        const data = await res.json();

        if (data.success && data.dani) {
          console.log(`✅ Spremljeni plan pronađen (star ${data._starost_dana} dana)`);
          setWeeklyPlan(data);
        }
      } catch (error) {
        console.error('❌ Greška pri dohvatu spremljenog plana:', error);
      }
    };

    fetchSavedPlan();
  }, [user]);

  // ============================================================
  // ODABERI RECEPT IZ DROPDOWNA
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
  // DODAJ OBROK (ručno preko forme)
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

  const progress = {
    kalorije: Math.min((ukupno.kalorije / dailyGoal.kalorije) * 100, 100),
    proteini: Math.min((ukupno.proteini / dailyGoal.proteini) * 100, 100),
    ugljikohidrati: Math.min((ukupno.ugljikohidrati / dailyGoal.ugljikohidrati) * 100, 100),
    masti: Math.min((ukupno.masti / dailyGoal.masti) * 100, 100)
  };

  // ============================================================
  // OTVORI MODAL ZA JELO
  // ============================================================
  const openMealModal = (meal, type) => {
    if (!meal || meal === '---') return;

    const labels = {
      dorucak: t('foodplanner.diary.breakfast'),
      rucak: t('foodplanner.diary.lunch'),
      vecera: t('foodplanner.diary.dinner')
    };
    const icons = {
      dorucak: '🌅',
      rucak: '☀️',
      vecera: '🌙'
    };

    if (typeof meal === 'object') {
      setSelectedMeal({
        ...meal,
        type,
        label: labels[type],
        icon: icons[type]
      });
      return;
    }

    setSelectedMeal({
      naziv: meal.replace('✨', '').replace('🤖', '').trim(),
      type,
      label: labels[type],
      icon: icons[type],
      kalorije: 0,
      proteini: 0,
      ugljikohidrati: 0,
      masti: 0,
      sastojci: [],
      upute: [],
      opis: '',
      _ai: meal.includes('✨')
    });
  };

  // ============================================================
  // DODAJ JELO IZ PLANA U DNEVNIK
  // ============================================================
  const addMealToDiary = async () => {
    if (!selectedMeal) return;

    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) {
      alert(t('foodplanner.alerts.login_required'));
      return;
    }

    const tipMap = {
      dorucak: 'Doručak',
      rucak: 'Ručak',
      vecera: 'Večera'
    };

    setSavingToDiary(true);
    try {
      const res = await fetch(`${API_URL}/api/obroci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          naziv: selectedMeal.naziv,
          kalorije: parseFloat(selectedMeal.kalorije) || 0,
          proteini: parseFloat(selectedMeal.proteini) || 0,
          ugljikohidrati: parseFloat(selectedMeal.ugljikohidrati) || 0,
          masti: parseFloat(selectedMeal.masti) || 0,
          tip: tipMap[selectedMeal.type] || 'Ručak',
          mood_before: '😐',
          mood_after: '😐',
          mood_note: selectedMeal._ai ? '🤖 AI preporuka' : '📅 Iz plana obroka',
          datum: formatDateForAPI(selectedDate)
        })
      });

      const data = await res.json();
      setObroci(prev => [data, ...prev]);

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setSelectedMeal(null);
        setActiveTab(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1000);

    } catch (error) {
      console.error('❌ Greška pri spremanju:', error);
      alert(t('foodplanner.alerts.add_error'));
    } finally {
      setSavingToDiary(false);
    }
  };

  // ============================================================
  // WEEKLY PLAN
  // ============================================================
  const generateWeeklyPlan = async () => {
    setLoadingPlan(true);
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      const jezik = i18n.language || 'hr';

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
          datum: formatDateForAPI(selectedDate),
          jezik: jezik
        })
      });

      const data = await res.json();
      console.log('📡 Weekly Plan:', data);
      setWeeklyPlan(data);
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(t('foodplanner.alerts.plan_error'));
      setWeeklyPlan({
        dani: [
          { naziv: 'Pon', dorucak: '---', rucak: '---', vecera: '---' },
          { naziv: 'Uto', dorucak: '---', rucak: '---', vecera: '---' },
          { naziv: 'Sri', dorucak: '---', rucak: '---', vecera: '---' },
          { naziv: 'Čet', dorucak: '---', rucak: '---', vecera: '---' },
          { naziv: 'Pet', dorucak: '---', rucak: '---', vecera: '---' },
          { naziv: 'Sub', dorucak: '---', rucak: '---', vecera: '---' },
          { naziv: 'Ned', dorucak: '---', rucak: '---', vecera: '---' }
        ],
        _izvor: 'error'
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
      labels.push(date.toLocaleDateString(i18n.language || 'hr', { weekday: 'short' }));

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
  }, [obroci, selectedDate, dailyGoal.kalorije, i18n.language, t]);

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
    const pdfUrl = `${API_URL}/api/pdf/izvjestaj/${encodeURIComponent(email)}?datum=${datum}`;

    // 🔥 DETEKTUJ PLATFORMU
    const isNative = typeof window !== 'undefined' && 
                     window.Capacitor?.isNativePlatform?.() === true;

    if (isNative) {
      // 🔥 NATIVE: otvori u sistemskom browseru
      try {
        const { Browser } = await import(/* @vite-ignore */ '@capacitor/browser');
        await Browser.open({ url: pdfUrl });
        console.log('✅ PDF otvoren u sistemskom browseru');
      } catch (err) {
        console.error('❌ Greška pri otvaranju PDF-a:', err);
        alert(t('foodplanner.alerts.pdf_error'));
      }
    } else {
      // 🔥 WEB: otvori u novom tabu
      window.open(pdfUrl, '_blank');
    }
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
    <div className="max-w-4xl mx-auto py-8 px-4 pb-32 dark:bg-gray-900 dark:text-white">
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

            {/* 🔥 PROGRESS BAR */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 sm:p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-sm sm:text-base dark:text-white">
                  {t('foodplanner.diary.consumed')}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
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
              
              {/* 🔥 MAKRONUTRIJENTI */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="flex flex-col items-center bg-white dark:bg-gray-700/50 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-sm">🥩</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                      {Math.round(progress.proteini)}%
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200">
                    {Math.round(ukupno.proteini)}
                    <span className="text-gray-400 dark:text-gray-500 font-normal">/{dailyGoal.proteini}g</span>
                  </span>
                </div>
                
                <div className="flex flex-col items-center bg-white dark:bg-gray-700/50 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-sm">🍞</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                      {Math.round(progress.ugljikohidrati)}%
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200">
                    {Math.round(ukupno.ugljikohidrati)}
                    <span className="text-gray-400 dark:text-gray-500 font-normal">/{dailyGoal.ugljikohidrati}g</span>
                  </span>
                </div>
                
                <div className="flex flex-col items-center bg-white dark:bg-gray-700/50 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-sm">🧈</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                      {Math.round(progress.masti)}%
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200">
                    {Math.round(ukupno.masti)}
                    <span className="text-gray-400 dark:text-gray-500 font-normal">/{dailyGoal.masti}g</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 🔥 UKUPNO PO TIPU OBROKA - SA PREVODIMA */}
            {obroci.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 mb-4 border border-emerald-200 dark:border-emerald-700">
                <h3 className="font-semibold dark:text-white mb-3 flex items-center gap-2">
                  📊 {t('foodplanner.diary.totals_by_meal')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(ukupnoPoTipu).map(([tip, data]) => {
                    const icons = {
                      'Doručak': '🌅',
                      'Ručak': '☀️',
                      'Večera': '🌙',
                      'Užina': '🍿'
                    };
                    
                    // 🔥 PREVOD TIPA OBROKA
                    const translatedTip = t(tipToKey[tip] || tip);
                    
                    return (
                      <div
                        key={tip}
                        className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center"
                      >
                        <div className="text-2xl mb-1">{icons[tip]}</div>
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                          {translatedTip}
                        </div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.round(data.kalorije)}
                        </div>
                        <div className="text-[10px] text-gray-400">kcal</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          {data.broj} {data.broj === 1 
                            ? t('foodplanner.diary.meal_singular') 
                            : t('foodplanner.diary.meal_plural')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* FORMA ZA UNOS */}
          <form onSubmit={handleDodajObrok} className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
            <h3 className="font-bold dark:text-white mb-2">{t('foodplanner.diary.add_meal')}</h3>

            <div className="relative mb-2">
              <input
                type="text"
                placeholder="🔍"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchTerm.trim()) setShowRecipeDropdown(true);
                }}
                className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />

              {searchingRecipes && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}

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
                      ❌ {t('foodplanner.diary.no_recipes_for')} "{searchTerm}"
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
                          {t(tipToKey[obrok.tip] || obrok.tip)}
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
      {/* TAB 3: PLAN OBROKA */}
      {/* ============================================================ */}
      {activeTab === 2 && (
        <div>
          <h2 className="text-xl font-bold mb-4 dark:text-white">{t('foodplanner.plan.title')}</h2>

          <button
            onClick={generateWeeklyPlan}
            disabled={loadingPlan}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-3 rounded-xl font-semibold transition mb-6 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/25"
          >
            {loadingPlan ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('foodplanner.plan.generating')}
              </>
            ) : (
              <>
                <span>🤖</span>
                {t('foodplanner.plan.generate')} ({dailyGoal.kalorije} kcal)
              </>
            )}
          </button>

          {/* INDIKATOR IZVORA */}
          {weeklyPlan && (
            <>
              {weeklyPlan._izvor === 'baza' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl p-3 mb-4">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    <span>✅</span>
                    {t('foodplanner.plan.from_db', { count: weeklyPlan._broj_iz_baze || 21 })}
                  </p>
                </div>
              )}

              {weeklyPlan._izvor === 'kombinovan' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-xl p-3 mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2 flex-wrap">
                    <span>🔄</span>
                    {t('foodplanner.plan.combined', { 
                      db: weeklyPlan._broj_iz_baze || 0, 
                      ai: weeklyPlan._broj_iz_ai || 0 
                    })}
                  </p>
                </div>
              )}

              {weeklyPlan._izvor === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-3 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                    <span>⚠️</span>
                    {t('foodplanner.plan.error')}
                  </p>
                </div>
              )}
            </>
          )}

          {/* PRIKAZ PLANA */}
          {weeklyPlan && weeklyPlan.dani && (
            <div className="space-y-6">
              {weeklyPlan.dani.map((dan, dayIndex) => (
                <div key={dayIndex}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wide">
                      📅 {getTranslatedDay(dan.naziv)}
                    </h3>
                    <div className="flex-1 h-px bg-gradient-to-l from-emerald-500/50 to-transparent"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <MealCard
                      meal={dan.dorucak}
                      type="dorucak"
                      icon="🌅"
                      label={t('foodplanner.diary.breakfast')}
                      onClick={openMealModal}
                      t={t}
                    />
                    <MealCard
                      meal={dan.rucak}
                      type="rucak"
                      icon="☀️"
                      label={t('foodplanner.diary.lunch')}
                      onClick={openMealModal}
                      t={t}
                    />
                    <MealCard
                      meal={dan.vecera}
                      type="vecera"
                      icon="🌙"
                      label={t('foodplanner.diary.dinner')}
                      onClick={openMealModal}
                      t={t}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STATISTIKA */}
          {weeklyPlan && weeklyPlan._broj_iz_baze !== undefined && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('foodplanner.plan.stats', {
                  total: weeklyPlan._ukupno || 0,
                  db: weeklyPlan._broj_iz_baze > 0 ? ` • ${weeklyPlan._broj_iz_baze} ${t('foodplanner.plan.from_db_short')}` : '',
                  ai: weeklyPlan._broj_iz_ai > 0 ? ` • ${weeklyPlan._broj_iz_ai} ${t('foodplanner.plan.from_ai_short')}` : ''
                })}
              </p>
            </div>
          )}

          {/* KADA NEMA PLANA */}
          {!weeklyPlan && (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
              <p className="text-5xl mb-4">🍽️</p>
              <p className="text-gray-500 dark:text-gray-400">
                {t('foodplanner.plan.no_plan')}
              </p>
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
            {restrictions.length > 0 && ` 🔒 ${t('foodplanner.plan.restrictions')}: ${restrictions.join(', ')}`}
          </p>
        </div>
      )}

      {/* ============================================================
          MODAL ZA DETALJE JELA
          ============================================================ */}
      {selectedMeal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
          onClick={() => setSelectedMeal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* SLIKA */}
            {selectedMeal.slika ? (
              <img
                src={selectedMeal.slika}
                alt={selectedMeal.naziv}
                className="w-full h-56 object-cover rounded-t-2xl"
              />
            ) : (
              <div className={`w-full h-44 rounded-t-2xl flex items-center justify-center ${
                selectedMeal.type === 'dorucak' ? 'bg-gradient-to-br from-orange-200 to-amber-300 dark:from-orange-900/50 dark:to-amber-900/50' :
                selectedMeal.type === 'rucak' ? 'bg-gradient-to-br from-emerald-200 to-teal-300 dark:from-emerald-900/50 dark:to-teal-900/50' :
                'bg-gradient-to-br from-indigo-200 to-purple-300 dark:from-indigo-900/50 dark:to-purple-900/50'
              }`}>
                <span className="text-7xl">{selectedMeal.icon}</span>
              </div>
            )}

            {/* SADRŽAJ */}
            <div className="p-6">
              {saveSuccess && (
                <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl text-center">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    ✅ {t('foodplanner.plan.saved_success')}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-2xl font-bold dark:text-white">{selectedMeal.naziv}</h2>
                    {selectedMeal._ai && (
                      <span className="text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-0.5 rounded-full">
                        ✨ AI
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                    <span>{selectedMeal.icon} {selectedMeal.label}</span>
                    {selectedMeal.vrijeme && <span>· ⏱️ {selectedMeal.vrijeme}</span>}
                    {selectedMeal.tezina && <span>· 👨‍🍳 {selectedMeal.tezina}</span>}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMeal(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl ml-2 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  ✕
                </button>
              </div>

              {selectedMeal.opis && (
                <p className="text-gray-600 dark:text-gray-300 mb-4 italic">
                  {selectedMeal.opis}
                </p>
              )}

              {(selectedMeal.kalorije > 0 || selectedMeal.proteini > 0) && (
                <div className="grid grid-cols-4 gap-2 mb-6">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">🔥</div>
                    <div className="font-bold dark:text-white text-lg">{selectedMeal.kalorije || 0}</div>
                    <div className="text-[10px] text-gray-400">kcal</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">🥩</div>
                    <div className="font-bold dark:text-white text-lg">{selectedMeal.proteini || 0}g</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">🍞</div>
                    <div className="font-bold dark:text-white text-lg">{selectedMeal.ugljikohidrati || 0}g</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">🧈</div>
                    <div className="font-bold dark:text-white text-lg">{selectedMeal.masti || 0}g</div>
                  </div>
                </div>
              )}

              {selectedMeal.sastojci && selectedMeal.sastojci.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                    📦 {t('foodplanner.plan.ingredients')}
                  </h3>
                  <ul className="space-y-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                    {selectedMeal.sastojci.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedMeal.upute && selectedMeal.upute.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                    👨‍🍳 {t('foodplanner.plan.preparation')}
                  </h3>
                  <ol className="space-y-2.5">
                    {selectedMeal.upute.map((u, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="pt-0.5 leading-relaxed">{u}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {(!selectedMeal.sastojci || selectedMeal.sastojci.length === 0) &&
               (!selectedMeal.upute || selectedMeal.upute.length === 0) && (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-6">
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    ℹ️ {t('foodplanner.plan.no_details')}
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={addMealToDiary}
                  disabled={savingToDiary || saveSuccess}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-70 text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                >
                  {savingToDiary ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('foodplanner.plan.saving')}
                    </>
                  ) : saveSuccess ? (
                    <>✅ {t('foodplanner.plan.saved')}</>
                  ) : (
                    <>
                      <span>➕</span>
                      {t('foodplanner.plan.add_to_diary')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedMeal(null)}
                  className="px-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition text-gray-700 dark:text-gray-200 font-medium"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodPlanner;