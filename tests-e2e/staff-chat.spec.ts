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

  test('robots.txt keeps crawlers out of the staff area, and the pages say noindex themselves', async ({ page }) => {
    // Disallow is a hint, not access control: the real protection is the login
    // plus the X-Robots-Tag header nginx adds (checked in seo.spec.ts).
    const r = await page.request.get('/robots.txt');
    expect(await r.text()).toMatch(/Disallow: \/staff/);
    const staff = await page.request.get('/staff', { maxRedirects: 0 });
    expect(staff.headers()['x-robots-tag'] || '').toMatch(/noindex/);
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

  test('a booking made on the website reaches the open dashboard live, without a reload', async ({ page, context }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    // the staff socket is opened by the chat console; give it a moment to join the staff room
    await page.waitForTimeout(1500);

    const tag = Math.random().toString(36).slice(2, 8);
    const visitor = await context.newPage();
    const res = await visitor.request.post('/api/bookings', {
      data: {
        visitDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        slot: 'afternoon', adults: 3, kids: 0, rate: 'nr',
        items: [{ id: 'zipline', variant: 'The Signature · 1.5 km, 1 line', adults: 3, kids: 0 }],
        name: `Live Guest ${tag}`, email: `live-${tag}@example.mu`, payMode: 'gate',
      },
    });
    expect(res.ok()).toBeTruthy();
    const ref = (await res.json()).refCode as string;

    // toast, banner and the row: none of them needs a reload
    await expect(page.getByTestId('booking-toast')).toContainText(ref, { timeout: 15000 });
    await expect(page.getByTestId('fresh-booking')).toContainText(`Live Guest ${tag}`);
    await expect(page.getByText(ref).first()).toBeVisible();
    await page.getByTestId('fresh-booking').getByRole('button', { name: 'Open' }).click();
    await expect(page.getByText(`Live Guest ${tag}`).first()).toBeVisible();
  });

  test('reports, reconciliation and forecast tabs show figures and export CSV', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /sales & reports/i }).click();
    const reports = page.getByTestId('reports-panel');
    await expect(reports.getByText('REVENUE', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(reports.getByText('WHERE GUESTS COME FROM')).toBeVisible();
    await expect(reports.getByText('WHAT SELLS')).toBeVisible();
    await reports.getByRole('button', { name: '90 days' }).click();
    await expect(reports.getByText(/VISITS \d{4}-\d{2}-\d{2} → \d{4}-\d{2}-\d{2}/)).toBeVisible();
    // the CSV links answer with a real spreadsheet
    const href = await reports.getByTestId('export-csv').first().getAttribute('href');
    const csv = await page.request.get(href!);
    expect(csv.status()).toBe(200);
    expect(csv.headers()['content-type']).toContain('text/csv');
    expect(csv.headers()['content-disposition']).toContain('.csv');
    expect(await csv.text()).toContain('Date,Bookings,Guests');

    await page.getByRole('button', { name: /reconciliation/i }).click();
    const rec = page.getByTestId('reconciliation-panel');
    await expect(rec.getByText('EXPECTED AT GATE')).toBeVisible({ timeout: 15000 });
    await expect(rec.getByText('COLLECTED AT GATE')).toBeVisible();
    await expect(rec.getByText(/BOOKINGS FOR \d{4}-\d{2}-\d{2}/)).toBeVisible();

    await page.getByRole('button', { name: /forecast/i }).click();
    const fc = page.getByTestId('forecast-panel');
    await expect(fc.getByText('GUESTS BOOKED', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await fc.getByRole('button', { name: '60 days' }).click();
    await expect(fc.locator('tbody tr')).toHaveCount(60, { timeout: 15000 });
  });

  test('bookings show when they came in to the second, and the drawer offers WhatsApp, call, e-mail and copy', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    const cell = page.getByTestId('booked-at').first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await expect(cell).toContainText(/\d{2}:\d{2}:\d{2}/);
    await page.locator('tbody tr').first().click();
    await expect(page.getByTestId('drawer-booked-at')).toContainText(/BOOKED .* · \d{2}:\d{2}:\d{2}/, { timeout: 15000 });
    const actions = page.getByTestId('contact-actions');
    await expect(actions.getByRole('button', { name: /copy confirmation/i })).toBeVisible();
    // at least one of the contact links, depending on what the guest left
    expect(await actions.getByRole('link').count()).toBeGreaterThanOrEqual(1);
    // the stat strip carries the new counters
    await expect(page.getByText('REVENUE TODAY')).toBeVisible();
    await expect(page.getByText('CHATS TO ANSWER')).toBeVisible();
  });

  test('quote requests from the packages page land in the Quotes tab with reply links', async ({ page }) => {
    const tag = Math.random().toString(36).slice(2, 8);
    const res = await page.request.post('/api/quotes', {
      data: { name: `Quote Guest ${tag}`, company: `Acme ${tag}`, email: `quote-${tag}@example.mu`, phone: '+230 5111 2222', groupSize: '25', preferredDate: '2026-11-12', message: 'Team day with ziplines and lunch.' },
    });
    // The quote form is rate-limited per IP; three viewport projects share one.
    test.skip(res.status() === 429, 'quote budget used by a parallel project');
    expect(res.ok()).toBeTruthy();
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /^quotes$/i }).click();
    const panel = page.getByTestId('quotes-panel');
    await expect(panel.getByText(`Quote Guest ${tag}`)).toBeVisible({ timeout: 15000 });
    const row = panel.locator('tr', { hasText: `Acme ${tag}` });
    await expect(row.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa\.me\/23051112222/);
    await expect(row.getByRole('link', { name: 'E-mail' })).toHaveAttribute('href', /^mailto:quote-/);
  });

  test('chat search finds a conversation by a word inside a message, and quick replies fill the box', async ({ page, context }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    const tag = Math.random().toString(36).slice(2, 8);
    const visitor = await context.newPage();
    await visitor.addInitScript(() => { localStorage.setItem('valle_rate', 'rr'); localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 })); });
    await visitor.goto('/');
    await visitor.getByRole('button', { name: /open chat/i }).click();
    const skip = visitor.getByRole('button', { name: /skip/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await visitor.getByLabel('Message').fill(`Do you have lockers? needle-${tag}`);
    await visitor.getByLabel('Message').press('Enter');
    await expect(visitor.getByText(`needle-${tag}`)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /^chat/i }).first().click();
    await page.getByLabel('Search conversations').fill(`needle-${tag}`);
    const list = page.locator('button', { hasText: `needle-${tag}` });
    await expect(list.first()).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Search conversations').fill('zzz-no-such-thing-zzz');
    await expect(page.getByText('No match')).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Search conversations').fill(`needle-${tag}`);
    await list.first().click();
    await expect(page.getByLabel('Reply')).toBeVisible();
    await page.getByRole('button', { name: /quick replies/i }).click();
    await page.getByTestId('quick-replies').getByRole('menuitem', { name: /opening hours/i }).click();
    await expect(page.getByLabel('Reply')).toHaveValue(/open every day from 09:00 to 17:30/);
    await visitor.close();
  });

  test('a booking gets a QR ticket: on the receipt, on the ticket page, and re-sendable from the desk', async ({ page, context }) => {
    // guest books on the website
    const guest = await context.newPage();
    await guest.addInitScript(() => { localStorage.setItem('valle_rate', 'rr'); localStorage.setItem('valle_sel', '{}'); localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 })); });
    await guest.goto('/booking');
    const tag = Math.random().toString(36).slice(2, 8);
    await guest.getByPlaceholder(/name/i).first().fill(`Ticket Guest ${tag}`);
    await guest.getByPlaceholder(/email/i).first().fill(`ticket-${tag}@example.mu`);
    await guest.getByRole('button', { name: /Confirm and pay on arrival/i }).click();
    await expect(guest.getByText(/BOOKING REFERENCE/i)).toBeVisible({ timeout: 15000 });
    const ref = (await guest.getByText(/VAL-\d{4}-26/).first().textContent())!.trim();
    // a real QR image, served by the API for this booking only
    const qr = guest.getByTestId('receipt-qr');
    await expect(qr).toBeVisible();
    await expect.poll(() => qr.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 15000 }).toBeGreaterThan(100);
    const ticketHref = await guest.getByRole('link', { name: /open my ticket/i }).getAttribute('href');
    expect(ticketHref).toMatch(new RegExp(`/ticket/${ref}\\?t=[A-Za-z0-9_-]{24}$`));
    await expect(guest.getByRole('link', { name: /send to my whatsapp/i })).toHaveAttribute('href', /wa\.me\/\?text=/);

    // the ticket page opens from the link and refuses a bad token
    await guest.goto(ticketHref!.replace(/^https?:\/\/[^/]+/, ''));
    await expect(guest.getByTestId('ticket')).toBeVisible({ timeout: 15000 });
    await expect(guest.getByText(`Ticket Guest ${tag}`)).toBeVisible();
    await expect.poll(() => guest.getByTestId('ticket-qr').evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 15000 }).toBeGreaterThan(100);
    await guest.goto(`/ticket/${ref}?t=AAAAAAAAAAAAAAAAAAAAAAAA`);
    await expect(guest.getByText(/not valid/i)).toBeVisible({ timeout: 15000 });
    const bad = await guest.request.get(`/api/tickets/${ref}/qr.png?t=AAAAAAAAAAAAAAAAAAAAAAAA`);
    expect(bad.status()).toBe(403);
    await guest.close();

    // the desk sees the ticket link and can re-send it
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder(/search ref/i).fill(ref);
    await page.getByText(ref).first().click({ timeout: 15000 });
    await expect(page.getByTestId('contact-actions').getByRole('link', { name: 'Ticket' })).toHaveAttribute('href', /\/ticket\//, { timeout: 15000 });
    await page.getByTestId('resend-ticket').click();
    // the local stack mails through the JSON test transport, so "sent" means rendered and handed over
    await expect(page.getByTestId('resend-ticket')).toContainText(/Sent by e-mail|Nothing sent/, { timeout: 15000 });
  });

  test('an operator takes a phone booking from the dashboard', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /new booking/i }).click();
    const drawer = page.getByTestId('new-booking');
    await expect(drawer).toBeVisible();
    const tag = Math.random().toString(36).slice(2, 8);
    await drawer.getByLabel('FULL NAME').fill(`Phone Guest ${tag}`);
    await drawer.getByLabel('PHONE').fill('+230 5000 0000');
    await drawer.getByLabel('NATIONALITY').selectOption('Mauritius');
    await drawer.getByLabel('Experience').selectOption('luge');
    await drawer.getByLabel('Option').selectOption({ index: 1 });
    await drawer.getByRole('button', { name: 'Add', exact: true }).click();
    const total = await drawer.getByTestId('new-booking-total').textContent();
    expect(total).toMatch(/Rs [\d,]+/);
    await drawer.getByRole('button', { name: /confirm booking/i }).click();
    // the detail drawer opens on the new reference, with the "taken by" note and audit entry
    await expect(page.getByText(`Phone Guest ${tag}`).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Taken by .* \(phone\)/).first()).toBeVisible({ timeout: 15000 });
  });

  test('photos, documents and voice notes travel both ways in chat', async ({ page, context }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });

    const visitor = await context.newPage();
    await visitor.addInitScript(() => { localStorage.setItem('valle_rate', 'rr'); localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 })); });
    await visitor.goto('/');
    await visitor.getByRole('button', { name: /open chat/i }).click();
    const skip = visitor.getByRole('button', { name: /skip/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();

    const tag = Math.random().toString(36).slice(2, 8);
    await visitor.getByLabel('Message').fill(`Photo ${tag} https://vallepark.com/menu`);
    // a 1x1 PNG straight from memory
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    await visitor.getByTestId('chat-file-input').setInputFiles({ name: `photo-${tag}.png`, mimeType: 'image/png', buffer: png });
    const shot = visitor.locator(`img[alt="photo-${tag}.png"]`);
    await expect(shot).toBeVisible({ timeout: 15000 });
    // the caption's link is clickable
    await expect(visitor.getByRole('link', { name: 'https://vallepark.com/menu' })).toBeVisible();

    // the operator sees the photo, served through the staff attachment route
    await page.getByRole('button', { name: /^chat/i }).first().click();
    await expect(page.getByText(`Photo ${tag}`).first()).toBeVisible({ timeout: 20000 });
    await page.getByText(`Photo ${tag}`).first().click();
    const staffShot = page.locator(`img[alt="photo-${tag}.png"]`);
    await expect(staffShot).toBeVisible({ timeout: 15000 });
    const src = await staffShot.getAttribute('src');
    expect(src).toContain('/api/staff/chat/attachments/');
    const bytes = await page.request.get(src!);
    expect(bytes.status()).toBe(200);
    expect(bytes.headers()['content-type']).toBe('image/png');

    // the operator answers with a PDF and a voice note; the visitor gets both
    await page.getByLabel('Reply').fill(`Menu ${tag}`);
    await page.getByTestId('chat-file-input').setInputFiles({ name: `menu-${tag}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%fake\n') });
    await expect(visitor.getByText(`menu-${tag}.pdf`)).toBeVisible({ timeout: 20000 });
    await page.getByTestId('chat-file-input').setInputFiles({ name: 'voice-note.webm', mimeType: 'audio/webm', buffer: Buffer.from('\x1aE\xdf\xa3fake-webm', 'binary') });
    await expect(visitor.locator('audio')).toHaveCount(1, { timeout: 20000 });

    // an executable is refused with a clear message
    await page.getByTestId('chat-file-input').setInputFiles({ name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
    await expect(page.getByRole('alert')).toContainText(/cannot be sent/i, { timeout: 15000 });
    await visitor.close();
  });

  test('chat console shows a visitor conversation and replies reach the visitor', async ({ page, context }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });

    // A visitor on the public site, in a second tab of the same context so it
    // inherits baseURL. The rate gate is a full-screen overlay that would sit on
    // top of the chat launcher, so pick a rate before the first paint.
    const visitor = await context.newPage();
    await visitor.addInitScript(() => { localStorage.setItem('valle_rate', 'rr'); localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 })); });
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
