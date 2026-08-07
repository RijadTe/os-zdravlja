// frontend/src/pages/Quiz.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Toast from '../components/Toast';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================
// 🔥 IKONE
// ============================================================
const getIconForOption = (option) => {
  const iconMap = {
    // VRSTA
    'Deserti': '🍰', 'Slano': '🍕', 'Dijetalni recepti': '🥗', 'Napitki': '🥤', 'Svejedno': '😋',
    'Desserts': '🍰', 'Savory': '🍕', 'Diet recipes': '🥗', 'Drinks': '🥤', 'Anything': '😋',
    'Nachspeisen': '🍰', 'Herzhaft': '🍕', 'Diät Rezepte': '🥗', 'Getränke': '🥤', 'Alles': '😋',
    
    // RESTRIKCIJE
    'Bez restrikcija': '✅', 'Bez glutena': '🌾', 'Bez laktoze': '🥛', 'Bez šećera': '🍬', 'Veganski': '🌱', 'Bez orašastih plodova': '🥜',
    'No restrictions': '✅', 'Gluten-free': '🌾', 'Lactose-free': '🥛', 'Sugar-free': '🍬', 'Vegan': '🌱', 'Nuts-free': '🥜',
    'Keine Einschränkungen': '✅', 'Glutenfrei': '🌾', 'Laktosefrei': '🥛', 'Zuckerfrei': '🍬', 'Vegan': '🌱', 'Nussfrei': '🥜',
    
    // PREFERENCIJE
    'Visokoproteinski': '💪', 'Bogat vlaknima': '🌾', 'Bogat ugljikohidratima': '🍞',
    'High protein': '💪', 'High fiber': '🌾', 'High carb': '🍞',
    'Hoher Protein': '💪', 'Hohe Ballaststoffe': '🌾', 'Hohe Kohlenhydrate': '🍞',
    
    // VRIJEME
    'Kratko (15-30 min)': '⚡', 'Srednje (30-45 min)': '⏳', 'Duže (45-60+ min)': '🐢',
    'Short (15-30 min)': '⚡', 'Medium (30-45 min)': '⏳', 'Long (45-60+ min)': '🐢',
    'Kurz (15-30 min)': '⚡', 'Mittel (30-45 min)': '⏳', 'Lang (45-60+ min)': '🐢',
    
    // TEŽINA
    'Početnik': '👶', 'Srednji': '👨‍🍳', 'Profesionalac': '👨‍🍳⭐',
    'Beginner': '👶', 'Intermediate': '👨‍🍳', 'Professional': '👨‍🍳⭐',
    'Anfänger': '👶', 'Fortgeschritten': '👨‍🍳', 'Profi': '👨‍🍳⭐',
    
    // KALORIJE
    'Nisko (do 300 kcal)': '⬇️', 'Umjereno (300-500 kcal)': '➡️', 'Srednje (500-700 kcal)': '⬆️', 'Visoko (900+ kcal)': '🔥',
    'Low (up to 300 kcal)': '⬇️', 'Moderate (300-500 kcal)': '➡️', 'Medium (500-700 kcal)': '⬆️', 'High (900+ kcal)': '🔥',
    'Niedrig (bis 300 kcal)': '⬇️', 'Mäßig (300-500 kcal)': '➡️', 'Mittel (500-700 kcal)': '⬆️', 'Hoch (900+ kcal)': '🔥',
  };

  if (iconMap[option]) return iconMap[option];

  const lower = option.toLowerCase();
  if (lower.includes('dessert') || lower.includes('nachspeisen')) return '🍰';
  if (lower.includes('savory') || lower.includes('herzhaft') || lower.includes('slano')) return '🍕';
  if (lower.includes('diet') || lower.includes('diät') || lower.includes('dijetalni')) return '🥗';
  if (lower.includes('drink') || lower.includes('getränk') || lower.includes('napitak')) return '🥤';
  if (lower.includes('anything') || lower.includes('alles') || lower.includes('svejedno')) return '😋';
  if (lower.includes('no restriction') || lower.includes('keine einschränkungen') || lower.includes('bez restrikcija')) return '✅';
  if (lower.includes('gluten free') || lower.includes('glutenfrei') || lower.includes('bez glutena')) return '🌾';
  if (lower.includes('lactose free') || lower.includes('laktosefrei') || lower.includes('bez laktoze')) return '🥛';
  if (lower.includes('sugar free') || lower.includes('zuckerfrei') || lower.includes('bez šećera')) return '🍬';
  if (lower.includes('vegan')) return '🌱';
  if (lower.includes('nuts') || lower.includes('nüsse') || lower.includes('nussfrei') || lower.includes('orašasti')) return '🥜';
  if (lower.includes('protein') || lower.includes('visokoprotein')) return '💪';
  if (lower.includes('fiber') || lower.includes('ballaststoff') || lower.includes('vlaknima')) return '🌾';
  if (lower.includes('carbs') || lower.includes('kohlenhydrat') || lower.includes('ugljikohidrat')) return '🍞';
  if (lower.includes('quick') || lower.includes('kurz') || lower.includes('kratko')) return '⚡';
  if (lower.includes('medium') || lower.includes('mittel')) return '⏳';
  if (lower.includes('long') || lower.includes('lang') || lower.includes('duže')) return '🐢';
  if (lower.includes('beginner') || lower.includes('anfänger') || lower.includes('početnik')) return '👶';
  if (lower.includes('intermediate') || lower.includes('fortgeschritten') || lower.includes('srednji')) return '👨‍🍳';
  if (lower.includes('professional') || lower.includes('profi') || lower.includes('profesionalac')) return '👨‍🍳⭐';
  if (lower.includes('low') || lower.includes('niedrig') || lower.includes('nisko')) return '⬇️';
  if (lower.includes('moderate') || lower.includes('mäßig') || lower.includes('umjereno')) return '➡️';
  if (lower.includes('high') || lower.includes('hoch') || lower.includes('visoko')) return '🔥';

  return '📌';
};

