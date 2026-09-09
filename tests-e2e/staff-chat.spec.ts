import { expect, test, type Page } from '@playwright/test';
import { STAFF_STATE } from './auth-state';

/**
 * Staff back office + live chat.
 * These need the API running (the staff portal is useless without it), so each
 * test skips itself when /api/health is unreachable rather than failing the suite.
 */

const SALES = { email: 'sales@vallepark.com', password: 'VallePark2026!Sales' };
// The brute-force limit is per (IP, email). Three viewport projects run in
// parallel against one machine, so the wrong-password test uses the second
// seeded account to keep each account's budget clear of the other test's.
const AGENT_EMAIL = 'agent@vallepark.com';

async function apiUp(page: Page): Promise<boolean> {
  try {
    const r = await page.request.get('/api/health', { timeout: 4000 });
    return r.ok();
  } catch {
    return false;
  }
}

async function signIn(page: Page) {
  await page.goto('/staff/login');
  await page.getByPlaceholder('you@valle.mu').fill(SALES.email);
  await page.getByPlaceholder('••••••••').fill(SALES.password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
}

test.describe('staff portal is not discoverable from the public site', () => {
  test('no public page links to /staff', async ({ page }) => {
    for (const path of ['/', '/explore', '/packages', '/dine/chamouze', '/booking']) {
      await page.goto(path);
      const hrefs = await page.locator('a[href]').evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href') || ''),
      );
      expect(hrefs.filter((h) => h.includes('/staff')), `on ${path}`).toHaveLength(0);
      const text = (await page.locator('body').innerText()).toLowerCase();
      expect(text).not.toContain('staff login');
    }
  });

  test('robots.txt does not advertise the staff area', async ({ page }) => {
    const r = await page.request.get('/robots.txt');
    expect((await r.text()).toLowerCase()).not.toContain('staff');
  });

  test('public chrome is absent on the staff routes', async ({ page }) => {
    await page.goto('/staff/login');
    // the public header shows the My Day / Book now actions; neither belongs here
    await expect(page.getByRole('button', { name: 'My Day' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Book now' })).toHaveCount(0);
  });
});

test.describe('staff authentication', () => {
  test('unauthenticated visit to /staff lands on the login form', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    await page.goto('/staff');
    await expect(page.getByPlaceholder('you@valle.mu')).toBeVisible();
  });

  test('wrong password is rejected without revealing the account', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    await page.goto('/staff/login');
    await page.getByPlaceholder('you@valle.mu').fill(AGENT_EMAIL);
    await page.getByPlaceholder('••••••••').fill('definitely-not-the-password');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    const err = page.getByText(/invalid|incorrect/i).first();
    await expect(err).toBeVisible();
    await expect(err).not.toContainText(/no such|unknown user|does not exist/i);
    await expect(page.getByPlaceholder('you@valle.mu')).toBeVisible(); // still on login
  });

  test('valid credentials reach the dashboard, and sign out returns to login', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    await signIn(page);
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /bookings/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page.getByPlaceholder('you@valle.mu')).toBeVisible();
  });
});

test.describe('staff dashboard', () => {
  // Reuse the session from staff.setup.ts rather than signing in per test.
  // See that file for why (the product rate-limits repeated logins).
  test.use({ storageState: STAFF_STATE });

  test.beforeEach(async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
  });

  test('bookings panel lists reservations and opens a detail drawer', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });

    // seed a booking through the public API so the table is never empty
    const res = await page.request.post('/api/bookings', {
      data: {
        visitDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        slot: 'morning', adults: 2, kids: 1, rate: 'rr',
        items: [{ id: 'zipline', adults: 2, kids: 1 }],
        name: 'E2E Drawer Guest', email: 'e2e-drawer@example.mu', payMode: 'gate',
      },
    });
    expect(res.ok()).toBeTruthy();
    const ref = (await res.json()).refCode as string;

    await page.reload();
    await page.getByPlaceholder(/search/i).first().fill(ref);
    await expect(page.getByText(ref).first()).toBeVisible({ timeout: 15000 });
    await page.getByText(ref).first().click();
    await expect(page.getByText('E2E Drawer Guest').first()).toBeVisible();
    await expect(page.getByText(/zipline/i).first()).toBeVisible();
  });

  test('chat console shows a visitor conversation and replies reach the visitor', async ({ page, context }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });

    // A visitor on the public site, in a second tab of the same context so it
    // inherits baseURL. The rate gate is a full-screen overlay that would sit on
    // top of the chat launcher, so pick a rate before the first paint.
    const visitor = await context.newPage();
    await visitor.addInitScript(() => localStorage.setItem('valle_rate', 'rr'));
    await visitor.goto('/');
    await visitor.getByRole('button', { name: /open chat/i }).click();
    const skip = visitor.getByRole('button', { name: /skip/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();

    // Unique per run: earlier runs leave conversations behind, and matching on a
    // fixed string could select one of those instead of the thread under test.
    const tag = Math.random().toString(36).slice(2, 8);
    const question = `E2E ${tag}: are the ziplines open on Sunday?`;
    await visitor.getByLabel('Message').fill(question);
    await visitor.getByLabel('Message').press('Enter');
    await expect(visitor.getByText(question)).toBeVisible({ timeout: 15000 });

    // staff sees it live and answers
    await page.getByRole('button', { name: /^chat/i }).first().click();
    await expect(page.getByText(question).first()).toBeVisible({ timeout: 20000 });
    await page.getByText(question).first().click();
    // the thread must be the one just opened before we type into the composer
    await expect(page.getByLabel('Reply')).toBeVisible();

    const reply = `E2E ${tag}: yes, every day 09:00-17:30.`;
    const composer = page.getByLabel('Reply');
    await composer.fill(reply);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(visitor.getByText(reply)).toBeVisible({ timeout: 20000 });
    await visitor.close();
  });
});

test.describe('public chat widget', () => {
  test('launcher clears the mobile action bar', async ({ page }, testInfo) => {
    await page.goto('/');
    const launcher = page.getByRole('button', { name: /open chat/i });
    await expect(launcher).toBeVisible();
    const box = await launcher.boundingBox();
    expect(box).not.toBeNull();

    if (testInfo.project.name === 'mobile') {
      const bar = page.getByRole('button', { name: /^book( now)?$/i }).last();
      const barBox = await bar.boundingBox();
      if (barBox) {
        // the launcher must sit entirely above the sticky action bar
        expect(box!.y + box!.height).toBeLessThanOrEqual(barBox.y + 1);
      }
    }
    // and never off-screen
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
  });

  test('widget is absent on staff routes', async ({ page }) => {
    await page.goto('/staff/login');
    await expect(page.getByRole('button', { name: /open chat/i })).toHaveCount(0);
  });
});
