// frontend/src/pages/HomeKonacno.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import ScanReceipt from '../components/ScanReceipt';
import AdBanner from '../components/AdBanner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const HomeKonacno = () => {
  const [recepti, setRecepti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [profilLoading, setProfilLoading] = useState(true);
  const [sleep, setSleep] = useState('');
  const [energy, setEnergy] = useState('');
  const [stress, setStress] = useState('');
  const [coachAdvice, setCoachAdvice] = useState('');
  const [fridgeItems, setFridgeItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [scanPoruka, setScanPoruka] = useState('');

  const [filters, setFilters] = useState({
    vrsta: '',
    vrijeme: '',
    tezina: '',
    preferencije: '',
    restrikcije: '',
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
          
          if (data.data.vrsta && data.data.vrsta.length > 0) {
            const odabraneVrste = data.data.vrsta.filter(v => v !== 'Svejedno');
            if (odabraneVrste.length > 0) {
              noviFilteri.vrsta = odabraneVrste[0];
            }
          }
          
          if (data.data.preferencije && data.data.preferencije.length > 0) {
            const odabranePref = data.data.preferencije.filter(p => p !== 'Svejedno');
            if (odabranePref.length > 0) {
              noviFilteri.preferencije = odabranePref[0];
            }
          }
          
          if (data.data.vrijeme) {
            noviFilteri.vrijeme = data.data.vrijeme;
          }
          
          if (data.data.tezina) {
            noviFilteri.tezina = data.data.tezina;
          }
          
          if (data.data.kalorije) {
            noviFilteri.kalorije = data.data.kalorije;
          }
          
          if (data.data.izbjegava && data.data.izbjegava.length > 0) {
            noviFilteri.restrikcije = data.data.izbjegava[0];
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
            restrikcije: '',
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
      
      if (profil.vrijeme) resetFilteri.vrijeme = profil.vrijeme;
      if (profil.tezina) resetFilteri.tezina = profil.tezina;
      if (profil.kalorije) resetFilteri.kalorije = profil.kalorije;
      
      if (profil.izbjegava && profil.izbjegava.length > 0) {
        resetFilteri.restrikcije = profil.izbjegava[0];
      }
      
      setFilters(prev => ({ ...prev, ...resetFilteri }));
    } else {
      setFilters({ 
        vrsta: '', 
        vrijeme: '', 
        tezina: '',
        preferencije: '',
        restrikcije: '',
        kalorije: ''
      });
    }
  }, [profil]);

  // ============================================================
  // 5. FILTRIRANI RECEPTI
  // ============================================================
  const filteredReceptiMemo = useMemo(() => {
    let filtered = recepti;
    
    if (filters.vrsta) {
      filtered = filtered.filter(r => r.vrsta === filters.vrsta);
    }
    
    if (filters.vrijeme) {
      filtered = filtered.filter(r => r.vrijeme === filters.vrijeme);
    }
    
    if (filters.tezina) {
      filtered = filtered.filter(r => r.tezina === filters.tezina);
    }
    
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
    
    if (filters.restrikcije) {
      const restrikcija = filters.restrikcije;
      filtered = filtered.filter(r => {
        const alergeni = r.alergeni || [];
        return !alergeni.includes(restrikcija);
      });
    }
    
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
  // 6. LIFESTYLE COACH - SA ČUVANJEM ZDRAVSTVENIH PODATAKA
  // ============================================================
  const getCoachAdvice = useCallback(async () => {
    if (!sleep || !energy || !stress) {
      alert('Molimo odgovorite na sva pitanja.');
      return;
    }

    try {
      const email = user?.email || localStorage.getItem('userEmail');
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
    } catch (error) {
      console.error('❌ Greška pri čuvanju podataka:', error);
    }

    const advice = `Na osnovu vašeg sna (${sleep}), energije (${energy}) i stresa (${stress}), preporučujemo lagani doručak i čaj od kamilice.`;
    setCoachAdvice(advice);
  }, [sleep, energy, stress, user]);

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

  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  // ============================================================
  // 7. KONFIGURACIJA
  // ============================================================
  const categories = [
    { id: 'dijetalni', icon: '🥗', label: 'DIJETALNO', link: '/recipes?vrsta=Dijetalni%20recepti' },
    { id: 'deserti', icon: '🍰', label: 'DESERTI', link: '/recipes?vrsta=Deserti' },
    { id: 'slana', icon: '🍕', label: 'SLANA JELA', link: '/recipes?vrsta=Slano' },
    { id: 'kviz', icon: '🧠', label: 'KVIZ', link: '/quiz' },
    { id: 'ai', icon: '🤖', label: 'AI CHEF', link: '/ai-chef' },
    { id: 'smoothie', icon: '🍹', label: 'SMOOTHIE', link: '/recipes?vrsta=Napitki' },
  ];

  const healthyChefCategories = [
    { id: 'hormonski', icon: '🩸', label: 'HORMONSKI', link: '/healthy-chef/hormonski' },
    { id: 'tiroida', icon: '🦋', label: 'TIROIDA', link: '/healthy-chef/tiroida' },
    { id: 'anemija', icon: '🩸', label: 'ANEMIJA', link: '/healthy-chef/anemija' },
    { id: 'kosti', icon: '🦴', label: 'KOSTI', link: '/healthy-chef/kosti' },
    { id: 'menopauza', icon: '👵', label: 'MENOPAUZA', link: '/healthy-chef/menopauza' },
    { id: 'pcos', icon: '💉', label: 'PCOS', link: '/healthy-chef/pcos' },
  ];

  const vrstaOptions = [
    { value: 'Slano', label: '🍕 Slano' },
    { value: 'Deserti', label: '🍰 Deserti' },
    { value: 'Dijetalni recepti', label: '🥗 Dijetalno' },
    { value: 'Napitki', label: '🍹 Smoothie' }
  ];
  const vrijemeOptions = [
    { value: 'Kratko (15-30 min)', label: '⚡ Kratko' },
    { value: 'Srednje (30-45 min)', label: '⏳ Srednje' },
    { value: 'Duže (45-60 min)', label: '🐢 Duže' }
  ];
  const tezinaOptions = [
    { value: 'Početnik', label: '👶 Početnik' },
    { value: 'Srednji', label: '👨‍🍳 Srednji' },
    { value: 'Profesionalac', label: '👨‍🍳⭐ Profesionalac' }
  ];

  const isPremium = user?.premium || false;

  // ============================================================
  // 8. RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* ===== HERO SEKCIJA ===== */}
      <section className="text-center py-12 md:py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-800 dark:text-white mb-3">
          🏥 OS Zdravlja – Operativni sistem za tvoje zdravlje
        </h1>
        <p className="text-lg md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
          Otkrivajte recepte prilagođene vašim potrebama, dijetama i ukusu.
        </p>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          <Link to="/quiz" className="bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-12 py-3 md:py-4 rounded-2xl text-base md:text-xl font-bold transition shadow-lg hover:shadow-xl flex items-center gap-2">
            🧠 Započni kviz
          </Link>
          <Link to="/ai-chef" className="bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-12 py-3 md:py-4 rounded-2xl text-base md:text-xl font-bold transition shadow-lg hover:shadow-xl flex items-center gap-2">
            🤖 AI Chef pretraga
          </Link>
        </div>
      </section>

      {/* ===== PORUKA AKO NEMA PROFILA ===== */}
      {!profilLoading && !profil && (
        <section className="py-4 px-4 max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">🧠</p>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Personalizujte svoje iskustvo!
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Popunite kratki kviz i mi ćemo vam prikazati recepte koji su savršeni za vas.
            </p>
            <Link 
              to="/quiz" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition inline-block"
            >
              🧠 Započni kviz
            </Link>
          </div>
        </section>
      )}

      {/* ===== PRIKAZ PROFILA IZ KVIZA ===== */}
      {!profilLoading && profil && (
        <section className="py-6 px-4 max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 shadow-lg border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              👤 Tvoj profil
              {profil.kviz_zavrsen && (
                <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                  ✅ Kviz završen
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Ime</p>
                <p className="font-semibold text-gray-800 dark:text-white">{profil.ime || 'Nije uneseno'}</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">🍽️ Želiš jesti</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profil.vrsta && profil.vrsta.length > 0 ? (
                    profil.vrsta.map(item => (
                      <span key={item} className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">Nije odabrano</span>
                  )}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">💪 Preferiraš</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profil.preferencije && profil.preferencije.length > 0 ? (
                    profil.preferencije.map(item => (
                      <span key={item} className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">Nije odabrano</span>
                  )}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">🚫 Izbjegavaš</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profil.izbjegava && profil.izbjegava.length > 0 ? (
                    profil.izbjegava.map(item => (
                      <span key={item} className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full text-xs">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">Nije odabrano</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span>⏱️ {profil.vrijeme || 'Nije odabrano'}</span>
              <span>👨‍🍳 {profil.tezina || 'Nije odabrano'}</span>
              <span>🔥 {profil.kalorije || 'Nije odabrano'}</span>
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
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-10 text-gray-800 dark:text-white">
            IZABERI KATEGORIJU
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 md:gap-10" style={{ rowGap: '40px' }}>
            {categories.map(cat => (
              <Link key={cat.id} to={cat.link} className="flex flex-col items-center justify-center hover:scale-105 transition transform p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm hover:shadow-md">
                <span className="text-7xl md:text-9xl mb-3">{cat.icon}</span>
                <span className="font-bold text-center text-sm md:text-lg text-gray-700 dark:text-gray-300">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LIFESTYLE COACH ===== */}
      <section className="py-12 md:py-20 px-4 flex justify-center bg-gray-50 dark:bg-gray-800">
        <div className="w-full max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800 dark:text-white flex items-center justify-center gap-2 flex-wrap">
            🧘 Lifestyle Coach
            <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>
          </h2>
          <div className="bg-white dark:bg-gray-700 rounded-2xl p-6 md:p-8 shadow-md">
            <div className="flex flex-wrap gap-4 justify-center">
              <select value={sleep} onChange={(e) => setSleep(e.target.value)} className="border rounded-lg px-4 py-2 text-base dark:bg-gray-600 dark:text-white dark:border-gray-500 flex-1 min-w-[120px] max-w-[180px]">
                <option value="">😴 San</option>
                <option value="Odlično">😁 Odlično</option>
                <option value="Dobro">🙂 Dobro</option>
                <option value="Loše">😩 Loše</option>
              </select>
              <select value={energy} onChange={(e) => setEnergy(e.target.value)} className="border rounded-lg px-4 py-2 text-base dark:bg-gray-600 dark:text-white dark:border-gray-500 flex-1 min-w-[120px] max-w-[180px]">
                <option value="">⚡ Energija</option>
                <option value="Pun/a">⚡ Pun/a</option>
                <option value="Osrednje">😐 Osrednje</option>
                <option value="Umoran/a">😴 Umoran/a</option>
              </select>
              <select value={stress} onChange={(e) => setStress(e.target.value)} className="border rounded-lg px-4 py-2 text-base dark:bg-gray-600 dark:text-white dark:border-gray-500 flex-1 min-w-[120px] max-w-[180px]">
                <option value="">😊 Stres</option>
                <option value="Nizak">😊 Nizak</option>
                <option value="Srednji">😐 Srednji</option>
                <option value="Visok">😰 Visok</option>
              </select>
              <button onClick={getCoachAdvice} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-base font-semibold transition">
                💡 Dobij preporuke
              </button>
            </div>
            {coachAdvice && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-xl border border-blue-200 dark:border-blue-700">
                <p className="text-gray-700 dark:text-gray-300 text-base">{coachAdvice}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== VIRTUALNI FRIŽIDER ===== */}
      <section className="py-12 md:py-20 px-4 flex justify-center bg-white dark:bg-gray-900">
        <div className="w-full max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800 dark:text-white flex items-center justify-center gap-2 flex-wrap">
            🧊 Moj frižider
            <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>
          </h2>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-md">
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={newItem} 
                onChange={(e) => setNewItem(e.target.value)} 
                placeholder="Dodaj namirnicu..." 
                className="flex-1 border rounded-lg px-4 py-3 text-base dark:bg-gray-700 dark:text-white dark:border-gray-600" 
                onKeyPress={(e) => e.key === 'Enter' && addFridgeItem()} 
              />
              <button 
                onClick={addFridgeItem} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition text-base w-full sm:w-auto"
              >
                ➕ Dodaj
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
              🔍 Pronađi recepte
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
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-10 shadow-2xl border-2 border-blue-300 dark:border-blue-600 overflow-hidden">
            {!user?.premium && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-3xl">
                <span className="text-6xl mb-4">🔒</span>
                <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Premium sadržaj</h3>
                <p className="text-white/80 text-center px-4 mb-4 max-w-md text-base">Otključajte Potpuni Food Planner i sve Premium funkcionalnosti!</p>
                <Link to="/premium" className="bg-yellow-500 hover:bg-yellow-600 text-white px-10 py-4 rounded-full font-bold transition shadow-lg hover:shadow-xl text-base md:text-lg">⭐ Postani Premium</Link>
              </div>
            )}
            <div className={`${!user?.premium ? 'opacity-50' : ''}`}>
              <div className="flex flex-wrap items-center justify-between mb-4">
                <h2 className="text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white flex items-center gap-3">📊 Potpuni Food Planner
                  {user?.premium && <span className="inline-block bg-green-200 dark:bg-green-600 text-green-800 dark:text-green-200 px-4 py-1 rounded-full text-sm font-bold">✅ Otključano</span>}
                  {!user?.premium && <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-base md:text-xl mb-6">Pratite svoje obroke, analizirajte ishranu i planirajte sedmicu uz AI asistenta.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 md:p-5 text-center border border-gray-200 dark:border-gray-600 hover:shadow-lg transition hover:scale-105">
                  <span className="text-4xl md:text-6xl block mb-2">😊</span>
                  <h4 className="font-bold text-sm md:text-lg text-gray-700 dark:text-gray-200">Emocionalni unos</h4>
                  <p className="text-xs md:text-sm text-gray-400 dark:text-gray-300">Biraj emoji prije/poslije</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 md:p-5 text-center border border-gray-200 dark:border-gray-600 hover:shadow-lg transition hover:scale-105">
                  <span className="text-4xl md:text-6xl block mb-2">🤖</span>
                  <h4 className="font-bold text-sm md:text-lg text-gray-700 dark:text-gray-200">AI preporuke</h4>
                  <p className="text-xs md:text-sm text-gray-400 dark:text-gray-300">Na osnovu raspoloženja</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 md:p-5 text-center border border-gray-200 dark:border-gray-600 hover:shadow-lg transition hover:scale-105">
                  <span className="text-4xl md:text-6xl block mb-2">📈</span>
                  <h4 className="font-bold text-sm md:text-lg text-gray-700 dark:text-gray-200">Grafikon</h4>
                  <p className="text-xs md:text-sm text-gray-400 dark:text-gray-300">Vizuelni prikaz kroz sedmicu</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 md:p-5 text-center border border-gray-200 dark:border-gray-600 hover:shadow-lg transition hover:scale-105">
                  <span className="text-4xl md:text-6xl block mb-2">⌚</span>
                  <h4 className="font-bold text-sm md:text-lg text-gray-700 dark:text-gray-200">Smartwatch</h4>
                  <p className="text-xs md:text-sm text-gray-400 dark:text-gray-300">Apple Health, Google Fit</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 md:p-5 text-center border border-gray-200 dark:border-gray-600 hover:shadow-lg transition hover:scale-105">
                  <span className="text-4xl md:text-6xl block mb-2">📄</span>
                  <h4 className="font-bold text-sm md:text-lg text-gray-700 dark:text-gray-200">PDF izvještaj</h4>
                  <p className="text-xs md:text-sm text-gray-400 dark:text-gray-300">Sedmični/mjesečni</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 md:p-5 text-center border border-gray-200 dark:border-gray-600 hover:shadow-lg transition hover:scale-105">
                  <span className="text-4xl md:text-6xl block mb-2">📅</span>
                  <h4 className="font-bold text-sm md:text-lg text-gray-700 dark:text-gray-200">Plan obroka</h4>
                  <p className="text-xs md:text-sm text-gray-400 dark:text-gray-300">AI plan po raspoloženju</p>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900 rounded-2xl p-4 md:p-6 border-2 border-purple-200 dark:border-purple-600 mb-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <span className="text-3xl md:text-4xl">🧘</span>
                  <div>
                    <h4 className="font-bold text-sm md:text-xl text-gray-700 dark:text-gray-200">Povezano sa Lifestyle Coach-om</h4>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-300">Preporuke se automatski dodaju u Dnevnik</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                {user?.premium ? (
                  <Link to="/food-planner" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-10 md:px-14 py-4 md:py-5 rounded-full text-base md:text-xl font-bold transition shadow-md hover:shadow-lg">📊 Otvori Dnevnik ishrane</Link>
                ) : (
                  <Link to="/premium" className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-10 md:px-14 py-4 md:py-5 rounded-full text-base md:text-xl font-bold transition shadow-md hover:shadow-lg">⭐ Postani Premium i otključaj sve</Link>
                )}
                <p className="text-xs md:text-sm text-gray-400 dark:text-gray-400 mt-3">
                  {user?.premium ? '✅ Sve funkcionalnosti su dostupne!' : '🔒 Sve funkcionalnosti su zaključane. Postanite Premium da ih koristite.'}
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
              🌿 HealthyChef
              <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-base md:text-xl mb-6">Personalizovani recepti za vaše zdravstvene potrebe.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 md:gap-10" style={{ rowGap: '40px' }}>
              {healthyChefCategories.map(cat => (
                <Link key={cat.id} to={cat.link} className="flex flex-col items-center justify-center hover:scale-105 transition transform p-6 bg-white dark:bg-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow-md">
                  <span className="text-7xl md:text-9xl mb-3">{cat.icon}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 text-sm md:text-lg text-center">{cat.label}</span>
                </Link>
              ))}
            </div>
            <Link to="/healthy-chef" className="inline-block mt-10 bg-yellow-500 hover:bg-yellow-600 text-white px-10 py-4 rounded-full text-base md:text-xl font-semibold transition shadow-md hover:shadow-lg">🌿 Otvori HealthyChef</Link>
          </div>
        </div>
      </section>

      {/* ===== PREPORUČENI RECEPTI ===== */}
      <section className="py-12 md:py-20 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8 text-gray-800 dark:text-white">
          🍽️ Preporučeni recepti
          {activeFiltersCount > 0 && (
            <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
              {activeFiltersCount} filtera aktivno
            </span>
          )}
        </h2>

        <div className="flex flex-wrap justify-center gap-3 mb-6 md:mb-8">
          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.vrsta} 
            onChange={(e) => handleFilterChange('vrsta', e.target.value)}
          >
            <option value="">🍽️ Sve vrste</option>
            {vrstaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.vrijeme} 
            onChange={(e) => handleFilterChange('vrijeme', e.target.value)}
          >
            <option value="">⏱️ Svo vrijeme</option>
            {vrijemeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.tezina} 
            onChange={(e) => handleFilterChange('tezina', e.target.value)}
          >
            <option value="">🏋️ Sva težina</option>
            {tezinaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>

          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.preferencije} 
            onChange={(e) => handleFilterChange('preferencije', e.target.value)}
          >
            <option value="">💪 Preferencije</option>
            <option value="Visokoproteinski">💪 Visokoproteinski</option>
            <option value="Bogat vlaknima">🌾 Bogat vlaknima</option>
            <option value="Bogat ugljikohidratima">🍞 Bogat ugljikohidratima</option>
          </select>

          <button 
            onClick={handleResetFilters} 
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-semibold transition"
          >
            🔄 Reset
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400 text-base md:text-lg">Učitavanje recepata...</p>
        ) : filteredReceptiMemo.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredReceptiMemo.slice(0, 6).map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg">Nema recepata koji odgovaraju filterima.</p>
            <button 
              onClick={handleResetFilters}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
            >
              Resetuj filtere
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