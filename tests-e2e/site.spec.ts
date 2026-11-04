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
  await sheet.getByRole('button', { name: /^\+ Add/ }).first().click();
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
    const banner = page.getByRole('region', { name: /Cookies and storage/i });
    await expect(banner).toBeVisible();
    await banner.getByTestId('consent-ok').click();
    await expect(banner).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('valle_consent') || 'null')?.level)).toBe('essential');
    await page.reload();
    await expect(page.getByRole('heading', { name: /Feel the/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /Cookies and storage/i })).toHaveCount(0);
  });

  test('footer link reopens the notice with only essential storage, no monitoring', async ({ page }) => {
    await preselectRate(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'COOKIE SETTINGS' }).click();
    const banner = page.getByRole('region', { name: /Cookies and storage/i });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('switch')).toHaveCount(1);
    await expect(banner.getByRole('switch', { name: /Essential storage/i })).toBeDisabled();
    await expect(banner).not.toContainText(/monitoring|analytics/i);
    await banner.getByTestId('consent-ok').click();
    await expect(banner).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('valle_consent') || 'null')?.level)).toBe('essential');
  });
});

test.describe('currency', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('picker converts every price, keeps the charged amount in rupees, and remembers the choice', async ({ page }) => {
    // the picker lives on the price pages (packages, booking), not in the header
    await page.goto('/packages/exclusive');
    await page.getByTestId('currency-picker').first().click();
    await page.getByRole('option', { name: /EUR/ }).click();
    await expect(page.getByTestId('currency-picker').first()).toHaveText(/EUR/);
    await page.goto('/explore');
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
    await page.goto('/booking');
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

  test('lists every experience and filters by search', async ({ page }) => {
    await page.goto('/explore');
    const total = ((await (await page.request.get('/api/catalog')).json()) as { ACTS: unknown[] }).ACTS.length;
    await expect(page.getByText(`${total} OF ${total}`)).toBeVisible();
    await page.goto('/explore?q=zip'); // the header search lands here; the page itself has no search box
    const shown = page.getByText(new RegExp('^[0-9]+ OF ' + total + '$'));
    await expect(shown).toBeVisible();
    expect(Number((await shown.textContent())!.split(' ')[0])).toBeLessThan(total);
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
    await page.getByRole('main').getByRole('link', { name: /All \d+ experiences/i }).click();
    await expect(page).toHaveURL(/\/explore$/);
  });

  test('the Giant Swing shows its price, age and a muted inline clip with a pause control', async ({ page }) => {
    await page.goto('/activities/giantswing');
    await expect(page.getByRole('heading', { level: 1, name: /The Giant Swing/i })).toBeVisible();
    await expect(page.getByText('Giant Swing · 2 rides', { exact: true })).toBeVisible();
    await expect(page.getByText('Rs 700').first()).toBeVisible();
    await expect(page.getByText('12+', { exact: true }).first()).toBeVisible();
    const video = page.getByTestId('activity-video');
    await expect(video).toBeAttached();
    expect(await video.evaluate((v: HTMLVideoElement) => ({ muted: v.muted, loop: v.loop, inline: v.playsInline, preload: v.preload, poster: !!v.poster }))).toEqual({ muted: true, loop: true, inline: true, preload: 'metadata', poster: true });
    await expect(page.getByRole('button', { name: /(Pause|Play) the video/ })).toBeVisible();
    const box = (await video.boundingBox())!;
    expect(box.x + box.width, 'the clip stays inside the viewport').toBeLessThanOrEqual(page.viewportSize()!.width);
    const clip = await page.request.get('/images/giant-swing/giant-swing.mp4', { headers: { Range: 'bytes=0-99' } });
    expect(clip.status()).toBe(206);
    expect(clip.headers()['content-type']).toBe('video/mp4');
    await expectNoHorizontalScroll(page);
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
    // the option exists only when the API has a payment provider (the e2e stack runs the sandbox; production has none)
    const cfg = await (await page.request.get('/api/payments/config')).json() as { enabled: boolean };
    await page.goto('/booking');
    if (cfg.enabled) {
      await expect(page.getByText(/Pay online now/i)).toBeVisible();
    } else {
      await expect(page.getByText(/Pay online now/i)).toHaveCount(0);
      await expect(page.getByText(/HOW WOULD YOU LIKE TO PAY/i)).toHaveCount(0);
      await expect(page.getByText(/PAY AT THE GATE/i).first()).toBeVisible();
    }
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
    await page.goto('/packages/exclusive');
    await expect(page.getByRole('heading', { name: /Packages/i }).first()).toBeVisible();
    // every card lists its inclusions now; the modal is the one with the Close button
    const closers = await page.getByTitle('Close').count();
    await page.getByRole('button', { name: /View details of Standard/ }).click();
    await expect(page.getByTitle('Close')).toHaveCount(closers + 1);
    const close = page.getByTitle('Close').last();
    await expect(close).toBeVisible();
    // bookable online when the API lists products; a WhatsApp reservation otherwise (bundled fallback catalog)
    await expect(page.getByText(/Reserve this package →|Add to my day and book|In my day · book now/)).toBeVisible();
    await close.click();
    await expect(page.getByTitle('Close')).toHaveCount(closers);
    await expectNoHorizontalScroll(page);
  });

  test('/packages/senior shows both senior packages and books Package 1 into My Day', async ({ page }) => {
    await page.goto('/packages/senior');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Senior citizen/i);
    const cards = page.getByTestId('senior-package');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText('Package 1');
    await expect(cards.nth(0).getByTestId('senior-price')).toHaveText('Rs 1,100');
    await expect(cards.nth(1)).toContainText('Package 2');
    await expect(cards.nth(1).getByTestId('senior-price')).toHaveText('Rs 1,500');
    await expect(cards.nth(1)).toContainText('45 min');
    await expect(page.getByRole('heading', { name: 'Lunch menu' })).toBeVisible();
    await expect(page.getByText('Chicken blanquette with vegetables')).toBeVisible();
    await expect(page.getByRole('link', { name: /Call VALLÉ on \+230 660 4477/ })).toHaveAttribute('href', 'tel:+2306604477');
    await expectNoHorizontalScroll(page);

    await cards.nth(0).getByTestId('senior-book').click();
    await expect(page).toHaveURL(/\/booking$/);
    await expect(page.getByText('Package 1').first()).toBeVisible();
    const sel = await page.evaluate(() => JSON.parse(localStorage.getItem('valle_sel') || '{}') as Record<string, unknown>);
    expect(Object.keys(sel)).toContain('product:pkg:senior:0');
  });

  test('/packages/senior: a visitor aged 55+ books at the same price, no resident-only switch', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('valle_rate', 'nr'));
    await page.goto('/packages/senior');
    const cards = page.getByTestId('senior-package');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0).getByTestId('senior-price')).toHaveText('Rs 1,100');
    await expect(cards.nth(1).getByTestId('senior-price')).toHaveText('Rs 1,500');
    await expect(page.getByTestId('pkg-rate-note')).toHaveCount(0);
    await expect(page.getByText('RESIDENT RATE · ID REQUIRED')).toHaveCount(0);
    await expect(cards.nth(0).getByTestId('senior-book')).toBeVisible();
    await expect(cards.nth(0).getByRole('button', { name: /View details/ })).toBeVisible();
  });

  /** The catalog the pages read (live API, same shape as the bundled fallback). */
  async function catalogOf(page: Page) {
    const r = await page.request.get('/api/catalog');
    expect(r.ok()).toBeTruthy();
    return r.json() as Promise<{
      PACKS: Record<string, { key?: string; name: string; single: string; dbl: string }[]>;
      PRODUCTS: { key: string; rr: number; dblRr: number | null }[];
      PL: Record<string, { n: string; rr: number; nr: number }[]>;
      PHOTO: { rr: { tiers: { key?: string; name: string; single: string; dbl: string }[] } };
      TEAM: unknown[];
    }>;
  }
  const rs = (n: number) => 'Rs ' + n.toLocaleString('en-US');
  const selKeys = (page: Page) => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('valle_sel') || '{}') as Record<string, unknown>));

  test('/packages/exclusive shows every family with catalog prices and books a tier into My Day', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    const cat = await catalogOf(page);
    await page.goto('/packages/exclusive');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Exclusive packages/i);
    const cards = page.getByTestId('pack-card');
    await expect(cards).toHaveCount(cat.PACKS.ls.length + cat.PACKS.ex.length);
    const std = cards.filter({ hasText: cat.PACKS.ls[1].name }).first();
    await expect(std).toContainText(cat.PACKS.ls[1].single);
    await expect(std).toContainText(cat.PACKS.ls[1].dbl);
    const vip = cat.PRODUCTS.find((p) => p.key === 'vip')!;
    await expect(page.getByTestId('vip-feature-single')).toHaveText(rs(vip.rr));
    await expect(page.getByTestId('vip-feature-double')).toHaveText(rs(vip.dblRr!));
    // Diamond is sold at the visitor rate: a resident sees the rate switch, not a Book button
    await expect(page.getByTestId('diamond-feature').getByTestId('pkg-rate-note')).toBeVisible();
    await expect(page.getByTestId('combo-card')).toHaveCount(2);
    await expectNoHorizontalScroll(page);

    const gold = cat.PACKS.ex[2];
    await cards.filter({ hasText: gold.single }).getByTestId('pkg-book').click();
    await expect(page).toHaveURL(/\/booking$/);
    expect(await selKeys(page)).toContain('product:' + gold.key);
  });

  test('/packages/resident lists the four resident packages and books one into My Day', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    const cat = await catalogOf(page);
    await page.goto('/packages/resident');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Resident packages/i);
    const cards = page.getByTestId('resident-package');
    await expect(cards).toHaveCount(cat.PACKS.resident.length);
    for (const [i, p] of cat.PACKS.resident.entries()) await expect(cards.nth(i).getByTestId('resident-price')).toHaveText(p.single);
    await expect(page.getByTestId('kids-pricelist')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await cards.nth(0).getByTestId('pkg-book').click();
    await expect(page).toHaveURL(/\/booking$/);
    expect(await selKeys(page)).toContain('product:' + cat.PACKS.resident[0].key);
  });

  test('/packages/student shows the student price list, the lunch prices and leads to the school booking', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    const cat = await catalogOf(page);
    const lunch = cat.PL.student.filter((r) => /^Lunch/.test(r.n));
    await page.goto('/packages/student');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Student package/i);
    await expect(page.getByTestId('student-row')).toHaveCount(cat.PL.student.length - lunch.length);
    await expect(page.getByTestId('student-lunch-price')).toHaveText(lunch.map((r) => rs(r.rr)));
    await expect(page.getByTestId('student-group').filter({ hasText: 'Kids Park' })).toContainText(/Top-up card/);
    await expectNoHorizontalScroll(page);
    await page.getByTestId('book-school').click();
    await expect(page).toHaveURL(/\/groups$/);
  });

  test('/packages/corporate opens on the team-building hero and lists the catalog programmes', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    const cat = await catalogOf(page);
    await page.goto('/packages/corporate');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Need a stronger team\?/i);
    await expect(page.getByTestId('team-phone')).toHaveAttribute('href', 'tel:+2306604477');
    await expect(page.getByTestId('team-card')).toHaveCount(cat.TEAM.length);
    await expectNoHorizontalScroll(page);
    await page.getByTestId('team-hero-quote').click();
    await expect(page.getByPlaceholder('Name *')).toBeInViewport();
  });

  test('/packages/photo-video shows the photo tiers, cinematic items and the Waterfall Swing, and books them into My Day', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    const cat = await catalogOf(page);
    await page.goto('/packages/photo-video');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Photo & video/i);
    const tiers = page.getByTestId('photo-tier');
    await expect(tiers).toHaveCount(cat.PHOTO.rr.tiers.length);
    await expect(tiers.nth(0)).toContainText(cat.PHOTO.rr.tiers[0].single);
    await expect(tiers.nth(0)).toContainText(cat.PHOTO.rr.tiers[0].dbl);
    const swing = page.getByTestId('swing-row');
    await expect(swing).toHaveCount(cat.PL.swing.length);
    for (const [i, r] of cat.PL.swing.entries()) await expect(swing.nth(i)).toContainText(rs(r.rr));
    await expect(page.getByRole('link', { name: 'See the Waterfall Swing' })).toHaveAttribute('href', '/activities/swing');
    await expectNoHorizontalScroll(page);
    await swing.nth(1).getByTestId('swing-book').click();
    await expect(page).toHaveURL(/\/booking$/);
    expect(await selKeys(page)).toContain('swing::' + cat.PL.swing[1].n);
    await page.goto('/packages/photo-video');
    await tiers.nth(0).getByTestId('photo-book').click();
    await expect(page).toHaveURL(/\/booking$/);
    expect(await selKeys(page)).toContain('product:' + cat.PHOTO.rr.tiers[0].key);
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

