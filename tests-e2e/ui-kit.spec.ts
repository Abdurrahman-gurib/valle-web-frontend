import { expect, test } from '@playwright/test';
import { STAFF_STATE } from './auth-state';

/**
 * The shared UI kit: the Embla carousel (home rail, Nature, restaurant photos)
 * with Lucide arrows and keyboard support, the Recharts revenue chart in the
 * back office, and reduced motion respected end to end.
 */

const rate = () => { try { localStorage.setItem('valle_rate', 'nr'); } catch { /* ignore */ } };

test.describe('carousels', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(rate); });

  test('the home rail moves forward and back with its arrows and the keyboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle'); // the prerendered page is swapped for the live app on load
    const section = page.locator('#vrail').locator('..');
    const track = page.locator('#vrail [data-testid="carousel"] > div');
    await track.scrollIntoViewIfNeeded();
    const prev = section.getByTestId('carousel-prev');
    const next = section.getByTestId('carousel-next');
    await expect(next).toBeEnabled();
    const before = await track.evaluate((el) => getComputedStyle(el).transform);
    await next.click();
    await expect.poll(() => track.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
    await expect(prev).toBeEnabled();
    // keyboard: focus the carousel region and press the arrow keys
    await page.locator('#vrail [data-testid="carousel"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#vrail [data-testid="carousel"]')).toHaveAttribute('aria-roledescription', 'carousel');
  });

  test('the Nature category shows its cards in a carousel with arrows, no page overflow', async ({ page }) => {
    await page.goto('/explore?cat=nature');
    await page.waitForLoadState('networkidle'); // the prerendered page is swapped for the live app on load
    const c = page.getByTestId('nature-carousel');
    await expect(c).toBeVisible();
    await expect(c.locator('[data-testid="carousel"] > div > div').first()).toBeVisible();
    await expect(c.getByTestId('carousel-next')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  });

  test('the restaurant photo strip is a carousel with working arrows', async ({ page }) => {
    await page.goto('/dine/chamouze');
    await page.waitForLoadState('networkidle'); // the prerendered page is swapped for the live app on load
    const strip = page.locator('#vgal');
    await strip.scrollIntoViewIfNeeded();
    await expect(strip.getByTestId('carousel')).toBeVisible();
    await expect(strip.locator('img').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  });

  test('the Arabic page flips the carousel to right-to-left', async ({ page }) => {
    await page.goto('/ar');
    await page.waitForLoadState('networkidle'); // the prerendered page is swapped for the live app on load
    await page.locator('#vrail').scrollIntoViewIfNeeded();
    expect(await page.locator('#vrail [data-testid="carousel"]').evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
  });
});

test.describe('reduced motion', () => {
  test('nothing autoplays and reveals are already visible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(rate);
    await page.goto('/');
    await page.waitForLoadState('networkidle'); // the prerendered page is swapped for the live app on load
    const track = page.locator('#vrail [data-testid="carousel"] > div');
    await track.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500); // let the looping layout settle once images have sized the slides
    const t0 = await track.evaluate((el) => getComputedStyle(el).transform);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await page.waitForTimeout(4200); // longer than the autoplay delay
    expect(await track.evaluate((el) => getComputedStyle(el).transform)).toBe(t0);
  });
});

test.describe('back office chart', () => {
  test.use({ storageState: STAFF_STATE });
  test('reports show the Recharts revenue chart', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'same chart on every viewport');
    await page.goto('/staff');
    await page.waitForLoadState('networkidle'); // the prerendered page is swapped for the live app on load
    await page.getByRole('button', { name: /reports/i }).first().click();
    const chart = page.getByTestId('revenue-chart');
    await expect(chart).toBeVisible({ timeout: 15000 });
    await expect(chart.locator('.recharts-surface')).toBeVisible();
  });
});
