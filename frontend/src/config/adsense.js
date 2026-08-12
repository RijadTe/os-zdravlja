// frontend/src/config/adsense.js

// ============================================================
// 🔥 ADSENSE KONFIGURACIJA - SVE NA JEDNOM MJESTU!
// ============================================================

// 🔥 TVOJ PUB KOD (ZAMIJENI SA SVOJIM!)
export const ADSENSE_CLIENT = 'ca-pub-9027267899539658';

// 🔥 TVOJI SLOT ID-EVI (ZAMIJENI SA SVOJIM!)
export const DEFAULT_SLOTS = {
  banner: '8508444317',        // Banner reklame (header, footer)
  sidebar: '7426316998',       // Sidebar reklame
  video: '9159013136',         // 🎬 Video reklame (AI Chef)
  inFeed: '5374868722',        // In-feed reklame (između sadržaja)
  native: '9438382605',        // Native reklame (izgledaju kao sadržaj)
  display: '7135652891'        // Display reklame (standardne)
};

// 🔥 FORMATI REKLAMA
export const AD_FORMATS = {
  BANNER: 'auto',
  VIDEO: 'video',
  IN_FEED: 'in-feed',
  NATIVE: 'native',
  DISPLAY: 'display',
  AUTO: 'auto'
};

// 🔥 AUTO-MAGIJA - UKLJUČI SAMO NA PRODUKCIJI
export const ADSENSE_ENABLED = process.env.NODE_ENV === 'production';

// 🔥 DODATNE OPCIJE
export const AD_OPTIONS = {
  // Prikazuj reklame samo za free korisnike
  showForPremium: false,
  
  // Minimalni razmak između reklama (u pikselima)
  spacing: 300,
  
  // Broj reklama po stranici
  maxPerPage: 3,
  
  // Prioritet reklama (gdje prvo prikazati)
  priority: ['banner', 'inFeed', 'sidebar']
};

// 🔥 TEST MODE - za lokalni razvoj
export const ADSENSE_TEST_MODE = process.env.NODE_ENV === 'development';