test.describe('slot capacity', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('a full slot cannot be chosen, the picker switches to the other slot, and a 409 is explained', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'same logic on every viewport');
    // tomorrow's morning is reported full, afternoon has room
    await page.route('**/api/bookings/availability**', async (route) => {
      const url = new URL(route.request().url());
      const from = url.searchParams.get('from') || '';
      const days = Number(url.searchParams.get('days') || '1');
      const out = [] as unknown[];
      for (let i = 0; i < days; i++) {
        const d = new Date(from + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + i);
        const iso = d.toISOString().slice(0, 10);
        out.push({ date: iso, morning: { bookings: 40, guests: 150, level: i === 1 ? 'full' : 'quiet' }, afternoon: { bookings: 0, guests: 0, level: 'quiet' } });
      }
      await route.fulfill({ json: out });
    });
    await page.goto('/booking');
    // the default date is tomorrow (index 1): the full morning chip is disabled and the afternoon is selected
    const full = page.getByTestId('slot-full');
    await expect(full).toBeDisabled();
    await expect(full).toContainText('Morning');
    await expect(page.getByRole('button', { name: /Afternoon/ })).toHaveAttribute('aria-pressed', 'true');

    // the server is the judge: a 409 is shown as a plain sentence and the picker is refreshed
    await page.route('**/api/bookings', (route) => route.fulfill({ status: 409, json: { message: 'That arrival slot is fully booked on this date. Pick the other slot or another day.' } }));
    await page.getByPlaceholder(/name/i).first().fill('Late Guest');
    await page.getByPlaceholder(/email/i).first().fill('late@example.com');
    await page.getByRole('button', { name: /Confirm and pay on arrival/i }).click();
    await expect(page.getByText(/fully booked on this date/)).toBeVisible();
    await expect(page.getByText(/BOOKING REFERENCE/i)).toHaveCount(0);
  });

  test('the API refuses the party that would overfill a slot', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'one project fills the slot');
    test.skip(!(await apiUp(page)), 'API not running');
    // a date nobody else books in the suite, 58 days out (inside the availability window)
    const d = new Date(); d.setUTCDate(d.getUTCDate() + 58);
    const iso = d.toISOString().slice(0, 10);
    const book = (n: number) => request.post('/api/bookings', {
      data: { visitDate: iso, slot: 'afternoon', adults: 12, kids: 0, rate: 'rr', items: [], name: `Coach ${n}`, email: `coach${n}@example.com`, payMode: 'gate' },
    });
    let full = 0;
    for (let n = 0; n < 14; n++) {
      const res = await book(n);
      if (res.status() === 409) { full++; expect(await res.json()).toMatchObject({ message: /fully booked/ }); break; }
      expect(res.status(), `booking ${n}`).toBe(201);
    }
    // With the default capacity (150) 12 × 12 = 144 fit and the 13th party of 12 is refused.
    // A local stack may run with a far higher BOOKING_SLOT_CAPACITY so the suite never fills tomorrow.
    test.skip(full === 0, 'BOOKING_SLOT_CAPACITY on this server is above what 14 parties can fill');
    expect(full).toBe(1);
    const avail = await (await request.get(`/api/bookings/availability?from=${iso}&days=1`)).json();
    expect(avail[0].afternoon.guests).toBeGreaterThanOrEqual(144);
  });
});

