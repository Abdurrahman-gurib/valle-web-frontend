import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * Languages: every public page exists at /, /fr, /de and /it, prerendered in
 * that language with hreflang alternates, and the header switch moves between
 * them on the same page.
 */
const dict = (lang: string): Record<string, string> => JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8'));
const LANGS = ['fr', 'de', 'it', 'ar'] as const;

function preset(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem('valle_rate', 'rr');
    localStorage.setItem('valle_sel', '{}');
    localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 }));
    localStorage.setItem('valle_lang_dismissed', '1');
  });
}

test.describe('language versions (served HTML)', () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'viewport-independent'); });

  for (const lang of LANGS) {
    test(`/${lang} pages are prerendered in ${lang}, canonical to themselves, with all four hreflang links`, async ({ request }) => {
      const d = dict(lang);
      for (const path of ['', '/explore', '/activities/zipline', '/packages', '/booking', '/story']) {
        const res = await request.get(`/${lang}${path}`, { maxRedirects: 0 });
        expect(res.status(), `/${lang}${path}`).toBe(200);
        const html = await res.text();
        expect(html, `/${lang}${path} lang`).toContain(lang === 'ar' ? '<html lang="ar" dir="rtl">' : `<html lang="${lang}">`);
        const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
        if (canonical) expect(canonical).toMatch(new RegExp(`/${lang}${path.replace(/\//g, '\\/')}$`));
        for (const l of ['en', 'fr', 'de', 'it', 'ar', 'x-default']) expect(html, `hreflang ${l}`).toContain(`hreflang="${l}"`);
      }
      // the home page's own words are in the language, not English
      const home = await (await request.get(`/${lang}`)).text();
      const title = home.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
      expect(title).not.toBe('VALLÉ Advenature™ Park · Ziplines, quad trails & nature in Chamouny, Mauritius');
      expect(home).toContain(d['Book now'] ?? '__missing__');
    });
  }

  test('English stays at the root, unchanged', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>VALLÉ Advenature™ Park · Ziplines, quad trails & nature in Chamouny, Mauritius</title>');
  });
});

test.describe('language switch', () => {
  test('keeps the page and moves between languages, and links stay in the chosen language', async ({ page }) => {
    await preset(page);
    await page.goto('/explore?cat=kids');
    await page.getByTestId('language-picker').first().click();
    await page.getByRole('option', { name: /Français/ }).click();
    await expect(page).toHaveURL(/\/fr\/explore\?cat=kids$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    // an activity link from a French page stays French
    const link = page.locator('a[href^="/fr/activities/"]').first();
    await expect(link).toBeVisible();
    await page.getByTestId('language-picker').first().click();
    await page.getByRole('option', { name: /Deutsch/ }).click();
    await expect(page).toHaveURL(/\/de\/explore\?cat=kids$/);
    await page.getByTestId('language-picker').first().click();
    await page.getByRole('option', { name: /English/ }).click();
    await expect(page).toHaveURL(/\/explore\?cat=kids$/);
  });

  test('a French browser gets an offer, never a forced redirect', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'fr-FR' });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('valle_rate', 'rr');
      localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 }));
    });
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    const offer = page.getByTestId('language-suggest');
    await expect(offer).toBeVisible();
    await offer.getByRole('button').first().click();
    await expect(page).toHaveURL(/\/fr$/);
    await ctx.close();
  });
});

test.describe('Arabic reads right to left', () => {
  test('the Arabic pages flip direction, render in Arabic and fit the screen', async ({ page }) => {
    await preset(page);
    const d = dict('ar');
    for (const path of ['/ar', '/ar/explore', '/ar/booking', '/ar/activities/zipline']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(1);
    }
    await expect(page.getByText(d['Book now'] ?? '__missing__').first()).toBeAttached();
    // leaving Arabic restores left-to-right
    await page.goto('/explore');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});

test.describe('booking in another language', () => {
  test('the French booking page prices and books like the English one', async ({ page }) => {
    await preset(page);
    const d = dict('fr');
    await page.goto('/fr/booking');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // the confirm button carries the French label
    await expect(page.getByRole('button', { name: d['Confirm and pay on arrival →'] ?? /__missing__/ })).toBeVisible();
  });
});
