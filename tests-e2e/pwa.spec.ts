import { expect, test, type Page } from '@playwright/test';

/**
 * Install to home screen + offline: the manifest, the service worker that keeps
 * activities, packages and prices available with no signal, and the install UI.
 * The rest of the suite blocks service workers (playwright.config.ts); this file
 * needs the real one.
 */
test.use({ serviceWorkers: 'allow' });

function preset(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem('valle_rate', 'rr');
    localStorage.setItem('valle_sel', '{}');
    localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 }));
    localStorage.setItem('valle_lang_dismissed', '1');
  });
}

/** Resolves once a service worker is active and controls this page. */
async function controlled(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((done) => navigator.serviceWorker.addEventListener('controllerchange', () => done(), { once: true }));
  });
}

test.describe('served files', () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'viewport-independent'); });

  test('the manifest describes an installable app with maskable icons, shortcuts and screenshots', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest"');
    expect(html).toContain('name="apple-mobile-web-app-title"');

    const res = await request.get('/site.webmanifest');
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m).toMatchObject({ id: '/', scope: '/', display: 'standalone', short_name: 'VALLÉ', theme_color: '#340057' });
    expect(m.start_url).toMatch(/^\/(\?|$)/);
    expect(m.icons.some((i: { purpose: string; sizes: string }) => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true);
    expect(m.icons.some((i: { purpose: string; sizes: string }) => i.purpose === 'any' && i.sizes === '192x192')).toBe(true);
    expect(m.shortcuts.map((s: { url: string }) => s.url.split('?')[0])).toEqual(['/booking', '/explore', '/packages']);
    // every file the manifest names really exists
    for (const src of [...m.icons, ...m.screenshots].map((i: { src: string }) => i.src)) expect((await request.get(src)).status(), src).toBe(200);
  });

  test('the service worker is stamped by the build and is never cached for long', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    const js = await res.text();
    expect(js).not.toContain('__VERSION__');
    expect(js).not.toContain('/*__PRECACHE__*/[]');
    const precache: string[] = JSON.parse(js.match(/const PRECACHE = (\[[^\]]*\]);/)![1]);
    expect(precache[0]).toBe('/');
    expect(precache.some((u) => /^\/assets\/index-[^/]+\.js$/.test(u))).toBe(true);
    expect(precache.some((u) => /^\/assets\/index-[^/]+\.css$/.test(u))).toBe(true);
    expect(js).not.toMatch(/jsQR/); // the staff scanner stays out of the guest shell
    expect(res.headers()['cache-control'] ?? '').not.toContain('immutable');
  });
});

test.describe('offline', () => {
  test('activities, packages and prices stay available with no connection', async ({ page, context }) => {
    await preset(page);
    await page.goto('/');
    await controlled(page);

    // one online visit to the price pages, as a guest planning at the hotel would do
    await page.goto('/packages');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/explore');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForFunction(async () => (await caches.keys()).some((k) => k.startsWith('valle-data')) && !!(await caches.match('/api/catalog')));

    await context.setOffline(true);
    try {
      // a page seen before: straight from the cache, prices included
      await page.goto('/packages');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/Rs\s?[\d,]+/).first()).toBeVisible();
      await expect(page.getByTestId('offline-pill')).toBeVisible();

      // a page never opened: the saved app shell renders it from the saved catalog
      await page.goto('/activities/zipline');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/Rs\s?[\d,]+/).first()).toBeVisible();

      // other languages work from the same shell
      await page.goto('/fr/explore');
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // the back office is never served from the cache
      const staff = await page.goto('/staff').catch(() => null);
      expect(staff).toBeNull();
    } finally {
      await context.setOffline(false);
    }
    await page.goto('/');
    await expect(page.getByTestId('offline-pill')).toHaveCount(0);
  });
});

test.describe('install', () => {
  test('the footer offers the install dialog once the browser allows it, and hides it after installing', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'tablet and mobile emulate Safari on iOS: see the next test');
    await preset(page);
    await page.goto('/');
    await expect(page.getByTestId('install-link')).toHaveCount(0);

    // what Chrome and Edge fire when the site is installable
    await page.evaluate(() => {
      const w = window as unknown as { __prompted: number };
      w.__prompted = 0;
      const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: async () => { w.__prompted += 1; },
        userChoice: Promise.resolve({ outcome: 'accepted' as const }),
      });
      window.dispatchEvent(e);
    });
    const link = page.getByTestId('install-link');
    await expect(link).toBeVisible();
    await link.click();
    expect(await page.evaluate(() => (window as unknown as { __prompted: number }).__prompted)).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await expect(page.getByTestId('install-link')).toHaveCount(0);
  });

  test('on iPhone and iPad, where there is no install dialog, the footer explains Add to Home Screen', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', 'iOS user agents only');
    await preset(page);
    await page.goto('/');
    const link = page.getByTestId('install-link');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.getByText('On iPhone or iPad: tap Share, then “Add to Home Screen”.')).toBeVisible();
  });
});
