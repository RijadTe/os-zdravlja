// frontend/src/pages/TermsOfService.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TermsOfService = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">⚖️ {t('termsofservice.title')}</h1>
      <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 p-4 rounded-xl">
          <p className="font-bold text-red-600 dark:text-red-400">{t('termsofservice.disclaimer.title')}</p>
          <p className="mt-2">
            {t('termsofservice.disclaimer.text')}
            <strong> {t('termsofservice.disclaimer.strong')}</strong>
          </p>
        </div>
        <p>
          {t('termsofservice.consult.text')}
          <strong> {t('termsofservice.consult.strong')}</strong>
        </p>
        <p className="text-sm text-gray-500 mt-6">{t('termsofservice.last_updated')}</p>
        <Link to="/" className="inline-block mt-4 text-blue-500 hover:underline">⬅️ {t('termsofservice.back_home')}</Link>
      </div>
    </div>
  );
};

export default TermsOfService;