test.describe('promo code race', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('a code whose last use just went to someone else is explained and dropped, not shown as a full slot', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'same logic on every viewport');
    await page.route('**/api/coupons/LASTONE', (route) => route.fulfill({ json: { code: 'LASTONE', kind: 'percent', value: 10, note: 'Partner offer' } }));
    await page.route('**/api/bookings', (route) => route.fulfill({ status: 409, json: { message: 'This code has just been fully used. Remove it or try another.' } }));
    await page.goto('/booking');
    await page.getByTestId('coupon-input').fill('LASTONE');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByTestId('coupon-msg')).toBeVisible();
    await page.getByPlaceholder(/name/i).first().fill('Late Guest');
    await page.getByPlaceholder(/email/i).first().fill('late@example.com');
    await page.getByRole('button', { name: /Confirm and pay on arrival/i }).click();
    await expect(page.getByText(/This code has just been fully used/)).toBeVisible();
    await expect(page.getByText(/fully booked on this date/)).toHaveCount(0);
    await expect(page.getByText(/BOOKING REFERENCE/i)).toHaveCount(0);
  });
});

test.describe('online payment', () => {
  // Needs the api with PAYMENT_PROVIDER=sandbox (the e2e compose override); production runs without a provider.
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('pay online: hosted checkout, webhook, ticket reads paid, ticket mail follows the money', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'same flow on every viewport');
    test.skip(!(await apiUp(page)), 'API not running');
    const cfg = await (await request.get('/api/payments/config')).json() as { enabled: boolean };
    test.skip(!cfg.enabled, 'no payment provider on this server');

    await page.goto('/booking');
    await page.getByPlaceholder(/name/i).first().fill('Card Guest');
    await page.getByPlaceholder(/email/i).first().fill('card@example.com');
    await page.getByText('Pay online now').click();
    await page.getByRole('button', { name: /Pay Rs .* now/ }).click();
    // the stand-in hosted page served by the api
    await expect(page.getByTestId('sandbox-checkout')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('sandbox-pay').click();
    // back on the ticket: the outcome is read, the balance is zero, the stamp says paid
    await expect(page).toHaveURL(/\/ticket\/VAL-\d+-\d+\?t=.*&payment=/, { timeout: 15000 });
    await expect(page.getByTestId('payment-outcome')).toHaveAttribute('data-status', 'paid', { timeout: 20000 });
    await expect(page.getByTestId('payment-outcome')).toContainText('Payment received');
    await expect(page.getByTestId('ticket-balance')).toContainText('Paid');
    await expect(page.getByTestId('ticket-pay-online')).toHaveCount(0);
  });

  test('a declined card is explained, nothing is charged, and the ticket still offers to pay online', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'same flow on every viewport');
    test.skip(!(await apiUp(page)), 'API not running');
    const cfg = await (await request.get('/api/payments/config')).json() as { enabled: boolean };
    test.skip(!cfg.enabled, 'no payment provider on this server');

    await page.goto('/booking');
    await page.getByPlaceholder(/name/i).first().fill('Declined Guest');
    await page.getByPlaceholder(/email/i).first().fill('declined@example.com');
    await page.getByText('Pay online now').click();
    await page.getByRole('button', { name: /Pay Rs .* now/ }).click();
    await expect(page.getByTestId('sandbox-checkout')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('sandbox-fail').click();
    await expect(page.getByTestId('payment-outcome')).toHaveAttribute('data-status', 'failed', { timeout: 20000 });
    await expect(page.getByTestId('payment-outcome')).toContainText('did not go through');
    await expect(page.getByTestId('ticket-balance')).toContainText('To pay on arrival');
    // try again from the ticket page
    await page.getByTestId('ticket-pay-online').click();
    await expect(page.getByTestId('sandbox-checkout')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('sandbox-pay').click();
    await expect(page.getByTestId('payment-outcome')).toHaveAttribute('data-status', 'paid', { timeout: 20000 });
  });
});

