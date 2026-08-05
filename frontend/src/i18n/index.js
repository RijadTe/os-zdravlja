// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 🔥 PROVJERI SPREMLJENI JEZIK
const savedLanguage = localStorage.getItem('i18nextLng') || 'hr';

// 🔥 INICIJALIZIRAJ BEZ PREVODA
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
    lng: savedLanguage,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// 🔥 UČITAVANJE PREVODA
const loadTranslations = async () => {
  try {
    // 🔥 HR UVEK PRVO
    const hrRes = await fetch('/locales/hr/translation.json');
    const hrData = await hrRes.json();
    i18n.addResourceBundle('hr', 'translation', hrData);
    
    // 🔥 AKO JE SPREMLJEN DRUGI JEZIK
    if (savedLanguage === 'en') {
      const enRes = await fetch('/locales/en/translation.json');
      const enData = await enRes.json();
      i18n.addResourceBundle('en', 'translation', enData);
    } else if (savedLanguage === 'de') {
      const deRes = await fetch('/locales/de/translation.json');
      const deData = await deRes.json();
      i18n.addResourceBundle('de', 'translation', deData);
    }
    
    // 🔥 POSTAVI JEZIK
    await i18n.changeLanguage(savedLanguage);
    console.log(`✅ i18n inicijaliziran sa: ${savedLanguage}`);
  } catch (error) {
    console.error('❌ Greška:', error);
    await i18n.changeLanguage('hr');
    localStorage.setItem('i18nextLng', 'hr');
  }
};

loadTranslations();

// 🔥 FUNKCIJA ZA PROMJENU JEZIKA - ODMAH REAGUJE
export const changeLanguage = async (lng) => {
  try {
    // 🔥 UČITAJ PREVOD AKO NEMA
    if (!i18n.hasResourceBundle(lng, 'translation')) {
      const response = await fetch(`/locales/${lng}/translation.json`);
      const data = await response.json();
      i18n.addResourceBundle(lng, 'translation', data);
    }
    
    // 🔥 PROMIJENI JEZIK
    await i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    
    // 🔥 FORSIRAJ RE-RENDER SVIH KOMPONENTI
    i18n.emit('languageChanged', lng);
    
    console.log(`✅ Jezik promijenjen na: ${lng}`);
  } catch (error) {
    console.error(`❌ Greška pri učitavanju ${lng}:`, error);
  }
};

export default i18n;