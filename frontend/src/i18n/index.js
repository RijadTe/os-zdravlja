// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import hrTranslation from '../../public/locales/hr/translation.json';
import enTranslation from '../../public/locales/en/translation.json';
import deTranslation from '../../public/locales/de/translation.json';

const resources = {
  hr: { translation: hrTranslation },
  en: { translation: enTranslation },
  de: { translation: deTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'hr',
    debug: true, // ← DODAJ OVO ZA DEBUG!
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;