test.describe('closed days and holds on the booking page', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('a closed slot reads as closed with its reason and cannot be chosen; typing a name holds the places', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'same logic on every viewport');
    await page.route('**/api/bookings/availability**', async (route) => {
      const url = new URL(route.request().url());
      const from = url.searchParams.get('from') || '';
      const days = Number(url.searchParams.get('days') || '1');
      const out = [] as unknown[];
      for (let i = 0; i < days; i++) {
        const d = new Date(from + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + i);
        out.push({ date: d.toISOString().slice(0, 10), morning: i === 1 ? { bookings: 0, guests: 0, level: 'closed', closure: { kind: 'private', reason: 'Wedding' } } : { bookings: 0, guests: 0, level: 'quiet' }, afternoon: { bookings: 0, guests: 0, level: 'quiet' } });
      }
      await route.fulfill({ json: out });
    });
    let held: unknown = null;
    await page.route('**/api/bookings/hold', async (route) => {
      held = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { holdId: '11111111-1111-4111-8111-111111111111', expiresAt: new Date(Date.now() + 600_000).toISOString() } });
    });
    await page.goto('/booking');
    const closed = page.getByTestId('slot-closed');
    await expect(closed).toBeDisabled();
    await expect(closed).toContainText('PRIVATE EVENT · Wedding');
    await expect(page.getByRole('button', { name: /Afternoon/ })).toHaveAttribute('aria-pressed', 'true');

    await page.getByPlaceholder(/name/i).first().fill('Holder');
    await expect(page.getByTestId('hold-note')).toContainText('HELD UNTIL', { timeout: 10000 });
    expect(held).toMatchObject({ slot: 'afternoon', adults: 2 });
  });
});

