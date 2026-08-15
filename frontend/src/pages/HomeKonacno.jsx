// frontend/src/pages/HomeKonacno.jsx

{  
      <SEO 
        title="Početna"
        description="Otkrivajte recepte prilagođene vašim potrebama, dijetama i ukusu. AI Chef, Food Planner i HealthyChef – sve na jednom mjestu!"
        url="https://os-zdravlja.vercel.app/"
      />
};


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RecipeCard from '../components/RecipeCard';
import ScanReceipt from '../components/ScanReceipt';
import AdBanner from '../components/AdBanner';
import { DEFAULT_SLOTS } from '../config/adsense';
import SEO from '../components/SEO';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================
// GLAVNA KOMPONENTA
// ============================================================
const HomeKonacno = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
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
  const [fridgeLoading, setFridgeLoading] = useState(false);

  const [filters, setFilters] = useState({
    vrsta: '',
    vrijeme: '',
    tezina: '',
    preferencije: '',
    restrikcije: [],
    kalorije: ''
  });

  // ============================================================
  // 🌍 MAPIRANJE ZA PREVOD PREFERENCIJA
  // ============================================================
  const translateValue = (value, type) => {
    if (!value) return t('profile.not_selected');
    
    const maps = {
      vrsta: {
        'Deserti': t('quiz.options.vrsta.0'),
        'Slano': t('quiz.options.vrsta.1'),
        'Dijetalni recepti': t('quiz.options.vrsta.2'),
        'Napitki': t('quiz.options.vrsta.3'),
        'Svejedno': t('quiz.options.vrsta.4')
      },
      restrikcije: {
        'Bez restrikcija': t('quiz.options.restrikcije.0'),
        'Bez glutena': t('quiz.options.restrikcije.1'),
        'Bez laktoze': t('quiz.options.restrikcije.2'),
        'Bez šećera': t('quiz.options.restrikcije.3'),
        'Veganski': t('quiz.options.restrikcije.4'),
        'Bez orašastih plodova': t('quiz.options.restrikcije.5')
      },
      preferencije: {
        'Visokoproteinski': t('quiz.options.preferencije.0'),
        'Bogat vlaknima': t('quiz.options.preferencije.1'),
        'Bogat ugljikohidratima': t('quiz.options.preferencije.2'),
        'Svejedno': t('quiz.options.preferencije.3')
      },
      vrijeme: {
        'Kratko (15-30 min)': t('quiz.options.vrijeme.0'),
        'Srednje (30-45 min)': t('quiz.options.vrijeme.1'),
        'Duže (45-60+ min)': t('quiz.options.vrijeme.2')
      },
      tezina: {
        'Početnik': t('quiz.options.tezina.0'),
        'Srednji': t('quiz.options.tezina.1'),
        'Profesionalac': t('quiz.options.tezina.2')
      },
      kalorije: {
        'Nisko (do 300 kcal)': t('quiz.options.kalorije.0'),
        'Umjereno (300-500 kcal)': t('quiz.options.kalorije.1'),
        'Srednje (500-700 kcal)': t('quiz.options.kalorije.2'),
        'Visoko (900+ kcal)': t('quiz.options.kalorije.3')
      }
    };

    const map = maps[type];
    if (!map) return value;
    
    if (Array.isArray(value)) {
      return value.map(v => map[v] || v).join(', ');
    }
    
    return map[value] || value;
  };

  // ============================================================
  // 🔐 PROVJERA DA LI JE KORISNIK PRIJAVLJEN
  // ============================================================
  useEffect(() => {
    const checkUser = () => {
      const userData = localStorage.getItem('user');
      if (!userData) {
        console.log('⚠️ Nema korisnika, preusmjeravam na login');
        navigate('/login');
        return;
      }

      try {
        const parsed = JSON.parse(userData);
        const expiry = parsed.expires_at || parsed.exp;
        if (expiry) {
          const now = Math.floor(Date.now() / 1000);
          if (expiry < now) {
            console.log('⏰ Session istekao, brišem...');
            localStorage.removeItem('user');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('remember_me');
            navigate('/login');
            return;
          }
        }
        if (!parsed?.email) {
          console.log('⚠️ Nema emaila, preusmjeravam na login');
          navigate('/login');
        }
      } catch (error) {
        console.error('❌ Greška pri provjeri korisnika:', error);
        localStorage.removeItem('user');
        navigate('/login');
      }
    };

    checkUser();
  }, [navigate]);

  // ============================================================
  // 1. DOHVATI KORISNIKA IZ LOCALSTORAGE
  // ============================================================
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
  }, []);

  // ============================================================
  // 2. DOHVATI PROFIL IZ BAZE
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
        
        const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
        
        if (response.status === 429) {
          console.warn('⚠️ Rate limit (429) - koristim podatke iz localStorage');
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser) {
            const fallbackProfil = {
              ime: storedUser.ime || 'Korisnik',
              email: storedUser.email || email,
              premium: storedUser.premium || false,
              kviz_zavrsen: storedUser.kviz_zavrsen || false,
              vrsta: storedUser.vrsta || [],
              izbjegava: storedUser.izbjegava || [],
              preferencije: storedUser.preferencije || [],
              vrijeme: storedUser.vrijeme || '',
              tezina: storedUser.tezina || '',
              kalorije: storedUser.kalorije || '',
              fridge: storedUser.fridge || []
            };
            setProfil(fallbackProfil);
            if (fallbackProfil.fridge) {
              setFridgeItems(Array.isArray(fallbackProfil.fridge) ? fallbackProfil.fridge : []);
            }
            
            const noviFilteri = {};
            if (fallbackProfil.vrsta && fallbackProfil.vrsta.length > 0) {
              const odabraneVrste = fallbackProfil.vrsta.filter(v => v !== 'Svejedno');
              if (odabraneVrste.length > 0) noviFilteri.vrsta = odabraneVrste[0];
            }
            if (fallbackProfil.preferencije && fallbackProfil.preferencije.length > 0) {
              const odabranePref = fallbackProfil.preferencije.filter(p => p !== 'Svejedno');
              if (odabranePref.length > 0) noviFilteri.preferencije = odabranePref[0];
            }
            if (fallbackProfil.izbjegava && fallbackProfil.izbjegava.length > 0) {
              const restrikcije = fallbackProfil.izbjegava.filter(r => r !== 'Bez restrikcija' && r !== 'No restrictions' && r !== 'Keine Einschränkungen');
              if (restrikcije.length > 0) noviFilteri.restrikcije = restrikcije;
            }
            if (fallbackProfil.vrijeme) noviFilteri.vrijeme = fallbackProfil.vrijeme;
            if (fallbackProfil.tezina) noviFilteri.tezina = fallbackProfil.tezina;
            if (fallbackProfil.kalorije) noviFilteri.kalorije = fallbackProfil.kalorije;
            
            setFilters(prev => ({ ...prev, ...noviFilteri }));
            console.log('✅ Profil dohvaćen iz localStorage (fallback)');
          }
          setProfilLoading(false);
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          console.log('✅ Profil dohvaćen:', data.data);
          setProfil(data.data);
          
          if (data.data.fridge) {
            const fridgeData = Array.isArray(data.data.fridge) ? data.data.fridge : [];
            setFridgeItems(fridgeData);
            console.log('🧊 Frižider dohvaćen iz baze:', fridgeData);
          } else {
            setFridgeItems([]);
          }
          
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
          
          // 🔥 POPRAVLJENO - koristi izbjegava
          if (data.data.izbjegava && data.data.izbjegava.length > 0) {
            const restrikcije = data.data.izbjegava.filter(r => 
              r !== 'Bez restrikcija' && r !== 'No restrictions' && r !== 'Keine Einschränkungen'
            );
            if (restrikcije.length > 0) {
              noviFilteri.restrikcije = restrikcije;
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
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
          const fallbackProfil = {
            ime: storedUser.ime || 'Korisnik',
            email: storedUser.email || email,
            premium: storedUser.premium || false,
            kviz_zavrsen: storedUser.kviz_zavrsen || false,
            vrsta: storedUser.vrsta || [],
            izbjegava: storedUser.izbjegava || [],
            preferencije: storedUser.preferencije || [],
            vrijeme: storedUser.vrijeme || '',
            tezina: storedUser.tezina || '',
            kalorije: storedUser.kalorije || '',
            fridge: storedUser.fridge || []
          };
          setProfil(fallbackProfil);
          if (fallbackProfil.fridge) {
            setFridgeItems(Array.isArray(fallbackProfil.fridge) ? fallbackProfil.fridge : []);
          }
        }
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
      const response = await fetch(`${API_URL}/api/recepti?page=1&limit=50`);
      
      if (response.status === 429) {
        console.warn('⚠️ Rate limit (429) - koristim prazne recepte');
        setRecepti([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data && data.data && Array.isArray(data.data)) {
        setRecepti(data.data);
        console.log(`✅ Dohvaćeno ${data.data.length} recepata (od ${data.pagination?.total || 0} ukupno)`);
      } else if (data && Array.isArray(data)) {
        setRecepti(data);
        console.log(`✅ Dohvaćeno ${data.length} recepata (stari format)`);
      } else {
        console.warn('⚠️ Recepti nisu array, postavljam prazan niz');
        setRecepti([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('❌ Greška pri dohvatu recepata:', err);
      setRecepti([]);
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
      
      // 🔥 POPRAVLJENO - koristi izbjegava
      if (profil.izbjegava && profil.izbjegava.length > 0) {
        const restrikcije = profil.izbjegava.filter(r => 
          r !== 'Bez restrikcija' && r !== 'No restrictions' && r !== 'Keine Einschränkungen'
        );
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
  // 5. FILTRIRANI RECEPTI - POPRAVLJENO!
  // ============================================================
  const filteredReceptiMemo = useMemo(() => {
    let filtered = Array.isArray(recepti) ? recepti : [];
    
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
    
    // 🔥 POPRAVLJENO - KORISTI izbjegava umjesto alergeni!
    if (filters.restrikcije && filters.restrikcije.length > 0) {
      const restrikcije = Array.isArray(filters.restrikcije) 
        ? filters.restrikcije 
        : [filters.restrikcije];
      
      filtered = filtered.filter(recipe => {
        const izbjegava = recipe.izbjegava || [];
        return restrikcije.every(r => izbjegava.includes(r));
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
  // 6. LIFESTYLE COACH - POPRAVLJENO!
  // ============================================================
  const getCoachAdvice = useCallback(async () => {
    if (!sleep || !energy || !stress) {
      alert(t('home.alert_required'));
      return;
    }

    try {
      const email = user?.email || localStorage.getItem('userEmail');
      
      if (email) {
        await fetch(`${API_URL}/api/zdravstveni-podaci`, {
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

      let advice = '';
      let filteredRecepti = [];

      const isSleepGood = sleep === 'Odlično' || sleep === 'Dobro';
      const isEnergyGood = energy === 'Pun/a' || energy === 'Osrednje';
      const isStressLow = stress === 'Nizak' || stress === 'Srednji';

      const baseRecipes = Array.isArray(recepti) ? recepti : [];

      if (baseRecipes.length > 0) {
        let filteredBase = baseRecipes;
        
        // 🔥 POPRAVLJENO - KORISTI izbjegava umjesto alergeni!
        if (filters.restrikcije && filters.restrikcije.length > 0) {
          const restrikcije = Array.isArray(filters.restrikcije) 
            ? filters.restrikcije 
            : [filters.restrikcije];
          
          filteredBase = filteredBase.filter(recipe => {
            const izbjegava = recipe.izbjegava || [];
            return restrikcije.every(r => izbjegava.includes(r));
          });
        }

        if (!isSleepGood && !isEnergyGood && !isStressLow) {
          advice = t('home.advice_tired_stressed');
          filteredRecepti = filteredBase.filter(r => 
            r.vrsta === 'Dijetalni recepti' || 
            (r.kalorije || 0) < 400 || 
            r.vrijeme?.includes('Kratko')
          );
        } else if (!isSleepGood && !isEnergyGood) {
          advice = t('home.advice_bad_sleep_low_energy');
          filteredRecepti = filteredBase.filter(r => 
            (r.proteini || 0) > 20 || 
            r.vrsta === 'Dijetalni recepti'
          );
        } else if (!isSleepGood && isStressLow) {
          advice = t('home.advice_bad_sleep_good_stress');
          filteredRecepti = filteredBase.filter(r => 
            (r.kalorije || 0) < 500 || 
            r.vrijeme?.includes('Srednje') ||
            r.vrsta === 'Dijetalni recepti'
          );
        } else if (isEnergyGood && isStressLow) {
          advice = t('home.advice_good_energy_low_stress');
          filteredRecepti = filteredBase.filter(r => 
            r.vrsta !== 'Dijetalni recepti' || 
            r.vrijeme?.includes('Duže')
          );
        } else if (isEnergyGood && !isStressLow) {
          advice = t('home.advice_good_energy_high_stress');
          filteredRecepti = filteredBase.filter(r => 
            r.vrsta === 'Deserti' || 
            r.vrsta === 'Napitki' ||
            (r.kalorije || 0) < 400
          );
        } else if (!isEnergyGood && isStressLow) {
          advice = t('home.advice_low_energy_low_stress');
          filteredRecepti = filteredBase.filter(r => 
            (r.proteini || 0) > 20 || 
            (r.ugljikohidrati || 0) > 30 ||
            r.vrsta === 'Slano'
          );
        } else {
          advice = t('home.advice_all_good');
          filteredRecepti = filteredBase.slice(0, 6);
        }

        filteredRecepti = filteredRecepti.slice(0, 6);
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

  // ============================================================
  // 7. FRIŽIDER FUNKCIJE
  // ============================================================
  const saveFridgeToDatabase = useCallback(async (items) => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) return;

    try {
      await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fridge: items || [] })
      });
      console.log('✅ Frižider spremljen u bazu');
    } catch (error) {
      console.error('❌ Greška pri spremanju frižidera:', error);
    }
  }, [user]);

  const addFridgeItem = useCallback(() => {
    if (!newItem.trim()) return;

    const isPremium = user?.premium || false;
    const maxItems = isPremium ? Infinity : 5;
    
    if (fridgeItems.length >= maxItems) {
      if (!isPremium) {
        alert(`❌ Dostigli ste maksimalni broj namirnica (5) za FREE korisnike. Postanite Premium za neograničenu listu!`);
      } else {
        alert('❌ Dostigli ste maksimalni broj namirnica.');
      }
      return;
    }

    const newItemObj = { name: newItem.trim(), purchased: false };
    const updatedItems = [...fridgeItems, newItemObj];
    setFridgeItems(updatedItems);
    setNewItem('');
    saveFridgeToDatabase(updatedItems);
  }, [newItem, fridgeItems, user, saveFridgeToDatabase]);

  const togglePurchased = useCallback((index) => {
    setFridgeItems(prev => {
      const updated = [...prev];
      if (typeof updated[index] === 'string') {
        updated[index] = { name: updated[index], purchased: false };
      }
      updated[index] = {
        ...updated[index],
        purchased: !updated[index].purchased
      };
      saveFridgeToDatabase(updated);
      return updated;
    });
  }, [saveFridgeToDatabase]);

  const findRecipesFromFridge = useCallback(async () => {
    const activeItems = fridgeItems
      .filter(item => typeof item === 'object' ? !item.purchased : true)
      .map(item => typeof item === 'object' ? item.name : item);
    
    if (activeItems.length === 0) {
      alert('Dodajte barem jednu nekupljenu namirnicu!');
      return;
    }

    try {
      setFridgeLoading(true);
      console.log('🔍 Tražim recepte za:', activeItems);
      
      const response = await fetch(`${API_URL}/api/ai-chef`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sastojci: activeItems.join(', '),
          email: user?.email || localStorage.getItem('userEmail')
        })
      });

      if (response.status === 429) {
        alert('Previše zahtjeva. Molimo sačekajte trenutak pa pokušajte ponovo.');
        setFridgeLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.recepti) {
        setRecepti(data.recepti);
        console.log('✅ Pronađeno recepata:', data.recepti.length);
        document.getElementById('recipes-section')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        alert('Nema recepata za ove namirnice. Pokušajte dodati još namirnica.');
      }
    } catch (error) {
      console.error('❌ Greška pri pretrazi:', error);
      alert('Došlo je do greške. Pokušajte ponovo.');
    } finally {
      setFridgeLoading(false);
    }
  }, [fridgeItems, user]);

  const handleNamirniceDodane = useCallback((namirnice) => {
    const isPremium = user?.premium || false;
    const maxItems = isPremium ? Infinity : 5;
    
    if (fridgeItems.length + namirnice.length > maxItems) {
      if (!isPremium) {
        alert(`❌ Ne možete dodati više od 5 namirnica. Trenutno imate ${fridgeItems.length} od 5. Postanite Premium za neograničenu listu!`);
        return;
      }
    }

    const newItems = namirnice.map(item => ({ name: item, purchased: false }));
    const updatedItems = [...fridgeItems, ...newItems];
    setFridgeItems(updatedItems);
    setScanPoruka(`✅ Dodano ${namirnice.length} namirnica u frižider!`);
    setTimeout(() => setScanPoruka(''), 4000);
    saveFridgeToDatabase(updatedItems);
  }, [fridgeItems, user, saveFridgeToDatabase]);

  const removeFridgeItem = useCallback((index) => {
    const updatedItems = fridgeItems.filter((_, i) => i !== index);
    setFridgeItems(updatedItems);
    saveFridgeToDatabase(updatedItems);
  }, [fridgeItems, saveFridgeToDatabase]);

  const clearFridge = useCallback(() => {
    if (fridgeItems.length === 0) return;
    if (window.confirm('Jeste li sigurni da želite očistiti frižider?')) {
      setFridgeItems([]);
      saveFridgeToDatabase([]);
    }
  }, [fridgeItems, saveFridgeToDatabase]);

  const remainingFreeSlots = useMemo(() => {
    if (user?.premium) return Infinity;
    return Math.max(0, 5 - fridgeItems.length);
  }, [user?.premium, fridgeItems.length]);

  const remainingToBuy = useMemo(() => {
    return fridgeItems.filter(item => {
      if (typeof item === 'object') return !item.purchased;
      return true;
    }).length;
  }, [fridgeItems]);

  const activeFiltersCount = Object.values(filters).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== '';
  }).length;

  // ============================================================
  // 8. KONFIGURACIJA
  // ============================================================
  const categories = [
    { id: 'dijetalni', icon: '🥗', label: t('home.categories.diet', { defaultValue: 'Dijetalno' }), link: '/recipes?vrsta=Dijetalni%20recepti' },
    { id: 'deserti', icon: '🍰', label: t('home.categories.desserts', { defaultValue: 'Deserti' }), link: '/recipes?vrsta=Deserti' },
    { id: 'slana', icon: '🍕', label: t('home.categories.savory', { defaultValue: 'Slana jela' }), link: '/recipes?vrsta=Slano' },
    { id: 'kviz', icon: '🧠', label: t('home.categories.quiz', { defaultValue: 'Kviz' }), link: '/quiz' },
    { id: 'ai', icon: '🤖', label: t('home.categories.ai_chef', { defaultValue: 'AI Chef' }), link: '/ai-chef' },
    { id: 'napitki', icon: '🍹', label: t('home.categories.drinks', { defaultValue: 'Napitki' }), link: '/recipes?vrsta=Napitki' },
  ];

  const healthyChefCategories = [
    { id: 'hormonski', icon: '🩸', label: t('home.healthychef.hormonal', { defaultValue: 'Hormonski' }) },
    { id: 'tiroida', icon: '🦋', label: t('home.healthychef.thyroid', { defaultValue: 'Tiroida' }) },
    { id: 'anemija', icon: '🩸', label: t('home.healthychef.anemia', { defaultValue: 'Anemija' }) },
    { id: 'kosti', icon: '🦴', label: t('home.healthychef.bones', { defaultValue: 'Kosti' }) },
    { id: 'menopauza', icon: '👵', label: t('home.healthychef.menopause', { defaultValue: 'Menopauza' }) },
    { id: 'pcos', icon: '💉', label: t('home.healthychef.pcos', { defaultValue: 'PCOS' }) },
  ];

  const foodPlannerFeatures = [
    { icon: '😊', label: t('home.foodplanner.emoji', { defaultValue: 'Emocionalni unos' }), desc: t('home.foodplanner.emoji_desc', { defaultValue: 'Biraj emoji prije/poslije' }) },
    { icon: '🤖', label: t('home.foodplanner.ai', { defaultValue: 'AI preporuke' }), desc: t('home.foodplanner.ai_desc', { defaultValue: 'Na osnovu raspoloženja' }) },
    { icon: '📈', label: t('home.foodplanner.chart', { defaultValue: 'Grafikon' }), desc: t('home.foodplanner.chart_desc', { defaultValue: 'Vizuelni prikaz kroz sedmicu' }) },
    { icon: '⌚', label: t('home.foodplanner.watch', { defaultValue: 'Smartwatch' }), desc: t('home.foodplanner.watch_desc', { defaultValue: 'Apple Health, Google Fit' }) },
    { icon: '📄', label: t('home.foodplanner.pdf', { defaultValue: 'PDF izvještaj' }), desc: t('home.foodplanner.pdf_desc', { defaultValue: 'Sedmični/mjesečni' }) },
    { icon: '📅', label: t('home.foodplanner.plan', { defaultValue: 'Plan obroka' }), desc: t('home.foodplanner.plan_desc', { defaultValue: 'AI plan po raspoloženju' }) },
  ];

  const vrstaOptions = [
    { value: 'Slano', label: '🍕 ' + t('home.filters.savory', { defaultValue: 'Slano' }) },
    { value: 'Deserti', label: '🍰 ' + t('home.filters.desserts', { defaultValue: 'Deserti' }) },
    { value: 'Dijetalni recepti', label: '🥗 ' + t('home.filters.diet', { defaultValue: 'Dijetalno' }) },
    { value: 'Napitki', label: '🍹 ' + t('home.filters.drinks', { defaultValue: 'Napitki' }) }
  ];
  const vrijemeOptions = [
    { value: 'Kratko (15-30 min)', label: '⚡ ' + t('home.filters.short', { defaultValue: 'Kratko' }) },
    { value: 'Srednje (30-45 min)', label: '⏳ ' + t('home.filters.medium', { defaultValue: 'Srednje' }) },
    { value: 'Duže (45-60+ min)', label: '🐢 ' + t('home.filters.long', { defaultValue: 'Duže' }) }
  ];
  const tezinaOptions = [
    { value: 'Početnik', label: '👶 ' + t('home.filters.beginner', { defaultValue: 'Početnik' }) },
    { value: 'Srednji', label: '👨‍🍳 ' + t('home.filters.intermediate', { defaultValue: 'Srednji' }) },
    { value: 'Profesionalac', label: '👨‍🍳⭐ ' + t('home.filters.professional', { defaultValue: 'Profesionalac' }) }
  ];

  const isPremium = user?.premium || false;

  // ============================================================
  // 9. RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* ===== HERO SEKCIJA ===== */}
      <section className="text-center py-12 md:py-20 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-gray-800 dark:text-white mb-2 leading-tight">
          {t('home.hero.title', { defaultValue: 'OS Zdravlja' })}
        </h1>
        <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-500 dark:text-gray-400 mb-4">
          {t('home.hero.subtitle', { defaultValue: 'Operativni sistem za tvoje zdravlje' })}
        </p>
        <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
          {t('home.hero.description', { defaultValue: 'Otkrivajte recepte prilagođene vašim potrebama, dijetama i ukusu.' })}
        </p>
        <div className="flex flex-row justify-center gap-3 sm:gap-4 md:gap-6 flex-wrap">
          <Link to="/quiz" className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-8 md:px-12 py-3 sm:py-4 rounded-2xl text-sm sm:text-base md:text-xl font-bold transition shadow-lg hover:shadow-xl flex items-center gap-2">
            🧠 {t('home.hero.start_quiz', { defaultValue: 'Započni kviz' })}
          </Link>
          <Link to="/ai-chef" className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-8 md:px-12 py-3 sm:py-4 rounded-2xl text-sm sm:text-base md:text-xl font-bold transition shadow-lg hover:shadow-xl flex items-center gap-2">
            🤖 {t('home.hero.ai_chef', { defaultValue: 'AI Chef pretraga' })}
          </Link>
        </div>
      </section>

      {/* ===== PORUKA AKO NEMA PROFILA ===== */}
      {!profilLoading && !profil && (
        <section className="py-4 px-4 max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">🧠</p>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {t('home.no_profile.title', { defaultValue: 'Personalizujte svoje iskustvo!' })}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('home.no_profile.description', { defaultValue: 'Popunite kratki kviz i mi ćemo vam prikazati recepte koji su savršeni za vas.' })}
            </p>
            <Link 
              to="/quiz" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition inline-block"
            >
              🧠 {t('home.no_profile.button', { defaultValue: 'Započni kviz' })}
            </Link>
          </div>
        </section>
      )}

      {/* ===== PRIKAZ PROFILA IZ KVIZA ===== */}
      {!profilLoading && profil && (
        <section className="py-6 px-4 max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 shadow-lg border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              👤 {t('home.profile.title', { defaultValue: 'Tvoj profil' })}
              {profil.kviz_zavrsen && (
                <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                  ✅ {t('home.profile.completed', { defaultValue: 'Kviz završen' })}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">{t('home.profile.name', { defaultValue: 'Ime' })}</p>
                <p className="font-semibold text-gray-800 dark:text-white">{profil.ime || t('home.profile.not_set', { defaultValue: 'Nije uneseno' })}</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">🍽️ {t('home.profile.eat', { defaultValue: 'Želiš jesti' })}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profil.vrsta && profil.vrsta.length > 0 ? (
                    profil.vrsta.map(item => (
                      <span key={item} className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs">
                        {translateValue(item, 'vrsta')}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">{t('home.profile.not_selected', { defaultValue: 'Nije odabrano' })}</span>
                  )}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">💪 {t('home.profile.prefers', { defaultValue: 'Preferiraš' })}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profil.preferencije && profil.preferencije.length > 0 ? (
                    profil.preferencije.map(item => (
                      <span key={item} className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs">
                        {translateValue(item, 'preferencije')}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">{t('home.profile.not_selected', { defaultValue: 'Nije odabrano' })}</span>
                  )}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs">🚫 {t('home.profile.avoids', { defaultValue: 'Izbjegavaš' })}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profil.izbjegava && profil.izbjegava.length > 0 ? (
                    profil.izbjegava.map(item => (
                      <span key={item} className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full text-xs">
                        {translateValue(item, 'restrikcije')}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">{t('home.profile.not_selected', { defaultValue: 'Nije odabrano' })}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span>⏱️ {translateValue(profil.vrijeme, 'vrijeme')}</span>
              <span>👨‍🍳 {translateValue(profil.tezina, 'tezina')}</span>
              <span>🔥 {translateValue(profil.kalorije, 'kalorije')}</span>
            </div>
          </div>
        </section>
      )}

      {/* ===== AD BANNER 1 ===== */}
      {!isPremium && (
        <section className="py-3 px-4 flex justify-center bg-gray-50 dark:bg-gray-800">
          <div className="w-full max-w-4xl">
            <AdBanner slot={DEFAULT_SLOTS.banner} className="mx-auto" />
          </div>
        </section>
      )}

      {/* ===== KATEGORIJE ===== */}
      <section className="py-12 md:py-20 px-4 flex justify-center bg-white dark:bg-gray-900">
        <div className="w-full max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 text-gray-800 dark:text-white">
            {t('home.categories.title', { defaultValue: 'IZABERI KATEGORIJU' })}
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
            🧘 {t('home.lifestyle.title', { defaultValue: 'Lifestyle Coach' })}
            <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>
          </h2>
          <div className="bg-white dark:bg-gray-700 rounded-2xl p-6 md:p-8 shadow-md">
            <div className="flex flex-wrap gap-4 justify-center">
              <select value={sleep} onChange={(e) => setSleep(e.target.value)} className="border rounded-lg px-4 py-2 text-base dark:bg-gray-600 dark:text-white dark:border-gray-500 flex-1 min-w-[120px] max-w-[180px]">
                <option value="">😴 {t('home.lifestyle.sleep', { defaultValue: 'San' })}</option>
                <option value="Odlično">😁 {t('home.lifestyle.excellent', { defaultValue: 'Odlično' })}</option>
                <option value="Dobro">🙂 {t('home.lifestyle.good', { defaultValue: 'Dobro' })}</option>
                <option value="Loše">😩 {t('home.lifestyle.bad', { defaultValue: 'Loše' })}</option>
              </select>
              <select value={energy} onChange={(e) => setEnergy(e.target.value)} className="border rounded-lg px-4 py-2 text-base dark:bg-gray-600 dark:text-white dark:border-gray-500 flex-1 min-w-[120px] max-w-[180px]">
                <option value="">⚡ {t('home.lifestyle.energy', { defaultValue: 'Energija' })}</option>
                <option value="Pun/a">⚡ {t('home.lifestyle.full', { defaultValue: 'Pun/a' })}</option>
                <option value="Osrednje">😐 {t('home.lifestyle.moderate', { defaultValue: 'Osrednje' })}</option>
                <option value="Umoran/a">😴 {t('home.lifestyle.tired', { defaultValue: 'Umoran/a' })}</option>
              </select>
              <select value={stress} onChange={(e) => setStress(e.target.value)} className="border rounded-lg px-4 py-2 text-base dark:bg-gray-600 dark:text-white dark:border-gray-500 flex-1 min-w-[120px] max-w-[180px]">
                <option value="">😊 {t('home.lifestyle.stress', { defaultValue: 'Stres' })}</option>
                <option value="Nizak">😊 {t('home.lifestyle.low', { defaultValue: 'Nizak' })}</option>
                <option value="Srednji">😐 {t('home.lifestyle.moderate', { defaultValue: 'Srednji' })}</option>
                <option value="Visok">😰 {t('home.lifestyle.high', { defaultValue: 'Visok' })}</option>
              </select>
              <button onClick={getCoachAdvice} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-base font-semibold transition">
                💡 {t('home.lifestyle.get_advice', { defaultValue: 'Dobij preporuke' })}
              </button>
            </div>
            
            {coachAdvice && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-xl border border-blue-200 dark:border-blue-700">
                <p className="text-gray-700 dark:text-gray-300 text-base">{coachAdvice}</p>
              </div>
            )}

            {coachRecipes.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">🍽️ {t('home.lifestyle.recommended', { defaultValue: 'Preporučeni recepti za vas:' })}</h4>
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

      {/* ===== MOJ FRIŽIDER ===== */}
      <section className="py-12 md:py-20 px-4 flex justify-center bg-white dark:bg-gray-900">
  <div className="w-full max-w-3xl">
    <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800 dark:text-white flex items-center justify-center gap-2 flex-wrap">
      🛒 {t('home.fridge.title', { defaultValue: 'Moj frižider' })}
      <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>
    </h2>
    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-md border border-gray-200 dark:border-gray-700">
      
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text" 
          value={newItem} 
          onChange={(e) => setNewItem(e.target.value)} 
          placeholder={t('home.fridge.placeholder', { defaultValue: 'Dodaj namirnicu...' })} 
          className="flex-1 border rounded-lg px-4 py-3 text-base dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === 'Enter' && addFridgeItem()} 
        />
        <button 
          onClick={addFridgeItem} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!newItem.trim() || (!isPremium && fridgeItems.length >= 5)}
        >
          ➕ {t('home.fridge.add', { defaultValue: 'Dodaj' })}
        </button>
      </div>

      {!isPremium && (
        <div className="mt-2 flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            📊 {fridgeItems.length} / 5 {t('home.fridge.ingredients')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ⭐ {t('home.fridge.remaining')}: {remainingFreeSlots} {t('home.fridge.slots')}
          </span>
        </div>
      )}

      {fridgeItems.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              📋 {t('home.fridge.total')}: {fridgeItems.length} {fridgeItems.length === 1 ? t('home.fridge.ingredient') : t('home.fridge.ingredients')}
            </span>
            <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              ⏳ {t('home.fridge.remaining_to_buy')}: {remainingToBuy}
            </span>
          </div>
        </div>
      )}

            <div className="mt-4 space-y-2">
              {fridgeItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                  <span className="text-4xl block mb-2">🛒</span>
                  <p>{t('home.fridge.empty', { defaultValue: 'Frižider je prazan.' })}</p>
                  <p className="text-sm">{t('home.fridge.empty_hint', { defaultValue: 'Dodajte namirnice koje trebate kupiti.' })}</p>
                </div>
              ) : (
                fridgeItems.map((item, index) => {
                  const isPurchased = typeof item === 'object' ? item.purchased : false;
                  const itemName = typeof item === 'object' ? item.name : item;
                  
                  return (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition group"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => togglePurchased(index)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${
                            isPurchased 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300 dark:border-gray-500 hover:border-blue-500'
                          }`}
                        >
                          {isPurchased && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        
                        <span className={`text-base dark:text-white flex-1 ${
                          isPurchased ? 'line-through text-gray-400 dark:text-gray-500' : ''
                        }`}>
                          {itemName}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => removeFridgeItem(index)}
                        className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                        title={t('home.fridge.delete', { defaultValue: 'Obriši' })}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={findRecipesFromFridge}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-full text-sm md:text-base font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={fridgeItems.length === 0 || fridgeLoading}
              >
                {fridgeLoading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    ⏳ Pretražujem...
                  </>
                ) : (
                  `🔍 ${t('home.fridge.find_recipes', { defaultValue: 'Pronađi recepte' })}${fridgeItems.length > 0 ? ` (${fridgeItems.length})` : ''}`
                )}
              </button>

              {fridgeItems.length > 0 && (
                <button 
            onClick={clearFridge}
  className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-full text-sm font-semibold transition"
>
  🗑️ Očisti
                </button>
              )}
            </div>

            {!user?.premium && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-xs text-center text-gray-600 dark:text-gray-300">
                  ⭐ Postanite Premium za <strong>neograničenu</strong> listu namirnica!
                </p>
                <Link 
                  to="/premium" 
                  className="block text-center text-xs text-yellow-600 dark:text-yellow-400 hover:underline font-semibold mt-1"
                >
                  Postani Premium →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== AD BANNER 2 ===== */}
      {!isPremium && (
        <section className="py-3 px-4 flex justify-center bg-gray-50 dark:bg-gray-800">
          <div className="w-full max-w-4xl">
            <AdBanner slot={DEFAULT_SLOTS.inFeed} className="mx-auto" />
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
                <h3 className="text-2xl md:text-4xl font-extrabold text-white mb-2 text-center px-4">{t('home.premium.title', { defaultValue: 'Premium sadržaj' })}</h3>
                <p className="text-white/80 text-center px-4 mb-4 max-w-md text-sm md:text-base">{t('home.premium.description', { defaultValue: 'Otključajte Potpuni Food Planner i sve Premium funkcionalnosti!' })}</p>
                <Link to="/premium" className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 md:px-10 py-3 md:py-4 rounded-full font-bold transition shadow-lg hover:shadow-xl text-sm md:text-lg">⭐ {t('home.premium.button', { defaultValue: 'Postani Premium' })}</Link>
              </div>
            )}
            <div className={`${!user?.premium ? 'opacity-50' : ''}`}>
              <div className="flex flex-wrap items-center justify-between mb-4">
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white flex items-center gap-2 md:gap-3">
                  📊 {t('home.foodplanner.title', { defaultValue: 'Potpuni Food Planner' })}
                  {user?.premium && <span className="inline-block bg-green-200 dark:bg-green-600 text-green-800 dark:text-green-200 px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-bold">✅ {t('home.premium.unlocked', { defaultValue: 'Otključano' })}</span>}
                  {!user?.premium && <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-bold">⭐ PREMIUM</span>}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-xl mb-6">{t('home.foodplanner.description', { defaultValue: 'Pratite svoje obroke, analizirajte ishranu i planirajte sedmicu uz AI asistenta.' })}</p>
              
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
                    <h4 className="font-bold text-sm md:text-xl text-gray-700 dark:text-gray-200">{t('home.foodplanner.connected', { defaultValue: 'Povezano sa Lifestyle Coach-om' })}</h4>
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-300">{t('home.foodplanner.connected_desc', { defaultValue: 'Preporuke se automatski dodaju u Dnevnik' })}</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                {user?.premium ? (
                  <Link to="/food-planner" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-14 py-3 md:py-5 rounded-full text-sm md:text-xl font-bold transition shadow-md hover:shadow-lg">📊 {t('home.foodplanner.open', { defaultValue: 'Otvori Dnevnik ishrane' })}</Link>
                ) : (
                  <Link to="/premium" className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-8 md:px-14 py-3 md:py-5 rounded-full text-sm md:text-xl font-bold transition shadow-md hover:shadow-lg">⭐ {t('home.premium.unlock_all', { defaultValue: 'Postani Premium i otključaj sve' })}</Link>
                )}
                <p className="text-[10px] md:text-sm text-gray-400 dark:text-gray-400 mt-3">
                  {user?.premium ? '✅ ' + t('home.premium.all_unlocked', { defaultValue: 'Sve funkcionalnosti su dostupne!' }) : '🔒 ' + t('home.premium.all_locked', { defaultValue: 'Sve funkcionalnosti su zaključane. Postanite Premium da ih koristite.' })}
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
            <AdBanner slot={DEFAULT_SLOTS.banner} className="mx-auto" />
          </div>
        </section>
      )}

      {/* ===== HEALTHYCHEF ===== */}
      <section className="py-12 md:py-20 px-4 flex justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div className="w-full max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-1 text-gray-800 dark:text-white flex items-center justify-center gap-3 flex-wrap">
              🌿 {t('home.healthychef.title', { defaultValue: 'HealthyChef' })}
              <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-bold">⭐ PREMIUM</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-base md:text-xl mb-6">
              {t('home.healthychef.description', { defaultValue: 'Personalizovani recepti za vaše zdravstvene potrebe.' })}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
              {healthyChefCategories.map(cat => (
                <div 
                  key={cat.id} 
                  className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 opacity-80 cursor-default"
                >
                  <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-2 sm:mb-3">{cat.icon}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg text-center">{cat.label}</span>
                </div>
              ))}
            </div>
            
            <Link 
              to="/healthy-chef" 
              className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-10 py-4 rounded-full text-base md:text-xl font-semibold transition shadow-md hover:shadow-lg"
            >
              🌿 {t('home.healthychef.open', { defaultValue: 'Otvori HealthyChef' })}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== PREPORUČENI RECEPTI ===== */}
      <section id="recipes-section" className="py-12 md:py-20 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8 text-gray-800 dark:text-white">
          🍽️ {t('home.recipes.title', { defaultValue: 'Preporučeni recepti' })}
          {activeFiltersCount > 0 && (
            <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
              {activeFiltersCount} {t('home.recipes.filters_active', { defaultValue: 'filtera aktivno' })}
            </span>
          )}
        </h2>

        <div className="flex flex-wrap justify-center gap-3 mb-6 md:mb-8">
          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.vrsta} 
            onChange={(e) => handleFilterChange('vrsta', e.target.value)}
          >
            <option value="">🍽️ {t('home.filters.all_types', { defaultValue: 'Sve vrste' })}</option>
            {vrstaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.vrijeme} 
            onChange={(e) => handleFilterChange('vrijeme', e.target.value)}
          >
            <option value="">⏱️ {t('home.filters.all_time', { defaultValue: 'Svo vrijeme' })}</option>
            {vrijemeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.tezina} 
            onChange={(e) => handleFilterChange('tezina', e.target.value)}
          >
            <option value="">🏋️ {t('home.filters.all_difficulty', { defaultValue: 'Sva težina' })}</option>
            {tezinaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>

          <select 
            className="border rounded-lg px-3 md:px-5 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 flex-1 min-w-[100px] max-w-[180px]" 
            value={filters.preferencije} 
            onChange={(e) => handleFilterChange('preferencije', e.target.value)}
          >
            <option value="">💪 {t('home.filters.preferences', { defaultValue: 'Sve preferencije' })}</option>
            <option value="Visokoproteinski">💪 {t('home.filters.high_protein', { defaultValue: 'Visokoproteinski' })}</option>
            <option value="Bogat vlaknima">🌾 {t('home.filters.high_fiber', { defaultValue: 'Bogat vlaknima' })}</option>
            <option value="Bogat ugljikohidratima">🍞 {t('home.filters.high_carbs', { defaultValue: 'Bogat ugljikohidratima' })}</option>
          </select>

          <button 
            onClick={handleResetFilters} 
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-semibold transition"
          >
            🔄 {t('home.filters.reset', { defaultValue: 'Reset' })}
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400 text-base md:text-lg">{t('home.recipes.loading', { defaultValue: 'Učitavanje recepata...' })}</p>
        ) : filteredReceptiMemo.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredReceptiMemo.slice(0, 6).map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg">{t('home.recipes.no_results', { defaultValue: 'Nema recepata koji odgovaraju filterima.' })}</p>
            <button 
              onClick={handleResetFilters}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
            >
              {t('home.recipes.reset_filters', { defaultValue: 'Resetuj filtere' })}
            </button>
          </div>
        )}
      </section>

      {/* ===== AD BANNER 4 ===== */}
      {!isPremium && (
        <section className="py-3 px-4 flex justify-center bg-gray-50 dark:bg-gray-800">
          <div className="w-full max-w-4xl">
            <AdBanner slot={DEFAULT_SLOTS.native} className="mx-auto" />
          </div>
        </section>
      )}
      
    </div>
  );
};

export default HomeKonacno;