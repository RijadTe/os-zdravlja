// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 🔥 INICIJALIZIRAJ SA PRAZNIM PREVODIMA (ODMAH)
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      hr: { translation: {} },
      en: { translation: {} },
      de: { translation: {} },
    },
    fallbackLng: 'hr',
    lng: 'hr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// 🔥 UČITAVANJE PREVODA ASINHRONO (NE BLOKIRA)
const loadTranslations = async () => {
  try {
    const [hr, en, de] = await Promise.all([
      fetch('/locales/hr/translation.json').then(res => res.json()),
      fetch('/locales/en/translation.json').then(res => res.json()),
      fetch('/locales/de/translation.json').then(res => res.json())
    ]);

    i18n.addResourceBundle('hr', 'translation', hr);
    i18n.addResourceBundle('en', 'translation', en);
    i18n.addResourceBundle('de', 'translation', de);

    // 🔥 PROVJERI SPREMLJENI JEZIK
    const savedLanguage = localStorage.getItem('i18nextLng') || 'hr';
    await i18n.changeLanguage(savedLanguage);

    console.log(`✅ i18n inicijaliziran sa: ${savedLanguage}`);
  } catch (error) {
    console.error('❌ Greška pri učitavanju prevoda:', error);
    // 🔥 FALLBACK NA HR
    await i18n.changeLanguage('hr');
  }
};

// 🔥 POKRENI UČITAVANJE (NE ČEKA)
loadTranslations();

// 🔥 SPREMI JEZIK KAD SE PROMIJENI
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;