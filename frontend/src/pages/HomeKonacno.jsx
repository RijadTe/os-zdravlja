// frontend/src/pages/HomeKonacno.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RecipeCard from '../components/RecipeCard';
import ScanReceipt from '../components/ScanReceipt';
import AdBanner from '../components/AdBanner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const HomeKonacno = () => {
  const { t } = useTranslation();
  
  const [recepti, setRecepti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [profilLoading, setProfilLoading] = useState(true);
  const [sleep, setSleep] = useState('');
  const [energy, setEnergy] = useState('');
  const [stress, setStress] = useState('');
  const [coachAdvice, setCoachAdvice] = useState('');
  const [coachRecipes, setCoachRecipes] = useState([]);
  const [fridgeItems, setFridgeItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [scanPoruka, setScanPoruka] = useState('');

  const [filters, setFilters] = useState({
    vrsta: '',
    vrijeme: '',
    tezina: '',
    preferencije: '',
    restrikcije: [],
    kalorije: ''
  });

  // ============================================================
  // 1. DOHVATI KORISNIKA IZ LOCALSTORAGE
  // ============================================================
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
  }, []);

  // ============================================================
  // 2. DOHVATI PROFIL IZ BAZE I AUTOMATSKI POSTAVI FILTERE
  // ============================================================
  useEffect(() => {
    const dohvatiProfil = async () => {
      const email = user?.email || localStorage.getItem('userEmail');
      
      if (!email) {
        console.log('⚠️ Nema emaila za dohvat profila');
        setProfilLoading(false);
        return;
      }

      try {
        setProfilLoading(true);
        console.log('📧 Dohvatam profil za email:', email);
        
        const response = await fetch(`${API_URL}/profil/${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          console.log('✅ Profil dohvaćen:', data.data);
          setProfil(data.data);
          
          const noviFilteri = {};
          
          // 🔥 VRSTA
          if (data.data.vrsta && data.data.vrsta.length > 0) {
            const odabraneVrste = data.data.vrsta.filter(v => v !== 'Svejedno');
            if (odabraneVrste.length > 0) {
              noviFilteri.vrsta = odabraneVrste[0];
            }
          }
          
          // 🔥 PREFERENCIJE
          if (data.data.preferencije && data.data.preferencije.length > 0) {
            const odabranePref = data.data.preferencije.filter(p => p !== 'Svejedno');
            if (odabranePref.length > 0) {
              noviFilteri.preferencije = odabranePref[0];
            }
          }
          
          // 🔥 RESTRIKCIJE (SVE, ne samo prva!)
          if (data.data.izbjegava && data.data.izbjegava.length > 0) {
            // Izbaci "Bez restrikcija" ako postoji
            const restrikcije = data.data.izbjegava.filter(r => r !== 'Bez restrikcija');
            if (restrikcije.length > 0) {
              noviFilteri.restrikcije = restrikcije;
            }
          }
          
          // 🔥 VRIJEME
          if (data.data.vrijeme) {
            noviFilteri.vrijeme = data.data.vrijeme;
          }
          
          // 🔥 TEŽINA
          if (data.data.tezina) {
            noviFilteri.tezina = data.data.tezina;
          }
          
          // 🔥 KALORIJE
          if (data.data.kalorije) {
            noviFilteri.kalorije = data.data.kalorije;
          }
          
          console.log('🔍 Automatski postavljeni filteri:', noviFilteri);
          setFilters(prev => ({ ...prev, ...noviFilteri }));
          
        } else {
          console.log('⚠️ Profil nije pronađen - prikazujem sve recepte');
          setFilters({
            vrsta: '',
            vrijeme: '',
            tezina: '',
            preferencije: '',
            restrikcije: [],
            kalorije: ''
          });
        }
      } catch (error) {
        console.error('❌ Greška pri dohvatu profila:', error);
      } finally {
        setProfilLoading(false);
      }
    };

    dohvatiProfil();
  }, [user]);

  // ============================================================
  // 3. DOHVATI RECEPTE
  // ============================================================
  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/recepti`);
      const data = await res.json();
      setRecepti(data);
      setLoading(false);
    } catch (err) {
      console.error('Greška:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // ============================================================
  // 4. FILTERIRANJE RECEPATA
  // ============================================================
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    if (profil) {
      const resetFilteri = {};
      
      if (profil.vrsta && profil.vrsta.length > 0) {
        const odabraneVrste = profil.vrsta.filter(v => v !== 'Svejedno');
        if (odabraneVrste.length > 0) {
          resetFilteri.vrsta = odabraneVrste[0];
        }
      }
      
      if (profil.preferencije && profil.preferencije.length > 0) {
        const odabranePref = profil.preferencije.filter(p => p !== 'Svejedno');
        if (odabranePref.length > 0) {
          resetFilteri.preferencije = odabranePref[0];
        }
      }
      
      if (profil.izbjegava && profil.izbjegava.length > 0) {
        const restrikcije = profil.izbjegava.filter(r => r !== 'Bez restrikcija');
        if (restrikcije.length > 0) {
          resetFilteri.restrikcije = restrikcije;
        }
      }
      
      if (profil.vrijeme) resetFilteri.vrijeme = profil.vrijeme;
      if (profil.tezina) resetFilteri.tezina = profil.tezina;
      if (profil.kalorije) resetFilteri.kalorije = profil.kalorije;
      
      setFilters(prev => ({ ...prev, ...resetFilteri }));
    } else {
      setFilters({ 
        vrsta: '', 
        vrijeme: '', 
        tezina: '',
        preferencije: '',
        restrikcije: [],
        kalorije: ''
      });
    }
  }, [profil]);

  // ============================================================
  // 5. FILTRIRANI RECEPTI - SA RESTRIKCIJAMA!
  // ============================================================
  const filteredReceptiMemo = useMemo(() => {
    let filtered = recepti;
    
    // 🔥 FILTER PO VRSTI
    if (filters.vrsta) {
      filtered = filtered.filter(r => r.vrsta === filters.vrsta);
    }
    
    // 🔥 FILTER PO VREMENU
    if (filters.vrijeme) {
      filtered = filtered.filter(r => r.vrijeme === filters.vrijeme);
    }
    
    // 🔥 FILTER PO TEŽINI
    if (filters.tezina) {
      filtered = filtered.filter(r => r.tezina === filters.tezina);
    }
    
    // 🔥 FILTER PO PREFERENCIJAMA
    if (filters.preferencije) {
      const pref = filters.preferencije;
      if (pref === 'Visokoproteinski') {
        filtered = filtered.filter(r => (r.proteini || 0) >= 25);
      } else if (pref === 'Bogat vlaknima') {
        filtered = filtered.filter(r => (r.vlakna || 0) >= 10);
      } else if (pref === 'Bogat ugljikohidratima') {
        filtered = filtered.filter(r => (r.ugljikohidrati || 0) >= 40);
      }
    }
    
    // 🔥 FILTER PO RESTRIKCIJAMA - SVE RESTRIKCIJE!
    if (filters.restrikcije && filters.restrikcije.length > 0) {
      const restrikcije = Array.isArray(filters.restrikcije) 
        ? filters.restrikcije 
        : [filters.restrikcije];
      
      filtered = filtered.filter(recipe => {
        const alergeni = recipe.alergeni || [];
        // Recept je dozvoljen ako NEMA nijednu od restrikcija
        return !restrikcije.some(r => alergeni.includes(r));
      });
    }
    
    // 🔥 FILTER PO KALORIJAMA
    if (filters.kalorije) {
      const kalorijeMap = {
        'Nisko (do 300 kcal)': { max: 300 },
        'Umjereno (300-500 kcal)': { min: 300, max: 500 },
        'Srednje (500-700 kcal)': { min: 500, max: 700 },
        'Visoko (900+ kcal)': { min: 900 }
      };
      
      const range = kalorijeMap[filters.kalorije];
      if (range) {
        filtered = filtered.filter(r => {
          const kal = r.kalorije || 0;
          if (range.min && range.max) return kal >= range.min && kal <= range.max;
          if (range.min) return kal >= range.min;
          if (range.max) return kal <= range.max;
          return true;
        });
      }
    }
    
    console.log(`📊 Od ${recepti.length} recepata, prikazano ${filtered.length} personalizovanih`);
    return filtered;
  }, [recepti, filters]);

  // ============================================================
  // 6. LIFESTYLE COACH - AI PREPORUKE NA OSNOVU RASPOLOŽENJA
  // ============================================================
  const getCoachAdvice = useCallback(async () => {
    if (!sleep || !energy || !stress) {
      alert(t('home.alert_required'));
      return;
    }

    try {
      const email = user?.email || localStorage.getItem('userEmail');
      
      // 🔥 SAČUVAJ ZDRAVSTVENE PODATKE
      if (email) {
        await fetch(`${API_URL}/zdravstveni-podaci`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            san_sati: sleep === 'Odlično' ? 8 : sleep === 'Dobro' ? 6 : 4,
            kvalitet_sna: sleep === 'Odlično' ? 9 : sleep === 'Dobro' ? 7 : 4,
            nivo_stresa: stress === 'Nizak' ? 2 : stress === 'Srednji' ? 5 : 8,
            energija: energy === 'Pun/a' ? 9 : energy === 'Osrednje' ? 5 : 3,
            raspolozenje: '😊'
          })
        });
        console.log('✅ Zdravstveni podaci sačuvani!');
      }

      // 🔥 GENERIŠI ADVICE NA OSNOVU RASPOLOŽENJA
      let advice = '';
      let filteredRecepti = [];

      // Analiziraj raspoloženje
      const isSleepGood = sleep === 'Odlično' || sleep === 'Dobro';
      const isEnergyGood = energy === 'Pun/a' || energy === 'Osrednje';
      const isStressLow = stress === 'Nizak' || stress === 'Srednji';

      // 🔥 FILTRIRAJ RECEPTE NA OSNOVU RASPOLOŽENJA + RESTRIKCIJA
      if (recepti.length > 0) {
        // Prvo primijeni restrikcije iz profila
        let baseRecipes = recepti;
        
        // 🔥 PRIMIJENI RESTRIKCIJE
        if (filters.restrikcije && filters.restrikcije.length > 0) {
          const restrikcije = Array.isArray(filters.restrikcije) 
            ? filters.restrikcije 
            : [filters.restrikcije];
          
          baseRecipes = baseRecipes.filter(recipe => {
            const alergeni = recipe.alergeni || [];
            return !restrikcije.some(r => alergeni.includes(r));
          });
        }

        // Onda primijeni filtere po raspoloženju
        if (!isSleepGood && !isEnergyGood && !isStressLow) {
          advice = t('home.advice_tired_stressed');
          filteredRecepti = baseRecipes.filter(r => 
            r.vrsta === 'Dijetalni recepti' || 
            (r.kalorije || 0) < 400 || 
            r.vrijeme?.includes('Kratko')
          );
        } else if (!isSleepGood && !isEnergyGood) {
          advice = t('home.advice_bad_sleep_low_energy');
          filteredRecepti = baseRecipes.filter(r => 
            (r.proteini || 0) > 20 || 
            r.vrsta === 'Dijetalni recepti'
          );
        } else if (!isSleepGood && isStressLow) {
          advice = t('home.advice_bad_sleep_good_stress');
          filteredRecepti = baseRecipes.filter(r => 
            (r.kalorije || 0) < 500 || 
            r.vrijeme?.includes('Srednje') ||
            r.vrsta === 'Dijetalni recepti'
          );
        } else if (isEnergyGood && isStressLow) {
          advice = t('home.advice_good_energy_low_stress');
          filteredRecepti = baseRecipes.filter(r => 
            r.vrsta !== 'Dijetalni recepti' || 
            r.vrijeme?.includes('Duže')
          );
        } else if (isEnergyGood && !isStressLow) {
          advice = t('home.advice_good_energy_high_stress');
          filteredRecepti = baseRecipes.filter(r => 
            r.vrsta === 'Deserti' || 
            r.vrsta === 'Napitki' ||
            (r.kalorije || 0) < 400
          );
        } else if (!isEnergyGood && isStressLow) {
          advice = t('home.advice_low_energy_low_stress');
          filteredRecepti = baseRecipes.filter(r => 
            (r.proteini || 0) > 20 || 
            (r.ugljikohidrati || 0) > 30 ||
            r.vrsta === 'Slano'
          );
        } else {
          advice = t('home.advice_all_good');
          filteredRecepti = baseRecipes.slice(0, 6);
        }

        // Ograniči na 6 recepata
        filteredRecepti = filteredRecepti.slice(0, 6);
        
        // 🔥 SAČUVAJ FILTRIRANE RECEPTE
        setCoachRecipes(filteredRecepti);
        setCoachAdvice(advice);
        
        if (filteredRecepti.length > 0) {
          console.log('🍽️ Preporučeni recepti:', filteredRecepti.map(r => r.naziv));
        } else {
          console.log('ℹ️ Nema recepata za ovo raspoloženje.');
        }
        
      } else {
        advice = t('home.advice_explore_recipes');
        setCoachAdvice(advice);
        setCoachRecipes([]);
      }

    } catch (error) {
      console.error('❌ Greška pri čuvanju podataka:', error);
      setCoachAdvice(t('home.advice_error'));
    }
  }, [sleep, energy, stress, user, recepti, filters.restrikcije, t]);

  const addFridgeItem = useCallback(() => {
    if (newItem.trim()) {
      setFridgeItems([...fridgeItems, newItem.trim()]);
      setNewItem('');
    }
  }, [newItem, fridgeItems]);

  const handleNamirniceDodane = useCallback((namirnice) => {
    setFridgeItems(prev => [...prev, ...namirnice]);
    setScanPoruka(`✅ Dodano ${namirnice.length} namirnica u frižider!`);
    setTimeout(() => setScanPoruka(''), 4000);
  }, []);

  const activeFiltersCount = Object.values(filters).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== '';
  }).length;

  // ============================================================
  // 7. KONFIGURACIJA
  // ============================================================
  const categories = [
    { id: 'dijetalni', icon: '🥗', label: t('home.categories.diet'), link: '/recipes?vrsta=Dijetalni%20recepti' },
    { id: 'deserti', icon: '🍰', label: t('home.categories.desserts'), link: '/recipes?vrsta=Deserti' },
    { id: 'slana', icon: '🍕', label: t('home.categories.savory'), link: '/recipes?vrsta=Slano' },
    { id: 'kviz', icon: '🧠', label: t('home.categories.quiz'), link: '/quiz' },
    { id: 'ai', icon: '🤖', label: t('home.categories.ai_chef'), link: '/ai-chef' },
    { id: 'napitki', icon: '🍹', label: t('home.categories.drinks'), link: '/recipes?vrsta=Napitki' },
  ];

  const healthyChefCategories = [
    { id: 'hormonski', icon: '🩸', label: t('home.healthychef.hormonal'), link: '/healthy-chef/hormonski' },
    { id: 'tiroida', icon: '🦋', label: t('home.healthychef.thyroid'), link: '/healthy-chef/tiroida' },
    { id: 'anemija', icon: '🩸', label: t('home.healthychef.anemia'), link: '/healthy-chef/anemija' },
    { id: 'kosti', icon: '🦴', label: t('home.healthychef.bones'), link: '/healthy-chef/kosti' },
    { id: 'menopauza', icon: '👵', label: t('home.healthychef.menopause'), link: '/healthy-chef/menopauza' },
    { id: 'pcos', icon: '💉', label: t('home.healthychef.pcos'), link: '/healthy-chef/pcos' },
  ];

  const foodPlannerFeatures = [
    { icon: '😊', label: t('home.foodplanner.emoji'), desc: t('home.foodplanner.emoji_desc') },
    { icon: '🤖', label: t('home.foodplanner.ai'), desc: t('home.foodplanner.ai_desc') },
    { icon: '📈', label: t('home.foodplanner.chart'), desc: t('home.foodplanner.chart_desc') },
    { icon: '⌚', label: t('home.foodplanner.watch'), desc: t('home.foodplanner.watch_desc') },
    { icon: '📄', label: t('home.foodplanner.pdf'), desc: t('home.foodplanner.pdf_desc') },
    { icon: '📅', label: t('home.foodplanner.plan'), desc: t('home.foodplanner.plan_desc') },
  ];

  const vrstaOptions = [
    { value: 'Slano', label: '🍕 ' + t('home.filters.savory') },
    { value: 'Deserti', label: '🍰 ' + t('home.filters.desserts') },
    { value: 'Dijetalni recepti', label: '🥗 ' + t('home.filters.diet') },
    { value: 'Napitki', label: '🍹 ' + t('home.filters.drinks') }
  ];
  const vrijemeOptions = [
    { value: 'Kratko (15-30 min)', label: '⚡ ' + t('home.filters.short') },
    { value: 'Srednje (30-45 min)', label: '⏳ ' + t('home.filters.medium') },
    { value: 'Duže (45-60+ min)', label: '🐢 ' + t('home.filters.long') }
  ];
  const tezinaOptions = [
    { value: 'Početnik', label: '👶 ' + t('home.filters.beginner') },
    { value: 'Srednji', label: '👨‍🍳 ' + t('home.filters.intermediate') },
    { value: 'Profesionalac', label: '👨‍🍳⭐ ' + t('home.filters.professional') }
  ];

  const isPremium = user?.premium || false;

  // ============================================================
  // 8. RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* ===== HERO SEKCIJA ===== */}
      <section className="text-center py-12 md:py-20 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-gray-800 dark:text-white mb-2 leading-tight">
          {t('home.hero.title')}
        </h1>
        <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-500 dark:text-gray-400 mb-4">
          {t('home.hero.subtitle')}
        </p>
        <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
          {t('home.hero.description')}
        </p>
        <div className="flex flex-row justify-center gap-3 sm:gap-4 md:gap-6 flex-wrap">
          <Link to="/quiz" className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-8 md:px-12 py-3 sm:py-4 rounded-2xl text-sm sm:text-base md:text-xl font-bold transition shadow-lg hover:shadow-xl flex items-center gap-2">
            🧠 {t('home.hero.start_quiz')}
          </Link>
          <Link to="/ai-chef" className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-8 md:px-12 py-3 sm:py-4 rounded-2xl text-sm sm:text-base md:text-xl font-bold transition shadow-lg hover:shadow-xl flex items-center gap-2">
            🤖 {t('home.hero.ai_chef')}
          </Link>
        </div>
      </section>

      {/* ===== PORUKA AKO NEMA PROFILA ===== */}
      {!profilLoading && !profil && (
        <section className="py-4 px-4 max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">🧠</p>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {t('home.no_profile.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('home.no_profile.description')}
            </p>
            <Link 
              to="/quiz" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition inline-block"
            >
              🧠 {t('home.no_profile.button')}
            </Link>
          </div>
        </section>
      )}

      {/* ===== PRIKAZ PROFILA IZ KVIZA ===== */}
      {!profilLoading && profil && (
        <section className="py-6 px-4 max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 shadow-lg border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              👤 {t('home.profile.title')}
              {profil.kviz_zavrsen && (
                <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                  ✅ {t('home.profile.completed')}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">{t('home.profile.name')}</p>
                <p className="font-semibold text-gray-800 dark:text-white">{profil.ime || t('home.profile.not_set')}</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">🍽️ {t('home.profile.eat')}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profil.vrsta && profil.vrsta.length > 0 ? (
                    profil.vrsta.map(item => (
                      <span key={item} className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">{t('home.profile.not_selected')}</span>
                  )}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">💪 {t('home.profile.prefers')}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profil.preferencije && profil.preferencije.length > 0 ? (
                    profil.preferencije.map(item => (
                      <span key={item} className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">{t('home.profile.not_selected')}</span>
                  )}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">🚫 {t('home.profile.avoids')}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profil.izbjegava && profil.izbjegava.length > 0 ? (
                    profil.izbjegava.map(item => (
                      <span key={item} className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full text-xs">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">{t('home.profile.not_selected')}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span>⏱️ {profil.vrijeme || t('home.profile.not_set')}</span>
              <span>👨‍🍳 {profil.tezina || t('home.profile.not_set')}</span>
              <span>🔥 {profil.kalorije || t('home.profile.not_set')}</span>
            </div>
          </div>
        </section>
      )}

      {/* ===== AD BANNER 1 ===== */}
      {!isPremium && (
        <section className="py-3 px-4 flex justify-center bg-gray-50 dark:bg-gray-800">
          <div className="w-full max-w-4xl">
            <AdBanner slot="1234567890" className="mx-auto" />
          </div>
        </section>
      )}

      {/* ===== KATEGORIJE ===== */}
      <section className="py-12 md:py-20 px-4 flex justify-center bg-white dark:bg-gray-900">
        <div className="w-full max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 text-gray-800 dark:text-white">
            {t('home.categories.title')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
            {categories.map(cat => (
              <Link 
                key={cat.id} 
                to={cat.link} 
                className="flex flex-col items-center justify-center hover:scale-105 transition transform p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-700"
              >
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-2 sm:mb-3">{cat.icon}</span>
                <span className="font-bold text-center text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 dark:text-gray-300">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LIFESTYLE COACH ===== */}
      <section className="py-12 md:py-20 px-4 flex justify-center bg-gray-50 dark:bg-gray-800">
        <div className="w-full max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800 dark:text-white flex items-center justify-center gap-2 flex-wrap">
            🧘 {t('home.lifestyle.title')}
            <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>
          </h2>
          <div className="bg-white dark:bg-gray-700 rounded-2xl p-6 md:p-8 shadow-md">
            <div className="flex flex-wrap gap-4 justify-center">
              <select value={sleep} onChange={(e) => setSleep(e.target.value)} className="border rounded-lg px-4 py-2 text-base dark:bg-gray-600 dark:text-white dark:border-gray-500 flex-1 min-w-[120px] max-w-[180px]">
                <option value="">😴 {t('home.lifestyle.sleep')}</option>
                <option value="Odlično">😁 {t('home.lifestyle.excellent')}</option>
                <option value="Dobro">🙂 {t('home.lifestyle.good')}</option>
                <option value="Loše">😩 {t('home.lifestyle.bad')}</option>
              </select>
              <select value={energy} onChange={(e) => setEnergy(e.target.value)} className="border rounded-lg px-4 py-2 text-base dark:bg-gray-600 dark:text-white dark:border-gray-500 flex-1 min-w-[120px] max-w-[180px]">
                <option value="">⚡ {t('home.lifestyle.energy')}</option>
                <option value="Pun/a">⚡ {t('home.lifestyle.full')}</option>
                <option value="Osrednje">😐 {t('home.lifestyle.moderate')}</option>
                <option value="Umoran/a">😴 {t('home.lifestyle.tired')}</option>
              </select>
              <select value={stress} onChange={(e) => setStress(e.target.value)} className="border rounded-lg px-4 py-2 text-base dark:bg-gray-600 dark:text-white dark:border-gray-500 flex-1 min-w-[120px] max-w-[180px]">
                <option value="">😊 {t('home.lifestyle.stress')}</option>
                <option value="Nizak">😊 {t('home.lifestyle.low')}</option>
                <option value="Srednji">😐 {t('home.lifestyle.moderate')}</option>
                <option value="Visok">😰 {t('home.lifestyle.high')}</option>
              </select>
              <button onClick={getCoachAdvice} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-base font-semibold transition">
                💡 {t('home.lifestyle.get_advice')}
              </button>
            </div>
            
            {coachAdvice && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-xl border border-blue-200 dark:border-blue-700">
                <p className="text-gray-700 dark:text-gray-300 text-base">{coachAdvice}</p>
              </div>
            )}

            {coachRecipes.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">🍽️ {t('home.lifestyle.recommended')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {coachRecipes.map(recipe => (
                    <Link
                      key={recipe.id}
                      to={`/recipes/${recipe.id}`}
                      className="bg-white dark:bg-gray-700 rounded-xl overflow-hidden shadow hover:shadow-lg transition border border-gray-200 dark:border-gray-600"
                    >
                      <img
                        src={recipe.slika || 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Recept'}
                        alt={recipe.naziv}
                        className="w-full h-24 object-cover"
                      />
                      <div className="p-2">
                        <h5 className="text-sm font-semibold dark:text-white line-clamp-1">{recipe.naziv}</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{recipe.vrijeme} · {recipe.kalorije} kcal</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== VIRTUALNI FRIŽIDER ===== */}
      <section className="py-12 md:py-20 px-4 flex justify-center bg-white dark:bg-gray-900">
        <div className="w-full max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800 dark:text-white flex items-center justify-center gap-2 flex-wrap">
            🧊 {t('home.fridge.title')}
            <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>
          </h2>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-md">
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={newItem} 
                onChange={(e) => setNewItem(e.target.value)} 
                placeholder={t('home.fridge.placeholder')} 
                className="flex-1 border rounded-lg px-4 py-3 text-base dark:bg-gray-700 dark:text-white dark:border-gray-600" 
                onKeyPress={(e) => e.key === 'Enter' && addFridgeItem()} 
              />
              <button 
                onClick={addFridgeItem} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition text-base w-full sm:w-auto"
              >
                ➕ {t('home.fridge.add')}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {fridgeItems.map((item, i) => (
                <span key={i} className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-4 py-1.5 rounded-full text-base">
                  {item}
                </span>
              ))}
            </div>

            {user?.premium && (
              <div className="mt-4">
                <ScanReceipt onNamirniceDodane={handleNamirniceDodane} />
              </div>
            )}

            {scanPoruka && (
              <div className="mt-3 text-base text-green-600 dark:text-green-400 font-semibold">
                {scanPoruka}
              </div>
            )}

            <button className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white w-full sm:w-auto px-6 md:px-8 py-3 rounded-full text-sm md:text-base font-semibold transition">
              🔍 {t('home.fridge.find_recipes')}
            </button>
          </div>
        </div>
      </section>

      {/* ===== AD BANNER 2 ===== */}
      {!isPremium && (
        <section className="py-3 px-4 flex justify-center bg-gray-50 dark:bg-gray-800">
          <div className="w-full max-w-4xl">
            <AdBanner slot="1234567891" className="mx-auto" />
          </div>
        </section>
      )}

      {/* ===== FOOD PLANNER ===== */}
      <section className="py-16 md:py-20 px-4 flex justify-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
        <div className="w-full max-w-5xl">
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-10 shadow-2xl border-2 border-blue-300 dark:border-blue-600 overflow-hidden">
            {!user?.premium && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-3xl">
                <span className="text-6xl mb-4">🔒</span>
                <h3 className="text-2xl md:text-4xl font-extrabold text-white mb-2 text-center px-4">{t('home.premium.title')}</h3>
                <p className="text-white/80 text-center px-4 mb-4 max-w-md text-sm md:text-base">{t('home.premium.description')}</p>
                <Link to="/premium" className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 md:px-10 py-3 md:py-4 rounded-full font-bold transition shadow-lg hover:shadow-xl text-sm md:text-lg">⭐ {t('home.premium.button')}</Link>
              </div>
            )}
            <div className={`${!user?.premium ? 'opacity-50' : ''}`}>
              <div className="flex flex-wrap items-center justify-between mb-4">
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white flex items-center gap-2 md:gap-3">
                  📊 {t('home.foodplanner.title')}
                  {user?.premium && <span className="inline-block bg-green-200 dark:bg-green-600 text-green-800 dark:text-green-200 px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-bold">✅ {t('home.premium.unlocked')}</span>}
                  {!user?.premium && <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-bold">⭐ PREMIUM</span>}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-xl mb-6">{t('home.foodplanner.description')}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6">
                {foodPlannerFeatures.map((feature, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 md:p-5 text-center border border-gray-200 dark:border-gray-600 hover:shadow-lg transition hover:scale-105">
                    <span className="text-4xl md:text-6xl block mb-2">{feature.icon}</span>
                    <h4 className="font-bold text-sm md:text-lg text-gray-700 dark:text-gray-200">{feature.label}</h4>
                    <p className="text-[10px] md:text-sm text-gray-400 dark:text-gray-300">{feature.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-purple-50 dark:bg-purple-900 rounded-2xl p-3 md:p-6 border-2 border-purple-200 dark:border-purple-600 mb-6">
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="text-2xl md:text-4xl">🧘</span>
                  <div>
                    <h4 className="font-bold text-sm md:text-xl text-gray-700 dark:text-gray-200">{t('home.foodplanner.connected')}</h4>
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-300">{t('home.foodplanner.connected_desc')}</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                {user?.premium ? (
                  <Link to="/food-planner" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-14 py-3 md:py-5 rounded-full text-sm md:text-xl font-bold transition shadow-md hover:shadow-lg">📊 {t('home.foodplanner.open')}</Link>
                ) : (
                  <Link to="/premium" className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-8 md:px-14 py-3 md:py-5 rounded-full text-sm md:text-xl font-bold transition shadow-md hover:shadow-lg">⭐ {t('home.premium.unlock_all')}</Link>
                )}
                <p className="text-[10px] md:text-sm text-gray-400 dark:text-gray-400 mt-3">
                  {user?.premium ? '✅ ' + t('home.premium.all_unlocked') : '🔒 ' + t('home.premium.all_locked')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== AD BANNER 3 ===== */}
      {!isPremium && (
        <section className="py-3 px-4 flex justify-center bg-gray-50 dark:bg-gray-800">
          <div className="w-full max-w-4xl">
            <AdBanner slot="1234567892" className="mx-auto" />
          </div>
        </section>
      )}

      {/* ===== HEALTHYCHEF ===== */}
      <section className="py-12 md:py-20 px-4 flex justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div className="w-full max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-1 text-gray-800 dark:text-white flex items-center justify-center gap-3 flex-wrap">
              🌿 {t('home.healthychef.title')}
              <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-base md:text-xl mb-6">{t('home.healthychef.description')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
              {healthyChefCategories.map(cat => (
                <Link 
                  key={cat.id} 
                  to={cat.link} 
                  className="flex flex-col items-center justify-center hover:scale-105 transition transform p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-700"
                >
                  <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-2 sm:mb-3">{cat.icon}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg text-center">{cat.label}</span>
                </Link>
              ))}
            </div>
            <Link to="/healthy-chef" className="inline-block mt-10 bg-yellow-500 hover:bg-yellow-600 text-white px-10 py-4 rounded-full text-base md:text-xl font-semibold transition shadow-md hover:shadow-lg">🌿 {t('home.healthychef.open')}</Link>
          </div>
        </div>
      </section>

      {/* ===== PREPORUČENI RECEPTI ===== */}
      <section className="py-12 md:py-20 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8 text-gray-800 dark:text-white">
          🍽️ {t('home.recipes.title')}
          {activeFiltersCount > 0 && (
            <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
              {activeFiltersCount} {t('home.recipes.filters_active')}
            </span>
          )}
        </h2>

        <div className="flex flex-wrap justify-center gap-3 mb-6 md:mb-8">
          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.vrsta} 
            onChange={(e) => handleFilterChange('vrsta', e.target.value)}
          >
            <option value="">🍽️ {t('home.filters.all_types')}</option>
            {vrstaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.vrijeme} 
            onChange={(e) => handleFilterChange('vrijeme', e.target.value)}
          >
            <option value="">⏱️ {t('home.filters.all_time')}</option>
            {vrijemeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.tezina} 
            onChange={(e) => handleFilterChange('tezina', e.target.value)}
          >
            <option value="">🏋️ {t('home.filters.all_difficulty')}</option>
            {tezinaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>

          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.preferencije} 
            onChange={(e) => handleFilterChange('preferencije', e.target.value)}
          >
            <option value="">💪 {t('home.filters.preferences')}</option>
            <option value="Visokoproteinski">💪 {t('home.filters.high_protein')}</option>
            <option value="Bogat vlaknima">🌾 {t('home.filters.high_fiber')}</option>
            <option value="Bogat ugljikohidratima">🍞 {t('home.filters.high_carbs')}</option>
          </select>

          <button 
            onClick={handleResetFilters} 
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-semibold transition"
          >
            🔄 {t('home.filters.reset')}
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400 text-base md:text-lg">{t('home.recipes.loading')}</p>
        ) : filteredReceptiMemo.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredReceptiMemo.slice(0, 6).map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg">{t('home.recipes.no_results')}</p>
            <button 
              onClick={handleResetFilters}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
            >
              {t('home.recipes.reset_filters')}
            </button>
          </div>
        )}
      </section>

      {/* ===== AD BANNER 4 ===== */}
      {!isPremium && (
        <section className="py-3 px-4 flex justify-center bg-gray-50 dark:bg-gray-800">
          <div className="w-full max-w-4xl">
            <AdBanner slot="1234567893" className="mx-auto" />
          </div>
        </section>
      )}
    </div>
  );
};

export default HomeKonacno;