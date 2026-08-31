// frontend/src/utils/empty-mock.js

// 🔥 PRAZAN MOCK ZA SVE CAPACITOR PAKETE
export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
  isPluginAvailable: () => false,
  platform: 'web',
  isNative: false,
  registerPlugin: () => {},
  Plugin: class {},
};

export const Plugins = {};

// Svi pluginovi
export const Share = { share: async () => {} };
export const TextToSpeech = { speak: async () => {}, stop: async () => {} };
export const AdMob = {
  prepareRewardVideoAd: async () => {},
  showRewardVideoAd: async () => {},
  addListener: () => ({ remove: () => {} }),
};
export const SpeechRecognition = {
  requestPermission: async () => true,
  start: async () => ({ matches: [''] }),
  stop: async () => {},
  isSupported: async () => true,
};
export const SplashScreen = { show: async () => {}, hide: async () => {} };
export const StatusBar = { setStyle: async () => {}, setBackgroundColor: async () => {} };
export const Style = { Dark: 'dark', Light: 'light' };
export const App = { getInfo: async () => ({}), getState: async () => ({}) };
export const Browser = { open: async () => {} };
export const Camera = { getPhoto: async () => ({}) };
export const Filesystem = { readFile: async () => ({}) };
export const Geolocation = { getCurrentPosition: async () => ({}) };
export const Haptics = { impact: async () => {} };
export const Preferences = { get: async () => ({}), set: async () => {} };
export const LocalNotifications = { schedule: async () => ({}) };
export const PushNotifications = { register: async () => {} };

export default {
  Capacitor,
  Plugins,
  Share,
  TextToSpeech,
  AdMob,
  SpeechRecognition,
  SplashScreen,
  StatusBar,
  Style,
  App,
  Browser,
  Camera,
  Filesystem,
  Geolocation,
  Haptics,
  Preferences,
  LocalNotifications,
  PushNotifications,
};