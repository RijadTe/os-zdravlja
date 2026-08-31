// frontend/src/pages/PrivacyPolicy.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">🔒 {t('privacypolicy.title')}</h1>
      <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p><strong>OS Zdravlja</strong> {t('privacypolicy.intro')}</p>
        <p>{t('privacypolicy.collect_info')}</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>📧 {t('privacypolicy.data.email')}</li>
          <li>👤 {t('privacypolicy.data.name')}</li>
          <li>🍽️ {t('privacypolicy.data.preferences')}</li>
          <li>📊 {t('privacypolicy.data.nutrition')}</li>
        </ul>
        <p><strong>{t('privacypolicy.sharing.title')}</strong></p>
        <p>{t('privacypolicy.delete_info')}</p>
        <p className="text-sm text-gray-500 mt-6">{t('privacypolicy.last_updated')}</p>
        <Link to="/" className="inline-block mt-4 text-blue-500 hover:underline">⬅️ {t('privacypolicy.back_home')}</Link>
      </div>
    </div>
  );
};

export default PrivacyPolicy;