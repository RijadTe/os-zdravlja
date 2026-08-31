// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isVercel = process.env.VERCEL === 'true' || mode === 'production';
  
  return {
    plugins: [
      react({
        fastRefresh: true,
      }),
    ],
    
    server: {
      host: true,
      port: 5174,
      strictPort: true,
      watch: {
        usePolling: true,
      },
      hmr: {
        overlay: true,
      },
    },
    
    preview: {
      host: true,
      port: 5174,
    },
    
    publicDir: 'public',
    assetsInclude: ['**/*.json'],
    
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log'],
        },
        format: {
          comments: false,
        },
      },
      chunkSizeWarningLimit: 1000,
      target: 'es2020',
      commonjsOptions: {
        exclude: [
          /@capacitor/,
          /cordova-plugin/,
        ],
      },
      rollupOptions: {
        external: (id) => {
          if (id.endsWith('.ts')) return true;
          if (id.endsWith('.tsx')) return true;
          if (isVercel) {
            if (id.includes('@capacitor') ||
                id.includes('cordova-plugin') ||
                id.includes('capacitor.config')) {
              return true;
            }
          }
          return false;
        },
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/react') || 
                id.includes('node_modules/react-dom') || 
                id.includes('node_modules/react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/i18next') || 
                id.includes('node_modules/react-i18next')) {
              return 'vendor-i18n';
            }
            if (id.includes('node_modules/chart.js') || 
                id.includes('node_modules/react-chartjs-2')) {
              return 'vendor-charts';
            }
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('node_modules/react-toastify')) {
              return 'vendor-ui';
            }
            if (id.includes('node_modules/axios') || 
                id.includes('node_modules/date-fns')) {
              return 'vendor-utils';
            }
            if (id.includes('node_modules/tesseract.js')) {
              return 'vendor-ocr';
            }
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/css/[name].[hash].[ext]';
            }
            if (assetInfo.name?.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
              return 'assets/images/[name].[hash].[ext]';
            }
            if (assetInfo.name?.match(/\.(woff|woff2|ttf|eot)$/)) {
              return 'assets/fonts/[name].[hash].[ext]';
            }
            return 'assets/[name].[hash].[ext]';
          },
        },
      },
    },
    
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom', 
        'i18next', 
        'react-i18next',
        '@supabase/supabase-js',
        'chart.js',
        'react-chartjs-2',
        'react-toastify',
        'tesseract.js',
        'axios',
        'date-fns',
        'zustand',
        'react-helmet-async',
      ],
      exclude: [
        '@capacitor',
        '@capacitor-community',
        'cordova-plugin',
        '@capacitor/core',
        '@capacitor/android',
        '@capacitor/ios',
        '@capacitor/cli',
        '@capacitor-community/admob',
        '@capacitor-community/speech-recognition',
        '@capacitor-community/text-to-speech',
        '@capacitor/app',
        '@capacitor/browser',
        '@capacitor/camera',
        '@capacitor/filesystem',
        '@capacitor/geolocation',
        '@capacitor/haptics',
        '@capacitor/local-notifications',
        '@capacitor/preferences',
        '@capacitor/push-notifications',
        '@capacitor/share',
        '@capacitor/splash-screen',
        '@capacitor/status-bar'
      ],
      esbuildOptions: {
        target: 'es2020',
        exclude: [
          '**/*.ts',
          '**/*.tsx',
          '**/capacitor.config.*',
        ],
      },
      entries: ['src/main.jsx'],
    },
    
    resolve: {
      alias: [
        // 🔥 EKSPLICITNI ALIASI ZA SVE CAPACITOR PAKETE
        { find: '@capacitor/share', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor-community/text-to-speech', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor-community/admob', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor-community/speech-recognition', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/app', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/browser', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/camera', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/filesystem', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/geolocation', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/haptics', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/preferences', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/splash-screen', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/status-bar', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/local-notifications', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/push-notifications', replacement: '/src/utils/empty-mock.js' },
        { find: '@capacitor/core', replacement: '/src/utils/empty-mock.js' },
        // 🔥 REGEX ALIASI ZA SVE OSTALE
        {
          find: /^@capacitor\/(.*)$/,
          replacement: '/src/utils/empty-mock.js'
        },
        {
          find: /^@capacitor-community\/(.*)$/,
          replacement: '/src/utils/empty-mock.js'
        },
        // 🔥 OBIČNI ALIASI
        { find: '@', replacement: '/src' },
        { find: '@components', replacement: '/src/components' },
        { find: '@pages', replacement: '/src/pages' },
        { find: '@utils', replacement: '/src/utils' },
        { find: '@hooks', replacement: '/src/hooks' },
        { find: '@styles', replacement: '/src/styles' },
      ],
      dedupe: ['react', 'react-dom'],
      extensions: ['.js', '.jsx', '.json', '.mjs'],
    },
    
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
    },
    
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      'process.env.VERCEL': JSON.stringify(process.env.VERCEL || false),
      'process.env.IS_CAPACITOR': JSON.stringify(process.env.IS_CAPACITOR || 'false'),
    },
  };
});