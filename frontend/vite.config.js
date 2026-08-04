// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // VAŽNO ZA VERCEL - base URL
  base: '/',
  
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
    // 🔥 IZBACI rollupOptions - Vite 8 koristi drugačiji sistem
  },
  
  // 🔥 Optimizacija za Vercel - drugačija sintaksa za Vite 8
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});