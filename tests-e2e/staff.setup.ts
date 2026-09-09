import { expect, test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { STAFF_STATE } from './auth-state';

/**
 * Signs in once and saves the session for the dashboard tests to reuse.
 *
 * Logging in per test would fight the product's own brute-force limit (10
 * attempts per account per minute, per IP): three viewport projects × several
 * tests exceeds it and the suite starts seeing 429s. Reusing one session also
 * keeps the tests honest: only the auth tests should exercise the login form.
 */
setup('authenticate as sales & reservations', async ({ page }) => {
  fs.mkdirSync(path.dirname(STAFF_STATE), { recursive: true });

  await page.goto('/staff/login');
  await page.getByPlaceholder('you@valle.mu').fill('sales@vallepark.com');
  await page.getByPlaceholder('••••••••').fill('VallePark2026!Sales');
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 20000 });
  await page.context().storageState({ path: STAFF_STATE });
});
