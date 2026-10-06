import { expect, test, type Page } from '@playwright/test';

/** Pre-select the resident rate so the rate gate doesn't block flows. */
function preselectRate(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem('valle_rate', 'rr');
    localStorage.setItem('valle_sel', '{}');
    localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 }));
  });
}

/** Bookings are confirmed by the API; those tests skip when it is not running (like staff-chat.spec). */
async function apiUp(page: Page): Promise<boolean> {
  try {
    const r = await page.request.get('/api/health', { timeout: 4000 });
    return r.ok();
  } catch {
    return false;
  }
}

/** Add one option of a multi-option experience (zipline, quad, luge...) from its detail page. */
async function addFirstOption(page: Page) {
  await page.getByRole('button', { name: /Choose an option/i }).first().click();
  const sheet = page.getByRole('dialog', { name: /Choose your/i });
  await sheet.getByRole('button', { name: /^\+ Add$/ }).first().click();
  await sheet.getByRole('button', { name: 'Done' }).click();
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
    // the same age rule as the booking page and the admission price list
    await expect(page.getByText(/under 6 free/).first()).toBeVisible();
    await expect(page.getByText(/under 5/)).toHaveCount(0);
    await page.getByText('I live in Mauritius').click();
    await expect(page.getByText('Which rate', { exact: false })).toBeHidden();
  });
});

test.describe('cookie consent', () => {
  test('asks once on the first visit and remembers the answer', async ({ page }) => {
    // Clear once (init scripts run again on reload, and the reload must keep the saved choice).
    await page.addInitScript(() => {
      if (sessionStorage.getItem('pw-fresh')) return;
      localStorage.clear();
      localStorage.setItem('valle_rate', 'rr');
      sessionStorage.setItem('pw-fresh', '1');
    });
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: /Cookies and storage/i });
    await expect(banner).toBeVisible();
    await banner.getByTestId('consent-essential').click();
    await expect(banner).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('valle_consent') || 'null')?.level)).toBe('essential');
    await page.reload();
    await expect(page.getByRole('heading', { name: /Feel the/i })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /Cookies and storage/i })).toHaveCount(0);
  });

  test('footer link reopens the settings and the toggle saves "all"', async ({ page }) => {
    await preselectRate(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'COOKIE SETTINGS' }).click();
    const banner = page.getByRole('dialog', { name: /Cookies and storage/i });
    await expect(banner).toBeVisible();
    await banner.getByRole('switch', { name: /Performance monitoring/i }).click();
    await banner.getByTestId('consent-save').click();
    await expect(banner).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('valle_consent') || 'null')?.level)).toBe('all');
  });
});

test.describe('currency', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('picker converts every price, keeps the charged amount in rupees, and remembers the choice', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.getByText(/^FROM Rs /).first()).toBeVisible();
    await page.getByTestId('currency-picker').first().click();
    await page.getByRole('option', { name: /EUR/ }).click();
    await expect(page.getByTestId('currency-picker').first()).toHaveText(/EUR/);
    await expect(page.getByText(/^FROM ≈ € /).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('valle_currency'))).toBe('EUR');

    // the booking bar quotes rupees (what is charged) with the conversion beside it
    await page.goto('/booking');
    await expect(page.getByText(/· Rs [\d,]+ \(≈ € [\d,.]+\)/).first()).toBeVisible();
    await expect(page.getByTestId('currency-picker').first()).toHaveText(/EUR/);

    // and back
    await page.getByTestId('currency-picker').first().click();
    await page.getByRole('option', { name: /MUR/ }).click();
    await expect(page.getByText(/· Rs [\d,]+$/).first()).toBeVisible();
  });

  test('lists dirham, riyal and Indian rupee among the currencies', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('currency-picker').first().click();
    for (const name of ['UAE dirham', 'Saudi riyal', 'Indian rupee', 'US dollar', 'Euro', 'British pound', 'South African rand']) {
      await expect(page.getByRole('option', { name })).toBeVisible();
    }
    await expect(page.getByText(/BANK OF MAURITIUS/)).toBeVisible();
  });
});

