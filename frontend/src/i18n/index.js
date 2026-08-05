// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 🔥 PROVJERI DA LI KORISNIK IMA SPREMLJEN JEZIK
const savedLanguage = localStorage.getItem('i18nextLng') || 'hr';

// 🔥 INICIJALIZIRAJ i18n BEZ PREVODA
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

// 🔥 FUNKCIJA ZA UČITAVANJE PREVODA
const loadTranslations = async () => {
  try {
    // 🔥 HR UVEK PRVO
    const hrRes = await fetch('/locales/hr/translation.json');
    const hrData = await hrRes.json();
    i18n.addResourceBundle('hr', 'translation', hrData);
    console.log('✅ HR prevod učitani!');

    // 🔥 PROVJERI SPREMLJENI JEZIK
    if (savedLanguage === 'en') {
      try {
        const enRes = await fetch('/locales/en/translation.json');
        const enData = await enRes.json();
        i18n.addResourceBundle('en', 'translation', enData);
        await i18n.changeLanguage('en');
        console.log('✅ EN prevod učitani!');
      } catch (e) {
        console.warn('⚠️ EN prevod nije dostupan');
        await i18n.changeLanguage('hr');
      }
    } else if (savedLanguage === 'de') {
      try {
        const deRes = await fetch('/locales/de/translation.json');
        const deData = await deRes.json();
        i18n.addResourceBundle('de', 'translation', deData);
        await i18n.changeLanguage('de');
        console.log('✅ DE prevod učitani!');
      } catch (e) {
        console.warn('⚠️ DE prevod nije dostupan');
        await i18n.changeLanguage('hr');
      }
    } else {
      await i18n.changeLanguage('hr');
      localStorage.setItem('i18nextLng', 'hr');
    }

    console.log(`✅ i18n inicijaliziran sa: ${i18n.language}`);
  } catch (error) {
    console.error('❌ Greška:', error);
    await i18n.changeLanguage('hr');
    localStorage.setItem('i18nextLng', 'hr');
  }
};

loadTranslations();

export const changeLanguage = async (lng) => {
  if (lng === 'hr') {
    localStorage.setItem('i18nextLng', 'hr');
    await i18n.changeLanguage('hr');
    return;
  }
  
  try {
    if (!i18n.hasResourceBundle(lng, 'translation')) {
      const response = await fetch(`/locales/${lng}/translation.json`);
      if (!response.ok) throw new Error(`Cannot load ${lng}`);
      const data = await response.json();
      i18n.addResourceBundle(lng, 'translation', data);
    }
    await i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  } catch (error) {
    console.error(`❌ Greška pri učitavanju ${lng}:`, error);
    localStorage.setItem('i18nextLng', 'hr');
    await i18n.changeLanguage('hr');
  }
};

export default i18n;