import { expect, test, type Page } from '@playwright/test';
import { STAFF_STATE } from './auth-state';

/**
 * Front office: promo codes on the website, the cashier recording payments,
 * a top-up on the day, FOC / discounts, weather postponement, receipts, and
 * waivers only for the activities that need them. Needs the API.
 */

async function apiUp(page: Page): Promise<boolean> {
  try {
    return (await page.request.get('/api/health', { timeout: 4000 })).ok();
  } catch {
    return false;
  }
}
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const tag = () => Math.random().toString(36).slice(2, 7).toUpperCase();

test.describe('front office', () => {
  test.use({ storageState: STAFF_STATE });
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'one run is enough'); });

  test('a code created by staff is applied on the website and shows on the receipt', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    const code = 'E2E' + tag();
    const made = await page.request.post('/api/staff/coupons', { data: { code, kind: 'percent', value: 10, note: 'e2e partner' } });
    expect(made.ok(), await made.text()).toBeTruthy();

    // the website checks the code and the server applies it
    const check = await page.request.get('/api/coupons/' + code);
    expect(check.ok()).toBeTruthy();
    const booked = await page.request.post('/api/bookings', {
      data: { visitDate: tomorrow(), slot: 'morning', adults: 2, kids: 0, rate: 'nr', items: [{ id: 'quad', adults: 2 }], name: 'Coupon Guest', email: 'coupon@example.mu', payMode: 'gate', couponCode: code },
    });
    expect(booked.ok(), await booked.text()).toBeTruthy();
    const b = (await booked.json()) as { refCode: string; total: number; adjustment: number; couponCode: string; ticketUrl: string };
    expect(b.couponCode).toBe(code);
    expect(b.adjustment).toBeGreaterThan(0);

    // the guest's ticket shows the discount, and the receipt PDF exists
    const u = new URL(b.ticketUrl);
    await page.goto(u.pathname + u.search);
    await expect(page.getByTestId('ticket')).toContainText('Code ' + code);
    const receipt = await page.request.get(`/api/tickets/${b.refCode}/receipt.pdf?t=${u.searchParams.get('t')}`);
    expect(receipt.headers()['content-type']).toContain('application/pdf');

    // a wrong code is refused, and a switched-off code too
    expect((await page.request.get('/api/coupons/NOPE-' + tag())).status()).toBe(404);
    await page.request.patch('/api/staff/coupons/' + code, { data: { active: false } });
    expect((await page.request.get('/api/coupons/' + code)).status()).toBe(404);
  });

  test('the cashier records a payment, adds a top-up, applies an FOC pass, and postpones for weather', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    const booked = await page.request.post('/api/bookings', {
      data: { visitDate: tomorrow(), slot: 'afternoon', adults: 2, kids: 0, rate: 'rr', items: [{ id: 'zipline', adults: 2 }], name: 'Cashier Guest', email: 'cashier@example.mu', payMode: 'gate' },
    });
    const b = (await booked.json()) as { refCode: string; total: number };

    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder(/search/i).first().fill(b.refCode).catch(() => {});
    await expect(page.getByText(b.refCode).first()).toBeVisible({ timeout: 15000 });
    await page.getByText(b.refCode).first().click();
    const dialog = page.getByRole('dialog', { name: 'Booking ' + b.refCode });
    await expect(dialog.getByTestId('money-paid')).toContainText('Rs 0');

    // 1. the guest pays part of it at the desk
    await dialog.getByRole('button', { name: 'Record payment' }).click();
    await dialog.getByTestId('pay-amount').fill('1000');
    await dialog.getByRole('button', { name: 'Record', exact: true }).click();
    await expect(dialog.getByTestId('money-paid')).toContainText('Rs 1,000', { timeout: 10000 });
    await expect(dialog.getByText('Balance to collect')).toBeVisible();

    // 2. they want to add a quad on the day: Edit, add the line, save; the total goes up
    await dialog.getByRole('button', { name: 'Edit' }).click();
    const editor = dialog.getByTestId('line-editor');
    await editor.getByLabel('Experience').selectOption('quad');
    const optionSel = editor.getByLabel('Option');
    if (await optionSel.count()) await optionSel.selectOption({ index: 1 });
    await editor.getByRole('button', { name: 'Add' }).click();
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog.getByText(/quad/i).first()).toBeVisible({ timeout: 10000 });
    const detail1 = await (await page.request.get('/api/staff/bookings/' + b.refCode)).json() as { total: number; paidAmount: number };
    expect(detail1.total).toBeGreaterThan(b.total);
    expect(detail1.paidAmount).toBe(1000);

    // 3. an FOC pass: everything free, the balance drops to zero
    await dialog.getByRole('button', { name: 'Edit' }).click();
    await dialog.locator('#bk-adj').selectOption('foc');
    await dialog.getByTestId('adj-note').fill('FOC pass #7');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog.getByText('FOC pass · FOC pass #7')).toBeVisible({ timeout: 10000 });
    const detail2 = await (await page.request.get('/api/staff/bookings/' + b.refCode)).json() as { total: number; adjustmentAmount: number };
    expect(detail2.total).toBe(0);
    expect(detail2.adjustmentAmount).toBeGreaterThan(0);

    // 4. rain: the visit is postponed, nothing refunded, the ticket says so
    await dialog.getByRole('button', { name: 'Postpone (weather)' }).click();
    await dialog.getByTestId('postpone-reason').fill('Heavy rain, park closed 11:00');
    await dialog.getByRole('button', { name: 'Postpone', exact: true }).click();
    await expect(dialog.getByText(/^postponed$/i).first()).toBeVisible({ timeout: 10000 });
    const detail3 = await (await page.request.get('/api/staff/bookings/' + b.refCode)).json() as { status: string; postponedFrom: string | null; audit: { changes: Record<string, { to: unknown }> }[] };
    expect(detail3.status).toBe('postponed');
    expect(detail3.postponedFrom).toBe(tomorrow());
    expect(JSON.stringify(detail3.audit)).toContain('Heavy rain');

    // the staff receipt is a PDF
    const receipt = await page.request.get('/api/staff/bookings/' + b.refCode + '/receipt.pdf');
    expect(receipt.headers()['content-type']).toContain('application/pdf');
  });

  test('a booking without ziplines, quads, buggies or luge needs no waiver', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    const booked = await page.request.post('/api/bookings', {
      data: { visitDate: tomorrow(), slot: 'morning', adults: 2, kids: 1, rate: 'nr', items: [{ id: 'private', units: 1 }, { id: 'pirate', kids: 1 }], name: 'Walker Family', email: 'walk@example.mu', payMode: 'gate' },
    });
    expect(booked.ok(), await booked.text()).toBeTruthy();
    const b = (await booked.json()) as { refCode: string; ticketUrl: string };
    const u = new URL(b.ticketUrl);
    const ticket = await (await page.request.get(`/api/tickets/${b.refCode}?t=${u.searchParams.get('t')}`)).json() as { waiversRequired: number };
    expect(ticket.waiversRequired).toBe(0);
    await page.goto(u.pathname.replace('/ticket/', '/waiver/') + u.search);
    await expect(page.getByTestId('waiver-none')).toBeVisible();
    const gate = await (await page.request.get('/api/staff/gate/' + b.refCode)).json() as { required: number; missing: number };
    expect(gate.required).toBe(0);
    expect(gate.missing).toBe(0);
    // check-in is not blocked by waivers
    const arrived = await page.request.post('/api/staff/gate/' + b.refCode + '/check-in', { data: {} });
    expect(arrived.ok(), await arrived.text()).toBeTruthy();
  });
});

