import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const API_TARGET = process.env.VITE_API_PROXY || 'http://localhost:3001';

/**
 * `/api` is the REST surface; `/socket.io` is the live-chat transport, which
 * needs `ws: true` so the HTTP upgrade is forwarded. Without it the chat falls
 * back to REST polling and the staff console sits on "reconnecting".
 * The production nginx config mirrors both of these.
 */
const proxy = {
  '/api': { target: API_TARGET, changeOrigin: true },
  '/socket.io': { target: API_TARGET, changeOrigin: true, ws: true },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    // tests-e2e/ belongs to Playwright (npm run test:e2e); vitest owns src/*.test.ts
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
