// frontend/src/pages/Quiz.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Toast from '../components/Toast';
import { supabase } from '../supabaseClient';

const ICONS = {
  'Deserti': '🍰',
  'Slano': '🍕',
  'Dijetalni recepti': '🥗',
  'Napitki': '🥤',
  'Svejedno': '😋',
  'Bez glutena': '🌾❌',
  'Bez laktoze': '🥛❌',
  'Bez šećera': '🍬❌',
  'Veganski': '🌱',
  'Orašasti plodovi': '🥜❌',
  'Visokoproteinski': '💪',
  'Bogat vlaknima': '🌾',
  'Bogat ugljikohidratima': '🍞',
  'Kratko (15-30 min)': '⚡',
  'Srednje (30-45 min)': '⏳',
  'Duže (45-60 min)': '🐢',
  'Početnik': '👶',
  'Srednji': '👨‍🍳',
  'Profesionalac': '👨‍🍳⭐',
  'Nisko (do 300 kcal)': '⬇️',
  'Umjereno (300-500 kcal)': '➡️',
  'Srednje (500-700 kcal)': '⬆️',
  'Visoko (900+ kcal)': '🔥'
};

const Quiz = () => {
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
  const [consentGiven, setConsentGiven] = useState(false);

  // ============================================================
  // 🔍 PROVJERI DA LI JE KORISNIK PRIJAVLJEN
  // ============================================================
  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        
        // 1. Provjeri Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ Korisnik prijavljen:', session.user.email);
          setUser(session.user);
          
          // Automatski popuni email i ime
          setFormData(prev => ({
            ...prev,
            email: session.user.email,
            ime: session.user.user_metadata?.ime || ''
          }));
          
          // Ako je kviz već završen, pitaj korisnika
          const { data: profile } = await supabase
            .from('profili')
            .select('kviz_zavrsen')
            .eq('email', session.user.email)
            .maybeSingle();
          
          if (profile?.kviz_zavrsen) {
            setToast({
              message: 'ℹ️ Već ste popunili kviz. Možete ponovo promijeniti svoje preferencije.',
              type: 'info'
            });
            setTimeout(() => setToast(null), 3000);
          }
        } else {
          // 2. Provjeri localStorage (fallback)
          const userData = JSON.parse(localStorage.getItem('user'));
          const email = localStorage.getItem('userEmail');
          const ime = localStorage.getItem('userName');
          
          if (userData || email) {
            console.log('✅ Korisnik iz localStorage:', email);
            setFormData(prev => ({
              ...prev,
              email: email || userData?.email || '',
              ime: ime || userData?.user_metadata?.ime || ''
            }));
          }
        }
      } catch (error) {
        console.error('❌ Greška:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  // ============================================================
  // 📋 PITANJA ZA KVIZ
  // ============================================================
  const questions = [
    {
      id: 'vrsta',
      label: '🍽️ Šta danas želite jesti? * (max 3)',
      type: 'checkbox',
      options: ['Deserti', 'Slano', 'Dijetalni recepti', 'Napitki', 'Svejedno'],
      maxSelect: 3
    },
    {
      id: 'preferencije',
      label: '💪 Šta PREFERIRATE? (max 2)',
      type: 'checkbox',
      options: ['Visokoproteinski', 'Bogat vlaknima', 'Bogat ugljikohidratima', 'Svejedno'],
      maxSelect: 2
    },
    {
      id: 'restrikcije',
      label: '🚫 Šta IZBJEGAVATE? (max 3)',
      type: 'checkbox',
      options: ['Bez glutena', 'Bez laktoze', 'Bez šećera', 'Veganski', 'Orašasti plodovi'],
      maxSelect: 3
    },
    {
      id: 'vrijeme',
      label: '⏱️ Koliko vremena imate za pripremu? *',
      type: 'select',
      options: ['Kratko (15-30 min)', 'Srednje (30-45 min)', 'Duže (45-60 min)']
    },
    {
      id: 'tezina',
      label: '👨‍🍳 Koliko ste vješti u kuhinji? *',
      type: 'select',
      options: ['Početnik', 'Srednji', 'Profesionalac']
    },
    {
      id: 'kalorije',
      label: '🔥 Koje kalorije preferirate? *',
      type: 'select',
      options: ['Nisko (do 300 kcal)', 'Umjereno (300-500 kcal)', 'Srednje (500-700 kcal)', 'Visoko (900+ kcal)']
    }
  ];

  // ============================================================
  // 🎯 UKLONI EMAIL I IME IZ PITANJA (ako je korisnik prijavljen)
  // ============================================================
  const getQuestions = () => {
    // Ako je korisnik prijavljen, preskoči email i ime
    if (user || formData.email) {
      return questions;
    }
    
    // Ako nije prijavljen, dodaj email i ime na početak
    return [
      {
        id: 'email',
        label: '📧 Email *',
        type: 'email',
        placeholder: 'Unesite vaš email',
        required: true
      },
      {
        id: 'ime',
        label: '👤 Ime *',
        type: 'text',
        placeholder: 'Unesite vaše ime',
        required: true
      },
      ...questions
    ];
  };

  const activeQuestions = getQuestions();

  // ============================================================
  // 📝 HANDLERI
  // ============================================================
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMultiSelect = (field, option) => {
    const current = formData[field] || [];
    const max = activeQuestions.find(q => q.id === field)?.maxSelect || 3;
    
    if (current.includes(option)) {
      handleChange(field, current.filter(item => item !== option));
    } else if (current.length < max) {
      handleChange(field, [...current, option]);
    } else {
      setToast({ 
        message: `Možete izabrati maksimalno ${max} opcije.`, 
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
    
    // Provjeri da li su sva polja popunjena
    const requiredFields = ['vrsta', 'restrikcije', 'preferencije', 'vrijeme', 'tezina', 'kalorije'];
    
    // Ako nije prijavljen, dodaj email i ime
    if (!user && !formData.email) {
      requiredFields.unshift('email', 'ime');
    }
    
    for (let field of requiredFields) {
      if (!formData[field] || (Array.isArray(formData[field]) && formData[field].length === 0)) {
        setToast({ 
          message: `Molimo popunite sva polja.`, 
          type: 'error' 
        });
        setTimeout(() => setToast(null), 2500);
        return;
      }
    }

    try {
      // Ako nema emaila, koristi onaj iz forme
      const email = user?.email || formData.email;
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${API_URL}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: email
        }),
      });
      const data = await res.json();
      
      setToast({ 
        message: '✅ Kviz završen! Filteri su sačuvani.', 
        type: 'success' 
      });
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('❌ Greška pri slanju kviza:', error);
      setToast({ 
        message: '❌ Greška pri slanju kviza. Pokušajte ponovo.', 
        type: 'error' 
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // ============================================================
  // 🖥️ RENDER PITANJA
  // ============================================================
  const renderQuestion = () => {
    const q = activeQuestions[currentStep];
    const getIcon = (option) => ICONS[option] || '📌';
    
    if (!q) return null;
    
    if (q.type === 'email' || q.type === 'text') {
      return (
        <input
          type={q.type}
          value={formData[q.id] || ''}
          onChange={(e) => handleChange(q.id, e.target.value)}
          onKeyDown={(e) => {
            // 🔥 SPRIJEČI ENTER DA SUBMIT-UJE FORMU
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          placeholder={q.placeholder}
          className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
          required={q.required}
        />
      );
    }
    
    if (q.type === 'checkbox') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {q.options.map(option => {
            const isSelected = (formData[q.id] || []).includes(option);
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
                <span className="text-lg sm:text-xl shrink-0">{getIcon(option)}</span>
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
          <option value="">Izaberite...</option>
          {q.options.map(option => (
            <option key={option} value={option}>
              {getIcon(option)} {option}
            </option>
          ))}
        </select>
      );
    }
    
    return null;
  };

  // ============================================================
  // 🔄 PROGRESS
  // ============================================================
  const progress = ((currentStep + 1) / activeQuestions.length) * 100;

  // ============================================================
  // 🖥️ LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Učitavanje...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🔐 CONSENT (samo za neprijavljene korisnike)
  // ============================================================
  if (!consentGiven && !user && !formData.email) {
    return (
      <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">🔐 Prije nego počnemo...</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Vaši odgovori će biti sačuvani kako bismo vam prilagodili recepte.
            Podaci se čuvaju sigurno i ne dijele se s trećim stranama.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Više informacija potražite u <Link to="/privacy" className="text-blue-500 hover:underline">Pravilima privatnosti</Link>.
          </p>
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            <button
              onClick={() => setConsentGiven(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              ✅ Slažem se – nastavi
            </button>
            <Link to="/" className="text-sm text-gray-500 hover:underline">
              ⬅️ Ne želim, vrati me na početnu
            </Link>
          </div>
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
        {/* Progress bar */}
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Korak {currentStep + 1} od {activeQuestions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Naslov */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-1">
          {user || formData.email ? '✏️ Izmjena filtera' : '👋 HAJDE DA VAS UPOZNAMO'}
        </h1>
        <p className="text-sm sm:text-base text-center text-gray-500 dark:text-gray-300 mb-4 sm:mb-6">
          {user || formData.email 
            ? 'Prilagodite svoje preferencije i uživajte u savršenim receptima!' 
            : 'Odgovorite na 8 pitanja i mi ćemo prilagoditi recepte vašim potrebama!'}
        </p>

        {/* Forma */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4 sm:mb-6">
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm sm:text-base">
              {activeQuestions[currentStep].label}
            </label>
            {renderQuestion()}
            {activeQuestions[currentStep].maxSelect && (
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                Odabrano: {(formData[activeQuestions[currentStep].id] || []).length}/{activeQuestions[currentStep].maxSelect}
              </p>
            )}
          </div>

          <div className="flex justify-between gap-3 mt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-4 sm:px-6 py-2 rounded-xl bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-500 transition text-sm sm:text-base"
            >
              Nazad
            </button>
            
            {currentStep === activeQuestions.length - 1 ? (
              <button
                type="submit"
                className="px-4 sm:px-6 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                {user || formData.email ? '✅ Sačuvaj izmjene' : '✅ Započnimo'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(activeQuestions.length - 1, prev + 1))}
                className="px-4 sm:px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                Dalje →
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Quiz;