// frontend/src/pages/Premium.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Premium = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handlePremium = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        alert(t('premium.alert.login_required'));
        setLoading(false);
        return;
      }

      console.log('💳 Pokrećem Stripe checkout za:', user.email);
      
      const res = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
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

  // Premium funkcionalnosti
  const premiumFeatures = [
    {
      icon: '📸',
      title: t('premium.features.ingredient_recognition'),
      description: t('premium.features.ingredient_recognition_desc')
    },
    {
      icon: '🎤',
      title: t('premium.features.voice_search'),
      description: t('premium.features.voice_search_desc')
    },
    {
      icon: '🌿',
      title: t('premium.features.healthychef'),
      description: t('premium.features.healthychef_desc')
    },
    {
      icon: '📊',
      title: t('premium.features.food_diary'),
      description: t('premium.features.food_diary_desc')
    },
    {
      icon: '📅',
      title: t('premium.features.meal_plan'),
      description: t('premium.features.meal_plan_desc')
    },
    {
      icon: '🧊',
      title: t('premium.features.virtual_fridge'),
      description: t('premium.features.virtual_fridge_desc')
    },
    {
      icon: '🧘',
      title: t('premium.features.lifestyle_coach'),
      description: t('premium.features.lifestyle_coach_desc')
    },
    {
      icon: '🍷',
      title: t('premium.features.sommelier'),
      description: t('premium.features.sommelier_desc')
    },
    {
      icon: '📸',
      title: t('premium.features.scan_receipt'),
      description: t('premium.features.scan_receipt_desc')
    },
    {
      icon: '🎤',
      title: t('premium.features.voice_cooking'),
      description: t('premium.features.voice_cooking_desc')
    },
    {
      icon: '📝',
      title: t('premium.features.community'),
      description: t('premium.features.community_desc')
    },
    {
      icon: '🏆',
      title: t('premium.features.badges'),
      description: t('premium.features.badges_desc')
    },
    {
      icon: '🛒',
      title: t('premium.features.shopping_list'),
      description: t('premium.features.shopping_list_desc')
    },
    {
      icon: '📄',
      title: t('premium.features.pdf_report'),
      description: t('premium.features.pdf_report_desc')
    },
    {
      icon: '⌚',
      title: t('premium.features.smartwatch'),
      description: t('premium.features.smartwatch_desc')
    },
    {
      icon: '🔒',
      title: t('premium.features.no_ads'),
      description: t('premium.features.no_ads_desc')
    }
  ];

  // Free funkcionalnosti
  const freeFeatures = [
    t('premium.free.features.search'),
    t('premium.free.features.recipes'),
    t('premium.free.features.categories'),
    t('premium.free.features.quiz')
  ];

  const freeMissing = [
    t('premium.free.missing.ingredient_recognition'),
    t('premium.free.missing.healthychef'),
    t('premium.free.missing.food_diary'),
    t('premium.free.missing.voice_cooking'),
    t('premium.free.missing.scan_receipt'),
    t('premium.free.missing.community')
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-4xl font-extrabold text-center mb-2">{t('premium.title')}</h1>
      <p className="text-center text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
        {t('premium.subtitle')}
      </p>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Free plan */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-center">{t('premium.free.title')}</h2>
          <p className="text-3xl font-bold text-center my-4">{t('premium.free.price')}</p>
          <ul className="space-y-2">
            {freeFeatures.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                ✅ {feature}
              </li>
            ))}
            {freeMissing.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                ❌ {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Premium plan */}
        <div className="bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/30 dark:to-gray-800 rounded-2xl p-6 shadow-lg border-2 border-yellow-400 dark:border-yellow-600">
          <h2 className="text-2xl font-bold text-center text-yellow-600 dark:text-yellow-400">{t('premium.premium.title')}</h2>
          <p className="text-3xl font-bold text-center my-4">
            {t('premium.premium.price')}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{t('premium.premium.period')}</span>
          </p>
          <ul className="space-y-2">
            {premiumFeatures.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-sm">
                ✅ {feature.title}
              </li>
            ))}
            <li className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-bold">
              ⭐ {t('premium.premium.total_features')}
            </li>
          </ul>
          <button
            onClick={handlePremium}
            disabled={loading}
            className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-bold transition shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {loading ? t('premium.button.loading') : t('premium.button.default')}
          </button>
        </div>
      </div>

      {/* ===== DETALJAN OPIS PREMIUM FUNKCIONALNOSTI ===== */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-center mb-2 dark:text-white">
          {t('premium.details.title')}
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
          {t('premium.details.subtitle')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {premiumFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{feature.icon}</span>
                <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== CTA NA KRAJU ===== */}
      <div className="mt-12 text-center bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-8 border-2 border-yellow-200 dark:border-yellow-700">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {t('premium.cta.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('premium.cta.subtitle')}
        </p>
        <button
          onClick={handlePremium}
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-10 py-4 rounded-full font-bold transition shadow-lg hover:shadow-xl disabled:opacity-50 text-lg"
        >
          {loading ? t('premium.button.loading') : t('premium.cta.button')}
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          {t('premium.cta.secure')}
        </p>
      </div>
    </div>
  );
};

export default Premium;