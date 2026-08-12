// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react({
      // 🔥 FAST REFRESH - brže osvježavanje u dev modu
      fastRefresh: true,
    }),
    // 🔥 VISUALIZER - za analizu veličine bundle-a (opcija)
    // Uključi kada želiš vidjeti šta zauzima prostor
    // process.env.ANALYZE === 'true' && visualizer({
    //   open: true,
    //   filename: 'dist/stats.html',
    //   gzipSize: true,
    //   brotliSize: true,
    // }),
  ],
  
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    // 🔥 BRŽE POKRETANJE U DEV MODU
    hmr: {
      overlay: true,
    },
    // 🔥 PROXY - ako imaš backend na drugom portu
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:5000',
    //     changeOrigin: true,
    //   },
    // },
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
    // 🔥 MINIFIKACIJA - bolja kompresija
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Ukloni console.log u produkciji
        drop_debugger: true,
        pure_funcs: ['console.log'], // Ukloni sve console.log
      },
      format: {
        comments: false, // Ukloni komentare
      },
    },
    // 🔥 CHUNK VELIČINA - upozorenje ako je preveliko
    chunkSizeWarningLimit: 1000,
    // 🔥 TARGET - moderni browseri
    target: 'es2020',
    // 🔥 MANJI BUNDLE
    rollupOptions: {
      output: {
        // 🔥 MANUAL CHUNKS - odvoji velike biblioteke
        manualChunks: {
          // React ekosistem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next'],
          
          // Chart.js - za FoodPlanner
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // Toast i UI
          'vendor-ui': ['react-toastify'],
          
          // Ostale velike biblioteke
          'vendor-utils': ['axios', 'date-fns'],
        },
        // 🔥 IMENA FAJLOVA SA HASHOM ZA CACHE
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          // CSS fajlovi
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/css/[name].[hash].[ext]';
          }
          // Slike
          if (assetInfo.name?.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
            return 'assets/images/[name].[hash].[ext]';
          }
          // Fontovi
          if (assetInfo.name?.match(/\.(woff|woff2|ttf|eot)$/)) {
            return 'assets/fonts/[name].[hash].[ext]';
          }
          return 'assets/[name].[hash].[ext]';
        },
        // 🔥 PREFERIRAJ MANJE CHUNKOVE
        experimentalMinChunkSize: 10000,
      },
      // 🔥 EKSTERNE BIBLIOTEKE - ako koristiš CDN
      // external: ['react', 'react-dom'],
    },
  },
  
  // 🔥 OPTIMIZACIJA ZA DEPENDENCIJE
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
    ],
    // 🔥 PREDBROWSER CACHE
    esbuildOptions: {
      target: 'es2020',
    },
  },
  
  // 🔥 RESOLVE - za lakši import
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@utils': '/src/utils',
      '@hooks': '/src/hooks',
      '@styles': '/src/styles',
    },
  },
  
  // 🔥 CSS OPCCIJE
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      // Ako koristiš SCSS
      // scss: {
      //   additionalData: `@import "@/styles/variables.scss";`,
      // },
    },
  },
  
  // 🔥 ENVIROMENT VARIJABLE
  define: {
    // 🔥 VRIJEME GRADNJE - za cache busting
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});

// 🔥 KORISTI OVAKO ZA ANALIZU BUNDLE-A:
// ANALYZE=true npm run build