// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const loadTranslations = async () => {
  try {
    // 🔥 UČITAJ JSON FAJLOVE DIREKTNO PREKO FETCH-a
    const [hr, en, de] = await Promise.all([
      fetch('/locales/hr/translation.json').then(res => {
        if (!res.ok) throw new Error('HR not found');
        return res.json();
      }),
      fetch('/locales/en/translation.json').then(res => {
        if (!res.ok) throw new Error('EN not found');
        return res.json();
      }),
      fetch('/locales/de/translation.json').then(res => {
        if (!res.ok) throw new Error('DE not found');
        return res.json();
      })
    ]);

    const resources = {
      hr: { translation: hr },
      en: { translation: en },
      de: { translation: de },
    };

    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'hr',
        // 🔥 SAMO OVO DODAJ - lng: 'hr' (PRVO HRVATSKI!)
        lng: 'hr',
        interpolation: {
          escapeValue: false,
        },
      });

    console.log('✅ i18n inicijaliziran sa HR kao osnovnim jezikom!');
    return i18n;
  } catch (error) {
    console.error('❌ Greška pri učitavanju prevoda:', error);
    // 🔥 FALLBACK - ako ne može da učita, koristi prazne prevode
    const resources = {
      hr: { translation: {} },
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
      });
    
    return i18n;
  }
};

// 🔥 POKRENI UČITAVANJE
loadTranslations();

export default i18n;