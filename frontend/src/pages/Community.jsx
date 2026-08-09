// frontend/src/pages/Community.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// 🔥 SAMO OPCIJE KOJE POSTOJE U KVIZU
const getAlergeniOpcije = (t) => [
  { key: 'bez_glutena', label: t('community.alergeni.bez_glutena') },
  { key: 'bez_laktoze', label: t('community.alergeni.bez_laktoze') },
  { key: 'bez_secera', label: t('community.alergeni.bez_secera') },
  { key: 'veganski', label: t('community.alergeni.veganski') },
  { key: 'bez_orasastih', label: t('community.alergeni.bez_orasastih') }
];

const alergenKeyToValue = {
  'bez_glutena': 'Bez glutena',
  'bez_laktoze': 'Bez laktoze',
  'bez_secera': 'Bez šećera',
  'veganski': 'Veganski',
  'bez_orasastih': 'Bez orašastih plodova'
};

const POSTS_PER_PAGE = 10;

// ============================================================
// 🔥🔥🔥 PREVEDENE FILTER OPCIJE
// ============================================================
const getVrstaOpcije = (t) => [
  { value: '', label: t('community.filters.all_types', { defaultValue: '🍽️ Sve vrste' }) },
  { value: 'Slano', label: t('community.filters.savory', { defaultValue: '🍕 Slano' }) },
  { value: 'Deserti', label: t('community.filters.desserts', { defaultValue: '🍰 Deserti' }) },
  { value: 'Dijetalni recepti', label: t('community.filters.diet', { defaultValue: '🥗 Dijetalno' }) },
  { value: 'Napitki', label: t('community.filters.drinks', { defaultValue: '🍹 Napitki' }) }
];

const getVrijemeOpcije = (t) => [
  { value: '', label: t('community.filters.all_time', { defaultValue: '⏱️ Svo vrijeme' }) },
  { value: 'Kratko (15-30 min)', label: t('community.filters.short', { defaultValue: '⚡ Kratko' }) },
  { value: 'Srednje (30-45 min)', label: t('community.filters.medium', { defaultValue: '⏳ Srednje' }) },
  { value: 'Duže (45-60+ min)', label: t('community.filters.long', { defaultValue: '🐢 Duže' }) }
];

const getTezinaOpcije = (t) => [
  { value: '', label: t('community.filters.all_difficulty', { defaultValue: '🏋️ Sva težina' }) },
  { value: 'Početnik', label: t('community.filters.beginner', { defaultValue: '👶 Početnik' }) },
  { value: 'Srednji', label: t('community.filters.intermediate', { defaultValue: '👨‍🍳 Srednji' }) },
  { value: 'Profesionalac', label: t('community.filters.professional', { defaultValue: '👨‍🍳⭐ Profesionalac' }) }
];

const getKalorijeOpcije = (t) => [
  { value: '', label: t('community.filters.all_calories', { defaultValue: '🔥 Sve kalorije' }) },
  { value: 'do_300', label: t('community.filters.low_cal', { defaultValue: '🔥 Do 300 kcal' }) },
  { value: '300_500', label: t('community.filters.medium_cal', { defaultValue: '🔥 300-500 kcal' }) },
  { value: '500_700', label: t('community.filters.high_cal', { defaultValue: '🔥 500-700 kcal' }) },
  { value: '900_plus', label: t('community.filters.very_high_cal', { defaultValue: '🔥 900+ kcal' }) }
];

