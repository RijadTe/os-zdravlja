// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // 🔥 VAŽNO - bez base: '/'
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    watch: {
      usePolling: true,
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
    // 🔥 EKSPLICITNO postavi base za build
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
});