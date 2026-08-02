// frontend/src/pages/Recipes.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import RecipeCard from '../components/RecipeCard';

const Recipes = () => {
  const location = useLocation();
  const [recepti, setRecepti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    vrijeme: '',
    tezina: '',
    preferencije: '',
    restrikcije: '',
    kalorije: ''
  });

  // ============================================================
  // 🔥 AUTOMATSKI DOHVATI PROFIL I POSTAVI FILTERE
  // ============================================================
  useEffect(() => {
    const dohvatiProfil = async () => {
      const email = localStorage.getItem('userEmail');
      if (!email) return;

      try {
        const response = await fetch(`http://localhost:5000/api/profil/${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const profil = data.data;
          const noviFilteri = {};
          
          if (profil.vrsta && profil.vrsta.length > 0) {
            const odabraneVrste = profil.vrsta.filter(v => v !== 'Svejedno');
            if (odabraneVrste.length > 0) {
              noviFilteri.vrsta = odabraneVrste[0];
            }
          }
          
          if (profil.preferencije && profil.preferencije.length > 0) {
            const odabranePref = profil.preferencije.filter(p => p !== 'Svejedno');
            if (odabranePref.length > 0) {
              noviFilteri.preferencije = odabranePref[0];
            }
          }
          
          if (profil.vrijeme) noviFilteri.vrijeme = profil.vrijeme;
          if (profil.tezina) noviFilteri.tezina = profil.tezina;
          if (profil.kalorije) noviFilteri.kalorije = profil.kalorije;
          
          if (profil.izbjegava && profil.izbjegava.length > 0) {
            noviFilteri.restrikcije = profil.izbjegava[0];
          }
          
          console.log('🔍 Recipes - Automatski postavljeni filteri:', noviFilteri);
          setFilters(prev => ({ ...prev, ...noviFilteri }));
        }
      } catch (error) {
        console.error('❌ Greška pri dohvatu profila:', error);
      }
    };

    dohvatiProfil();
  }, []);

  // Dohvati filter iz URL parametara
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vrsta = params.get('vrsta');
    if (vrsta) {
      setFilter(decodeURIComponent(vrsta));
    }
  }, [location]);

  // Dohvati recepte
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        console.log('🔍 Dohvatam recepte...');
        const res = await axios.get('http://localhost:5000/api/recepti');
        console.log('📊 Dohvaćeno recepata:', res.data?.length || 0);
        setRecepti(res.data || []);
        setLoading(false);
      } catch (error) {
        console.error('❌ Greška pri dohvatu recepata:', error);
        setRecepti([]);
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  // Funkcija za resetovanje svih filtera
  const resetAllFilters = () => {
    setFilter('');
    setFilters({ 
      vrijeme: '', 
      tezina: '', 
      preferencije: '',
      restrikcije: '',
      kalorije: ''
    });
    setSearchTerm('');
  };

  // Filtrirani recepti
  const filteredRecipes = recepti.filter(recipe => {
    // Filter po vrsti (iz URL-a)
    if (filter && recipe.vrsta !== filter) {
      return false;
    }
    // Filter po vremenu
    if (filters.vrijeme && recipe.vrijeme !== filters.vrijeme) {
      return false;
    }
    // Filter po težini
    if (filters.tezina && recipe.tezina !== filters.tezina) {
      return false;
    }
    // Filter po preferencijama
    if (filters.preferencije) {
      const pref = filters.preferencije;
      if (pref === 'Visokoproteinski' && (recipe.proteini || 0) < 25) {
        return false;
      }
      if (pref === 'Bogat vlaknima' && (recipe.vlakna || 0) < 10) {
        return false;
      }
      if (pref === 'Bogat ugljikohidratima' && (recipe.ugljikohidrati || 0) < 40) {
        return false;
      }
    }
    // Filter po restrikcijama
    if (filters.restrikcije) {
      const alergeni = recipe.alergeni || [];
      if (alergeni.includes(filters.restrikcije)) {
        return false;
      }
    }
    // Filter po kalorijama
    if (filters.kalorije) {
      const kalorijeMap = {
        'Nisko (do 300 kcal)': { max: 300 },
        'Umjereno (300-500 kcal)': { min: 300, max: 500 },
        'Srednje (500-700 kcal)': { min: 500, max: 700 },
        'Visoko (900+ kcal)': { min: 900 }
      };
      
      const range = kalorijeMap[filters.kalorije];
      if (range) {
        const kal = recipe.kalorije || 0;
        if (range.min && range.max) {
          if (kal < range.min || kal > range.max) return false;
        } else if (range.min) {
          if (kal < range.min) return false;
        } else if (range.max) {
          if (kal > range.max) return false;
        }
      }
    }
    // Filter po pretrazi
    if (searchTerm && !recipe.naziv?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Mapiranje naziva kategorija
  const categoryNames = {
    'Dijetalni recepti': '🥗 Dijetalni recepti',
    'Deserti': '🍰 Deserti',
    'Slano': '🍕 Slana jela',
    'Napitki': '🍹 Smoothie & Čajevi'
  };

  // Broj aktivnih filtera
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length + (filter ? 1 : 0);

  // ============================================================
  // 🖥️ RENDER - LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">⏳ Učitavanje recepata...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - NEMA RECEPATA
  // ============================================================
  if (recepti.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <p className="text-4xl mb-4">😢</p>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Nema recepata
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Trenutno nema recepata u bazi. Molimo pokušajte kasnije.
        </p>
        <Link 
          to="/" 
          className="mt-6 inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
        >
          🏠 Vrati se na početnu
        </Link>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - GLAVNI UI
  // ============================================================
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* ===== BREADCRUMB NAVIGACIJA ===== */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 flex-wrap">
        <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1">
          <span>🏠</span> Početna
        </Link>
        <span className="text-gray-400 dark:text-gray-600">›</span>
        {filter ? (
          <>
            <Link to="/recipes" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Recepti
            </Link>
            <span className="text-gray-400 dark:text-gray-600">›</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {categoryNames[filter] || filter}
            </span>
          </>
        ) : (
          <span className="text-gray-700 dark:text-gray-300 font-medium">Svi recepti</span>
        )}
        {activeFiltersCount > 0 && (
          <>
            <span className="text-gray-400 dark:text-gray-600">•</span>
            <span className="text-blue-600 dark:text-blue-400 text-xs bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
              {activeFiltersCount} filtera
            </span>
          </>
        )}
      </nav>

      {/* NASLOV */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
        {categoryNames[filter] || filter || '📚 Svi recepti'}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {filter 
          ? `Recepti iz kategorije "${filter}"` 
          : 'Svi recepti prilagođeni vašim potrebama'}
        {activeFiltersCount > 0 && (
          <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
            {activeFiltersCount} filtera aktivno
          </span>
        )}
      </p>

      {/* PRETRAGA I FILTERI */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="🔍 Pretraži recepte..."
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
          <option value="">⏱️ Svo vrijeme</option>
          <option value="Kratko (15-30 min)">⚡ Kratko (15-30 min)</option>
          <option value="Srednje (30-45 min)">⏳ Srednje (30-45 min)</option>
          <option value="Duže (45-60 min)">🐢 Duže (45-60 min)</option>
        </select>

        <select
          value={filters.tezina}
          onChange={(e) => setFilters(prev => ({ ...prev, tezina: e.target.value }))}
          className="p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition text-sm flex-1 min-w-[130px] max-w-[180px]"
        >
          <option value="">🏋️ Sva težina</option>
          <option value="Početnik">👶 Početnik</option>
          <option value="Srednji">👨‍🍳 Srednji</option>
          <option value="Profesionalac">👨‍🍳⭐ Profesionalac</option>
        </select>

        <select
          value={filters.preferencije}
          onChange={(e) => setFilters(prev => ({ ...prev, preferencije: e.target.value }))}
          className="p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition text-sm flex-1 min-w-[130px] max-w-[180px]"
        >
          <option value="">💪 Preferencije</option>
          <option value="Visokoproteinski">💪 Visokoproteinski</option>
          <option value="Bogat vlaknima">🌾 Bogat vlaknima</option>
          <option value="Bogat ugljikohidratima">🍞 Bogat ugljikohidratima</option>
        </select>

        {(filter || filters.vrijeme || filters.tezina || filters.preferencije || filters.restrikcije || filters.kalorije || searchTerm) && (
          <button
            onClick={resetAllFilters}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-sm flex items-center gap-1"
          >
            🔄 Resetuj filtere
          </button>
        )}
      </div>

      {/* BROJ RECEPATA */}
      <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
        Prikazano {filteredRecipes.length} od {recepti.length} recepata
        {activeFiltersCount > 0 && ` (${activeFiltersCount} filtera aktivno)`}
      </p>

      {/* RECEPTI */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            😕 Nema recepata koji odgovaraju filterima.
          </p>
          <button
            onClick={resetAllFilters}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
          >
            🔄 Resetuj filtere
          </button>
        </div>
      )}
    </div>
  );
};

export default Recipes;