test.describe('date picker shows how busy each slot is', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('dots per day and a level on the chosen slot, fed by the bookings so far', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    // make sure at least one future date has a morning booking
    const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const res = await page.request.post('/api/bookings', {
      data: { visitDate: date, slot: 'morning', adults: 2, kids: 0, rate: 'rr', items: [], name: 'Busy Guest', email: 'busy@example.mu', payMode: 'gate' },
    });
    expect(res.ok()).toBeTruthy();

    await page.goto('/booking');
    // every one of the 14 date chips carries its two dots once the API has answered
    await expect(page.getByTestId('load-dots')).toHaveCount(14, { timeout: 15000 });
    const dots = page.getByTestId('load-dots').nth(5);
    await expect(dots).toHaveAttribute('title', /Morning: (quiet|busy|very busy|fully booked) · Afternoon: /);
    // the slot chips of the selected date say how busy they are
    await expect(page.getByTestId('slot-level')).toHaveCount(2);
    await expect(page.getByTestId('slot-level').first()).toHaveText(/QUIET|BUSY|VERY BUSY|FULLY BOOKED/);
    // the API agrees with what is drawn
    const api = await (await page.request.get(`/api/bookings/availability?from=${date}&days=1`)).json();
    expect(api[0].morning.bookings).toBeGreaterThanOrEqual(1);
    expect(['quiet', 'busy', 'very-busy', 'full']).toContain(api[0].morning.level);
  });
});

test.describe('chat composer', () => {
  test('emoji picker inserts into the message and the attach and voice buttons are there', async ({ page }) => {
    await preselectRate(page);
    await page.goto('/');
    await page.getByRole('button', { name: /open chat/i }).click();
    const skip = page.getByRole('button', { name: /skip/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await expect(page.getByLabel('Message')).toBeVisible();
    await page.getByLabel('Message').fill('See you Sunday ');
    await page.getByRole('button', { name: /insert an emoji/i }).click();
    await expect(page.getByTestId('emoji-picker')).toBeVisible();
    await page.getByRole('button', { name: 'Insert 🎉' }).click();
    await expect(page.getByLabel('Message')).toHaveValue('See you Sunday 🎉');
    await expect(page.getByTestId('emoji-picker')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /attach a photo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /record a voice note/i })).toBeVisible();
  });
});

