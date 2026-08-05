// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 🔥 DIREKTNO UVEZI HR PREVOD (IZVORNI JEZIK) - ODMAH DOSTUPAN!
import hrTranslation from '../locales/hr/translation.json';

// 🔥 UČITAVANJE PREVODA - SA MEMORISANJEM JEZIKA
const loadTranslations = async () => {
  try {
    // 🔥 PROVJERI DA LI KORISNIK IMA SPREMLJEN JEZIK
    const savedLanguage = localStorage.getItem('i18nextLng') || 'hr';
    
    // 🔥 UČITAJ SAMO AKO NIJE HR (HR JE VEĆ UVEZEN)
    let enTranslation = {};
    let deTranslation = {};
    
    if (savedLanguage === 'en') {
      try {
        const enRes = await fetch('/locales/en/translation.json');
        if (enRes.ok) {
          enTranslation = await enRes.json();
          console.log('✅ EN prevod učitani iz keša!');
        }
      } catch (e) {
        console.warn('⚠️ EN prevod nije dostupan, koristi se HR');
      }
    }
    
    if (savedLanguage === 'de') {
      try {
        const deRes = await fetch('/locales/de/translation.json');
        if (deRes.ok) {
          deTranslation = await deRes.json();
          console.log('✅ DE prevod učitani iz keša!');
        }
      } catch (e) {
        console.warn('⚠️ DE prevod nije dostupan, koristi se HR');
      }
    }

    const resources = {
      hr: { translation: hrTranslation },
      en: { translation: enTranslation },
      de: { translation: deTranslation },
    };

    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'hr',
        lng: savedLanguage,
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false, // 🔥 ISKLJUČI SUSPENSE
        },
      });

    console.log(`✅ i18n inicijaliziran sa jezikom: ${savedLanguage}`);
    return i18n;
  } catch (error) {
    console.error('❌ Greška pri učitavanju prevoda:', error);
    
    // 🔥 FALLBACK - SAMO HR
    const resources = {
      hr: { translation: hrTranslation },
      en: { translation: {} },
      de: { translation: {} },
    };
    
    await i18n
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
    
    return i18n;
  }
};

// 🔥 POKRENI UČITAVANJE
loadTranslations();

// 🔥 FUNKCIJA ZA PROMJENU JEZIKA (POZIVA SE IZ LanguageSwitcher)
export const changeLanguage = async (lng) => {
  if (lng === 'hr') {
    localStorage.setItem('i18nextLng', 'hr');
    await i18n.changeLanguage('hr');
    return;
  }
  
  try {
    // 🔥 PROVJERI DA LI JE VEĆ UČITAN
    if (!i18n.hasResourceBundle(lng, 'translation')) {
      const response = await fetch(`/locales/${lng}/translation.json`);
      if (!response.ok) throw new Error(`Cannot load ${lng}`);
      const data = await response.json();
      i18n.addResourceBundle(lng, 'translation', data);
      console.log(`✅ ${lng} prevod učitani!`);
    }
    
    await i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    console.log(`✅ Jezik promijenjen na: ${lng}`);
  } catch (error) {
    console.error(`❌ Greška pri učitavanju ${lng}:`, error);
    // 🔥 FALLBACK NA HR
    localStorage.setItem('i18nextLng', 'hr');
    await i18n.changeLanguage('hr');
  }
};

export default i18n;