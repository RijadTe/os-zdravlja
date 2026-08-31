// frontend/src/config/ads.config.js
// ============================================================
// 🔥 RAZDVOJENA ADMOB I ADSENSE KONFIGURACIJA
// ============================================================

// ============================================================
// 1. ADSENSE KONFIGURACIJA (ZA PWA / WEB)
// ============================================================
export const ADSENSE_CONFIG = {
  // 🔥 Tvoj AdSense Client ID (Publisher ID)
  // Format: ca-pub-xxxxxxxxxxxxxxxx
  client: 'ca-pub-9027267899539658',  // ← Tvoj AdSense ID (bez /)
  
  // 🔥 AdSense Slot ID-jevi
  slots: {
    banner: '1234567890',        // ← Tvoj banner slot
    rewarded: '0987654321',      // ← Tvoj rewarded slot
    interstitial: '1122334455'   // ← Tvoj interstitial slot
  },
  
  // 🔥 AdSense postavke
  settings: {
    adFormat: 'auto',
    fullWidthResponsive: true,
    testMode: process.env.NODE_ENV === 'development'
  }
};

// ============================================================
// 2. ADMOB KONFIGURACIJA (ZA NATIVE)
// ============================================================
export const ADMOB_CONFIG = {
  // 🔥 Tvoj AdMob App ID
  // Format: ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy
  appId: 'ca-app-pub-9027267899539658~1234567890',  // ← Tvoj AdMob App ID
  
  // 🔥 AdMob Ad Unit ID-jevi
  // Format: ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy
  adUnits: {
    banner: 'ca-app-pub-9027267899539658/1234567890',      // ← Tvoj banner
    rewarded: 'ca-app-pub-9027267899539658/0987654321',    // ← Tvoj rewarded
    interstitial: 'ca-app-pub-9027267899539658/1122334455' // ← Tvoj interstitial
  },
  
  // 🔥 AdMob postavke
  settings: {
    testMode: process.env.NODE_ENV === 'development',
    testAdUnits: {
      banner: 'ca-app-pub-3940256099942544/6300978111',
      rewarded: 'ca-app-pub-3940256099942544/5224354917',
      interstitial: 'ca-app-pub-3940256099942544/1033173712'
    }
  }
};

// ============================================================
// 3. ZAJEDNIČKE POSTAVKE (RADE I ZA ADSENSE I ADMOB)
// ============================================================
export const ADS_CONFIG = {
  // 🔥 ZAJEDNIČKE POSTAVKE
  showForPremium: false,
  rewardsPerDay: 3,
  cooldownSeconds: 5,
  preloadAds: true,
  loadTimeout: 15000,
  retryAttempts: 3,
  
  // 🔥 PRIORITET REKLAMA
  priority: ['banner', 'rewarded', 'interstitial']
};

// ============================================================
// 4. FUNKCIJE ZA DOHVAĆANJE ID-JEVA PO PLATFORMI
// ============================================================

import { isNative } from '../utils/platform';

/**
 * Dohvaća odgovarajuću konfiguraciju za trenutnu platformu
 */
export const getAdConfig = () => {
  if (isNative) {
    return {
      type: 'admob',
      config: ADMOB_CONFIG,
      isTestMode: ADMOB_CONFIG.settings.testMode
    };
  } else {
    return {
      type: 'adsense',
      config: ADSENSE_CONFIG,
      isTestMode: ADSENSE_CONFIG.settings.testMode
    };
  }
};

/**
 * Dohvaća Ad Unit ID za datu platformu i tip
 */
export const getAdUnitId = (type) => {
  const platform = getAdConfig();
  
  if (platform.type === 'admob') {
    // 🔥 NATIVE - AdMob
    if (ADMOB_CONFIG.settings.testMode) {
      return ADMOB_CONFIG.settings.testAdUnits[type] || ADMOB_CONFIG.adUnits[type];
    }
    return ADMOB_CONFIG.adUnits[type] || ADMOB_CONFIG.adUnits.banner;
  } else {
    // 🔥 PWA - AdSense
    return ADSENSE_CONFIG.slots[type] || ADSENSE_CONFIG.slots.banner;
  }
};

/**
 * Dohvaća AdSense Client ID (samo za PWA)
 */
export const getAdSenseClientId = () => {
  return ADSENSE_CONFIG.client;
};

/**
 * Dohvaća AdMob App ID (samo za native)
 */
export const getAdMobAppId = () => {
  return ADMOB_CONFIG.appId;
};

/**
 * Provjera treba li prikazati reklame
 */
export const shouldShowAds = (isPremium) => {
  if (isPremium) return false;
  return true;
};

/**
 * Provjerava je li korisnik iskoristio dnevni limit
 */
export const canWatchRewardedAd = (usedToday) => {
  return usedToday < ADS_CONFIG.rewardsPerDay;
};

/**
 * Vraća preostali broj video reklama za danas
 */
export const getRemainingRewards = (usedToday) => {
  return Math.max(0, ADS_CONFIG.rewardsPerDay - usedToday);
};

/**
 * Provjerava je li korisnik na cooldownu
 */
export const isOnCooldown = (lastWatchedTimestamp, currentTime = Date.now()) => {
  if (!lastWatchedTimestamp) return false;
  const diffSeconds = (currentTime - lastWatchedTimestamp) / 1000;
  return diffSeconds < ADS_CONFIG.cooldownSeconds;
};

/**
 * Vraća preostalo vrijeme cooldowna
 */
export const getCooldownRemaining = (lastWatchedTimestamp, currentTime = Date.now()) => {
  if (!lastWatchedTimestamp) return 0;
  const diffSeconds = (currentTime - lastWatchedTimestamp) / 1000;
  return Math.max(0, Math.ceil(ADS_CONFIG.cooldownSeconds - diffSeconds));
};

/**
 * Validira AdMob ID
 */
export const isValidAdMobId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return id.startsWith('ca-app-pub-') && id.includes('/');
};

/**
 * Validira AdSense ID
 */
export const isValidAdSenseId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return id.startsWith('ca-pub-');
};

// ============================================================
// 5. ANALITIKA
// ============================================================

export const AD_EVENTS = {
  LOADED: 'ad_loaded',
  FAILED: 'ad_failed',
  OPENED: 'ad_opened',
  CLOSED: 'ad_closed',
  REWARDED: 'ad_rewarded',
  CLICKED: 'ad_clicked'
};

export const ENABLE_ADS_LOGS = true;

export const adLog = (message, level = 'info') => {
  if (!ENABLE_ADS_LOGS) return;
  
  const platform = isNative ? 'AdMob' : 'AdSense';
  const prefix = `[${platform}]`;
  
  switch (level) {
    case 'error':
      console.error(`${prefix} ❌ ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix} ⚠️ ${message}`);
      break;
    default:
      console.log(`${prefix} ℹ️ ${message}`);
  }
};

// ============================================================
// 6. BACKWARD KOMPATIBILNOST (ZA POSTOJEĆI KOD)
// ============================================================

// ⚠️ OVO OSTAVLJAMO ZA BACKWARD KOMPATIBILNOST
// ALI PREPORUČUJEMO KORIŠTENJE NOVIH FUNKCIJA

export const ADMOB_APP_ID = ADMOB_CONFIG.appId;
export const AD_UNITS = ADMOB_CONFIG.adUnits;