// frontend/src/pages/AIRecipe.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createBannerAd } from "@/ads/AdsManager.jsx";
import { isNative } from '../utils/platform';
import SEO from '../components/SEO';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================
// VOICE RECIPE READER KOMPONENTA (ISTA KAO U RecipeDetails)
// ============================================================
const VoiceRecipeReader = ({ recipe }) => {
  const { t, i18n } = useTranslation();
  const [isReading, setIsReading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const utteranceRef = useRef(null);
  const steps = recipe?.upute || [];

  const getSpeechLang = () => {
    const langCode = (i18n.language || 'hr').split('-')[0].toLowerCase();

    const langMap = {
      'hr': 'hr-HR',
      'en': 'en-US',
      'de': 'de-DE',
      'fr': 'fr-FR',
      'it': 'it-IT',
      'es': 'es-ES',
      'sl': 'sl-SI'
    };

    const result = langMap[langCode] || 'hr-HR';
    console.log('🎤 Speech language:', langCode, '→', result);
    return result;
  };

  useEffect(() => {
    if (!isNative && !('speechSynthesis' in window)) {
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (!isNative && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakStep = async (stepIndex) => {
    if (!speechSupported) {
      alert(t('common.error'));
      return;
    }

    if (stepIndex >= steps.length) {
      setIsReading(false);
      setCurrentStep(0);
      return;
    }

    const text = `${t('recipe.step')} ${stepIndex + 1}: ${steps[stepIndex]}`;

    if (isNative) {
      try {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        await TextToSpeech.speak({
          text: text,
          lang: getSpeechLang(),
          rate: 0.85,
          pitch: 1.0,
          volume: 1.0
        });

        if (isReading && !isPaused) {
          const nextStep = stepIndex + 1;
          if (nextStep < steps.length) {
            setCurrentStep(nextStep);
            setTimeout(() => speakStep(nextStep), 500);
          } else {
            setIsReading(false);
            setCurrentStep(0);
            alert(t('recipe.finished'));
          }
        }
      } catch (error) {
        console.error('Native TTS error:', error);
        setIsReading(false);
        setCurrentStep(0);
      }
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getSpeechLang();
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
            alert(t('recipe.finished'));
          }
        }
      };

      utterance.onerror = () => {
        setIsReading(false);
        setCurrentStep(0);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const startReading = () => {
    if (steps.length === 0) {
      alert(t('recipe.no_steps'));
      return;
    }

    if (isReading) {
      if (isPaused) {
        if (isNative) {
          setIsPaused(false);
          speakStep(currentStep);
        } else {
          window.speechSynthesis.resume();
          setIsPaused(false);
        }
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
      if (isNative) {
        setIsPaused(true);
        import('@capacitor-community/text-to-speech').then(({ TextToSpeech }) => {
          TextToSpeech.stop();
        }).catch(() => {});
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  };

  const stopReading = () => {
    if (isNative) {
      import('@capacitor-community/text-to-speech').then(({ TextToSpeech }) => {
        TextToSpeech.stop();
      }).catch(() => {});
    } else {
      window.speechSynthesis.cancel();
    }
    setIsReading(false);
    setIsPaused(false);
    setCurrentStep(0);
  };

  const skipStep = () => {
    if (isReading) {
      if (!isNative) {
        window.speechSynthesis.cancel();
      }
      const nextStep = currentStep + 1;
      if (nextStep < steps.length) {
        setCurrentStep(nextStep);
        setIsPaused(false);
        setTimeout(() => speakStep(nextStep), 300);
      } else {
        stopReading();
        alert(t('recipe.finished'));
      }
    }
  };

  const prevStep = () => {
    if (isReading && currentStep > 0) {
      if (!isNative) {
        window.speechSynthesis.cancel();
      }
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
          🎤 {t('recipe.voice_cooking')}
          <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ {t('premium.title')}</span>
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {!isReading ? (
            <button
              onClick={startReading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 text-sm"
            >
              🔊 {t('recipe.start_reading')}
            </button>
          ) : (
            <>
              <button
                onClick={pauseReading}
                disabled={isPaused}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg font-semibold transition disabled:opacity-50 text-sm"
              >
                ⏸️ {t('recipe.pause')}
              </button>
              <button
                onClick={startReading}
                className={`${isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} text-white px-3 py-2 rounded-lg font-semibold transition text-sm`}
                disabled={!isPaused}
              >
                ▶️ {t('recipe.resume')}
              </button>
              <button
                onClick={stopReading}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition text-sm"
              >
                ⏹️ {t('recipe.stop')}
              </button>
            </>
          )}
        </div>
      </div>

      {isReading && (
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>{t('recipe.step')} {currentStep + 1} {t('recipe.of')} {steps.length}</span>
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
              <span className="font-bold text-purple-600 dark:text-purple-400">{t('recipe.step')} {currentStep + 1}:</span> {steps[currentStep]}
            </p>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={prevStep}
              disabled={currentStep === 0 || !isReading}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              ⬅️ {t('recipe.previous')}
            </button>
            <button
              onClick={skipStep}
              disabled={!isReading}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              {t('recipe.next')} ➡️
            </button>
          </div>
        </div>
      )}

      {isReading && !isPaused && (
        <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
          <span className="animate-pulse">🔴</span> {t('recipe.reading')}
        </div>
      )}
      {isReading && isPaused && (
        <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
          <span>⏸️</span> {t('recipe.paused')}
        </div>
      )}
      {!speechSupported && (
        <p className="text-red-500 text-sm mt-2">❌ {t('recipe.not_supported')}</p>
      )}
    </div>
  );
};

// ============================================================
// GLAVNA KOMPONENTA AIRecipe
// ============================================================
const AIRecipe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [recipe, setRecipe] = useState(null);
  const [originalRecipe, setOriginalRecipe] = useState(null);
  const [translatedRecipe, setTranslatedRecipe] = useState(null); // 🔥 DODANO
  const [loading, setLoading] = useState(true);
  const [osobe, setOsobe] = useState(4);
  const [originalneOsobe, setOriginalneOsobe] = useState(4);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState(null);

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
  // 🔄 PREVEDI AI RECEPT
  // ============================================================
  const translateRecipe = async (recipeData, targetLang) => {
    if (targetLang === 'hr') {
      setTranslatedRecipe(null);
      return;
    }

    try {
      console.log('🔄 Prevodim AI recept na:', targetLang);

      const res = await fetch(`${API_URL}/api/recepti/groq/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recept: recipeData,
          jezik: targetLang
        })
      });

      const data = await res.json();

      if (data.success && data.data) {
        console.log('✅ Prevod dohvaćen:', data._source);
        setTranslatedRecipe(data.data);
      }
    } catch (error) {
      console.error('❌ Greška pri prevodu:', error);
      setTranslatedRecipe(null);
    }
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
  // 👤 KORISNIK
  // ============================================================
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
  }, []);

  // ============================================================
  // 📥 DOHVATI GROQ RECEPT
  // ============================================================
  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        console.log('🔍 Dohvatam AI recept ID:', id);

        const res = await fetch(`${API_URL}/api/recepti/groq/${id}`);

        if (!res.ok) {
          throw new Error('Recept nije pronađen');
        }

        const data = await res.json();
        console.log('📊 AI recept dohvaćen:', data);

        if (data.success && data.data) {
          const recipeData = data.data;
          setOriginalRecipe(recipeData);
          setOriginalneOsobe(4);
          setRecipe({
            ...recipeData,
            sastojci: recipeData.sastojci || []
          });

          // 🔥 PREVEDI AKO JEZIK NIJE HRVATSKI
          const currentLang = (i18n.language || 'hr').split('-')[0].toLowerCase();
          if (currentLang !== 'hr') {
            translateRecipe(recipeData, currentLang);
          }
        } else {
          throw new Error(data.error || 'Recept nije pronađen');
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
  }, [id, i18n.language]); // 🔥 DODANO i18n.language

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
      alert('⏰ ' + t('recipe.time_up'));
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
  // 📤 SHARE RECIPE
  // ============================================================
  const shareRecipe = async () => {
    try {
      const shareData = {
        title: recipe?.naziv || 'AI Recept',
        text: `${recipe?.naziv}\n⏱️ ${recipe?.vrijeme || 0} min\n🔥 ${recipe?.kalorije || 0} kcal\n\n📋 Sastojci: ${recipe?.sastojci?.join(', ') || ''}\n\n👨‍🍳 Upute: ${recipe?.upute?.join('. ') || ''}`,
        url: window.location.href,
      };

      if (isNative) {
        try {
          const { Share } = await import('@capacitor/share');
          await Share.share({
            title: shareData.title,
            text: shareData.text,
            url: shareData.url,
            dialogTitle: 'Podijeli recept'
          });
        } catch (nativeError) {
          console.error('Native share error:', nativeError);
          await navigator.clipboard.writeText(shareData.text);
          alert(t('recipe.copied'));
        }
      } else if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        alert(t('recipe.copied'));
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(t('common.error'), error);
      }
    }
  };

  // ============================================================
  // 🍷 AI SOMELIJER
  // ============================================================
  const fetchSommelier = async () => {
    setLoadingSommelier(true);
    setSommelierError(null);
    try {
      // 🔥 UZMI JEZIK IZ i18n
      const currentLang = (i18n.language || 'hr').split('-')[0].toLowerCase();

      const res = await fetch(`${API_URL}/api/ai-sommelier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naziv: recipe?.naziv,
          sastojci: recipe?.sastojci,
          receptId: recipe?.id,
          jezik: currentLang  // 🔥 DODANO
        })
      });
      const data = await res.json();
      setSommelierData(data);
    } catch (error) {
      console.error('Greška:', error);
      setSommelierError('❌ ' + t('common.error'));
    } finally {
      setLoadingSommelier(false);
    }
  };

  // ============================================================
  // 🔥 PRIKAZ - koristi prevedeni recept ako postoji
  // ============================================================
  const displayRecipe = translatedRecipe
    ? { ...recipe, ...translatedRecipe }
    : recipe;

  // ============================================================
  // 🖥️ RENDER - LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
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
            ❌ Recept nije pronađen
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Ovaj AI recept je istekao ili nije dostupan.
          </p>
          <button
            onClick={() => navigate('/ai-chef')}
            className="mt-6 inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg transition"
          >
            ← Nazad na AI Chef
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - RECEPT
  // ============================================================
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      <SEO
        title={displayRecipe.naziv}
        description={displayRecipe.opis}
        url={`https://os-zdravlja.vercel.app/ai-recipe/${id}`}
      />

      {/* DUGME ZA NAZAD */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-purple-500 dark:text-purple-400 hover:underline flex items-center gap-2"
        >
          ⬅️ {t('common.back')}
        </button>
        <Link
          to="/ai-chef"
          className="text-purple-500 dark:text-purple-400 hover:underline flex items-center gap-2"
        >
          ✨ AI Chef
        </Link>
        <Link
          to="/recipes"
          className="text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-2"
        >
          📋 {t('recipe.all_recipes')}
        </Link>
      </div>

      {/* SLIKA */}
      <div className="relative">
        <img
          src={recipe.slika || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop'}
          alt={displayRecipe.naziv}
          className="w-full h-64 object-cover rounded-xl mb-4"
        />
        <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
          <span>✨</span> AI GENERIRANO
        </div>
      </div>

      {/* NASLOV I FAVORIT */}
      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold dark:text-white">{displayRecipe.naziv}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={`text-2xl ${isFavorite ? 'text-red-500' : 'text-gray-400'} hover:scale-110 transition`}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      {/* OPIS */}
      <p className="text-gray-600 dark:text-gray-300 mt-2">{displayRecipe.opis}</p>

      {/* INFORMACIJE */}
      <div className="flex flex-wrap gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <div className="flex items-center gap-2">
          <label className="font-semibold dark:text-white">👥 {t('recipe.servings')}:</label>
          <select
            value={osobe}
            onChange={(e) => setOsobe(parseInt(e.target.value))}
            className="border rounded-lg px-3 py-1 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold dark:text-white">⏱️</span>
          <span className="dark:text-gray-300">{recipe.vrijeme || '30 min'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold dark:text-white">🔥</span>
          <span className="dark:text-gray-300">{recipe.kalorije || 0} kcal</span>
        </div>
        {recipe.tezina && (
          <div className="flex items-center gap-2">
            <span className="font-semibold dark:text-white">⚡</span>
            <span className="dark:text-gray-300">{recipe.tezina}</span>
          </div>
        )}
      </div>

      {/* REKLAMA 1 */}
      {createBannerAd(user?.premium)}

      {/* TIP */}
      <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900 rounded-xl border border-purple-200 dark:border-purple-700">
        <h3 className="font-semibold dark:text-white">💡 {t('recipe.tip')}</h3>
        <p className="text-gray-700 dark:text-gray-300">
          {t('recipe.tip_text')}
        </p>
      </div>

      {/* SASTOJCI */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold dark:text-white mb-2">
          📋 {t('recipe.ingredients')} ({t('recipe.for')} {osobe} {osobe === 1 ? t('recipe.person') : t('recipe.people')})
        </h2>
        <ul className="list-disc list-inside space-y-1">
          {displayRecipe.sastojci?.map((s, i) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">{s}</li>
          ))}
        </ul>
        {osobe !== originalneOsobe && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            * {t('recipe.adjusted')} {osobe} {t('recipe.people')} ({t('recipe.original')}: {originalneOsobe} {t('recipe.people')})
          </p>
        )}
      </div>

      {/* REKLAMA 2 */}
      {createBannerAd(user?.premium)}

      {/* NUTRITIVNE VRIJEDNOSTI */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h3 className="font-bold dark:text-white mb-2">📊 {t('recipe.nutrition')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="dark:text-gray-300"><span className="font-semibold">🔥 {t('recipe.calories')}:</span> {recipe.kalorije || 0} kcal</div>
          <div className="dark:text-gray-300"><span className="font-semibold">🥩 {t('recipe.protein')}:</span> {recipe.proteini || 0}g</div>
          <div className="dark:text-gray-300"><span className="font-semibold">🍞 {t('recipe.carbs')}:</span> {recipe.ugljikohidrati || 0}g</div>
          <div className="dark:text-gray-300"><span className="font-semibold">🧈 {t('recipe.fat')}:</span> {recipe.masti || 0}g</div>
        </div>
      </div>

      {/* UPUTSTVA */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold dark:text-white mb-2">👨‍🍳 {t('recipe.instructions')}</h2>
        <ol className="list-decimal list-inside space-y-2">
          {displayRecipe.upute?.map((u, i) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">{u}</li>
          ))}
        </ol>
      </div>

      {/* NACIN PRIPREME */}
      {displayRecipe.nacin_pripreme && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-xl">
          <h3 className="font-bold dark:text-white mb-2">📝 {t('recipe.preparation')}</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{displayRecipe.nacin_pripreme}</p>
        </div>
      )}

      {/* DUGMAD */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => window.print()}
          className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition dark:text-white"
        >
          🖨️ {t('recipe.print')}
        </button>
        <button
          onClick={shareRecipe}
          className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition dark:text-white"
        >
          📤 {t('recipe.share')}
        </button>
      </div>

      {/* SOCIAL MEDIA */}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => {
            const url = encodeURIComponent(window.location.href);
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
          }}
          className="bg-[#1877F2] text-white px-4 py-2 rounded-lg hover:bg-[#166fe5] transition"
        >
          📘 Facebook
        </button>
        <button
          onClick={() => {
            const text = encodeURIComponent(`${recipe?.naziv} - ${window.location.href}`);
            window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
          }}
          className="bg-[#25D366] text-white px-4 py-2 rounded-lg hover:bg-[#20b858] transition"
        >
          📱 WhatsApp
        </button>
      </div>

      {/* AI SOMELIJER */}
      <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900 rounded-xl border border-purple-200 dark:border-purple-700">
        <h3 className="font-bold dark:text-white flex items-center gap-2">
          🍷 {t('recipe.sommelier')}
          <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ {t('premium.title')}</span>
        </h3>

        {sommelierError && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-2">{sommelierError}</p>
        )}

        {sommelierData ? (
          <div className="mt-3 space-y-1 dark:text-gray-300">
            <p><span className="font-semibold">🌿 {t('recipe.spices')}:</span> {sommelierData.zacini}</p>
            <p><span className="font-semibold">🍷 {t('recipe.drink')}:</span> {sommelierData.pice}</p>
            <p><span className="font-semibold">🥗 {t('recipe.side')}:</span> {sommelierData.prilog}</p>
            <p><span className="font-semibold">⏰ {t('recipe.time')}:</span> {sommelierData.vrijeme_jela}</p>
            <button
              onClick={() => setSommelierData(null)}
              className="mt-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              🔄 {t('recipe.ask_again')}
            </button>
          </div>
        ) : (
          <button
            onClick={fetchSommelier}
            disabled={loadingSommelier}
            className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            {loadingSommelier ? t('common.loading') : '🍷 ' + t('recipe.ask_sommelier')}
          </button>
        )}
      </div>

      {/* GLASOVNO KUHANJE */}
      {user?.premium ? (
        <div className="mt-6">
          <VoiceRecipeReader recipe={displayRecipe} />
        </div>
      ) : (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            🎤 {t('recipe.voice_premium')}
          </p>
          <Link to="/premium" className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-full text-sm font-semibold transition inline-block">
            ⭐ {t('premium.button.default')}
          </Link>
        </div>
      )}

      {/* TIMER */}
      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-4 flex-wrap">
        <button
          onClick={startTimer}
          className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition"
        >
          ⏱️ {t('recipe.start_timer')}
        </button>
        <span className="text-2xl font-mono dark:text-white">{formatTime(timer)}</span>
        {timerActive && (
          <button
            onClick={() => setTimerActive(false)}
            className="bg-red-500 dark:bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition"
          >
            ⏹️ {t('recipe.stop')}
          </button>
        )}
      </div>

      {/* BACK */}
      <div className="mt-8 text-center">
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