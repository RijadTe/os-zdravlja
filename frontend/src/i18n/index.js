// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 🔥 PROVJERI DA LI KORISNIK IMA SPREMLJEN JEZIK
const savedLanguage = localStorage.getItem('i18nextLng') || 'hr';

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
        // 🔥 KORISTI SPREMLJENI JEZIK ILI HR
        lng: savedLanguage,
        interpolation: {
          escapeValue: false,
        },
      });

    console.log(`✅ i18n inicijaliziran sa jezikom: ${savedLanguage}`);
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

// 🔥 KAD SE JEZIK PROMIJENI, SPREMI GA U LOCALSTORAGE
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
  console.log(`💾 Jezik sačuvan: ${lng}`);
});

export default i18n;