// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
    minify: 'terser',  // ✅ VRAĆENO NA terser
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
    rollupOptions: {
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
    ],
    rolldownOptions: {
      target: 'es2020',
    },
  },
  
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
  
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});