test.describe('online payment refunds', () => {
  test.use({ storageState: STAFF_STATE });

  test('the desk refunds part of an online payment through the provider, and the trail says so', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'one viewport is enough');
    test.skip(!(await apiUp(page)), 'API not running');
    const cfg = await (await page.request.get('/api/payments/config')).json() as { enabled: boolean; provider: string | null };
    test.skip(cfg.provider !== 'sandbox', 'needs the sandbox provider');

    // a guest books and pays online (the sandbox page reports "paid" like a webhook would)
    const booked = await page.request.post('/api/bookings', {
      data: { visitDate: tomorrow(), slot: 'afternoon', adults: 2, kids: 0, rate: 'rr', items: [{ id: 'zipline', adults: 2 }], name: 'Refund Guest', email: 'refund@example.mu', payMode: 'online' },
    });
    const b = (await booked.json()) as { refCode: string; total: number; checkoutUrl: string; paymentId: string };
    expect(b.checkoutUrl).toMatch(/\/api\/payments\/sandbox\//);
    const k = new URL(b.checkoutUrl).searchParams.get('k') || '';
    const paid = await page.request.post(`/api/payments/sandbox/${b.paymentId}/complete`, { form: { outcome: 'paid', k }, maxRedirects: 0 });
    expect(paid.status()).toBe(303);

    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder(/search/i).first().fill(b.refCode).catch(() => {});
    await expect(page.getByText(b.refCode).first()).toBeVisible({ timeout: 15000 });
    await page.getByText(b.refCode).first().click();
    const dialog = page.getByRole('dialog', { name: 'Booking ' + b.refCode });
    await expect(dialog.getByTestId('money-paid')).toContainText('online');
    await expect(dialog.getByText('Fully paid')).toBeVisible();

    await dialog.getByRole('button', { name: 'Refund online payment' }).click();
    await dialog.getByTestId('refund-amount').fill('500');
    await dialog.getByTestId('refund-reason').fill('rain day');
    await dialog.getByRole('button', { name: 'Refund', exact: true }).click();
    await expect(dialog.getByTestId('money-paid')).toContainText('Rs ' + (b.total - 500).toLocaleString('en-US'), { timeout: 10000 });
    await expect(dialog.getByText('Balance to collect')).toBeVisible();
    await expect(dialog.getByText(/rain day/)).toBeVisible();
  });
});

