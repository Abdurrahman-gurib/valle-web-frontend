import { defineConfig, devices } from '@playwright/test';

/**
 * Responsive e2e suite that runs the production build (vite preview) at three
 * viewports: desktop, tablet and mobile.
 * The backend API is optional for the public-site tests (the app falls back to
 * bundled content); the staff tests skip themselves when it is not reachable.
 */
export default defineConfig({
  testDir: './tests-e2e',
  timeout: 45_000,
  fullyParallel: true,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Signs in once so the dashboard tests can reuse the session instead of
    // each one burning a login against the brute-force limit.
    { name: 'setup', testMatch: /staff\.setup\.ts/ },

    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      dependencies: ['setup'],
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
