import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      }
    },
  },
  test: {
    environment: 'node',
  },
  // Production: Vercel rewrites handle /api proxying to the backend
  // The client always uses relative /api paths, so no base URL needed
});
