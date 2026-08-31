// frontend/src/utils/platform.js

// 🔥 Provjera da li smo na Vercelu
const isVercelBuild = typeof process !== 'undefined' && 
  (process.env?.VERCEL === 'true' || 
   process.env?.NODE_ENV === 'production');

// 🔥 Inicijalne vrijednosti (default - web)
let isNative = false;
let isAndroid = false;
let isIOS = false;
let isWeb = true;
let Capacitor = null;

// 🔥 SAMO NA KLIJENT STRANI - provjeri Capacitor
if (typeof window !== 'undefined' && !isVercelBuild) {
  try {
    // Pokušaj učitati Capacitor iz window objekta
    const cap = window.Capacitor || window.capacitor;
    if (cap) {
      Capacitor = cap;
      isNative = typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : false;
      isAndroid = typeof cap.getPlatform === 'function' ? cap.getPlatform() === 'android' : false;
      isIOS = typeof cap.getPlatform === 'function' ? cap.getPlatform() === 'ios' : false;
      isWeb = !isNative;
      console.log('✅ Capacitor pronađen:', { isNative, isAndroid, isIOS, isWeb });
    } else {
      console.log('📦 Capacitor nije pronađen u window, web mode');
    }
  } catch (e) {
    console.warn('⚠️ Greška pri čitanju Capacitor:', e.message);
  }
} else if (isVercelBuild) {
  console.log('📦 Vercel build - web mode');
} else {
  console.log('📦 Web mode (fallback)');
}

// 🔥 EKSPORTIRAJ SVE
export { isNative, isAndroid, isIOS, isWeb, Capacitor };

export const isCapacitorAvailable = () => {
  if (isVercelBuild) return false;
  return Capacitor !== null && isNative;
};

export const getPlatform = () => {
  if (isVercelBuild) return 'vercel';
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
  getPlatform,
  isVercelBuild
};