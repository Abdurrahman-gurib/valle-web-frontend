import { expect, test, type Page } from '@playwright/test';

/** Pre-select the resident rate so the rate gate doesn't block flows. */
function preselectRate(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem('valle_rate', 'rr');
    localStorage.setItem('valle_sel', '{}');
  });
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
}

test.describe('rate gate', () => {
  test('appears on first visit and applies the chosen rate', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await expect(page.getByText('Which rate', { exact: false })).toBeVisible();
    await page.getByText('I live in Mauritius').click();
    await expect(page.getByText('Which rate', { exact: false })).toBeHidden();
  });
});

test.describe('home', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('renders hero and all sections without horizontal overflow', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Feel the/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /wildest locals/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Taste the soul/i })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: testInfo.outputPath('home-top.png') });
  });

  test('park map pin opens a popup', async ({ page }) => {
    await page.goto('/');
    // pin "A": Park Entrance & Reception
    await page.getByRole('button', { name: 'A', exact: true }).click();
    await expect(page.getByText('Park Entrance & Reception')).toBeVisible();
  });
});

test.describe('explore', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('lists all 21 experiences and filters by search', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.getByText('21 OF 21')).toBeVisible();
    await page.getByPlaceholder(/Search/i).fill('zip');
    await expect(page.getByText(/\d+ OF 21/)).toBeVisible();
    const count = await page.getByText(/^\d+ OF 21$/).textContent();
    expect(Number(count!.split(' ')[0])).toBeLessThan(21);
    await expectNoHorizontalScroll(page);
  });

  test('category filter from URL works', async ({ page }) => {
    await page.goto('/explore?cat=kids');
    await expect(page.getByText('Pirate Ship')).toBeVisible();
    await expect(page.getByText('Zipline Adventures')).toBeHidden();
  });
});

test.describe('experience detail', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('shows pricing table and adds to My Day', async ({ page }) => {
    await page.goto('/experience/zipline');
    await expect(page.getByRole('heading', { name: /Zipline Adventures/i }).first()).toBeVisible();
    await expect(page.getByText('The Plunge · 500 m, 1 line')).toBeVisible();
    await page.getByRole('button', { name: /Add to My Day/i }).first().click();
    await expect(page.getByRole('button', { name: /Added to My Day/i }).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('unknown id redirects to explore', async ({ page }) => {
    await page.goto('/experience/does-not-exist');
    await expect(page).toHaveURL(/\/explore/);
  });
});

test.describe('booking flow', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('completes a booking end to end', async ({ page }) => {
    await page.goto('/experience/zipline');
    await page.getByRole('button', { name: /Add to My Day/i }).first().click();
    await page.goto('/booking');
    await expect(page.getByRole('heading', { name: /Build your day/i })).toBeVisible();
    await page.getByPlaceholder(/name/i).first().fill('Playwright Guest');
    await page.getByPlaceholder(/email/i).first().fill('pw@example.com');
    await page.getByRole('button', { name: /Confirm and pay on arrival/i }).click();
    await expect(page.getByText(/BOOKING REFERENCE/i)).toBeVisible();
    await expect(page.getByText(/VAL-\d{4}-26/)).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test.describe('regressions', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('booking again after a confirmation returns to the form', async ({ page }) => {
    await page.goto('/experience/luge');
    await page.getByRole('button', { name: /Add to My Day/i }).first().click();
    await page.goto('/booking');
    await page.getByPlaceholder(/name/i).first().fill('Repeat Guest');
    await page.getByPlaceholder(/email/i).first().fill('repeat@example.com');
    await page.getByRole('button', { name: /Confirm and pay on arrival|Pay Rs/i }).click();
    await expect(page.getByText(/BOOKING REFERENCE/i)).toBeVisible();

    // Any booking entry point must leave the receipt and show the form again.
    await page.getByRole('button', { name: /^Book( now)?$/ }).first().click();
    await expect(page.getByRole('heading', { name: /Build your day/i })).toBeVisible();
    await expect(page.getByText(/BOOKING REFERENCE/i)).toBeHidden();
  });

  test('repeat clicks on a hash nav link scroll again', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('button', { name: 'Plan your visit' })
      .or(page.getByText('Plan your visit', { exact: true })).first();
    await link.click();
    await page.waitForTimeout(900);
    const firstY = await page.evaluate(() => window.scrollY);
    expect(firstY).toBeGreaterThan(200);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await link.click();
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  });

  test('explore filters survive a trip through an experience page', async ({ page }) => {
    await page.goto('/explore?cat=kids');
    await expect(page.getByText('Pirate Ship')).toBeVisible();
    await page.getByText('Pirate Ship').first().click();
    await expect(page).toHaveURL(/\/experience\/pirate/);
    await page.getByText(/All experiences/i).first().click();
    await expect(page).toHaveURL(/cat=kids/);
    await expect(page.getByText('Zipline Adventures')).toBeHidden();
  });
});

test.describe('packages', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('opens a package modal with prices', async ({ page }) => {
    await page.goto('/packages');
    await expect(page.getByRole('heading', { name: /Packages/i }).first()).toBeVisible();
    await page.getByText('MOST POPULAR', { exact: false }).first().click();
    await expect(page.getByText('WHAT IS INCLUDED', { exact: true })).toBeVisible();
    await expect(page.getByText('Reserve this package →')).toBeVisible();
    await page.getByTitle('Close').first().click();
    await expect(page.getByText('WHAT IS INCLUDED', { exact: true })).toBeHidden();
    await expectNoHorizontalScroll(page);
  });

  test('team quote form validates and submits', async ({ page }) => {
    await page.goto('/packages#quote');
    const name = page.getByPlaceholder(/name/i).first();
    await name.scrollIntoViewIfNeeded();
    await name.fill('HR Team');
    await page.getByPlaceholder(/email/i).first().fill('hr@corp.mu');
    await page.getByRole('button', { name: /request|quote|send/i }).last().click();
    await expect(page.getByText(/hr@corp\.mu|request .* sent|thank/i).first()).toBeVisible();
  });
});

test.describe('restaurants', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('chamouze shows menu and links to citronelle', async ({ page }) => {
    await page.goto('/dine/chamouze');
    await expect(page.getByRole('heading', { name: /Le Chamouzé/i }).first()).toBeVisible();
    await expect(page.getByText('Burrata Salad', { exact: true })).toBeVisible();
    await page.getByText('La Citronelle', { exact: true }).last().click();
    await expect(page).toHaveURL(/\/dine\/citronelle/);
    await expect(page.getByText('Veg Thali', { exact: true })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test.describe('visual sweep', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  for (const [name, path] of [
    ['home', '/'],
    ['explore', '/explore'],
    ['detail', '/experience/zipline'],
    ['packages', '/packages'],
    ['restaurant', '/dine/chamouze'],
    ['booking', '/booking'],
  ] as const) {
    test(`${name} full-page has no horizontal overflow`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.waitForTimeout(600);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: testInfo.outputPath(`${name}-full.png`), fullPage: true });
    });
  }
});
