import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { fileURLToPath } from 'node:url';
import { nginxLikeRoutes } from './scripts/preview-routes';

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

/**
 * Source maps go to Sentry, never to visitors: when SENTRY_AUTH_TOKEN is present
 * at build time (Railway build variable) the build emits hidden maps, the plugin
 * uploads them under the release stamped by CI, then deletes them from dist.
 */
const sentryUpload = Boolean(process.env.SENTRY_AUTH_TOKEN);
// nginxLikeRoutes makes `vite preview` behave like production nginx (prerendered
// pages, redirects, real 404s) so the e2e suite checks what crawlers see.
const plugins: PluginOption[] = [react(), nginxLikeRoutes()];
if (sentryUpload) {
  plugins.push(
    sentryVitePlugin({
      org: 'valle-advenature-park',
      project: 'valle-web',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.VITE_SENTRY_RELEASE || undefined, deploy: { env: process.env.VITE_SENTRY_ENVIRONMENT || 'production' } },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
    }),
  );
}

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  build: {
    outDir: 'dist',
    sourcemap: sentryUpload ? 'hidden' : false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    // tests-e2e/ belongs to Playwright (npm run test:e2e); vitest owns src/*.test.ts
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
