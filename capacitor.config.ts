// frontend/capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartkuhar.app',
  appName: 'SmartKuhar',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
  },
  android: {
    path: '../android',   // 🔥 DODAO SAM OVO - pokazuje na android folder u root-u
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
  ios: {
    contentInset: 'always'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999'
    },
    // 🔥 ADMOB KONFIGURACIJA
    AdMob: {
      androidAppId: 'ca-app-pub-3940256099942544~3347511713', // TEST ID
      iosAppId: 'ca-app-pub-3940256099942544~3347511713'      // TEST ID
    },
    // 🔥 ZA PUSH NOTIFIKACIJE (ako ih koristiš)
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    // 🔥🔥🔥 DODAJ OVO - ZA STATUS BAR 🔥🔥🔥
    StatusBar: {
      overlaysWebView: false,        // Status bar NE PREKRIVA WebView
      style: 'LIGHT',                // LIGHT ili DARK
    }
  }
};

export default config;