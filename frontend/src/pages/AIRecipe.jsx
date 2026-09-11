// frontend/src/pages/AIRecipe.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AIRecipe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecipe = async () => {
      setLoading(true);
      try {
        console.log('📥 Dohvatam Groq recept:', id);
        
        const res = await fetch(`${API_URL}/api/recepti/groq/${id}`);
        
        if (!res.ok) {
          throw new Error('Recept nije pronađen');
        }
        
        const data = await res.json();
        
        if (data.success && data.data) {
          setRecipe(data.data);
        } else {
          throw new Error(data.error || 'Recept nije pronađen');
        }
      } catch (err) {
        console.error('❌ Greška:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRecipe();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <p className="text-gray-500 dark:text-gray-400">Učitavam recept...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-6xl mb-4">😕</p>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Recept nije pronađen
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error || 'Ovaj recept je istekao ili nije dostupan.'}
          </p>
          <button
            onClick={() => navigate('/ai-chef')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition"
          >
            ← Nazad na AI Chef
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <SEO 
          title={recipe.naziv}
          description={recipe.opis}
          url={`https://os-zdravlja.vercel.app/ai-recipe/${id}`}
        />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="relative">
            <img
              src={recipe.slika || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop'}
              alt={recipe.naziv}
              className="w-full h-64 sm:h-80 object-cover"
            />
            <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
              <span>✨</span> AI GENERIRANO
            </div>
          </div>
          
          <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">
              {recipe.naziv}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {recipe.opis}
            </p>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span>⏱️</span> {recipe.vrijeme || '30 min'}
              </span>
              <span className="flex items-center gap-1">
                <span>🔥</span> {recipe.kalorije || 0} kcal
              </span>
              {recipe.tezina && (
                <span className="flex items-center gap-1">
                  <span>⚡</span> {recipe.tezina}
                </span>
              )}
              {recipe.vrsta && (
                <span className="flex items-center gap-1">
                  <span>🍽️</span> {recipe.vrsta}
                </span>
              )}
            </div>
          </div>
        </div>

        {recipe.sastojci && recipe.sastojci.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span>📦</span> Sastojci
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recipe.sastojci.map((sastojak, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-green-500">✓</span>
                  {sastojak}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipe.upute && recipe.upute.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span>👨‍🍳</span> Upute za pripremu
            </h2>
            <ol className="space-y-3">
              {recipe.upute.map((uputa, idx) => (
                <li key={idx} className="flex gap-3 text-gray-700 dark:text-gray-300">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <span>{uputa}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {recipe.nacin_pripreme && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span>📝</span> Način pripreme
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {recipe.nacin_pripreme}
            </p>
          </div>
        )}

        <Link 
          to="/ai-chef" 
          className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:underline font-medium"
        >
          <span>←</span> Nazad na AI Chef
        </Link>
      </div>
    </div>
  );
};

export default AIRecipe;