test.describe('manage my booking', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('from the ticket link a guest moves the date, adds a person and an experience, then cancels; the trail says guest', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'same flow on every viewport');
    test.skip(!(await apiUp(page)), 'API not running');
    const day = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const booked = await request.post('/api/bookings', {
      data: { visitDate: day(2), slot: 'morning', adults: 2, kids: 0, rate: 'rr', items: [{ id: 'zipline', adults: 2 }], name: 'Self Service', email: 'self@example.com', payMode: 'gate' },
    });
    expect(booked.status()).toBe(201);
    const b = (await booked.json()) as { refCode: string; total: number; ticketUrl: string };
    const u = new URL(b.ticketUrl);
    await page.goto(u.pathname + u.search);
    await expect(page.getByTestId('ticket')).toBeVisible();

    await page.getByTestId('manage-toggle').click();
    await page.getByTestId('manage-date').fill(day(3));
    await page.getByTestId('manage-slot').selectOption('afternoon');
    await page.getByTestId('manage-adults').getByRole('button', { name: /\+/ }).click();
    await page.getByTestId('manage-add-select').selectOption('luge');
    await page.getByTestId('manage-add').click();
    await page.getByTestId('manage-save').click();
    await expect(page.getByTestId('manage-done')).toContainText('Saved', { timeout: 15000 });
    await expect(page.getByTestId('ticket')).toContainText('3 adults');
    await expect(page.getByTestId('ticket')).toContainText(/Afternoon/);
    await expect(page.getByTestId('ticket')).toContainText(/Luge/);
    const after = await (await request.get(u.pathname.replace(/^.*\/ticket\//, '/api/tickets/') + u.search)).json() as { visitDate: string; adults: number; total: number };
    expect(after.visitDate).toBe(day(3));
    expect(after.adults).toBe(3);
    expect(after.total).toBeGreaterThan(b.total);

    await page.getByTestId('manage-toggle').click();
    await page.getByTestId('manage-cancel').click();
    await page.getByTestId('manage-cancel-confirm').click();
    await expect(page.getByTestId('manage-done')).toContainText('cancelled', { timeout: 15000 });
    await expect(page.getByText('THIS BOOKING WAS CANCELLED')).toBeVisible();
    await expect(page.getByTestId('manage-toggle')).toHaveCount(0);
  });

  test('a guest cannot touch an arrived or past booking, and a bad token is refused', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'API only');
    test.skip(!(await apiUp(page)), 'API not running');
    const booked = await request.post('/api/bookings', { data: { visitDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), slot: 'afternoon', adults: 1, kids: 0, rate: 'rr', items: [], name: 'Token Guest', email: 'token@example.com', payMode: 'gate' } });
    const b = (await booked.json()) as { refCode: string };
    const bad = await request.patch(`/api/tickets/${b.refCode}/booking?t=${'x'.repeat(24)}`, { data: { adults: 2 } });
    expect(bad.status()).toBe(403);
    const none = await request.post(`/api/tickets/${b.refCode}/cancel`, { data: {} });
    expect([400, 403]).toContain(none.status());
  });
});

test.describe('timed sessions on the booking page', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('a sessioned activity asks for a start time, full times are disabled, and the time travels with the hold', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'same logic on every viewport');
    await page.route('**/api/bookings/availability**', async (route) => {
      const url = new URL(route.request().url());
      const from = url.searchParams.get('from') || '';
      const days = Number(url.searchParams.get('days') || '1');
      const out = [] as unknown[];
      for (let i = 0; i < days; i++) {
        const d = new Date(from + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + i);
        out.push({ date: d.toISOString().slice(0, 10), morning: { bookings: 0, guests: 0, level: 'quiet' }, afternoon: { bookings: 0, guests: 0, level: 'quiet' }, sessions: { zipline: { durationMin: 90, times: { '09:30': 'full', '10:30': 'quiet', '14:00': 'busy' } } } });
      }
      await route.fulfill({ json: out });
    });
    let held: { items?: { id: string; time?: string }[] } | null = null;
    await page.route('**/api/bookings/hold', async (route) => {
      held = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { holdId: '11111111-1111-4111-8111-111111111111', expiresAt: new Date(Date.now() + 600_000).toISOString() } });
    });
    // two adults on the zipline, straight into the saved cart
    await page.addInitScript(() => { localStorage.setItem('valle_sel', JSON.stringify({ zipline: { a: 2 } })); });
    await page.goto('/booking');
    const picker = page.getByTestId('session-picker-zipline');
    await expect(picker).toBeVisible();
    await expect(picker.getByRole('button', { name: /09:30/ })).toBeDisabled();
    await expect(picker.getByRole('button', { name: /14:00/ })).toContainText('FEW LEFT');
    // no time yet: the confirm refuses and names the activity
    await page.getByPlaceholder(/name/i).first().fill('Timed Guest');
    await page.getByPlaceholder(/email/i).first().fill('timed@example.com');
    await page.getByRole('button', { name: /Confirm and pay on arrival/i }).click();
    await expect(page.getByText(/Pick a start time for Zipline/)).toBeVisible();
    await picker.getByRole('button', { name: /10:30/ }).click();
    await expect(page.getByTestId('hold-note')).toBeVisible({ timeout: 10000 });
    expect(held?.items?.[0]).toMatchObject({ id: 'zipline', time: '10:30' });
  });
});

