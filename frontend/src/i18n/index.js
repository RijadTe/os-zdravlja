// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 🔥 UVOZI DIREKTNO - BEZ FETCH-A!
import hrTranslation from '../locales/hr/translation.json';
import enTranslation from '../locales/en/translation.json';
import deTranslation from '../locales/de/translation.json';

const resources = {
  hr: { translation: hrTranslation },
  en: { translation: enTranslation },
  de: { translation: deTranslation },
};

// 🔥 SINHRONO INICIJALIZIRAJ - ODMAH!
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'hr',
    lng: 'hr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

console.log('✅ i18n inicijaliziran sa HR!');

export default i18n;