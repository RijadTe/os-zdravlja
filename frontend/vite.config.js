// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // Dozvoli pristup sa svih IP adresa
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
});