test.describe('packages booked online', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('a combo, a package tier and a cinematic item go into the day and are charged at their package price', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'same flow on every viewport');
    test.skip(!(await apiUp(page)), 'API not running');
    const cat = await (await request.get('/api/catalog')).json() as { PRODUCTS?: { key: string; mode: string; rr: number; dblRr: number | null }[]; COMBO: { key?: string; name: string; rr: [number, number] }[] };
    test.skip(!cat.PRODUCTS?.length, 'no products on this server (migration 013 missing)');
    const combo = cat.COMBO[0];
    expect(combo.key).toBeTruthy();

    // the prerendered page carries no product keys; they arrive with the live catalog
    const catalogLoaded = page.waitForResponse((r) => r.url().includes('/api/catalog') && r.ok());
    await page.goto('/packages/exclusive#combo');
    await catalogLoaded;
    await page.getByRole('button', { name: /Book this combo/ }).first().click();
    await expect(page).toHaveURL(/\/booking$/);
    await expect(page.getByText(combo.name).first()).toBeVisible();
    // two adults on a "pair" product cost the double price
    await expect(page.getByText('Rs ' + combo.rr[1].toLocaleString('en-US')).first()).toBeVisible();

    // the server prices it the same way and writes a product line
    const booked = await request.post('/api/bookings', {
      data: { visitDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), slot: 'afternoon', adults: 2, kids: 0, rate: 'rr', items: [{ id: 'product:' + combo.key, adults: 2, kids: 0 }], name: 'Combo Guest', email: 'combo@example.com', payMode: 'gate' },
    });
    expect(booked.status()).toBe(201);
    const b = (await booked.json()) as { total: number; lines: { label: string; amount: number }[] };
    const line = b.lines.find((l) => l.label.startsWith(combo.name));
    expect(line?.amount).toBe(combo.rr[1]);

    // a visitor-only product is refused for a resident, an unknown one too
    const diamond = cat.PRODUCTS!.find((p) => p.key.startsWith('pkg:diamond'));
    if (diamond) {
      const refused = await request.post('/api/bookings', { data: { visitDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), slot: 'afternoon', adults: 1, kids: 0, rate: 'rr', items: [{ id: 'product:' + diamond.key, adults: 1 }], name: 'Res', email: 'res@example.com', payMode: 'gate' } });
      expect(refused.status()).toBe(400);
    }
    const unknown = await request.post('/api/bookings', { data: { visitDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), slot: 'afternoon', adults: 1, kids: 0, rate: 'rr', items: [{ id: 'product:nope', adults: 1 }], name: 'X', email: 'x@example.com', payMode: 'gate' } });
    expect(unknown.status()).toBe(400);
  });
});

test.describe('groups and schools', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });
  const far = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() + 20 + Math.floor(Math.random() * 30)); return d.toISOString().slice(0, 10); };

  test('a school books 34 people per head with a list, gets a deposit, and the teacher signs one waiver pack', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'same flow on every viewport');
    test.skip(!(await apiUp(page)), 'API not running');
    const cat = await (await request.get('/api/catalog')).json() as { PRODUCTS?: { key: string; family: string; name: string; rr: number }[]; PL: Record<string, { n: string; rr: number }[]> };
    const student = cat.PRODUCTS?.filter((p) => p.family === 'student' && !/^entrance fee/i.test(p.name)) ?? [];
    const entrance = cat.PRODUCTS?.find((p) => p.family === 'student' && /^entrance fee/i.test(p.name));
    const adultEntry = cat.PL.admission?.find((r) => r.n.toLowerCase().includes('12 years'))?.rr ?? 0;
    test.skip(student.length === 0, 'no student products (migration 014 missing)');

    await page.goto('/groups');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/whole group/i);
    await page.getByTestId('group-org').fill('Loreto College e2e');
    await page.getByTestId('group-leader').fill('Mrs Teacher');
    await page.getByTestId('group-email').fill('teacher@example.mu');
    await page.getByTestId('group-date').fill(far());
    await page.getByTestId('group-adults').fill('4');
    await page.getByTestId('group-kids').fill('30');
    await page.getByTestId('group-items').getByRole('checkbox').first().check();
    await page.getByTestId('group-list').fill('Ariane Léger, 11\nKabir Ramdhun, 10\nname,age\nSara Dupont');
    await expect(page.getByTestId('group-list-count')).toContainText('3 NAMES');
    // the row × the 30 pupils (full student price, no half rate), the student entrance fee once per pupil,
    // and the 4 teachers at the ordinary adult entry
    const perHead = student[0].rr;
    const expected = perHead * 30 + (entrance?.rr ?? 0) * 30 + adultEntry * 4;
    await expect(page.getByTestId('group-total')).toContainText('Rs ' + expected.toLocaleString('en-US'));
    await expect(page.getByTestId('group-deposit')).toContainText('Rs ' + Math.round(expected * 0.3).toLocaleString('en-US'));
    await page.getByTestId('group-submit').click();
    await expect(page.getByTestId('group-confirmed')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('group-confirmed')).toContainText('deposit Rs');

    // the ticket shows the group and the leader pack; one signature covers the party
    await page.getByTestId('group-ticket').click();
    await expect(page.getByTestId('ticket-group')).toContainText('Loreto College e2e');
    await expect(page.getByTestId('ticket-group')).toContainText('34 people');
    await expect(page.getByTestId('ticket-waivers')).toContainText('0 of 1 signed');
    await expect(page.getByTestId('ticket-waivers')).toContainText('waiver pack');
    const ticketUrl = new URL(page.url());
    const ref = ticketUrl.pathname.split('/').pop() as string;
    const token = ticketUrl.searchParams.get('t') as string;
    const view = await (await request.get(`/api/tickets/${ref}/waivers?t=${token}`)).json() as { required: number; group?: { participants: string[] } };
    expect(view.required).toBe(1);
    expect(view.group?.participants).toEqual(['Ariane Léger', 'Kabir Ramdhun', 'Sara Dupont']);

    // a party over 12 without a group is refused; a group under 10 too
    const noGroup = await request.post('/api/bookings', { data: { visitDate: far(), slot: 'afternoon', adults: 13, kids: 0, rate: 'rr', items: [], name: 'Big', email: 'big@example.com', payMode: 'gate' } });
    expect(noGroup.status()).toBe(400);
    const tiny = await request.post('/api/bookings', { data: { visitDate: far(), slot: 'afternoon', adults: 2, kids: 2, rate: 'rr', items: [], name: 'Small', email: 'small@example.com', payMode: 'gate', group: { kind: 'club', organisation: 'Tiny club' } } });
    expect(tiny.status()).toBe(400);
  });
});

test.describe('restaurant tables and saved drafts', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });

  test('a table is requested from the restaurant page with a pre-order, and the desk confirms it', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'same flow on every viewport');
    test.skip(!(await apiUp(page)), 'API not running');
    await page.goto('/dine/chamouze');
    await page.getByTestId('table-open').click();
    const d = new Date(); d.setUTCDate(d.getUTCDate() + 3);
    await page.getByTestId('table-date').fill(d.toISOString().slice(0, 10));
    await page.getByTestId('table-time').selectOption('13:00');
    await page.getByTestId('table-party').fill('6');
    await page.getByTestId('table-preorder').locator('summary').click();
    await page.getByTestId('table-preorder').getByRole('button', { name: /\+$/ }).first().click();
    await page.getByTestId('table-name').fill('Table Guest');
    await page.getByTestId('table-email').fill('table@example.com');
    await page.getByTestId('table-submit').click();
    await expect(page.getByTestId('table-done')).toContainText('table of 6', { timeout: 15000 });

    // the API refuses a request with no way to confirm, and an unknown restaurant
    const noContact = await request.post('/api/restaurants/chamouze/reservations', { data: { name: 'X', visitDate: d.toISOString().slice(0, 10), visitTime: '12:00', party: 2 } });
    expect(noContact.status()).toBe(400);
    const unknown = await request.post('/api/restaurants/nowhere/reservations', { data: { name: 'X', email: 'x@example.com', visitDate: d.toISOString().slice(0, 10), visitTime: '12:00', party: 2 } });
    expect(unknown.status()).toBe(404);
  });

  test('a guest saves the day by e-mail and comes back to it through the link', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'same flow on every viewport');
    test.skip(!(await apiUp(page)), 'API not running');
    await page.addInitScript(() => { localStorage.setItem('valle_sel', JSON.stringify({ zipline: { a: 3 } })); });
    await page.goto('/booking');
    await page.getByPlaceholder(/name/i).first().fill('Draft Guest');
    await page.getByPlaceholder(/email/i).first().fill('draft@example.com');
    await page.getByTestId('draft-save').click();
    await expect(page.getByTestId('draft-sent')).toBeVisible({ timeout: 15000 });
    // details survive a plain reload
    await page.reload();
    await expect(page.getByPlaceholder(/name/i).first()).toHaveValue('Draft Guest');

    // the link restores everything in a fresh browser state
    const saved = await request.post('/api/bookings/draft', { data: { email: 'draft@example.com', payload: { sel: { quad: { a: 2 } }, adults: 2, kids: 1, slot: 1, name: 'Link Guest', email: 'draft@example.com' } } });
    expect(saved.status()).toBe(201);
    const { id } = (await saved.json()) as { id: string };
    await page.context().clearCookies();
    await page.addInitScript(() => { localStorage.removeItem('valle_sel'); localStorage.removeItem('valle_draft'); });
    await page.goto('/booking?draft=' + id);
    await expect(page.getByTestId('draft-loaded')).toContainText('Welcome back', { timeout: 15000 });
    await expect(page.getByPlaceholder(/name/i).first()).toHaveValue('Link Guest');
    await expect(page.getByText('Quad').nth(1)).toBeVisible();
    await expect(page.getByRole('button', { name: /Afternoon/ })).toHaveAttribute('aria-pressed', 'true');
    const gone = await request.get('/api/bookings/draft/11111111-1111-4111-8111-111111111111');
    expect(gone.status()).toBe(404);
  });
});

test.describe('idempotent booking submit', () => {
  test('the same attempt sent twice makes one booking; a retry after a lost response gets the same reference', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'API only');
    test.skip(!(await apiUp(page)), 'API not running');
    const key = '7f1c4d3e-2b5a-4c6d-9e8f-0a1b2c3d4e5f'.replace('7f1c', Math.random().toString(16).slice(2, 6).padEnd(4, '0'));
    const body = { visitDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), slot: 'afternoon', adults: 1, kids: 0, rate: 'rr', items: [], name: 'Twice Guest', email: 'twice@example.com', payMode: 'gate', idempotencyKey: key };
    // a double tap: two requests in flight at once
    const [a, b] = await Promise.all([request.post('/api/bookings', { data: body }), request.post('/api/bookings', { data: body })]);
    expect(a.status()).toBe(201);
    expect(b.status()).toBe(201);
    const ra = (await a.json()) as { refCode: string; ticketUrl: string };
    const rb = (await b.json()) as { refCode: string; ticketUrl: string };
    expect(rb.refCode).toBe(ra.refCode);
    expect(rb.ticketUrl).toBe(ra.ticketUrl);
    // a later retry still answers with the same booking
    const c = await request.post('/api/bookings', { data: body });
    expect(((await c.json()) as { refCode: string }).refCode).toBe(ra.refCode);
    // a different attempt is a different booking
    const d = await request.post('/api/bookings', { data: { ...body, idempotencyKey: key.replace(/.$/, key.endsWith('f') ? '0' : 'f') } });
    expect(((await d.json()) as { refCode: string }).refCode).not.toBe(ra.refCode);
  });
});

