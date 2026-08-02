// frontend/src/pages/RecipeDetails.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// --- VOICE RECIPE READER KOMPONENTA ---
const VoiceRecipeReader = ({ recipe }) => {
  const [isReading, setIsReading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const utteranceRef = useRef(null);
  const steps = recipe?.upute || [];

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakStep = (stepIndex) => {
    if (!speechSupported) {
      alert('❌ Vaš pretraživač ne podržava glasovno čitanje.');
      return;
    }

    if (stepIndex >= steps.length) {
      setIsReading(false);
      setCurrentStep(0);
      return;
    }

    const text = `Korak ${stepIndex + 1}: ${steps[stepIndex]}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hr';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utteranceRef.current = utterance;

    utterance.onend = () => {
      if (isReading && !isPaused) {
        const nextStep = stepIndex + 1;
        if (nextStep < steps.length) {
          setCurrentStep(nextStep);
          setTimeout(() => speakStep(nextStep), 500);
        } else {
          setIsReading(false);
          setCurrentStep(0);
          alert('🎉 Recept je završen! Dobar tek!');
        }
      }
    };

    utterance.onerror = () => {
      setIsReading(false);
      setCurrentStep(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  const startReading = () => {
    if (steps.length === 0) {
      alert('⚠️ Ovaj recept nema upute za čitanje.');
      return;
    }

    if (isReading) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      }
      return;
    }

    setIsReading(true);
    setIsPaused(false);
    setCurrentStep(0);
    speakStep(0);
  };

  const pauseReading = () => {
    if (isReading && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setIsReading(false);
    setIsPaused(false);
    setCurrentStep(0);
  };

  const skipStep = () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      const nextStep = currentStep + 1;
      if (nextStep < steps.length) {
        setCurrentStep(nextStep);
        setIsPaused(false);
        setTimeout(() => speakStep(nextStep), 300);
      } else {
        stopReading();
        alert('🎉 Recept je završen! Dobar tek!');
      }
    }
  };

  const prevStep = () => {
    if (isReading && currentStep > 0) {
      window.speechSynthesis.cancel();
      const prev = currentStep - 1;
      setCurrentStep(prev);
      setIsPaused(false);
      setTimeout(() => speakStep(prev), 300);
    }
  };

  if (!recipe || steps.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-2xl p-4 md:p-6 border-2 border-purple-200 dark:border-purple-600">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
          🎤 Glasovno kuhanje
          <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ PREMIUM</span>
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {!isReading ? (
            <button
              onClick={startReading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 text-sm"
            >
              🔊 Počni čitanje
            </button>
          ) : (
            <>
              <button
                onClick={pauseReading}
                disabled={isPaused}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg font-semibold transition disabled:opacity-50 text-sm"
              >
                ⏸️ Pauza
              </button>
              <button
                onClick={startReading}
                className={`${isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} text-white px-3 py-2 rounded-lg font-semibold transition text-sm`}
                disabled={!isPaused}
              >
                ▶️ Nastavi
              </button>
              <button
                onClick={stopReading}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition text-sm"
              >
                ⏹️ Stop
              </button>
            </>
          )}
        </div>
      </div>

      {isReading && (
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Korak {currentStep + 1} od {steps.length}</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
            <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base">
              <span className="font-bold text-purple-600 dark:text-purple-400">Korak {currentStep + 1}:</span> {steps[currentStep]}
            </p>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={prevStep}
              disabled={currentStep === 0 || !isReading}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              ⬅️ Prethodni
            </button>
            <button
              onClick={skipStep}
              disabled={!isReading}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Sljedeći ➡️
            </button>
          </div>
        </div>
      )}

      {isReading && !isPaused && (
        <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
          <span className="animate-pulse">🔴</span> Čitam...
        </div>
      )}
      {isReading && isPaused && (
        <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
          <span>⏸️</span> Pauzirano
        </div>
      )}
      {!speechSupported && (
        <p className="text-red-500 text-sm mt-2">❌ Vaš pretraživač ne podržava glasovno čitanje.</p>
      )}
    </div>
  );
};

// ===== GLAVNA KOMPONENTA RECIPEDETAILS =====
const RecipeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [originalRecipe, setOriginalRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [osobe, setOsobe] = useState(4);
  const [originalneOsobe, setOriginalneOsobe] = useState(4);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [slicniRecepti, setSlicniRecepti] = useState([]);
  const [user, setUser] = useState(null);

  // AI Somelijer state
  const [sommelierData, setSommelierData] = useState(null);
  const [loadingSommelier, setLoadingSommelier] = useState(false);
  const [sommelierError, setSommelierError] = useState(null);

  // ============================================================
  // 📊 PRERAČUNAJ SASTOJKE ZA BROJ OSOBA
  // ============================================================
  const prilagodiSastojke = (sastojci, originalneOsobe, noveOsobe) => {
    if (!sastojci || sastojci.length === 0) return sastojci;
    if (originalneOsobe === noveOsobe) return sastojci;
    
    const faktor = noveOsobe / originalneOsobe;
    
    return sastojci.map(sastojak => {
      const match = sastojak.match(/^(\d+\.?\d*)\s*(g|kg|ml|l|kom|šolja|kašika|kafena kašika|prstohvat|dcl|dl)?/i);
      
      if (match) {
        const kolicina = parseFloat(match[1]);
        const jedinica = match[2] || '';
        const ostatak = sastojak.replace(/^(\d+\.?\d*)\s*(g|kg|ml|l|kom|šolja|kašika|kafena kašika|prstohvat|dcl|dl)?\s*/i, '');
        
        const novaKolicina = Math.round(kolicina * faktor * 10) / 10;
        const prikazKolicine = Number.isInteger(novaKolicina) ? novaKolicina : novaKolicina.toFixed(1);
        
        return `${prikazKolicine}${jedinica ? ' ' + jedinica : ''}${ostatak ? ' ' + ostatak : ''}`;
      }
      
      return sastojak;
    });
  };

  // ============================================================
  // 🔄 AŽURIRAJ SASTOJKE KADA SE PROMIJENI BROJ OSOBA
  // ============================================================
  useEffect(() => {
    if (originalRecipe && originalRecipe.sastojci) {
      const prilagodjeniSastojci = prilagodiSastojke(
        originalRecipe.sastojci,
        originalneOsobe || 4,
        osobe
      );
      
      setRecipe({
        ...originalRecipe,
        sastojci: prilagodjeniSastojci
      });
    }
  }, [osobe, originalRecipe, originalneOsobe]);

  // ============================================================
  // 📤 SHARE RECIPE
  // ============================================================
  const shareRecipe = async () => {
    try {
      const shareData = {
        title: recipe?.naziv || 'Recept',
        text: `${recipe?.naziv || 'Recept'}\n⭐ ${recipe?.prosjecna_ocjena || 4.8}\n⏱️ ${recipe?.vrijeme || 0} min\n🔥 ${recipe?.kalorije || 0} kcal\n\n📋 Sastojci: ${recipe?.sastojci?.join(', ') || ''}\n\n👨‍🍳 Upute: ${recipe?.upute?.join('. ') || ''}`,
        url: window.location.href,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        alert('✅ Recept je kopiran u clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Greška pri dijeljenju:', error);
      }
    }
  };

  // ============================================================
  // 👤 KORISNIK
  // ============================================================
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
  }, []);

  // ============================================================
  // 📥 DOHVATI RECEPT
  // ============================================================
  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        console.log('🔍 Dohvatam recept ID:', id);
        
        const res = await fetch(`${API_URL}/recepti/${id}`);
        const data = await res.json();
        console.log('📊 Recept dohvaćen:', data);
        
        setOriginalRecipe(data);
        setOriginalneOsobe(4);
        setRecipe({
          ...data,
          sastojci: data.sastojci || []
        });

        // Dohvati slične recepte
        if (data?.vrsta) {
          const slicniRes = await fetch(`${API_URL}/recepti?vrsta=${encodeURIComponent(data.vrsta)}`);
          const slicniData = await slicniRes.json();
          setSlicniRecepti(slicniData.filter(r => r.id !== id).slice(0, 3));
        }
        setLoading(false);
      } catch (error) {
        console.error('❌ Greška:', error);
        setLoading(false);
      }
    };
    
    if (id) {
      fetchRecipe();
    } else {
      setLoading(false);
    }
  }, [id]);

  // ============================================================
  // ⏱️ TIMER LOGIKA
  // ============================================================
  useEffect(() => {
    let interval;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0 && timerActive) {
      setTimerActive(false);
      alert('⏰ Vrijeme je isteklo!');
    }
    return () => clearInterval(interval);
  }, [timer, timerActive]);

  const startTimer = () => {
    if (recipe?.vrijeme) {
      const mins = parseInt(recipe.vrijeme) || 30;
      setTimer(mins * 60);
      setTimerActive(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================================
  // 🍷 AI SOMELIJER
  // ============================================================
  const fetchSommelier = async () => {
    setLoadingSommelier(true);
    setSommelierError(null);
    try {
      const res = await fetch(`${API_URL}/ai-sommelier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naziv: recipe?.naziv,
          sastojci: recipe?.sastojci
        })
      });
      const data = await res.json();
      setSommelierData(data);
    } catch (error) {
      console.error('Greška:', error);
      setSommelierError('❌ Došlo je do greške. Pokušajte ponovo.');
    } finally {
      setLoadingSommelier(false);
    }
  };

  // ============================================================
  // 🖥️ RENDER - LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">⏳ Učitavanje recepta...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - RECEPT NIJE PRONAĐEN
  // ============================================================
  if (!recipe || !originalRecipe) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
          <p className="text-4xl mb-4">😢</p>
          <p className="text-red-600 dark:text-red-300 text-lg font-semibold">
            ❌ Recept nije pronađen.
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Izvinjavamo se, ali recept koji tražite ne postoji ili je uklonjen.
          </p>
          <Link 
            to="/" 
            className="mt-6 inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
          >
            🏠 Vrati se na početnu
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - RECEPT
  // ============================================================
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      <button
        onClick={() => navigate(-1)}
        className="text-blue-500 dark:text-blue-400 hover:underline mb-4 flex items-center gap-2"
      >
        ⬅️ Nazad
      </button>

      <img
        src={recipe.slika || 'https://via.placeholder.com/800x400'}
        alt={recipe.naziv}
        className="w-full h-64 object-cover rounded-xl mb-4"
      />

      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold dark:text-white">{recipe.naziv}</h1>
        <div className="flex items-center gap-2">
          <span className="text-yellow-500">⭐ {recipe.prosjecna_ocjena || 4.8}</span>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={`text-2xl ${isFavorite ? 'text-red-500' : 'text-gray-400'} hover:scale-110 transition`}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mt-2">{recipe.opis}</p>

      <div className="flex flex-wrap gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <div className="flex items-center gap-2">
          <label className="font-semibold dark:text-white">👥 Broj osoba:</label>
          <select
            value={osobe}
            onChange={(e) => setOsobe(parseInt(e.target.value))}
            className="border rounded-lg px-3 py-1 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            (Original: {originalneOsobe} osobe)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold dark:text-white">⏱️</span>
          <span className="dark:text-gray-300">{recipe.vrijeme} min</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold dark:text-white">🔥</span>
          <span className="dark:text-gray-300">{recipe.kalorije} kcal</span>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-xl border border-blue-200 dark:border-blue-700">
        <h3 className="font-semibold dark:text-white">💡 Pametni savjet</h3>
        <p className="text-gray-700 dark:text-gray-300">
          "Ovo jelo je bogato vitaminom C i cinkom – odlično za imunitet!"
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-bold dark:text-white mb-2">
          📋 Sastojci (za {osobe} {osobe === 1 ? 'osobu' : 'osobe'})
        </h2>
        <ul className="list-disc list-inside space-y-1">
          {recipe.sastojci?.map((s, i) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">{s}</li>
          ))}
        </ul>
        {osobe !== originalneOsobe && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            * Prilagođeno za {osobe} osobe (original: {originalneOsobe} osobe)
          </p>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h3 className="font-bold dark:text-white mb-2">📊 Nutritivne vrijednosti (po porciji)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="dark:text-gray-300"><span className="font-semibold">🔥 Kalorije:</span> {recipe.kalorije} kcal</div>
          <div className="dark:text-gray-300"><span className="font-semibold">🥩 Proteini:</span> {recipe.proteini || 0}g</div>
          <div className="dark:text-gray-300"><span className="font-semibold">🍞 Ugljikohidrati:</span> {recipe.ugljikohidrati || 0}g</div>
          <div className="dark:text-gray-300"><span className="font-semibold">🧈 Masti:</span> {recipe.masti || 0}g</div>
          <div className="dark:text-gray-300"><span className="font-semibold">🌾 Vlakna:</span> {recipe.vlakna || 0}g</div>
          <div className="dark:text-gray-300"><span className="font-semibold">🧂 Natrij:</span> {recipe.natrij || 0}mg</div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-bold dark:text-white mb-2">👨‍🍳 Upute</h2>
        <ol className="list-decimal list-inside space-y-2">
          {recipe.upute?.map((u, i) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">{u}</li>
          ))}
        </ol>
      </div>

      {/* AI SOMELIJER */}
      <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900 rounded-xl border border-purple-200 dark:border-purple-700">
        <h3 className="font-bold dark:text-white flex items-center gap-2">
          🍷 AI Somelijer
          <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ PREMIUM</span>
        </h3>

        {sommelierError && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-2">{sommelierError}</p>
        )}

        {sommelierData ? (
          <div className="mt-3 space-y-1 dark:text-gray-300">
            <p><span className="font-semibold">🌿 Začini:</span> {sommelierData.zacini}</p>
            <p><span className="font-semibold">🍷 Piće:</span> {sommelierData.pice}</p>
            <p><span className="font-semibold">🥗 Prilog:</span> {sommelierData.prilog}</p>
            <p><span className="font-semibold">⏰ Idealno vrijeme:</span> {sommelierData.vrijeme_jela}</p>
            <button
              onClick={() => setSommelierData(null)}
              className="mt-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              🔄 Ponovo pitaj
            </button>
          </div>
        ) : (
          <button
            onClick={fetchSommelier}
            disabled={loadingSommelier}
            className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            {loadingSommelier ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI razmišlja...
              </>
            ) : (
              '🍷 Pitaj AI Somelijera'
            )}
          </button>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          AI generiše preporuke na osnovu sastojaka i naziva jela.
        </p>
      </div>

      {/* GLASOVNO KUHANJE */}
      {user?.premium ? (
        <div className="mt-6">
          <VoiceRecipeReader recipe={recipe} />
        </div>
      ) : (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            🎤 Glasovno kuhanje je dostupno samo za Premium korisnike.
          </p>
          <Link to="/premium" className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-full text-sm font-semibold transition inline-block">
            ⭐ Postani Premium
          </Link>
        </div>
      )}

      {/* SHARE RECIPE */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={shareRecipe}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
        >
          📤 Podijeli recept
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-4 flex-wrap">
        <button
          onClick={startTimer}
          className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition"
        >
          ⏱️ Pokreni timer
        </button>
        <span className="text-2xl font-mono dark:text-white">{formatTime(timer)}</span>
        {timerActive && (
          <button
            onClick={() => setTimerActive(false)}
            className="bg-red-500 dark:bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition"
          >
            ⏹️ Stop
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition dark:text-white">🖨️ Printaj</button>
        <button className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition dark:text-white">✉️ Pošalji na email</button>
        <button className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition dark:text-white">📤 Podijeli</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">📘 Facebook</button>
        <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">📱 WhatsApp</button>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">📌 Pinterest</button>
        <button className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">🐦 Twitter</button>
      </div>

      {slicniRecepti.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold dark:text-white mb-4">🍽️ Slični recepti</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {slicniRecepti.map(r => (
              <Link
                key={r.id}
                to={`/recipes/${r.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition"
              >
                <img src={r.slika || 'https://via.placeholder.com/300x200'} alt={r.naziv} className="w-full h-32 object-cover" />
                <div className="p-3">
                  <h3 className="font-bold text-sm dark:text-white">{r.naziv}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{r.vrijeme} · {r.kalorije} kcal</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetails;