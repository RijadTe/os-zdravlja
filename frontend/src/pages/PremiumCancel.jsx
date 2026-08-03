// frontend/src/pages/PremiumCancel.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PremiumCancel = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto py-20 px-4 text-center dark:bg-gray-900 dark:text-white">
      <div className="text-6xl mb-6">😔</div>
      <h1 className="text-4xl font-extrabold mb-4">{t('premiumcancel.title')}</h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
        {t('premiumcancel.subtitle')}
      </p>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {t('premiumcancel.message')}
      </p>
      <Link
        to="/premium"
        className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full font-semibold transition"
      >
        ⭐ {t('premiumcancel.button')}
      </Link>
    </div>
  );
};

export default PremiumCancel;