// frontend/src/pages/Premium.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Premium = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumDo, setPremiumDo] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  // 🔥 PROVJERI DA LI JE KORISNIK VEĆ PREMIUM
  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    setUserEmail(email);
    
    if (email) {
      const checkPremium = async () => {
        try {
          const res = await fetch(`${API_URL}/api/profil/${email}`);
          const data = await res.json();
          if (data.success && data.data) {
            setIsPremium(data.data.premium || false);
            setPremiumDo(data.data.premium_do);
          }
        } catch (error) {
          console.error('❌ Greška:', error);
        }
      };
      checkPremium();
    }
  }, []);

  // ⭐ PREMIUM FUNKCIONALNOSTI
  const premiumFeatures = [
    { 
      icon: '📸', 
      title: t('premium.features.ingredient_recognition'), 
      desc: t('premium.features.ingredient_recognition_desc'),
      color: 'from-purple-500 to-pink-500'
    },
    { 
      icon: '🧊', 
      title: t('premium.features.virtual_fridge'), 
      desc: t('premium.features.virtual_fridge_desc'),
      color: 'from-cyan-500 to-blue-500'
    },
    { 
      icon: '🛒', 
      title: t('premium.features.shopping_list'), 
      desc: t('premium.features.shopping_list_desc'),
      color: 'from-green-500 to-emerald-500'
    },
    { 
      icon: '🎤', 
      title: t('premium.features.voice_search'), 
      desc: t('premium.features.voice_search_desc'),
      color: 'from-indigo-500 to-purple-500'
    },
    { 
      icon: '🎤', 
      title: t('premium.features.voice_cooking'), 
      desc: t('premium.features.voice_cooking_desc'),
      color: 'from-rose-500 to-pink-500'
    },
    { 
      icon: '💬', 
      title: t('premium.features.ai_chat'), 
      desc: t('premium.features.ai_chat_desc'),
      color: 'from-violet-500 to-purple-500'
    },
    { 
      icon: '🌿', 
      title: t('premium.features.healthychef'), 
      desc: t('premium.features.healthychef_desc'),
      color: 'from-emerald-500 to-green-500'
    },
    { 
      icon: '🍷', 
      title: t('premium.features.sommelier'), 
      desc: t('premium.features.sommelier_desc'),
      color: 'from-amber-500 to-orange-500'
    },
    { 
      icon: '📊', 
      title: t('premium.features.food_diary'), 
      desc: t('premium.features.food_diary_desc'),
      color: 'from-blue-500 to-indigo-500'
    },
    { 
      icon: '📅', 
      title: t('premium.features.meal_plan'), 
      desc: t('premium.features.meal_plan_desc'),
      color: 'from-teal-500 to-cyan-500'
    },
    { 
      icon: '🧘', 
      title: t('premium.features.lifestyle_coach'), 
      desc: t('premium.features.lifestyle_coach_desc'),
      color: 'from-fuchsia-500 to-pink-500'
    },
    { 
      icon: '📄', 
      title: t('premium.features.pdf_report'), 
      desc: t('premium.features.pdf_report_desc'),
      color: 'from-red-500 to-rose-500'
    },
    { 
      icon: '🔒', 
      title: t('premium.features.no_ads'), 
      desc: t('premium.features.no_ads_desc'),
      color: 'from-gray-600 to-gray-800'
    }
  ];

  // ✅ FREE FUNKCIONALNOSTI
  const freeFeatures = [
    { icon: '🔍', text: t('premium.free.features.ai_chef') },
    { icon: '📖', text: t('premium.free.features.recipes') },
    { icon: '🍽️', text: t('premium.free.features.categories') },
    { icon: '📝', text: t('premium.free.features.quiz') },
    { icon: '🎯', text: t('premium.free.features.goals') },
    { icon: '💧', text: t('premium.free.features.water') },
    { icon: '📊', text: t('premium.free.features.micronutrients') },
    { icon: '📝', text: t('premium.free.features.community') },
    { icon: '🏆', text: t('premium.free.features.badges') },
    { icon: '📄', text: t('premium.free.features.pdf_report') },
    { icon: '🛒', text: t('premium.free.features.shopping_list_limited') },
    { icon: '🧊', text: t('premium.free.features.virtual_fridge_limited') }
  ];

  // ❌ FREE NEMA
  const freeMissing = [
    { icon: '📸', text: t('premium.free.missing.ingredient_recognition') },
    { icon: '🧊', text: t('premium.free.missing.virtual_fridge') },
    { icon: '🛒', text: t('premium.free.missing.shopping_list') },
    { icon: '🎤', text: t('premium.free.missing.voice_search') },
    { icon: '🎤', text: t('premium.free.missing.voice_cooking') },
    { icon: '💬', text: t('premium.free.missing.ai_chat') },
    { icon: '🌿', text: t('premium.free.missing.healthychef') },
    { icon: '🍷', text: t('premium.free.missing.sommelier') },
    { icon: '📊', text: t('premium.free.missing.food_diary') },
    { icon: '📅', text: t('premium.free.missing.meal_plan') },
    { icon: '🧘', text: t('premium.free.missing.lifestyle_coach') },
    { icon: '📄', text: t('premium.free.missing.pdf_report') },
    { icon: '🔒', text: t('premium.free.missing.no_ads') }
  ];

  // 🔥 HANDLE PREMIUM KUPOVINU
  const handlePremium = async () => {
    if (!userEmail) {
      alert(t('premium.alert.login_required'));
      return;
    }

    setLoading(true);
    try {
      console.log('💳 Pokrećem Stripe checkout za:', userEmail);
      
      const res = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || t('premium.alert.session_error'));
      }

      const data = await res.json();
      console.log('✅ Stripe session kreiran:', data.url);
      window.location.href = data.url;
      
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(`${t('premium.alert.payment_error')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 AKO JE KORISNIK VEĆ PREMIUM
  if (isPremium && premiumDo) {
    const premiumDoDate = new Date(premiumDo);
    const daysLeft = Math.ceil((premiumDoDate - new Date()) / (1000 * 60 * 60 * 24));
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-3xl p-12 border-2 border-green-200 dark:border-green-700 shadow-2xl">
            <div className="text-7xl block mb-6 animate-pulse">⭐</div>
            <h2 className="text-4xl font-bold text-green-600 dark:text-green-400 mb-4">
              {t('premium.already_premium')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-3">
              {t('premium.premium_until')}: {premiumDoDate.toLocaleDateString('hr', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            {daysLeft > 0 && (
              <div className="inline-block bg-green-100 dark:bg-green-900/50 px-6 py-2 rounded-full mb-6">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  🎉 {t('premium.days_left', { days: daysLeft })}
                </p>
              </div>
            )}
            <Link 
              to="/profile" 
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold transition shadow-lg hover:shadow-xl"
            >
              {t('premium.go_to_profile')} →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 GLAVNI RENDER - FREE KORISNICI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* HERO */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4 animate-bounce">⭐</div>
          <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
            {t('premium.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mt-4 max-w-3xl mx-auto">
            {t('premium.subtitle')}
          </p>
        </div>

        {/* PRICING CARDS */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* FREE PLAN */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">🆓 {t('premium.free.title')}</h2>
              <p className="text-5xl font-bold text-green-500 my-4">{t('premium.free.price')}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Zauvijek besplatno</p>
            </div>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {freeFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-sm py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <span className="text-green-500 text-lg flex-shrink-0">✅</span>
                  <span className="flex-1">{feature.icon} {feature.text}</span>
                </div>
              ))}
              {freeMissing.map((feature, index) => (
                <div
                  key={`missing-${index}`}
                  className="flex items-center gap-3 text-gray-400 dark:text-gray-500 text-sm py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <span className="text-red-400 text-lg flex-shrink-0">❌</span>
                  <span className="flex-1">{feature.icon} {feature.text}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                {t('premium.free.limit_hint')}
              </p>
            </div>
          </div>

          {/* PREMIUM PLAN */}
          <div className="relative bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/30 dark:to-gray-800 rounded-3xl p-8 shadow-2xl border-2 border-yellow-400 dark:border-yellow-600 hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                ⭐ {t('premium.premium.best_value')}
              </span>
            </div>
            
            <div className="text-center mb-6 mt-2">
              <h2 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{t('premium.premium.title')}</h2>
              <p className="text-5xl font-bold text-gray-800 dark:text-white my-4">
                {t('premium.premium.price')}
                <span className="text-base font-normal text-gray-500 dark:text-gray-400">{t('premium.premium.period')}</span>
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Otkažite bilo kada</p>
            </div>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {premiumFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-sm py-1.5 px-3 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition"
                >
                  <span className="text-yellow-500 text-lg flex-shrink-0">✅</span>
                  <span className="flex-1">{feature.icon} {feature.title}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400 font-bold text-sm py-2 px-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <span className="text-yellow-500 text-lg flex-shrink-0">⭐</span>
                <span className="flex-1">{t('premium.premium.total_features')}</span>
              </div>
            </div>

            <button
              onClick={handlePremium}
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white py-4 rounded-xl font-bold text-lg transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  {t('premium.button.loading')}
                </span>
              ) : (
                t('premium.button.default')
              )}
            </button>
            <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-3">
              {t('premium.cta.secure')}
            </p>
          </div>
        </div>

        {/* DETAILED FEATURES */}
        <div className="mt-16">
          <h2 className="text-4xl font-bold text-center mb-3 dark:text-white">
            {t('premium.details.title')}
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-10">
            {t('premium.details.subtitle')}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {premiumFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-block p-3 rounded-xl bg-gradient-to-r ${feature.color} text-white text-3xl mb-4 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FINAL CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-3xl p-10 border-2 border-yellow-200 dark:border-yellow-700">
          <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
            {t('premium.cta.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t('premium.cta.subtitle')}
          </p>
          <button
            onClick={handlePremium}
            disabled={loading}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white px-12 py-5 rounded-full font-bold text-xl transition shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {t('premium.button.loading')}
              </span>
            ) : (
              t('premium.cta.button')
            )}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            {t('premium.cta.secure')}
          </p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default Premium;