import { defineConfig, devices } from '@playwright/test';

/**
 * Responsive e2e suite that runs the production build (vite preview) at three
 * viewports: desktop, tablet and mobile.
 * The backend API is optional for the public-site tests (the app falls back to
 * bundled content); the staff tests skip themselves when it is not reachable.
 */
/**
 * E2E_BASE_URL points the whole suite at a running deployment instead of the
 * preview server, e.g. the docker compose stack (nginx + api + db):
 *   E2E_BASE_URL=http://127.0.0.1:18081 npx playwright test
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4173';

export default defineConfig({
  testDir: './tests-e2e',
  timeout: 45_000,
  fullyParallel: true,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    // The suite stubs and counts network calls with page.route(), which never sees requests a
    // service worker makes; tests-e2e/pwa.spec.ts turns the worker back on for itself.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Signs in once so the dashboard tests can reuse the session instead of
    // each one burning a login against the brute-force limit.
    { name: 'setup', testMatch: /staff\.setup\.ts/ },

    // Crawler-facing checks (head tags, status codes, redirects): viewport-independent
    // and no staff session needed, so they run without the setup project.
    { name: 'seo', testMatch: /seo\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },

    {
      name: 'desktop',
      testIgnore: /seo\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      dependencies: ['setup'],
    },
    {
      name: 'tablet',
      testIgnore: /seo\.spec\.ts/,
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      testIgnore: /seo\.spec\.ts/,
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
