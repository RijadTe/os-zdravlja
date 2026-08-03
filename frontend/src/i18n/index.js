// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  // Učitava prevode iz public/locales
  .use(Backend)
  // Detektuje jezik preglednika
  .use(LanguageDetector)
  // Povezuje sa React-om
  .use(initReactI18next)
  .init({
    fallbackLng: 'hr', // Ako prevod ne postoji, prikaži hrvatski
    debug: false, // Postavi na true za debug (prikazuje greške u konzoli)
    interpolation: {
      escapeValue: false, // React već štiti od XSS napada
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // Pamti izbor jezika
    },
  });

export default i18n;