// frontend/src/pages/Recipes.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RecipeCard from '../components/RecipeCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Recipes = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [recepti, setRecepti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userEmail, setUserEmail] = useState(null);
  const [userRestrictions, setUserRestrictions] = useState([]);
  
  // 🔥 NOVI STATE ZA PAGINACIJU
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  
  const [filters, setFilters] = useState({
    vrijeme: '',
    tezina: '',
    preferencije: '',
    kalorije: ''
  });

  // ============================================================
  // 🔥 DOHVATI KORISNIKA I NJEGOVE RESTRIKCIJE
  // ============================================================
  useEffect(() => {
    const dohvatiKorisnika = async () => {
      const email = localStorage.getItem('userEmail');
      if (!email) {
        console.log('ℹ️ Korisnik nije prijavljen');
        setUserEmail(null);
        setUserRestrictions([]);
        return;
      }
      
      setUserEmail(email);
      
      try {
        console.log(`🔍 Dohvatam profil za: ${email}`);
        const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const profil = data.data;
          
          const restrikcije = profil.izbjegava || [];
          setUserRestrictions(restrikcije);
          
          const noviFilteri = {};
          if (profil.vrijeme) noviFilteri.vrijeme = profil.vrijeme;
          if (profil.tezina) noviFilteri.tezina = profil.tezina;
          if (profil.kalorije) noviFilteri.kalorije = profil.kalorije;
          
          console.log('🔍 Korisničke restrikcije (SVE):', restrikcije);
          console.log('🔍 Filteri iz profila:', noviFilteri);
          
          setFilters(prev => ({ ...prev, ...noviFilteri }));
        }
      } catch (error) {
        console.error('❌ Greška pri dohvatu profila:', error);
      }
    };

    dohvatiKorisnika();
  }, []);

  // ============================================================
  // 🔥 DOHVATI FILTER IZ URL PARAMETARA (VRSTA)
  // ============================================================
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vrsta = params.get('vrsta');
    if (vrsta) {
      setFilter(decodeURIComponent(vrsta));
    }
  }, [location]);

  // ============================================================
  // 🔥 DOHVATI RECEPTE SA BACKENDA (SA PAGINACIJOM)
  // ============================================================
  const fetchRecipes = async (page = 1) => {
    try {
      setLoading(true);
      console.log('🔍 Dohvatam recepte sa paginacijom...');
      
      let url = `${API_URL}/api/recepti`;
      const queryParams = new URLSearchParams();
      
      // 🔥 DODAJ PAGINACIJU
      queryParams.append('page', page);
      queryParams.append('limit', 20);
      
      // 🔥 DODAJ EMAIL AKO KORISNIK POSTOJI
      if (userEmail) {
        queryParams.append('email', userEmail);
      }
      
      // 🔥 DODAJ FILTERE
      if (filter) {
        queryParams.append('vrsta', filter);
      }
      if (filters.vrijeme) {
        queryParams.append('vrijeme', filters.vrijeme);
      }
      if (filters.tezina) {
        queryParams.append('tezina', filters.tezina);
      }
      if (filters.kalorije) {
        queryParams.append('kalorije', filters.kalorije);
      }
      
      // 🔥 DODAJ PRETRAGU (ako postoji)
      if (searchTerm && searchTerm.trim()) {
        queryParams.append('search', searchTerm.trim());
      }
      
      // 🔥 DODAJ SVE RESTRIKCIJE KAO NIZ
      if (userRestrictions.length > 0) {
        const hasNoRestrictions = userRestrictions.some(r => 
          r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
        );
        
        if (!hasNoRestrictions) {
          queryParams.append('restrikcije', userRestrictions.join(','));
          console.log('🔒 Šaljem sve restrikcije na backend:', userRestrictions);
        } else {
          console.log('✅ Korisnik nema restrikcija');
        }
      }
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      console.log('📡 URL:', url);
      
      const res = await fetch(url);
      const data = await res.json();
      
      // 🔥 NOVI RESPONSE FORMAT SA PAGINACIJOM
      if (data.data && Array.isArray(data.data)) {
        setRecepti(data.data);
        setPagination(data.pagination);
        setCurrentPage(data.pagination.page);
        console.log('📊 Dohvaćeno recepata:', data.data.length);
        console.log('📊 Ukupno:', data.pagination.total);
        console.log('📊 Stranica:', data.pagination.page, '/', data.pagination.pages);
      } else if (Array.isArray(data)) {
        // FALLBACK za stari format (ako backend još nije ažuriran)
        setRecepti(data);
        setPagination({
          page: 1,
          limit: 20,
          total: data.length,
          pages: 1
        });
        setCurrentPage(1);
      } else {
        setRecepti([]);
        setPagination({
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        });
      }
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Greška pri dohvatu recepata:', error);
      setRecepti([]);
      setLoading(false);
    }
  };

  // 🔥 POKRENI DOHVAT KADA SE PROMIJENE FILTERI
  useEffect(() => {
    fetchRecipes(1);
  }, [userEmail, userRestrictions, filter, filters.vrijeme, filters.tezina, filters.kalorije, searchTerm]);

  // ============================================================
  // 🔥 FILTRIRANJE NA FRONTENDU - SAMO PRETRAGA (VEĆ RADI BACKEND)
  // ============================================================
  // 🔥 SADA JE searchTerm VEĆ POSLAN NA BACKEND, OVDJE SAMO PRIKAZUJEMO
  const filteredRecipes = recepti; // Backend je već filtrirao

  // ============================================================
  // 🔥 RESET FILTERA
  // ============================================================
  const resetAllFilters = () => {
    setFilter('');
    setFilters({ 
      vrijeme: '', 
      tezina: '', 
      preferencije: '',
      kalorije: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
    fetchRecipes(1);
  };

  // ============================================================
  // 🔥 BROJ AKTIVNIH FILTERA
  // ============================================================
  const activeFiltersCount = () => {
    let count = 0;
    if (filter) count++;
    if (filters.vrijeme) count++;
    if (filters.tezina) count++;
    if (filters.kalorije) count++;
    if (filters.preferencije) count++;
    if (searchTerm && searchTerm.trim()) count++;
    return count;
  };

  // ============================================================
  // 🔥 PROMIJENI STRANICU
  // ============================================================
  const goToPage = (page) => {
    if (page < 1 || page > pagination.pages) return;
    fetchRecipes(page);
  };

  // ============================================================
  // 🖥️ RENDER - LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - NEMA RECEPATA
  // ============================================================
  if (recepti.length === 0 && pagination.total === 0) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <p className="text-4xl mb-4">😢</p>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {t('recipes.no_recipes')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {t('recipes.no_recipes_desc')}
        </p>
        <Link 
          to="/" 
          className="mt-6 inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
        >
          🏠 {t('nav.home')}
        </Link>
      </div>
    );
  }

  // Mapiranje naziva kategorija
  const categoryNames = {
    'Dijetalni recepti': '🥗 ' + t('recipes.categories.diet'),
    'Deserti': '🍰 ' + t('recipes.categories.desserts'),
    'Slano': '🍕 ' + t('recipes.categories.savory'),
    'Napitki': '🍹 ' + t('recipes.categories.drinks')
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* BREADCRUMB */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 flex-wrap">
        <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1">
          <span>🏠</span> {t('nav.home')}
        </Link>
        <span className="text-gray-400 dark:text-gray-600">›</span>
        {filter ? (
          <>
            <Link to="/recipes" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              {t('nav.recipes')}
            </Link>
            <span className="text-gray-400 dark:text-gray-600">›</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {categoryNames[filter] || filter}
            </span>
          </>
        ) : (
          <span className="text-gray-700 dark:text-gray-300 font-medium">{t('recipes.all')}</span>
        )}
        {activeFiltersCount() > 0 && (
          <span className="text-blue-600 dark:text-blue-400 text-xs bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
            {activeFiltersCount()} {t('recipes.filters')}
          </span>
        )}
      </nav>

      {/* NASLOV */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
        {categoryNames[filter] || filter || '📚 ' + t('recipes.all')}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {filter 
          ? t('recipes.category_recipes', { category: filter })
          : t('recipes.all_recipes')}
        
        {/* 🔥 PRIKAŽI RESTRIKCIJE AKO POSTOJE */}
        {userRestrictions.length > 0 && !userRestrictions.some(r => 
          r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
        ) && (
          <span className="ml-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-3 py-1 rounded-full">
            🚫 {t('recipes.excluding')}: {userRestrictions.join(', ')}
          </span>
        )}
        
        {/* 🔥 PRIKAŽI BROJ STRANICA */}
        {pagination.pages > 1 && (
          <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
            📄 {pagination.page} / {pagination.pages}
          </span>
        )}
      </p>

      {/* PRETRAGA I FILTERI */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder={t('recipes.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition text-sm"
          />
        </div>
        
        <select
          value={filters.vrijeme}
          onChange={(e) => setFilters(prev => ({ ...prev, vrijeme: e.target.value }))}
          className="p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition text-sm flex-1 min-w-[130px] max-w-[180px]"
        >
          <option value="">⏱️ {t('recipes.all_time')}</option>
          <option value="Kratko (15-30 min)">⚡ {t('recipes.short')}</option>
          <option value="Srednje (30-45 min)">⏳ {t('recipes.medium')}</option>
          <option value="Duže (45-60+ min)">🐢 {t('recipes.long')}</option>
        </select>

        <select
          value={filters.tezina}
          onChange={(e) => setFilters(prev => ({ ...prev, tezina: e.target.value }))}
          className="p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition text-sm flex-1 min-w-[130px] max-w-[180px]"
        >
          <option value="">🏋️ {t('recipes.all_levels')}</option>
          <option value="Početnik">👶 {t('recipes.beginner')}</option>
          <option value="Srednji">👨‍🍳 {t('recipes.intermediate')}</option>
          <option value="Profesionalac">👨‍🍳⭐ {t('recipes.professional')}</option>
        </select>

        <select
          value={filters.preferencije}
          onChange={(e) => setFilters(prev => ({ ...prev, preferencije: e.target.value }))}
          className="p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition text-sm flex-1 min-w-[130px] max-w-[180px]"
        >
          <option value="">💪 {t('recipes.preferences')}</option>
          <option value="Visokoproteinski">💪 {t('recipes.high_protein')}</option>
          <option value="Bogat vlaknima">🌾 {t('recipes.high_fiber')}</option>
          <option value="Bogat ugljikohidratima">🍞 {t('recipes.high_carb')}</option>
        </select>

        {(filter || filters.vrijeme || filters.tezina || filters.preferencije || filters.kalorije || searchTerm) && (
          <button
            onClick={resetAllFilters}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-sm flex items-center gap-1"
          >
            🔄 {t('recipes.reset')}
          </button>
        )}
      </div>

      {/* BROJ RECEPATA */}
      <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
        {t('recipes.showing')} {recepti.length} {t('recipes.of')} {pagination.total} {t('recipes.recipes')}
        {pagination.pages > 1 && (
          <span className="ml-2 text-xs text-gray-400">
            (Stranica {pagination.page} od {pagination.pages})
          </span>
        )}
        
        {/* 🔥 PRIKAŽI RESTRIKCIJE AKO POSTOJE */}
        {userRestrictions.length > 0 && !userRestrictions.some(r => 
          r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
        ) && (
          <span className="ml-2 text-red-500 dark:text-red-400">
            🚫 {t('recipes.excluding')}: {userRestrictions.join(', ')}
          </span>
        )}
      </p>

      {/* RECEPTI */}
      {recepti.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recepti.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {/* 🔥🔥🔥 PAGINACIJA */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Prikazano {recepti.length} od {pagination.total} recepata
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* DUGME ZA PRVU STRANICU */}
                <button
                  onClick={() => goToPage(1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  ⏮
                </button>
                
                {/* DUGME ZA PREVIOUS */}
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  ⬅️ Prethodna
                </button>
                
                {/* BROJ STRANICA */}
                <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold">
                  {pagination.page} / {pagination.pages}
                </span>
                
                {/* DUGME ZA NEXT */}
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Sljedeća ➡️
                </button>
                
                {/* DUGME ZA ZADNJU STRANICU */}
                <button
                  onClick={() => goToPage(pagination.pages)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  ⏭
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            😕 {t('recipes.no_results')}
          </p>
          <button
            onClick={resetAllFilters}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
          >
            🔄 {t('recipes.reset_filters')}
          </button>
        </div>
      )}
    </div>
  );
};

export default Recipes;