const Quiz = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    ime: '',
    vrsta: [],
    restrikcije: [],
    preferencije: [],
    vrijeme: '',
    tezina: '',
    kalorije: ''
  });
  const [toast, setToast] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  // ============================================================
  // 🔍 PROVJERI DA LI JE KORISNIK PRIJAVLJEN
  // ============================================================
  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ Korisnik prijavljen:', session.user.email);
          setUser(session.user);
          
          setFormData(prev => ({
            ...prev,
            email: session.user.email,
            ime: session.user.user_metadata?.ime || ''
          }));
          
          const { data: profile } = await supabase
            .from('profili')
            .select('kviz_zavrsen, vrsta, izbjegava, preferencije, vrijeme, tezina, kalorije')
            .eq('email', session.user.email)
            .maybeSingle();
          
          if (profile) {
            setFormData(prev => ({
              ...prev,
              vrsta: profile.vrsta || [],
              restrikcije: profile.izbjegava || [],
              preferencije: profile.preferencije || [],
              vrijeme: profile.vrijeme || '',
              tezina: profile.tezina || '',
              kalorije: profile.kalorije || ''
            }));
            
            if (profile.kviz_zavrsen) {
              setToast({
                message: t('quiz.toast.already_completed'),
                type: 'info'
              });
              setTimeout(() => setToast(null), 3000);
            }
          }
        } else {
          console.log('🔒 Korisnik nije prijavljen, preusmjeravam na login...');
          setToast({
            message: t('quiz.toast.login_required'),
            type: 'info'
          });
          setTimeout(() => {
            navigate('/login', { state: { from: '/quiz' } });
          }, 1500);
        }
      } catch (error) {
        console.error('❌ Greška:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate, t]);

  // ============================================================
  // 📋 PITANJA ZA KVIZ
  // ============================================================
  const questions = [
    {
      id: 'vrsta',
      label: t('quiz.questions.vrsta'),
      type: 'checkbox',
      options: t('quiz.options.vrsta', { returnObjects: true }) || ['Deserti', 'Slano', 'Dijetalni recepti', 'Napitki', 'Svejedno'],
      maxSelect: 3
    },
    {
      id: 'preferencije',
      label: t('quiz.questions.preferencije'),
      type: 'checkbox',
      options: t('quiz.options.preferencije', { returnObjects: true }) || ['Visokoproteinski', 'Bogat vlaknima', 'Bogat ugljikohidratima', 'Svejedno'],
      maxSelect: 2
    },
    {
      id: 'restrikcije',
      label: t('quiz.questions.restrikcije'),
      type: 'checkbox',
      options: t('quiz.options.restrikcije', { returnObjects: true }) || ['Bez restrikcija', 'Bez glutena', 'Bez laktoze', 'Bez šećera', 'Veganski', 'Bez orašastih plodova'],
      maxSelect: 3
    },
    {
      id: 'vrijeme',
      label: t('quiz.questions.vrijeme'),
      type: 'select',
      options: t('quiz.options.vrijeme', { returnObjects: true }) || ['Kratko (15-30 min)', 'Srednje (30-45 min)', 'Duže (45-60+ min)'],
      maxSelect: 1
    },
    {
      id: 'tezina',
      label: t('quiz.questions.tezina'),
      type: 'select',
      options: t('quiz.options.tezina', { returnObjects: true }) || ['Početnik', 'Srednji', 'Profesionalac'],
      maxSelect: 1
    },
    {
      id: 'kalorije',
      label: t('quiz.questions.kalorije'),
      type: 'select',
      options: t('quiz.options.kalorije', { returnObjects: true }) || ['Nisko (do 300 kcal)', 'Umjereno (300-500 kcal)', 'Srednje (500-700 kcal)', 'Visoko (900+ kcal)'],
      maxSelect: 1
    }
  ];

  // ============================================================
  // 📝 HANDLERI
  // ============================================================
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ============================================================
  // 🎯 LOGIKA ZA MULTI-SELECT - POPRAVLJENA ZA SVE JEZIKE!
  // ============================================================
  const handleMultiSelect = (field, option) => {
    const current = formData[field] || [];
    const max = questions.find(q => q.id === field)?.maxSelect || 3;
    
    // 🔥 DEFINIRAJ "SVEJEDNO" NA SVIM JEZICIMA
    const anythingOptions = ['Svejedno', 'Anything', 'Alles'];
    const noRestrictionOptions = ['Bez restrikcija', 'No restrictions', 'Keine Einschränkungen'];
    
    const isAnything = (val) => anythingOptions.includes(val);
    const isNoRestriction = (val) => noRestrictionOptions.includes(val);
    
    // ============================================================
    // 1. LOGIKA ZA "SVEJEDNO" (VRSTA I PREFERENCIJE)
    // ============================================================
    if (field === 'vrsta' || field === 'preferencije') {
      // Ako je odabrana opcija "Svejedno" (na bilo kojem jeziku)
      if (isAnything(option)) {
        // Ako je već odabrano → ukloni ga
        if (current.some(item => isAnything(item))) {
          handleChange(field, current.filter(item => !isAnything(item)));
        } else {
          // Inače, postavi SAMO "Svejedno"
          handleChange(field, [option]);
        }
        return;
      }
      
      // Ako je "Svejedno" već odabrano, dodaj novu opciju umjesto njega
      if (current.some(item => isAnything(item))) {
        const newSelection = current.filter(item => !isAnything(item));
        if (!newSelection.includes(option) && newSelection.length < max) {
          handleChange(field, [...newSelection, option]);
        } else if (newSelection.includes(option)) {
          handleChange(field, newSelection.filter(item => item !== option));
        }
        return;
      }
    }
    
    // ============================================================
    // 2. LOGIKA ZA "BEZ RESTRIKCIJA" (RESTRIKCIJE)
    // ============================================================
    if (field === 'restrikcije') {
      // Ako je odabrana opcija "Bez restrikcija" (na bilo kojem jeziku)
      if (isNoRestriction(option)) {
        if (current.some(item => isNoRestriction(item))) {
          handleChange(field, current.filter(item => !isNoRestriction(item)));
        } else {
          handleChange(field, [option]);
        }
        return;
      }
      
      // Ako je "Bez restrikcija" već odabrano, dodaj novu opciju umjesto njega
      if (current.some(item => isNoRestriction(item))) {
        const newSelection = current.filter(item => !isNoRestriction(item));
        if (!newSelection.includes(option) && newSelection.length < max) {
          handleChange(field, [...newSelection, option]);
        } else if (newSelection.includes(option)) {
          handleChange(field, newSelection.filter(item => item !== option));
        }
        return;
      }
    }
    
    // ============================================================
    // 3. STANDARDNA LOGIKA ZA SVE OSTALO
    // ============================================================
    if (current.includes(option)) {
      handleChange(field, current.filter(item => item !== option));
    } else if (current.length < max) {
      handleChange(field, [...current, option]);
    } else {
      setToast({ 
        message: t('quiz.toast.max_selected', { max }), 
        type: 'error' 
      });
      setTimeout(() => setToast(null), 2500);
    }
  };

  // ============================================================
  // 📤 SLANJE KVIZA
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const anythingOptions = ['Svejedno', 'Anything', 'Alles'];
    const noRestrictionOptions = ['Bez restrikcija', 'No restrictions', 'Keine Einschränkungen'];
    
    const isAnything = (val) => anythingOptions.includes(val);
    const isNoRestriction = (val) => noRestrictionOptions.includes(val);
    
    let restrikcijeZaSlanje = formData.restrikcije;
    if (restrikcijeZaSlanje.some(item => isNoRestriction(item))) {
      restrikcijeZaSlanje = [];
    }
    
    let vrstaZaSlanje = formData.vrsta;
    if (vrstaZaSlanje.some(item => isAnything(item))) {
      vrstaZaSlanje = [];
    }
    
    let preferencijeZaSlanje = formData.preferencije;
    if (preferencijeZaSlanje.some(item => isAnything(item))) {
      preferencijeZaSlanje = [];
    }
    
    const requiredFields = ['vrsta', 'restrikcije', 'preferencije', 'vrijeme', 'tezina', 'kalorije'];
    
    for (let field of requiredFields) {
      if (!formData[field] || (Array.isArray(formData[field]) && formData[field].length === 0)) {
        setToast({ 
          message: t('quiz.toast.fill_all_fields'), 
          type: 'error' 
        });
        setTimeout(() => setToast(null), 2500);
        return;
      }
    }

    try {
      const email = user?.email;
      
      if (!email) {
        setToast({ 
          message: t('quiz.toast.not_logged_in'), 
          type: 'error' 
        });
        navigate('/login');
        return;
      }
      
      const payload = {
        email: email,
        vrsta: vrstaZaSlanje || [],
        restrikcije: restrikcijeZaSlanje || [],
        preferencije: preferencijeZaSlanje || [],
        vrijeme: formData.vrijeme || '',
        tezina: formData.tezina || '',
        kalorije: formData.kalorije || ''
      };
      
      console.log('📤 Šaljem kviz na:', `${API_URL}/api/quiz`);
      console.log('📦 Podaci:', payload);
      
      const res = await fetch(`${API_URL}/api/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('✅ Kviz uspješno poslan:', data);
      
      setToast({ 
        message: t('quiz.toast.success'), 
        type: 'success' 
      });
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('❌ Greška pri slanju kviza:', error);
      setToast({ 
        message: t('quiz.toast.error', { message: error.message }), 
        type: 'error' 
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // ============================================================
  // 🖥️ RENDER PITANJA
  // ============================================================
  const renderQuestion = () => {
    const q = questions[currentStep];
    
    if (!q) return null;
    
    if (q.type === 'checkbox') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {q.options.map(option => {
            const isSelected = (formData[q.id] || []).includes(option);
            const icon = getIconForOption(option) || '📌';
            return (
              <label
                key={option}
                className={`flex items-center gap-2 p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition text-sm sm:text-base ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-400' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleMultiSelect(q.id, option)}
                  className="w-4 h-4 accent-blue-500 shrink-0"
                />
                <span className="text-lg sm:text-xl shrink-0">{icon}</span>
                <span className="text-gray-700 dark:text-gray-200 break-words">{option}</span>
              </label>
            );
          })}
        </div>
      );
    }
    
    if (q.type === 'select') {
      return (
        <select
          value={formData[q.id] || ''}
          onChange={(e) => handleChange(q.id, e.target.value)}
          className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
          required
        >
          <option value="">{t('quiz.select_placeholder')}</option>
          {q.options.map(option => {
            const icon = getIconForOption(option) || '📌';
            return (
              <option key={option} value={option}>
                {icon} {option}
              </option>
            );
          })}
        </select>
      );
    }
    
    return null;
  };

  // ============================================================
  // 🔄 PROGRESS
  // ============================================================
  const progress = ((currentStep + 1) / questions.length) * 100;

  // ============================================================
  // 🖥️ LOADING
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
  // 🖥️ GLAVNI RENDER
  // ============================================================
  return (
    <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-3 sm:p-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 mt-4 sm:mt-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>{t('quiz.step_label')}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-1">
          {user?.kviz_zavrsen ? t('quiz.edit_title') : t('quiz.title')}
        </h1>
        <p className="text-sm sm:text-base text-center text-gray-500 dark:text-gray-300 mb-4 sm:mb-6">
          {user?.kviz_zavrsen ? t('quiz.edit_subtitle') : t('quiz.subtitle')}
        </p>

        {user && (
          <div className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('quiz.logged_in_as')} <span className="font-semibold text-blue-600 dark:text-blue-400">{user.email}</span>
          </div>
        )}

        <form 
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
        >
          <div className="mb-4 sm:mb-6">
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm sm:text-base">
              {questions[currentStep].label}
            </label>
            {renderQuestion()}
          </div>

          <div className="flex justify-between gap-3 mt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-4 sm:px-6 py-2 rounded-xl bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-500 transition text-sm sm:text-base"
            >
              {t('quiz.buttons.back')}
            </button>
            
            {currentStep === questions.length - 1 ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 sm:px-6 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                {user?.kviz_zavrsen ? t('quiz.buttons.save') : t('quiz.buttons.submit')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-4 sm:px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                {t('quiz.buttons.next')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Quiz;