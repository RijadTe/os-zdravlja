// frontend/src/utils/platform.js
import { Capacitor } from '@capacitor/core';

// ============================================================
// 🔥 DETEKCIJA PLATFORME (radi u PWA, Vercel buildu i Native)
// ============================================================

const platform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'
const isNativePlatform = Capacitor.isNativePlatform();

const isNative = isNativePlatform;
const isAndroid = platform === 'android';
const isIOS = platform === 'ios';
const isWeb = platform === 'web';

// ============================================================
// 🔥 DETEKCIJA VERCEL / WEB HOSTINGA (samo za web)
// ============================================================

const isVercel =
  !isNative &&
  typeof window !== 'undefined' &&
  typeof window.location !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('os-zdravlja'));

// ============================================================
// 🔥 DEBUG LOG (vidiš u konzoli)
// ============================================================

console.log('✅ Platform detekcija:', {
  platform,
  isNative,
  isAndroid,
  isIOS,
  isWeb,
  isVercel,
  CapacitorAvailable: !!Capacitor,
  CapacitorVersion: Capacitor?.Plugins ? 'loaded' : 'not loaded'
});

// ============================================================
// 🔥 EKSPORTIRAJ SVE
// ============================================================

export { isNative, isAndroid, isIOS, isWeb, Capacitor, isVercel };

export const isCapacitorAvailable = () => isNative;

export const getPlatform = () => platform;

// ============================================================
// 🔥 DEFAULT EXPORT
// ============================================================

export default {
  isNative,
  isAndroid,
  isIOS,
  isWeb,
  Capacitor,
  isVercel,
  isCapacitorAvailable,
  getPlatform
};