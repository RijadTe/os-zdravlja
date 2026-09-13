// frontend/src/utils/platform.js

// 🔥 Inicijalne vrijednosti (default - web)
let isNative = false;
let isAndroid = false;
let isIOS = false;
let isWeb = true;
let Capacitor = null;

// 🔥 Detekcija platforme
if (typeof window !== 'undefined') {
  try {
    // 🔥 Prvo probaj da učitaš Capacitor iz window objekta (native)
    const cap = window.Capacitor || window.capacitor;
    
    if (cap && typeof cap.isNativePlatform === 'function') {
      Capacitor = cap;
      isNative = cap.isNativePlatform();
      const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'web';
      isAndroid = platform === 'android';
      isIOS = platform === 'ios';
      isWeb = !isNative;
      
      console.log('✅ Capacitor pronađen:', { isNative, isAndroid, isIOS, isWeb, platform });
    } else {
      // 🔥 Web fallback - nema Capacitora
      console.log('📦 Web mode (Capacitor nije prisutan)');
    }
  } catch (e) {
    console.warn('⚠️ Greška pri detekciji platforme:', e.message);
  }
}

// 🔥 EKSPORTIRAJ SVE
export { isNative, isAndroid, isIOS, isWeb, Capacitor };

// 🔥 Pomoćne funkcije
export const isCapacitorAvailable = () => {
  return Capacitor !== null && isNative;
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