const Community = () => {
  const { t, i18n } = useTranslation();
  const [objave, setObjave] = useState([]);
  const [filteredObjave, setFilteredObjave] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [profilLoading, setProfilLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // 🔥 State za prikaz notifikacije o bedževima
  const [badgeNotification, setBadgeNotification] = useState(null);

  const [filters, setFilters] = useState({
    vrsta: '',
    alergeni: [],
    vrijeme: '',
    tezina: '',
    kalorije: ''
  });

  const [novaObjava, setNovaObjava] = useState({
    naziv: '',
    vrsta: '',
    opis: '',
    sastojci: '',
    slika: null,
    alergeni: [],
    vrijeme: '',
    tezina: ''
  });

  const alergeniOpcije = getAlergeniOpcije(t);

  // ============================================================
  // 1. DOHVATI KORISNIKA I PROFIL
  // ============================================================
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    const email = userData?.email || localStorage.getItem('userEmail');
    if (email) {
      fetchProfile(email);
    }
    
    fetchObjave();
  }, []);

  // ============================================================
  // 🔥 IZMJENJEN fetchProfile - ISKLJUČEN KALORIJE FILTER!
  // ============================================================
  const fetchProfile = async (email) => {
    try {
      setProfilLoading(true);
      const res = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        setProfil(data.data);
        
        const newFilters = {};
        
        if (data.data.vrsta && data.data.vrsta.length > 0) {
          const vrste = data.data.vrsta.filter(v => v !== 'Svejedno');
          if (vrste.length > 0) {
            newFilters.vrsta = vrste[0];
          }
        }
        
        if (data.data.izbjegava && data.data.izbjegava.length > 0) {
          const restrikcije = data.data.izbjegava.filter(r => r !== 'Bez restrikcija');
          if (restrikcije.length > 0) {
            newFilters.alergeni = restrikcije;
          }
        }
        
        if (data.data.vrijeme) {
          newFilters.vrijeme = data.data.vrijeme;
        }
        
        if (data.data.tezina) {
          newFilters.tezina = data.data.tezina;
        }
        
        // 🔥🔥🔥 KALORIJE FILTER JE ISKLJUČEN - NE POSTAVLJA SE AUTOMATSKI!
        // Korisnik će morati ručno odabrati filter za kalorije ako želi
        // if (data.data.kalorije) {
        //   const kalorijeMap = {
        //     'Nisko (do 300 kcal)': 'do_300',
        //     'Umjereno (300-500 kcal)': '300_500',
        //     'Srednje (500-700 kcal)': '500_700',
        //     'Visoko (900+ kcal)': '900_plus'
        //   };
        //   newFilters.kalorije = kalorijeMap[data.data.kalorije] || '';
        // }
        
        setFilters(prev => ({ ...prev, ...newFilters }));
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu profila:', error);
    } finally {
      setProfilLoading(false);
    }
  };

  // ============================================================
  // 📥 DOHVATI OBJAVE - SA BOLJIM LOGOVIMA
  // ============================================================
  const fetchObjave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Dohvatam objave...');
      const res = await fetch(`${API_URL}/api/community/objave`);
      console.log('📥 Response status:', res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('📥 Podaci iz API-ja:', data);
      
      if (data && Array.isArray(data.data)) {
        console.log('✅ Postavljam objave (data.data):', data.data.length);
        setObjave(data.data);
        setFilteredObjave(data.data);
      } else if (Array.isArray(data)) {
        console.log('✅ Postavljam objave (array):', data.length);
        setObjave(data);
        setFilteredObjave(data);
      } else {
        console.warn('⚠️ API nije vratio niz:', data);
        setObjave([]);
        setFilteredObjave([]);
      }
    } catch (error) {
      console.error('❌ Greška pri dohvatu objava:', error);
      setError(error.message);
      setObjave([]);
      setFilteredObjave([]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 2. FILTRIRANJE OBJAVA - SA LOGOVIMA
  // ============================================================
  useEffect(() => {
    console.log('🔍 Filtriram objave, ukupno:', objave.length);
    console.log('🔍 Aktivni filteri:', filters);
    
    let filtered = [...objave];
    
    if (filters.vrsta) {
      filtered = filtered.filter(objava => objava.vrsta === filters.vrsta);
      console.log('🔍 Nakon filtera vrsta:', filtered.length);
    }
    
    if (filters.alergeni && filters.alergeni.length > 0) {
      filtered = filtered.filter(objava => {
        const objavaAlergeni = objava.alergeni || [];
        return !filters.alergeni.some(restrikcija => 
          objavaAlergeni.includes(restrikcija)
        );
      });
      console.log('🔍 Nakon filtera alergeni:', filtered.length);
    }
    
    if (filters.vrijeme) {
      filtered = filtered.filter(objava => objava.vrijeme === filters.vrijeme);
      console.log('🔍 Nakon filtera vrijeme:', filtered.length);
    }
    
    if (filters.tezina) {
      filtered = filtered.filter(objava => objava.tezina === filters.tezina);
      console.log('🔍 Nakon filtera tezina:', filtered.length);
    }
    
    if (filters.kalorije) {
      const kalorijeMap = {
        'do_300': { max: 300 },
        '300_500': { min: 300, max: 500 },
        '500_700': { min: 500, max: 700 },
        '900_plus': { min: 900 }
      };
      
      const range = kalorijeMap[filters.kalorije];
      if (range) {
        filtered = filtered.filter(objava => {
          const kal = objava.kalorije || 0;
          if (range.min && range.max) return kal >= range.min && kal <= range.max;
          if (range.min) return kal >= range.min;
          if (range.max) return kal <= range.max;
          return true;
        });
        console.log('🔍 Nakon filtera kalorije:', filtered.length);
      }
    }
    
    console.log('🔍 Ukupno nakon filtriranja:', filtered.length);
    setFilteredObjave(filtered);
    setCurrentPage(1);
  }, [objave, filters]);

  // ============================================================
  // 3. HANDLERI
  // ============================================================
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    if (profil) {
      const resetFilters = {};
      
      if (profil.vrsta && profil.vrsta.length > 0) {
        const vrste = profil.vrsta.filter(v => v !== 'Svejedno');
        if (vrste.length > 0) {
          resetFilters.vrsta = vrste[0];
        }
      }
      
      if (profil.izbjegava && profil.izbjegava.length > 0) {
        const restrikcije = profil.izbjegava.filter(r => r !== 'Bez restrikcija');
        if (restrikcije.length > 0) {
          resetFilters.alergeni = restrikcije;
        }
      }
      
      if (profil.vrijeme) resetFilters.vrijeme = profil.vrijeme;
      if (profil.tezina) resetFilters.tezina = profil.tezina;
      
      // 🔥 NE RESETUJ KALORIJE - ostavi prazno
      // if (profil.kalorije) {
      //   const kalorijeMap = {
      //     'Nisko (do 300 kcal)': 'do_300',
      //     'Umjereno (300-500 kcal)': '300_500',
      //     'Srednje (500-700 kcal)': '500_700',
      //     'Visoko (900+ kcal)': '900_plus'
      //   };
      //   resetFilters.kalorije = kalorijeMap[profil.kalorije] || '';
      // }
      
      setFilters(prev => ({ ...prev, ...resetFilters }));
    } else {
      setFilters({
        vrsta: '',
        alergeni: [],
        vrijeme: '',
        tezina: '',
        kalorije: ''
      });
    }
  };

  const handleLike = async (id) => {
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      const res = await fetch(`${API_URL}/api/community/objave/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      
      const data = await res.json();
      
      if (data.lajkovao) {
        const objava = objave.find(o => o.id === id);
        if (objava && objava.korisnik_email) {
          try {
            const badgeRes = await fetch(`${API_URL}/api/badges/check`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                email: objava.korisnik_email,
                akcija: 'novi_lajk',
                podaci: { objava_id: id }
              })
            });
            
            const badgeData = await badgeRes.json();
            
            if (badgeData.success && badgeData.noviBadgevi && badgeData.noviBadgevi.length > 0) {
              const badgeNames = badgeData.noviBadgevi.map(b => b.naziv).join(', ');
              setBadgeNotification({
                message: `🎉 Autor je osvojio: ${badgeNames}!`,
                type: 'success'
              });
              setTimeout(() => setBadgeNotification(null), 5000);
            }
          } catch (badgeError) {
            console.error('❌ Greška pri provjeri bedževa:', badgeError);
          }
        }
      }
      
      fetchObjave();
    } catch (error) {
      console.error('Greška pri lajkanju:', error);
    }
  };

  const toggleAlergen = (alergenKey) => {
    setNovaObjava(prev => {
      const current = prev.alergeni || [];
      if (current.includes(alergenKey)) {
        return { ...prev, alergeni: current.filter(a => a !== alergenKey) };
      } else {
        return { ...prev, alergeni: [...current, alergenKey] };
      }
    });
  };

  // ============================================================
  // 🔥 handleSubmit - slanje objave
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!user) {
      alert(t('community.alerts.login_required'));
      return;
    }

    if (!novaObjava.vrsta) {
      setSubmitError('Molimo odaberite vrstu jela.');
      return;
    }

    if (!novaObjava.naziv || novaObjava.naziv.trim() === '') {
      setSubmitError('Molimo unesite naziv recepta.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      const email = user?.email || localStorage.getItem('userEmail');
      
      formData.append('email', email);
      formData.append('naziv', novaObjava.naziv.trim());
      formData.append('vrsta', novaObjava.vrsta);
      formData.append('opis', novaObjava.opis || '');
      formData.append('sastojci', novaObjava.sastojci || '');
      if (novaObjava.slika) formData.append('slika', novaObjava.slika);
      
      const alergeniValues = (novaObjava.alergeni || []).map(key => alergenKeyToValue[key] || key);
      formData.append('alergeni', JSON.stringify(alergeniValues));
      formData.append('vrijeme', novaObjava.vrijeme || '');
      formData.append('tezina', novaObjava.tezina || '');

      console.log('📤 Šaljem objavu:', {
        email,
        naziv: novaObjava.naziv,
        vrsta: novaObjava.vrsta,
        opis: novaObjava.opis,
        sastojci: novaObjava.sastojci,
        alergeni: alergeniValues,
        vrijeme: novaObjava.vrijeme,
        tezina: novaObjava.tezina
      });

      const res = await fetch(`${API_URL}/api/community/objave`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errorMessage = `Server error: ${res.status}`;
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          const text = await res.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      const responseData = await res.json();
      console.log('✅ Objava uspješno kreirana:', responseData);

      setNovaObjava({ 
        naziv: '',
        vrsta: '',
        opis: '',
        sastojci: '',
        slika: null,
        alergeni: [],
        vrijeme: '',
        tezina: ''
      });
      
      try {
        const badgeRes = await fetch(`${API_URL}/api/badges/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: email,
            akcija: 'nova_objava'
          })
        });
        
        const badgeData = await badgeRes.json();
        
        if (badgeData.success && badgeData.noviBadgevi && badgeData.noviBadgevi.length > 0) {
          const badgeNames = badgeData.noviBadgevi.map(b => b.naziv).join(', ');
          setBadgeNotification({
            message: `🎉 Čestitamo! Osvojili ste: ${badgeNames}!`,
            type: 'success'
          });
          setTimeout(() => setBadgeNotification(null), 5000);
        }
      } catch (badgeError) {
        console.error('❌ Greška pri provjeri bedževa:', badgeError);
      }
      
      fetchObjave();
      setSubmitError(null);
      
    } catch (error) {
      console.error('❌ Greška pri objavi:', error);
      setSubmitError(error.message || 'Došlo je do greške pri objavi. Pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTranslatedAlergen = (alergenValue) => {
    const entry = Object.entries(alergenKeyToValue).find(([key, value]) => value === alergenValue);
    if (entry) {
      const key = entry[0];
      const option = alergeniOpcije.find(opt => opt.key === key);
      return option ? option.label : alergenValue;
    }
    return alergenValue;
  };

  // 🔥 PAGINACIJA
  const totalPages = Math.ceil(filteredObjave.length / POSTS_PER_PAGE);
  const getCurrentPagePosts = () => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    return filteredObjave.slice(startIndex, endIndex);
  };

  const currentPosts = getCurrentPagePosts();

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== '';
  }).length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">{t('community.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">❌ Greška: {error}</p>
        <button 
          onClick={fetchObjave}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
        >
          {t('common.retry') || 'Pokušaj ponovo'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">📝 {t('community.title')}</h1>

      {/* 🔥 NOTIFIKACIJA ZA BEDŽEVE */}
      {badgeNotification && (
        <div className={`mb-4 p-4 rounded-2xl animate-bounce-in ${
          badgeNotification.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-800 dark:text-green-200'
            : 'bg-blue-100 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-700 text-blue-800 dark:text-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <p className="font-medium">{badgeNotification.message}</p>
            <button 
              onClick={() => setBadgeNotification(null)}
              className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          🔥 FORMA ZA NOVU OBJAVU - PRVA!
      ============================================================ */}
      {user ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">➕ {t('community.share_recipe')}</h2>
          
          {submitError && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
              ❌ {submitError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vrsta jela - OBAVEZNO! */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                🍽️ {t('community.recipe_type') || 'Vrsta jela'} *
              </label>
              <select
                value={novaObjava.vrsta}
                onChange={(e) => setNovaObjava({ ...novaObjava, vrsta: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              >
                <option value="">{t('community.select_type') || 'Odaberi vrstu jela...'}</option>
                <option value="Slano">🍕 {t('community.filters.savory', { defaultValue: 'Slano' })}</option>
                <option value="Deserti">🍰 {t('community.filters.desserts', { defaultValue: 'Deserti' })}</option>
                <option value="Dijetalni recepti">🥗 {t('community.filters.diet', { defaultValue: 'Dijetalno' })}</option>
                <option value="Napitki">🍹 {t('community.filters.drinks', { defaultValue: 'Napitki' })}</option>
              </select>
            </div>

            <input
              type="text"
              placeholder={t('community.recipe_name')}
              value={novaObjava.naziv}
              onChange={(e) => setNovaObjava({ ...novaObjava, naziv: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            />
            
            <textarea
              placeholder={t('community.description')}
              value={novaObjava.opis}
              onChange={(e) => setNovaObjava({ ...novaObjava, opis: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              rows="3"
            />
            
            <input
              type="text"
              placeholder={t('community.ingredients')}
              value={novaObjava.sastojci}
              onChange={(e) => setNovaObjava({ ...novaObjava, sastojci: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />

            {/* ============================================================
                🔥 ALERGENI SA DUGMETOM "BEZ RESTRIKCIJA"
            ============================================================ */}
            <div className="border dark:border-gray-600 rounded-lg p-4">
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('community.allergens', { defaultValue: '🚫 Restrikcije / Alergeni' })}
                <span className="text-sm text-gray-400 ml-2">({t('community.select_all_that_apply', { defaultValue: 'označite sve koji se odnose' })})</span>
              </label>
              
              {/* 🔥 DUGME ZA BEZ RESTRIKCIJA */}
              <button
                type="button"
                onClick={() => setNovaObjava(prev => ({ ...prev, alergeni: [] }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition mb-2 ${
                  (novaObjava.alergeni || []).length === 0
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                ✅ Bez restrikcija
              </button>
              
              <div className="flex flex-wrap gap-2">
                {alergeniOpcije.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAlergen(key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      (novaObjava.alergeni || []).includes(key)
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              {(novaObjava.alergeni || []).length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  ✅ {t('community.selected', { defaultValue: 'Odabrano' })}: {(novaObjava.alergeni || []).map(key => {
                    const option = alergeniOpcije.find(opt => opt.key === key);
                    return option ? option.label : key;
                  }).join(', ')}
                </p>
              )}
              
              {(novaObjava.alergeni || []).length === 0 && (
                <p className="text-xs text-green-500 dark:text-green-400 mt-2">
                  ✅ Nema restrikcija - recept je dostupan svima!
                </p>
              )}
            </div>

            {/* Vrijeme i Težina */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('community.prep_time', { defaultValue: '⏱️ Vrijeme pripreme' })}
                </label>
                <select
                  value={novaObjava.vrijeme}
                  onChange={(e) => setNovaObjava({ ...novaObjava, vrijeme: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">{t('community.select_time', { defaultValue: 'Odaberi vrijeme...' })}</option>
                  <option value="Kratko (15-30 min)">⚡ {t('labels.vrijeme.kratko', { defaultValue: 'Kratko' })}</option>
                  <option value="Srednje (30-45 min)">⏳ {t('labels.vrijeme.srednje', { defaultValue: 'Srednje' })}</option>
                  <option value="Duže (45-60+ min)">🐢 {t('labels.vrijeme.dugo', { defaultValue: 'Duže' })}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('community.difficulty', { defaultValue: '👨‍🍳 Težina' })}
                </label>
                <select
                  value={novaObjava.tezina}
                  onChange={(e) => setNovaObjava({ ...novaObjava, tezina: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">{t('community.select_difficulty', { defaultValue: 'Odaberi težinu...' })}</option>
                  <option value="Početnik">👶 {t('labels.tezina.lagani', { defaultValue: 'Početnik' })}</option>
                  <option value="Srednji">👨‍🍳 {t('labels.tezina.srednji', { defaultValue: 'Srednji' })}</option>
                  <option value="Profesionalac">👨‍🍳⭐ {t('labels.tezina.teski', { defaultValue: 'Profesionalac' })}</option>
                </select>
              </div>
            </div>

            {/* Upload slike */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNovaObjava({ ...novaObjava, slika: e.target.files[0] })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {novaObjava.slika ? (
                  <span className="text-green-500 text-sm">✅ {novaObjava.slika.name}</span>
                ) : (
                  <span className="text-3xl">📸</span>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '⏳ Slanje...' : '📤 ' + t('community.post_button')}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 text-center mb-8">
          <p className="text-yellow-800 dark:text-yellow-200">
            🔒 {t('community.alerts.login_required')}
          </p>
          <Link to="/login" className="inline-block mt-2 text-blue-600 dark:text-blue-400 hover:underline">
            {t('login.title')} →
          </Link>
        </div>
      )}

      {/* ============================================================
          🔥 FILTERI - SADA ISPOD FORME (samo ako ima objava)
      ============================================================ */}
      {profil && filteredObjave.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              🔍 {t('community.filters.title', { defaultValue: 'Filteri' })}
              {activeFiltersCount > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {activeFiltersCount} {t('community.filters.active', { defaultValue: 'aktivna' })}
                </span>
              )}
            </h3>
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition"
            >
              🔄 {t('community.filters.reset', { defaultValue: 'Reset' })}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.vrsta}
              onChange={(e) => handleFilterChange('vrsta', e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              {getVrstaOpcije(t).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <select
              value={filters.vrijeme}
              onChange={(e) => handleFilterChange('vrijeme', e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              {getVrijemeOpcije(t).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <select
              value={filters.tezina}
              onChange={(e) => handleFilterChange('tezina', e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              {getTezinaOpcije(t).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <select
              value={filters.kalorije}
              onChange={(e) => handleFilterChange('kalorije', e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              {getKalorijeOpcije(t).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ============================================================
          🔥 LISTA OBJAVA
      ============================================================ */}
      {!filteredObjave || filteredObjave.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-gray-500 dark:text-gray-400">
            {filters.vrsta || filters.alergeni.length > 0 || filters.vrijeme || filters.tezina || filters.kalorije
              ? t('community.no_results', { defaultValue: 'Nema objava koje odgovaraju vašim filterima.' })
              : t('community.no_posts', { defaultValue: 'Nema objava u zajednici.' })}
          </p>
          {(filters.vrsta || filters.alergeni.length > 0 || filters.vrijeme || filters.tezina || filters.kalorije) && (
            <button
              onClick={handleResetFilters}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
            >
              {t('community.filters.reset', { defaultValue: 'Resetuj filtere' })}
            </button>
          )}
          {user && !filters.vrsta && !filters.alergeni.length && !filters.vrijeme && !filters.tezina && !filters.kalorije && (
            <p className="text-sm text-gray-400 mt-2">
              {t('community.be_first', { defaultValue: 'Budite prvi koji će podijeliti recept! 🍽️' })}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {currentPosts.map((objava, index) => (
              <div 
                key={objava.id || index} 
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition flex flex-col"
              >
                {objava.slika && (
                  <div className="w-full h-40 md:h-48 overflow-hidden">
                    <img 
                      src={objava.slika} 
                      alt={objava.naziv} 
                      className="w-full h-full object-cover hover:scale-105 transition duration-300"
                    />
                  </div>
                )}
                
                <div className="p-3 md:p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-sm md:text-base dark:text-white line-clamp-2 min-h-[2.5rem]">
                    {objava.naziv || t('community.untitled', { defaultValue: 'Bez naslova' })}
                  </h3>
                  
                  {objava.vrsta && (
                    <span className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                      🍽️ {objava.vrsta}
                    </span>
                  )}
                  
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 italic">
                    {t('community.click_for_details', { defaultValue: '📖 Za detaljalje pripreme otvorite recept' })}
                  </p>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    👤 {objava.korisnik_ime || objava.author || t('community.unknown_user')}
                  </p>
                  
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 flex-1">
                    {objava.opis || objava.description || ''}
                  </p>
                  
                  {objava.alergeni && objava.alergeni.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {objava.alergeni.slice(0, 2).map((alergen, i) => (
                        <span key={i} className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                          🚫 {getTranslatedAlergen(alergen).substring(0, 12)}
                          {getTranslatedAlergen(alergen).length > 12 && '...'}
                        </span>
                      ))}
                      {objava.alergeni.length > 2 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          +{objava.alergeni.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {(objava.vrijeme || objava.tezina) && (
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                      {objava.vrijeme && <span>⏱️ {objava.vrijeme.replace(/\s*\(.*?\)\s*/, '').substring(0, 12)}</span>}
                      {objava.tezina && <span>👨‍🍳 {objava.tezina.substring(0, 12)}</span>}
                    </div>
                  )}
                  
                  {objava.sastojci && objava.sastojci.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {objava.sastojci.slice(0, 2).map((s, i) => (
                        <span key={i} className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-[10px] text-gray-600 dark:text-gray-300">
                          {s.length > 15 ? s.substring(0, 15) + '...' : s}
                        </span>
                      ))}
                      {objava.sastojci.length > 2 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          +{objava.sastojci.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {objava.created_at && new Date(objava.created_at).toLocaleDateString(
                        i18n.language === 'hr' ? 'hr-HR' : 
                        i18n.language === 'de' ? 'de-DE' : 'en-US'
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      {objava.pregledi !== undefined && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          👁️ {objava.pregledi || 0}
                        </span>
                      )}
                      <button
                        onClick={() => handleLike(objava.id)}
                        className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition text-sm"
                      >
                        ❤️ {objava.lajkovi || 0}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                ⬅️
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-10 h-10 rounded-lg font-semibold transition ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                ➡️
              </button>
            </div>
          )}

          <div className="text-center text-sm text-gray-400 dark:text-gray-500 mt-4">
            {t('community.showing', { 
              defaultValue: 'Prikazano {{count}} od {{total}} objava',
              count: currentPosts.length, 
              total: filteredObjave.length 
            })}
            {totalPages > 1 && ` (${t('community.page', { 
              defaultValue: 'stranica {{current}}/{{total}}',
              current: currentPage, 
              total: totalPages 
            })})`}
          </div>
        </>
      )}
    </div>
  );
};

export default Community;