// frontend/src/utils/platform.js
import { Capacitor } from '@capacitor/core';

// ============================================================
// 🔥 DETEKCIJA PLATFORME (radi u PWA, Vercel buildu i Native)
// ============================================================

let platform = 'web';
let isNativePlatform = false;

try {
  if (Capacitor && typeof Capacitor.getPlatform === 'function') {
    platform = Capacitor.getPlatform();
    isNativePlatform = Capacitor.isNativePlatform();
  }
} catch (e) {
  console.warn('⚠️ Capacitor greška pri detekciji:', e.message);
}

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
// 🔥 DEBUG LOG
// ============================================================

console.log('✅ Platform detekcija:', {
  platform,
  isNative,
  isAndroid,
  isIOS,
  isWeb,
  isVercel,
  CapacitorAvailable: !!Capacitor
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