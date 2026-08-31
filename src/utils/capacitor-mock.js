// frontend/src/utils/capacitor-mock.js

// ============================================================
// 🔥 POTPUNI MOCK ZA SVE CAPACITOR PLUGINOVE
// ============================================================

// @capacitor/core
export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
  isPluginAvailable: () => false,
  platform: 'web',
  isNative: false,
  registerPlugin: () => {},
  Plugin: class {},
  getAppVersion: () => Promise.resolve('1.0.0'),
  getDeviceInfo: () => Promise.resolve({ platform: 'web' }),
};

// ============================================================
// SVI PLUGINOVI
// ============================================================
export const Plugins = {
  // @capacitor/app
  App: {
    getInfo: () => Promise.resolve({ version: '1.0.0', build: '1' }),
    getState: () => Promise.resolve({ state: 'active' }),
    getLaunchUrl: () => Promise.resolve({ url: null }),
    addListener: () => ({ remove: () => {} }),
    removeAllListeners: () => Promise.resolve(),
  },

  // @capacitor/browser
  Browser: {
    open: (options) => {
      window.open(options.url, '_blank');
      return Promise.resolve();
    },
    close: () => Promise.resolve(),
    addListener: () => ({ remove: () => {} }),
  },

  // @capacitor/camera
  Camera: {
    getPhoto: () => {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                base64String: reader.result.split(',')[1],
                format: file.type.split('/')[1],
                webPath: URL.createObjectURL(file),
              });
            };
            reader.readAsDataURL(file);
          } else {
            reject(new Error('No image selected'));
          }
        };
        input.click();
      });
    },
    pickImages: () => {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
          const files = Array.from(e.target.files);
          if (files.length > 0) {
            const results = files.map((file) => ({
              base64String: '',
              format: file.type.split('/')[1],
              webPath: URL.createObjectURL(file),
            }));
            resolve({ photos: results });
          } else {
            reject(new Error('No images selected'));
          }
        };
        input.click();
      });
    },
  },

  // @capacitor/filesystem
  Filesystem: {
    readFile: (options) => {
      return new Promise((resolve, reject) => {
        if (options.path && options.path.startsWith('http')) {
          fetch(options.path)
            .then((res) => res.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({ data: reader.result.split(',')[1] });
              };
              reader.readAsDataURL(blob);
            })
            .catch(reject);
        } else {
          reject(new Error('Filesystem not available on web'));
        }
      });
    },
    writeFile: () => Promise.reject(new Error('Filesystem not available on web')),
    mkdir: () => Promise.reject(new Error('Filesystem not available on web')),
    readdir: () => Promise.reject(new Error('Filesystem not available on web')),
    stat: () => Promise.reject(new Error('Filesystem not available on web')),
    deleteFile: () => Promise.reject(new Error('Filesystem not available on web')),
    rename: () => Promise.reject(new Error('Filesystem not available on web')),
    copy: () => Promise.reject(new Error('Filesystem not available on web')),
  },

  // @capacitor/geolocation
  Geolocation: {
    getCurrentPosition: () => {
      return new Promise((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude || 0,
                altitudeAccuracy: position.coords.altitudeAccuracy || 0,
                heading: position.coords.heading || 0,
                speed: position.coords.speed || 0,
              },
              timestamp: position.timestamp,
            }),
            () => resolve({ coords: { latitude: 0, longitude: 0 } })
          );
        } else {
          resolve({ coords: { latitude: 0, longitude: 0 } });
        }
      });
    },
    watchPosition: () => Promise.resolve('watch-id'),
    clearWatch: () => Promise.resolve(),
  },

  // @capacitor/preferences
  Preferences: {
    get: ({ key }) => {
      const value = localStorage.getItem(key);
      return Promise.resolve({ value });
    },
    set: ({ key, value }) => {
      localStorage.setItem(key, value);
      return Promise.resolve();
    },
    remove: ({ key }) => {
      localStorage.removeItem(key);
      return Promise.resolve();
    },
    clear: () => {
      localStorage.clear();
      return Promise.resolve();
    },
    keys: () => {
      const keys = Object.keys(localStorage);
      return Promise.resolve({ keys });
    },
  },

  // @capacitor/share
  Share: {
    share: (options) => {
      if (navigator.share) {
        return navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
      }
      const text = options.text || options.url || '';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      return Promise.resolve();
    },
  },

  // @capacitor/splash-screen
  SplashScreen: {
    show: () => Promise.resolve(),
    hide: () => Promise.resolve(),
    setBackgroundColor: () => Promise.resolve(),
  },

  // @capacitor/status-bar
  StatusBar: {
    setStyle: () => Promise.resolve(),
    setBackgroundColor: () => Promise.resolve(),
    setOverlaysWebView: () => Promise.resolve(),
    show: () => Promise.resolve(),
    hide: () => Promise.resolve(),
    getInfo: () => Promise.resolve({ visible: true, style: 'dark' }),
  },

  // @capacitor/haptics
  Haptics: {
    impact: () => Promise.resolve(),
    notification: () => Promise.resolve(),
    selectionStart: () => Promise.resolve(),
    selectionChanged: () => Promise.resolve(),
    selectionEnd: () => Promise.resolve(),
  },

  // @capacitor/local-notifications
  LocalNotifications: {
    schedule: () => Promise.resolve({ notifications: [] }),
    cancel: () => Promise.resolve(),
    registerActionTypes: () => Promise.resolve(),
    areEnabled: () => Promise.resolve({ value: true }),
    requestPermissions: () => Promise.resolve({ display: 'granted' }),
    getPending: () => Promise.resolve({ notifications: [] }),
    addListener: () => ({ remove: () => {} }),
  },

  // @capacitor/push-notifications
  PushNotifications: {
    register: () => Promise.resolve(),
    unregister: () => Promise.resolve(),
    requestPermissions: () => Promise.resolve({ receive: 'granted' }),
    getDeliveredNotifications: () => Promise.resolve({ notifications: [] }),
    removeAllDeliveredNotifications: () => Promise.resolve(),
    addListener: () => ({ remove: () => {} }),
  },

  // @capacitor-community/admob
  AdMob: {
    prepareRewardVideoAd: () => Promise.resolve(),
    showRewardVideoAd: () => Promise.resolve(),
    addListener: () => ({ remove: () => {} }),
    prepareInterstitial: () => Promise.resolve(),
    showInterstitial: () => Promise.resolve(),
    prepareBanner: () => Promise.resolve(),
    showBanner: () => Promise.resolve(),
    hideBanner: () => Promise.resolve(),
    removeBanner: () => Promise.resolve(),
    setBannerPosition: () => Promise.resolve(),
    resumeBanner: () => Promise.resolve(),
    pauseBanner: () => Promise.resolve(),
  },

  // @capacitor-community/speech-recognition
  SpeechRecognition: {
    requestPermission: () => Promise.resolve(true),
    start: (options) => {
      return new Promise((resolve) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          resolve({ matches: [''] });
          return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = options.language || 'hr-HR';
        recognition.maxResults = options.maxResults || 1;
        recognition.continuous = options.continuous || false;
        recognition.interimResults = options.interimResults || false;
        
        recognition.onresult = (event) => {
          const matches = [];
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              matches.push(event.results[i][0].transcript);
            }
          }
          resolve({ matches: matches.length > 0 ? matches : [''] });
        };
        recognition.onerror = () => {
          resolve({ matches: [''] });
        };
        recognition.start();
        
        setTimeout(() => {
          try { recognition.stop(); } catch (e) {}
        }, 10000);
      });
    },
    stop: () => {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.stop();
        }
      } catch (e) {}
      return Promise.resolve();
    },
    isSupported: () => Promise.resolve(!!(window.SpeechRecognition || window.webkitSpeechRecognition)),
    getSupportedLanguages: () => Promise.resolve(['hr-HR', 'en-US']),
  },

  // @capacitor-community/text-to-speech
  TextToSpeech: {
    speak: (options) => {
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(options.text);
        utterance.lang = options.lang || 'hr-HR';
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        window.speechSynthesis.speak(utterance);
        return Promise.resolve();
      }
      return Promise.reject(new Error('Speech synthesis not available'));
    },
    stop: () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return Promise.resolve();
    },
    getSupportedLanguages: () => Promise.resolve(['hr-HR', 'en-US']),
    isSupported: () => Promise.resolve(!!window.speechSynthesis),
  },
};

// ============================================================
// DEFAULT EXPORT
// ============================================================
export default {
  Capacitor,
  Plugins,
};

// ============================================================
// EXPORT ZA SVE MOGUĆE FORME IMPORTA
// ============================================================
export * from './capacitor-mock';