// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 🔥 UČITAVANJE IZ PUBLIC FOLDER-a
const loadTranslations = async () => {
  try {
    console.log('🔄 Učitavam prevode iz public/locales/...');
    
    const [hr, en, de] = await Promise.all([
      fetch('/locales/hr/translation.json').then(res => {
        if (!res.ok) throw new Error('HR translation not found');
        return res.json();
      }),
      fetch('/locales/en/translation.json').then(res => {
        if (!res.ok) throw new Error('EN translation not found');
        return res.json();
      }),
      fetch('/locales/de/translation.json').then(res => {
        if (!res.ok) throw new Error('DE translation not found');
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
        interpolation: {
          escapeValue: false,
        },
        detection: {
          order: ['localStorage', 'navigator', 'htmlTag'],
          caches: ['localStorage']
        }
      });

    console.log('✅ i18n inicijaliziran!');
    console.log('📊 Dostupni jezici:', Object.keys(resources));
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
        interpolation: {
          escapeValue: false,
        },
      });
    
    console.warn('⚠️ i18n inicijaliziran sa praznim prevodima (fallback)');
    return i18n;
  }
};

// 🔥 POKRENI UČITAVANJE
loadTranslations();

export default i18n;