test.describe('special deals (expo)', () => {
  test.beforeEach(async ({ page }) => {
    await preselectRate(page);
    await page.addInitScript(() => localStorage.removeItem('valle_draft'));
  });
  const DEALS = [['GO-PACKAGE', 'Rs 3,225', 'Rs 1,975', 'SAVE Rs 1,250'], ['PLUS-PACKAGE', 'Rs 3,025', 'Rs 2,175', 'SAVE Rs 850'], ['PRO-PACKAGE', 'Rs 3,900', 'Rs 3,000', 'SAVE Rs 900'], ['ELITE-PACKAGE', 'Rs 5,150', 'Rs 3,700', 'SAVE Rs 1,450']];
  const inWindow = () => { const d = new Date().toISOString().slice(0, 10); return d >= '2026-10-23' && d <= '2027-01-15'; };

  test('/packages/deals shows the four deals; a resident books one at the deal price with no entry line', async ({ page, request }, info) => {
    test.skip(!inWindow(), 'the expo deals are only on sale from 23 Oct 2026 to 15 Jan 2027');
    test.skip(!(await apiUp(page)), 'API not running');
    const catalogLoaded = page.waitForResponse((r) => r.url().includes('/api/catalog') && r.ok());
    await page.goto('/packages/deals');
    await catalogLoaded;
    const cards = page.getByTestId('deal-card');
    await expect(cards).toHaveCount(4);
    for (const [i, [name, was, deal, save]] of DEALS.entries()) {
      const card = cards.nth(i);
      await expect(card).toContainText(name);
      await expect(card.getByTestId('deal-was')).toContainText(was);
      await expect(card.getByTestId('deal-price')).toHaveText(deal);
      await expect(card.getByTestId('deal-save')).toHaveText(save);
      await expect(card).toContainText('RESIDENT RATE · ID REQUIRED');
    }
    await expect(page.getByTestId('deals-notes')).toContainText('valid Mauritian National ID card');
    await expect(page.getByTestId('deals-notes')).toContainText('NON REFUNDABLE');
    await expectNoHorizontalScroll(page);

    // book the GO deal: two adults (the default party) at Rs 1,975, park entry included
    await cards.first().getByTestId('deal-book').click();
    await expect(page).toHaveURL(/\/booking$/);
    await expect(page.getByText('GO-PACKAGE').first()).toBeVisible();
    await expect(page.getByTestId('entry-note')).toContainText('INCLUDED WITH THE EXPO DEAL');
    await expect(page.getByText(/1 experience \+ entry · Rs 3,950/).first()).toBeVisible();

    // the server agrees: deal price × party, entry 0; refused for visitors and outside the dates
    const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const body = (over: Record<string, unknown>) => ({ visitDate: day, slot: 'afternoon', adults: 2, kids: 0, rate: 'rr', items: [{ id: 'product:expo:go', adults: 2, kids: 0 }], name: 'Expo Guest', email: 'expo@example.com', payMode: 'gate', ...over });
    const booked = await request.post('/api/bookings', { data: body({}) });
    expect(booked.status()).toBe(201);
    const b = (await booked.json()) as { total: number; lines: { label: string; amount: number }[] };
    expect(b.total).toBe(3950);
    expect(b.lines.find((l) => l.label.startsWith('Park entry'))?.amount ?? 0).toBe(0);
    expect((await request.post('/api/bookings', { data: body({ rate: 'nr' }) })).status()).toBe(400);
    expect((await request.post('/api/bookings', { data: body({ visitDate: '2027-01-16' }) })).status()).toBe(400);
  });

  test('a visitor sees the deals but is offered the resident rate instead of a Book button', async ({ page }) => {
    test.skip(!inWindow(), 'the expo deals are only on sale from 23 Oct 2026 to 15 Jan 2027');
    await page.addInitScript(() => localStorage.setItem('valle_rate', 'nr'));
    await page.goto('/packages/deals');
    const first = page.getByTestId('deal-card').first();
    await expect(first.getByTestId('deal-visitor')).toBeVisible();
    await expect(first.getByTestId('deal-book')).toHaveCount(0);
    await first.getByRole('button', { name: /switch to the resident rate/ }).click();
    await expect(first.getByTestId('deal-book')).toBeVisible();
  });

  test('the packages menu and index list the special deals first', async ({ page }, info) => {
    test.skip(!inWindow(), 'the expo deals are only on sale from 23 Oct 2026 to 15 Jan 2027');
    test.skip(info.project.name !== 'desktop', 'class strip checked once');
    await page.goto('/packages');
    await expect(page.getByTestId('package-classes').locator('a').first()).toHaveAttribute('data-testid', 'class-deals');
  });
});

test.describe('Le Chamouzé kids menu', () => {
  test.beforeEach(async ({ page }) => { await preselectRate(page); });
  test('the menu shows the kids menu with its allergens and the included dessert', async ({ page }) => {
    await page.goto('/dine/chamouze');
    const group = page.getByTestId('menu-group').filter({ hasText: 'KIDS MENU' });
    await expect(group).toBeVisible();
    for (const dish of ['Chicken burger', 'Chicken farfalle pasta', 'Chicken skewers']) await expect(group).toContainText(dish);
    await expect(group).toContainText('Rs 600');
    await expect(group.getByTestId('menu-group-note')).toContainText('Desserts included: 2 scoops of ice cream');
    await expect(group.getByText('LACT', { exact: true }).first()).toBeVisible();
    await expect(group).toContainText('GL = GLUTEN');
  });
});