test.describe('calendar and capacity', () => {
  test.use({ storageState: STAFF_STATE });
  const far = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

  test('a manager closes a day and caps an activity; the website shows it and the API refuses what does not fit', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'one viewport is enough');
    test.skip(!(await apiUp(page)), 'API not running');
    const original = await (await page.request.get('/api/staff/ops/calendar')).json() as { slotCapacity: number; closures: unknown[]; activityCapacity: Record<string, unknown> };
    const closedDay = far(40), cappedDay = far(41);
    try {
      // 1. save a private-event closure and one buggy per morning
      // the local stack runs with a huge BOOKING_SLOT_CAPACITY; the setting itself is capped at 5000
      const slotCapacity = original.slotCapacity <= 5000 ? original.slotCapacity : undefined;
      const saved = await page.request.put('/api/staff/ops/calendar', { data: {
        slotCapacity,
        closures: [...original.closures, { from: closedDay, to: closedDay, slot: 'all', kind: 'private', reason: 'Wedding' }],
        activityCapacity: { ...original.activityCapacity, buggy: { morning: 1, afternoon: null } },
      } });
      expect(saved.status()).toBe(200);

      // 2. the back office lists it
      await page.goto('/staff');
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: 'Calendar' }).click();
      const panel = page.getByTestId('calendar-panel');
      await expect(panel.getByTestId('closure-list')).toContainText('Wedding', { timeout: 15000 });
      await expect(panel.getByTestId('cap-buggy-morning')).toHaveValue('1');

      // 3. the picker shows the closed day and the API refuses a booking on it
      const avail = await (await page.request.get(`/api/bookings/availability?from=${closedDay}&days=1`)).json() as { morning: { level: string; closure?: { reason: string } } }[];
      expect(avail[0].morning.level).toBe('closed');
      expect(avail[0].morning.closure?.reason).toBe('Wedding');
      const refused = await page.request.post('/api/bookings', { data: { visitDate: closedDay, slot: 'morning', adults: 2, kids: 0, rate: 'rr', items: [], name: 'Closed Day', email: 'closed@example.mu', payMode: 'gate' } });
      expect(refused.status()).toBe(409);
      expect(((await refused.json()) as { message: string }).message).toMatch(/reserved for a private event .*Wedding/);

      // 4. one buggy per morning: a hold takes it, a booking is refused by name, releasing the hold frees it
      const buggy = (slot: string) => ({ visitDate: cappedDay, slot, adults: 2, kids: 0, rate: 'rr', items: [{ id: 'buggy', units: 1 }], name: 'Buggy Guest', email: 'buggy@example.mu', payMode: 'gate' });
      const hold = await page.request.post('/api/bookings/hold', { data: { visitDate: cappedDay, slot: 'morning', adults: 2, kids: 0, items: [{ id: 'buggy', units: 1 }] } });
      expect(hold.status()).toBe(201);
      const { holdId } = (await hold.json()) as { holdId: string };
      const while_held = await page.request.post('/api/bookings', { data: buggy('morning') });
      expect(while_held.status()).toBe(409);
      expect(((await while_held.json()) as { message: string }).message).toMatch(/Buggy is fully booked for the morning/);
      const levels = await (await page.request.get(`/api/bookings/availability?from=${cappedDay}&days=1`)).json() as { activities?: Record<string, { morning: string; afternoon: string }> }[];
      expect(levels[0].activities?.buggy).toEqual({ morning: 'full', afternoon: 'quiet' });
      expect((await page.request.delete(`/api/bookings/hold/${holdId}`)).status()).toBe(204);
      const first = await page.request.post('/api/bookings', { data: buggy('morning') });
      expect(first.status()).toBe(201);
      const second = await page.request.post('/api/bookings', { data: buggy('morning') });
      expect(second.status()).toBe(409);
      const afternoon = await page.request.post('/api/bookings', { data: buggy('afternoon') });
      expect(afternoon.status()).toBe(201);
    } finally {
      await page.request.put('/api/staff/ops/calendar', { data: { slotCapacity: original.slotCapacity <= 5000 ? original.slotCapacity : undefined, closures: original.closures, activityCapacity: original.activityCapacity } });
    }
  });
});