test.describe('booking desk unreachable', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('shows an error instead of a phantom reference', async ({ page }) => {
    await page.route('**/api/bookings', (route) => route.abort('connectionrefused'));
    await page.goto('/experience/luge');
    await addFirstOption(page);
    await page.goto('/booking');
    await page.getByPlaceholder(/name/i).first().fill('Offline Guest');
    await page.getByPlaceholder(/email/i).first().fill('offline@example.com');
    await page.getByRole('button', { name: /Confirm and pay on arrival/i }).click();
    await expect(page.getByText(/could not reach the booking desk/i)).toBeVisible();
    await expect(page.getByText(/BOOKING REFERENCE/i)).toHaveCount(0);
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
    // pin "A": Park Entrance & Reception (the quad and zipline maps have their own "A" pins)
    await page.getByRole('button', { name: 'A', exact: true }).and(page.locator('[title="Park Entrance & Reception"]')).first().click();
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
    // Zipline has several tours, so the button opens the option sheet.
    await addFirstOption(page);
    await expect(page.getByRole('button', { name: /In My Day/i }).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('unknown id shows the not-found page with a way back', async ({ page }) => {
    // /experience/<id> is the old URL: 301 to /activities/<id>, which is a real 404.
    await page.goto('/experience/does-not-exist');
    await expect(page).toHaveURL(/\/activities\/does-not-exist$/);
    await expect(page.getByRole('heading', { name: /Off the/i })).toBeVisible();
    await page.getByRole('link', { name: /All 21 experiences/i }).click();
    await expect(page).toHaveURL(/\/explore$/);
  });
});

test.describe('booking flow', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('completes a booking end to end', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    await page.goto('/experience/zipline');
    await addFirstOption(page);
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
    test.skip(!(await apiUp(page)), 'API not running');
    await page.goto('/experience/luge');
    await addFirstOption(page);
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

  test('no "pay online" is offered and a fresh booking is never stamped as paid', async ({ page }) => {
    // Nothing on the site takes money yet: the choice is hidden and the receipt says pay on arrival.
    test.skip(!(await apiUp(page)), 'API not running');
    await page.goto('/booking');
    await expect(page.getByText(/Pay online now/i)).toHaveCount(0);
    await expect(page.getByText(/HOW WOULD YOU LIKE TO PAY/i)).toHaveCount(0);
    await expect(page.getByText(/PAY AT THE GATE/i).first()).toBeVisible();
    await page.getByPlaceholder(/name/i).first().fill('Gate Payer');
    await page.getByPlaceholder(/email/i).first().fill('gate@example.com');
    await page.getByRole('button', { name: /Confirm and pay on arrival/i }).click();
    await expect(page.getByText(/BOOKING REFERENCE/i)).toBeVisible();
    await expect(page.getByText('PAY ON ARRIVAL', { exact: true })).toBeVisible();
    await expect(page.getByText(/PAID ✓|All paid|Total paid/)).toHaveCount(0);
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
    await expect(page).toHaveURL(/\/activities\/pirate/);
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
    // The form is rate-limited per IP (5 per 10 min); parallel projects and reruns share one.
    const outcome = page.getByText(/hr@corp\.mu|request .* sent|thank/i).first().or(page.getByTestId('quote-error'));
    await expect(outcome).toBeVisible();
    test.skip(/Too many requests/.test(await outcome.innerText()), 'quote budget used by a parallel project');
    await expect(page.getByText(/hr@corp\.mu|request .* sent|thank/i).first()).toBeVisible();
  });

  test('a quote request that the desk did not receive is never reported as sent', async ({ page }) => {
    await page.route('**/api/quotes', (route) => route.fulfill({ status: 500, json: { message: 'boom' } }));
    await page.goto('/packages#quote');
    const name = page.getByPlaceholder(/name/i).first();
    await name.scrollIntoViewIfNeeded();
    await name.fill('Unlucky Team');
    await page.getByPlaceholder(/email/i).first().fill('unlucky@corp.mu');
    const submit = page.locator('#quote').getByRole('button', { name: /request a quote/i });
    await submit.click();
    await expect(page.getByTestId('quote-error')).toContainText('We could not send your request');
    await expect(page.getByText(/Request sent/i)).toHaveCount(0);
    // the form is still there with what was typed
    await expect(page.getByPlaceholder(/name/i).first()).toHaveValue('Unlucky Team');

    await page.unroute('**/api/quotes');
    await page.route('**/api/quotes', (route) => route.fulfill({ status: 429, json: { message: 'Too many' } }));
    await submit.click();
    await expect(page.getByTestId('quote-error')).toContainText('Too many requests');
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

test.describe('external links', () => {
  // Guards against a past defect where every "/" in six outbound URLs had become "i"
  // (api.whatsapp.comisendi…), which left Directions, WhatsApp and Read reviews dead.
  for (const path of ['/', '/packages', '/activities/zipline', '/dine/chamouze']) {
    test(`every outbound link on ${path} has a real host and path`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'markup is the same on every viewport');
      await page.goto(path);
      const hrefs = await page.locator('a[href^="http"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''));
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        const u = new URL(href);
        expect(u.hostname, href).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
        expect(u.hostname, href).not.toMatch(/\.(com|org|net)i$/);
        expect(href, href).not.toMatch(/\.(com|org|net)i[a-zA-Z]/);
      }
    });
  }
});

test.describe('legal pages', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('the footer links to the privacy policy and the terms, which exist in every language', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'markup is the same on every viewport');
    await page.goto('/');
    await expect(page.getByText(/UX RESTRUCTURE CONCEPT/)).toHaveCount(0);
    await page.getByRole('link', { name: 'PRIVACY POLICY' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Privacy policy/i);
    await expect(page.getByTestId('legal-privacy')).toContainText('Mare Anguilles Farms Ltd');
    await expect(page.getByTestId('legal-privacy')).toContainText('Data Protection Act 2017');
    await page.getByRole('link', { name: /Terms of use/ }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByTestId('legal-terms')).toContainText('nothing is charged online');

    for (const p of ['/fr/privacy', '/de/terms', '/ar/privacy', '/hi/terms']) {
      const res = await request.get(p);
      expect(res.status(), p).toBe(200);
      const html = await res.text();
      expect(html, p).toContain('legal-');
      expect(html, p).not.toContain('Privacy policy · VALLÉ');
    }
  });
});
