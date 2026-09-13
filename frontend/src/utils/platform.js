// frontend/src/utils/platform.js

// 🔥 Inicijalne vrijednosti (default - web)
let isNative = false;
let isAndroid = false;
let isIOS = false;
let isWeb = true;
let Capacitor = null;

// 🔥 Detekcija platforme - BEZ importa, samo preko window objekta
if (typeof window !== 'undefined') {
  try {
    const cap = window.Capacitor || window.capacitor;
    if (cap && typeof cap.isNativePlatform === 'function') {
      Capacitor = cap;
      isNative = cap.isNativePlatform();
      const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'web';
      isAndroid = platform === 'android';
      isIOS = platform === 'ios';
      isWeb = !isNative;
      console.log('✅ Platform detekcija:', { isNative, isAndroid, isIOS, isWeb, platform });
    } else {
      console.log('📦 Web mode (Capacitor nije prisutan)');
    }
  } catch (e) {
    console.warn('⚠️ Greška pri detekciji platforme:', e.message);
  }
}

// 🔥 EKSPORTIRAJ SVE
export { isNative, isAndroid, isIOS, isWeb, Capacitor };

export const isCapacitorAvailable = () => Capacitor !== null && isNative;
export const getPlatform = () => isNative ? 'native' : (isWeb ? 'web' : 'unknown');

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