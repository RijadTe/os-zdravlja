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
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['react-toastify'],
          'vendor-utils': ['axios', 'date-fns'],
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
        experimentalMinChunkSize: 10000,
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
    esbuildOptions: {
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