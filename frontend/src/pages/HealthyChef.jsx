// frontend/src/pages/HealthyChef.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================
// BREADCRUMB KOMPONENTA - ISTA KAO U HomeKonacno
// ============================================================
const Breadcrumb = ({ customLabels = {} }) => {
  const { t } = useTranslation();
  const location = window.location;
  const pathnames = location.pathname.split('/').filter(x => x);
  
  const nameMap = {
    'healthy-chef': '🌿 ' + t('healthychef.title', { defaultValue: 'HealthyChef' }),
    ...customLabels
  };

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 flex-wrap">
      <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1">
        <span>🏠</span> {t('healthychef.breadcrumb.home', { defaultValue: 'Početna' })}
      </Link>
      
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = nameMap[value] || value.charAt(0).toUpperCase() + value.slice(1);
        
        return (
          <React.Fragment key={to}>
            <span className="text-gray-400 dark:text-gray-600">›</span>
            {isLast ? (
              <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
            ) : (
              <Link to={to} className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// ============================================================
// GLAVNA KOMPONENTA
// ============================================================
const HealthyChef = () => {
  const { t } = useTranslation();
  const { kategorijaId, fazaId } = useParams();
  const navigate = useNavigate();
  const [kategorije, setKategorije] = useState([]);
  const [faze, setFaze] = useState([]);
  const [recepti, setRecepti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFaze, setLoadingFaze] = useState(false);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({
    vrsta: '',
    vrijeme: '',
    tezina: ''
  });

  const [categoryNameKey, setCategoryNameKey] = useState('');
  const [categoryNameFallback, setCategoryNameFallback] = useState('');
  const [phaseNameKey, setPhaseNameKey] = useState('');
  const [phaseNameFallback, setPhaseNameFallback] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // ============================================================
  // BOJE ZA FAZE - koristi ID umjesto naziva za mapiranje
  // ============================================================
  const phaseColors = {
    'menstrual': { bg: 'bg-red-500', border: 'border-red-600', hover: 'hover:bg-red-600', text: 'text-white' },
    'follicular': { bg: 'bg-orange-400', border: 'border-orange-500', hover: 'hover:bg-orange-500', text: 'text-white' },
    'ovulation': { bg: 'bg-yellow-400', border: 'border-yellow-500', hover: 'hover:bg-yellow-500', text: 'text-gray-800' },
    'early_luteal': { bg: 'bg-green-400', border: 'border-green-500', hover: 'hover:bg-green-500', text: 'text-white' },
    'pms': { bg: 'bg-purple-500', border: 'border-purple-600', hover: 'hover:bg-purple-600', text: 'text-white' },
    'perimenopause': { bg: 'bg-pink-400', border: 'border-pink-500', hover: 'hover:bg-pink-500', text: 'text-gray-800' },
    'menopause': { bg: 'bg-rose-500', border: 'border-rose-600', hover: 'hover:bg-rose-600', text: 'text-white' },
    'postmenopause': { bg: 'bg-purple-500', border: 'border-purple-600', hover: 'hover:bg-purple-600', text: 'text-white' },
    'tip1': { bg: 'bg-red-500', border: 'border-red-600', hover: 'hover:bg-red-600', text: 'text-white' },
    'tip2': { bg: 'bg-orange-400', border: 'border-orange-500', hover: 'hover:bg-orange-500', text: 'text-white' },
    'tip3': { bg: 'bg-yellow-400', border: 'border-yellow-500', hover: 'hover:bg-yellow-500', text: 'text-gray-800' },
    'tip4': { bg: 'bg-green-400', border: 'border-green-500', hover: 'hover:bg-green-500', text: 'text-white' },
    'tip5': { bg: 'bg-blue-500', border: 'border-blue-600', hover: 'hover:bg-blue-600', text: 'text-white' },
    'tip6': { bg: 'bg-purple-500', border: 'border-purple-600', hover: 'hover:bg-purple-600', text: 'text-white' },
  };

  const getPhaseColor = (id) => {
    return phaseColors[id] || { bg: 'bg-gray-300', border: 'border-gray-400', hover: 'hover:bg-gray-400', text: 'text-gray-800' };
  };

  // ============================================================
  // KORISNIK
  // ============================================================
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
  }, []);

  // ============================================================
  // DOHVATI KATEGORIJE I FAZE
  // ============================================================
  useEffect(() => {
    const fetchAllData = async (retry = 0) => {
      try {
        console.log(`🔄 Dohvatam podatke (pokušaj ${retry + 1})...`);
        
        const katRes = await fetch(`${API_URL}/api/healthy-chef/kategorije`);
        const katData = await katRes.json();
        console.log('📊 Kategorije dohvaćene:', katData?.length || 0);
        
        // ✅ MAPIRAJ KATEGORIJE - dodaj nazivKey za i18n
        const mappedKategorije = katData.map(kat => ({
          ...kat,
          nazivKey: `healthychef.categories.items.${kat.id}`
        }));
        setKategorije(mappedKategorije);
        
        if (kategorijaId) {
          setLoadingFaze(true);
          
          const fazeData = katData.filter(kat => kat.parent_id === kategorijaId);
          console.log('📊 Faze dohvaćene:', fazeData?.length || 0);
          
          // ✅ MAPIRAJ FAZE - dodaj nazivKey za i18n
          const mappedFaze = fazeData.map(faza => ({
            ...faza,
            nazivKey: `healthychef.phases.items.${kategorijaId}.${faza.id}`
          }));
          setFaze(mappedFaze);
          
          const kat = mappedKategorije.find(k => k.id === kategorijaId);
          if (kat) {
            setCategoryNameKey(kat.nazivKey);
            setCategoryNameFallback(kat.naziv);
          }
          
          if (fazaId) {
            const faza = mappedFaze.find(f => f.id === fazaId);
            if (faza) {
              setPhaseNameKey(faza.nazivKey);
              setPhaseNameFallback(faza.naziv);
            }
          }
          
          setLoadingFaze(false);
        }
        
        setIsDataLoaded(true);
        console.log('✅ Podaci uspješno dohvaćeni!');
      } catch (error) {
        console.error('❌ Greška pri dohvatanju podataka:', error);
        if (retry < 3) {
          console.log(`⏳ Pokušaj ${retry + 1} nije uspio, ponavljam za 500ms...`);
          setTimeout(() => fetchAllData(retry + 1), 500);
        } else {
          console.log('❌ Svi pokušaji dohvatanja podataka su propali.');
          setIsDataLoaded(true);
          setLoadingFaze(false);
        }
      }
    };
    
    fetchAllData();
  }, [kategorijaId, fazaId]);

  // ============================================================
  // DOHVATI RECEPTE
  // ============================================================
  useEffect(() => {
    if (fazaId && user && isDataLoaded) {
      const fetchRecepti = async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams({
            kategorijaId: fazaId,
            email: user.email,
            ...filters
          });
          
          const res = await fetch(`${API_URL}/api/healthy-chef/recepti?${params}`);
          const data = await res.json();
          console.log('📊 Recepti dohvaćeni:', data?.length || 0);
          setRecepti(data);
        } catch (error) {
          console.error('❌ Greška pri dohvatu recepata:', error);
          setRecepti([]);
        } finally {
          setLoading(false);
        }
      };
      fetchRecepti();
    }
  }, [fazaId, user, filters, isDataLoaded]);

  // ============================================================
  // RESET FILTERA
  // ============================================================
  const resetFilters = () => {
    setFilters({
      vrsta: '',
      vrijeme: '',
      tezina: ''
    });
  };

  // ============================================================
  // BROJ AKTIVNIH FILTERA
  // ============================================================
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  // ============================================================
  // RENDER - NIJE PREMIUM
  // ============================================================
  if (!user?.premium) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center dark:bg-gray-900 dark:text-white">
        <h1 className="text-3xl font-bold mb-4">🌿 {t('healthychef.title', { defaultValue: 'HealthyChef' })}</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{t('healthychef.premium.description', { defaultValue: 'Ova sekcija je dostupna samo za Premium korisnike.' })}</p>
        <Link to="/premium" className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full font-semibold transition inline-block">
          ⭐ {t('healthychef.premium.button', { defaultValue: 'Postani Premium' })}
        </Link>
      </div>
    );
  }

  // ============================================================
  // RENDER - LOADING
  // ============================================================
  if (!isDataLoaded) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center dark:bg-gray-900 dark:text-white">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-500 dark:text-gray-400 mt-4">⏳ {t('healthychef.loading', { defaultValue: 'Učitavanje...' })}</p>
      </div>
    );
  }

  // ============================================================
  // RENDER - GLAVNE KATEGORIJE
  // ============================================================
  if (!kategorijaId) {
    const glavneKategorije = kategorije.filter(kat => !kat.parent_id || kat.parent_id === null);
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
        <Breadcrumb />
        <h1 className="text-3xl font-bold text-center mb-2">🌿 {t('healthychef.title', { defaultValue: 'HealthyChef' })}</h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">{t('healthychef.categories.subtitle', { defaultValue: 'Odaberite kategoriju za personalizovane recepte.' })}</p>
        {glavneKategorije.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {glavneKategorije.map(kat => (
              <Link 
                key={kat.id} 
                to={`/healthy-chef/${kat.id}`} 
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition border border-gray-200 dark:border-gray-700 text-center hover:scale-105"
              >
                <span className="text-4xl block mb-2">{kat.ikona || '🌿'}</span>
                <h3 className="font-bold text-gray-800 dark:text-white">
                  {t(kat.nazivKey, { defaultValue: kat.naziv })}
                </h3>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">{t('healthychef.categories.empty', { defaultValue: 'Nema dostupnih kategorija.' })}</p>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER - FAZE
  // ============================================================
  if (!fazaId) {
    const trenutnaKategorija = kategorije.find(k => k.id === kategorijaId);
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
        <Breadcrumb customLabels={{ [kategorijaId]: t(categoryNameKey, { defaultValue: categoryNameFallback || kategorijaId }) }} />
        <button 
          onClick={() => navigate('/healthy-chef')} 
          className="text-blue-500 dark:text-blue-400 hover:underline mb-4 flex items-center gap-2"
        >
          ⬅️ {t('healthychef.phases.back_to_categories', { defaultValue: 'Nazad na kategorije' })}
        </button>
        <h1 className="text-3xl font-bold mb-2 dark:text-white">
          {t(categoryNameKey, { defaultValue: trenutnaKategorija?.naziv || t('healthychef.phases.category', { defaultValue: 'Kategorija' }) })}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{t('healthychef.phases.subtitle', { defaultValue: 'Odaberite fazu za koju želite recepte.' })}</p>

        {loadingFaze ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">⏳ {t('healthychef.phases.loading', { defaultValue: 'Učitavanje faza...' })}</p>
          </div>
        ) : faze.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {faze.map(faza => {
              const colors = getPhaseColor(faza.id);
              return (
                <Link 
                  key={faza.id} 
                  to={`/healthy-chef/${kategorijaId}/${faza.id}`} 
                  className={`${colors.bg} ${colors.hover} rounded-xl p-4 shadow-md hover:shadow-lg transition border-2 ${colors.border} text-center hover:scale-105`}
                >
                  <span className="text-2xl block mb-1">{faza.ikona || '🟢'}</span>
                  <h3 className={`font-semibold ${colors.text}`}>
                    {t(faza.nazivKey, { defaultValue: faza.naziv })}
                  </h3>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">{t('healthychef.phases.empty', { defaultValue: 'Nema dostupnih faza za ovu kategoriju.' })}</p>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER - RECEPTI ZA FAZU
  // ============================================================
  const trenutnaFaza = faze.find(f => f.id === fazaId);
  const trenutnaKategorija = kategorije.find(k => k.id === kategorijaId);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      <Breadcrumb 
        customLabels={{
          [kategorijaId]: t(categoryNameKey, { defaultValue: categoryNameFallback || kategorijaId }),
          [fazaId]: t(phaseNameKey, { defaultValue: phaseNameFallback || fazaId })
        }} 
      />
      <button 
        onClick={() => navigate(`/healthy-chef/${kategorijaId}`)} 
        className="text-blue-500 dark:text-blue-400 hover:underline mb-4 flex items-center gap-2"
      >
        ⬅️ {t('healthychef.recipes.back_to_phases', { defaultValue: 'Nazad na faze' })}
      </button>
      <h1 className="text-3xl font-bold mb-2 dark:text-white">
        {t(phaseNameKey, { defaultValue: trenutnaFaza?.naziv || t('healthychef.recipes.title', { defaultValue: 'Recepti' }) })}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {t('healthychef.recipes.subtitle', { defaultValue: 'Recepti prilagođeni vašim preferencijama i zdravstvenim potrebama.' })}
        {activeFiltersCount > 0 && (
          <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
            {activeFiltersCount} {t('healthychef.recipes.filters_active', { defaultValue: 'filtera aktivno' })}
          </span>
        )}
      </p>

      {/* FILTERI */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <select 
          className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm flex-1 min-w-[120px] max-w-[180px]" 
          value={filters.vrsta} 
          onChange={(e) => setFilters({ ...filters, vrsta: e.target.value })}
        >
          <option value="">🍽️ {t('healthychef.filters.all_types', { defaultValue: 'Sve vrste' })}</option>
          <option value="Deserti">🍰 {t('healthychef.filters.desserts', { defaultValue: 'Deserti' })}</option>
          <option value="Slano">🍕 {t('healthychef.filters.savory', { defaultValue: 'Slano' })}</option>
          <option value="Dijetalni recepti">🥗 {t('healthychef.filters.diet', { defaultValue: 'Dijetalno' })}</option>
          <option value="Napitki">🥤 {t('healthychef.filters.drinks', { defaultValue: 'Napitki' })}</option>
        </select>
        
        <select 
          className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm flex-1 min-w-[120px] max-w-[180px]" 
          value={filters.vrijeme} 
          onChange={(e) => setFilters({ ...filters, vrijeme: e.target.value })}
        >
          <option value="">⏱️ {t('healthychef.filters.all_time', { defaultValue: 'Svo vrijeme' })}</option>
          <option value="Kratko (15-30 min)">⚡ {t('healthychef.filters.short', { defaultValue: 'Kratko' })}</option>
          <option value="Srednje (30-45 min)">⏳ {t('healthychef.filters.medium', { defaultValue: 'Srednje' })}</option>
          <option value="Duže (45-60+ min)">🐢 {t('healthychef.filters.long', { defaultValue: 'Duže' })}</option>
        </select>
        
        <select 
          className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm flex-1 min-w-[120px] max-w-[180px]" 
          value={filters.tezina} 
          onChange={(e) => setFilters({ ...filters, tezina: e.target.value })}
        >
          <option value="">🏋️ {t('healthychef.filters.all_difficulty', { defaultValue: 'Sva težina' })}</option>
          <option value="Početnik">👶 {t('healthychef.filters.beginner', { defaultValue: 'Početnik' })}</option>
          <option value="Srednji">👨‍🍳 {t('healthychef.filters.intermediate', { defaultValue: 'Srednji' })}</option>
          <option value="Profesionalac">👨‍🍳⭐ {t('healthychef.filters.professional', { defaultValue: 'Profesionalac' })}</option>
        </select>

        {(filters.vrsta || filters.vrijeme || filters.tezina) && (
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-sm"
          >
            🔄 {t('healthychef.filters.reset', { defaultValue: 'Resetuj filtere' })}
          </button>
        )}
      </div>

      {/* RECEPTI */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">⏳ {t('healthychef.recipes.loading', { defaultValue: 'Učitavanje recepata...' })}</p>
        </div>
      ) : recepti.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recepti.map(recipe => (
            <Link 
              key={recipe.id} 
              to={`/recipes/${recipe.id}`} 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border border-gray-100 dark:border-gray-700 hover:scale-105 duration-200"
            >
              <img 
                src={recipe.slika || 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Recept'} 
                alt={recipe.naziv} 
                className="w-full h-48 object-cover" 
              />
              <div className="p-4">
                <h3 className="font-bold text-lg dark:text-white">{recipe.naziv}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{recipe.vrijeme} · {recipe.kalorije}</p>
                {recipe.premium && (
                  <span className="inline-block mt-1 bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full font-semibold">
                    ⭐ Premium
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">😕 {t('healthychef.recipes.no_results', { defaultValue: 'Nema recepata za ovu fazu sa trenutnim filterima.' })}</p>
          <button
            onClick={resetFilters}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
          >
            🔄 {t('healthychef.recipes.reset_filters', { defaultValue: 'Resetuj filtere' })}
          </button>
        </div>
      )}
    </div>
  );
};

export default HealthyChef;