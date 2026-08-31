// frontend/src/components/LanguageSwitcher.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 🔥 SVIH 7 JEZIKA (HR, EN, DE, FR, IT, ES, SL)
  const languages = [
    { code: 'hr', label: 'Hrvatski', flag: '🇭🇷', native: 'Hrvatski' },
    { code: 'en', label: 'English', flag: '🇬🇧', native: 'English' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪', native: 'Deutsch' },
    { code: 'fr', label: 'Français', flag: '🇫🇷', native: 'Français' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹', native: 'Italiano' },
    { code: 'es', label: 'Español', flag: '🇪🇸', native: 'Español' },
    { code: 'sl', label: 'Slovenščina', flag: '🇸🇮', native: 'Slovenščina' }, // 🔥 DODATO
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    setIsOpen(false);
  };

  // Zatvori dropdown kad se klikne van
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* DUGME ZA TRENUTNI JEZIK */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300 transition duration-200"
        aria-label="Promijeni jezik"
      >
        <span className="text-base sm:text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline text-xs sm:text-sm font-medium">{currentLanguage.native}</span>
        <span className="inline sm:hidden text-xs font-medium">{currentLanguage.code.toUpperCase()}</span>
        <svg 
          className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* DROPDOWN LISTA - SVIH 7 JEZIKA */}
      {isOpen && (
        <div className="absolute right-0 mt-1 sm:mt-2 w-40 sm:w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fadeIn">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm transition duration-150 ${
                i18n.language === lang.code
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="text-base sm:text-lg">{lang.flag}</span>
              <span className="flex-1 text-left font-medium">{lang.native}</span>
              <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">{lang.label}</span>
              {i18n.language === lang.code && (
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;