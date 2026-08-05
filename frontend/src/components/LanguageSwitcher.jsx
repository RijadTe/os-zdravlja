// frontend/src/components/LanguageSwitcher.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <div className="flex gap-1">
      <button 
        onClick={() => changeLanguage('hr')}
        className={`px-2 py-1 rounded ${i18n.language === 'hr' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      >
        HR
      </button>
      <button 
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 rounded ${i18n.language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      >
        EN
      </button>
      <button 
        onClick={() => changeLanguage('de')}
        className={`px-2 py-1 rounded ${i18n.language === 'de' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      >
        DE
      </button>
    </div>
  );
};

export default LanguageSwitcher;