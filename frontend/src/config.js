// frontend/src/config.js

// ============================================================
// 🔥 DETEKCIJA PLATFORME - OVO JE SRCE SVEGA!
// ============================================================

// 1. Provjeri da li smo na Native (Android/iOS) ili Web (PWA)
export const isNative = () => {
  // Capacitor
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    return true;
  }
  // Cordova
  if (typeof window !== 'undefined' && window.cordova) {
    return true;
  }
  // User Agent
  if (typeof navigator !== 'undefined' && 
      navigator.userAgent?.includes('Capacitor')) {
    return true;
  }
  return false;
};

// 2. Uzmi URL iz .env fajla
const ENV_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// 3. Generiši PRAVI URL za svaku platformu - 🔥 POPRAVLJENO!
export const getApiUrl = () => {
  let baseUrl = ENV_URL.replace(/\/+$/, ''); // Skini / sa kraja
  
  // 🔥 SKINI SVE /api SA KRAJA (da ne dupliramo)
  while (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.replace(/\/api$/, '');
  }
  
  // 🔥🔥🔥 KLJUČNA LOGIKA - RAZLIČITO ZA PWA I NATIVE!
  if (isNative()) {
    // 🔥 NATIVE: BEZ /api (šalje direktno na /profil)
    return baseUrl;
  } else {
    // 🔥 PWA: SA /api (šalje na /api/profil)
    return `${baseUrl}/api`;
  }
};

// 4. Izvezi gotov URL za korištenje u cijeloj aplikaciji
export const API_URL = getApiUrl();

// 5. Log za provjeru (vidi se u konzoli)
console.log(`📡 Platforma: ${isNative() ? '📱 NATIVE' : '🌐 PWA'}`);
console.log(`📡 API URL (BASE): ${API_URL}`);

// ============================================================
// 🔥 DODATNE KONFIGURACIJE (AKO TREBA)
// ============================================================

// Vrijeme trajanja sesije (30 dana u sekundama)
export const SESSION_DURATION = 60 * 60 * 24 * 30;

// Default jezik
export const DEFAULT_LANGUAGE = 'hr';

// Podržani jezici
export const SUPPORTED_LANGUAGES = ['hr', 'en', 'de', 'fr', 'it', 'es', 'sl'];

// Mapiranje jezika za prikaz
export const LANGUAGE_NAMES = {
  hr: 'Hrvatski',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  es: 'Español',
  sl: 'Slovenščina'
};

// Zastave za jezike
export const LANGUAGE_FLAGS = {
  hr: '🇭🇷',
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  it: '🇮🇹',
  es: '🇪🇸',
  sl: '🇸🇮'
};

// ============================================================
// 🔥 EKSPORT SVIH KONFIGURACIJA
// ============================================================

export default {
  API_URL,
  isNative,
  getApiUrl,
  SESSION_DURATION,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS
};