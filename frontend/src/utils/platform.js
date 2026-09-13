// frontend/src/utils/platform.js
import { Capacitor } from '@capacitor/core';

// 🔥 Inicijalne vrednosti
let isNative = false;
let isAndroid = false;
let isIOS = false;
let isWeb = true;

// 🔥 Detekcija platforme preko Capacitora
// Ovo radi i na webu (Vercel) i na native (Android/iOS)
if (typeof window !== 'undefined') {
  try {
    isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    isAndroid = platform === 'android';
    isIOS = platform === 'ios';
    isWeb = platform === 'web';

    console.log('✅ Platform detekcija:', {
      isNative,
      isAndroid,
      isIOS,
      isWeb,
      platform
    });
  } catch (e) {
    console.warn('⚠️ Capacitor greška:', e.message);
  }
}

// 🔥 EKSPORTIRAJ SVE
export { isNative, isAndroid, isIOS, isWeb, Capacitor };

// 🔥 Pomoćne funkcije
export const isCapacitorAvailable = () => {
  return Capacitor !== null && Capacitor !== undefined && isNative;
};

export const getPlatform = () => {
  if (isNative) return 'native';
  if (isWeb) return 'web';
  return 'unknown';
};

// 🔥 Default export
export default {
  isNative,
  isAndroid,
  isIOS,
  isWeb,
  Capacitor,
  isCapacitorAvailable,
  getPlatform
};