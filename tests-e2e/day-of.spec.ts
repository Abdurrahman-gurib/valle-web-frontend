import { expect, test, type Page } from '@playwright/test';
import { STAFF_STATE } from './auth-state';

/**
 * The visit day on the ticket (now / next, meeting points, live waits, the
 * map), waiver history when a participant signs again, and visit photos
 * uploaded by the desk and downloaded from the ticket.
 */

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const far = () => { const d = new Date(); d.setDate(d.getDate() + 30 + Math.floor(Math.random() * 200)); return d.toISOString().slice(0, 10); };

async function book(page: Page, items: { id: string; adults?: number; units?: number; time?: string }[], extra: Record<string, unknown> = {}) {
  const res = await page.request.post('/api/bookings', { data: { visitDate: far(), slot: 'morning', adults: 2, kids: 0, rate: 'rr', items, name: 'Day Guest', email: 'day@example.mu', payMode: 'gate', ...extra } });
  expect(res.ok(), await res.text()).toBeTruthy();
  const b = await res.json() as { refCode: string; ticketUrl: string };
  const u = new URL(b.ticketUrl);
  return { ref: b.refCode, path: u.pathname + u.search, token: u.searchParams.get('t') as string };
}

test.describe('the visit day, waiver history and photos', () => {
  test.use({ storageState: STAFF_STATE });

  test('the desk sets a wait and a meeting point; the ticket shows the day card with them and the map', async ({ page }) => {
    const live = await (await page.request.get('/api/park-live')).json() as { activities: Record<string, { meetingPoint: string; waitMin: number | null }> };
    expect(live.activities.zipline.meetingPoint).toContain('Briefing');
    const put = await page.request.put('/api/staff/ops/park-status/live', { data: { activities: { zipline: { waitMin: 25, note: 'Briefing every 20 minutes' } } } });
    expect(put.ok(), await put.text()).toBeTruthy();
    try {
      const pub = await (await page.request.get('/api/park-live')).json() as typeof live;
      expect(pub.activities.zipline.waitMin).toBe(25);
      expect(pub.activities.zipline.meetingPoint).toContain('Briefing'); // untouched fields survive

      const b = await book(page, [{ id: 'zipline', adults: 2 }, { id: 'quad', units: 1 }]);
      await page.goto(b.path);
      const day = page.getByTestId('ticket-day');
      await expect(day).toBeVisible();
      await expect(day).toContainText(/YOUR DAY/);
      await expect(day).toContainText('Meet at: Park Entrance & Briefing');
      await expect(day).toContainText('Briefing every 20 minutes');
      await expect(day.getByTestId('day-step-any time')).toHaveCount(2);
      await expect(page.getByTestId('ticket-map')).toBeVisible();
      await expect(page.getByTestId('locate-me')).toBeVisible();
    } finally {
      await page.request.put('/api/staff/ops/park-status/live', { data: { activities: { zipline: { waitMin: null, note: '' } } } });
    }
  });

  test('signing again keeps the earlier version; only current signatures count', async ({ page }) => {
    const b = await book(page, [{ id: 'zipline', adults: 2 }]);
    const sign = (name: string, weight: number) => page.request.post(`/api/tickets/${b.ref}/waivers?t=${b.token}`, { data: {
      participantName: name, birthDate: '1990-04-12', heightCm: 170, weightKg: weight, emergencyName: 'Omar', emergencyPhone: '+230 5292 8841', phone: '+230 5292 8841', nationality: 'Mauritius',
      declarations: { terms: true, health: true, consent: true }, signature: 'data:image/png;base64,' + 'A'.repeat(300), lang: 'en',
    } });
    expect((await sign('Day Guest', 70)).ok()).toBeTruthy();
    expect((await sign('Day Guest', 72)).ok()).toBeTruthy();
    const view = await (await page.request.get(`/api/tickets/${b.ref}?t=${b.token}`)).json() as { waiversSigned: number; waiversRequired: number };
    expect(view).toMatchObject({ waiversSigned: 1, waiversRequired: 2 });
    const gate = await (await page.request.get('/api/staff/gate/' + b.ref)).json() as { signedCount: number; waivers: { participantName: string; version: number; weightKg: number }[]; history: { version: number; participantName: string }[] };
    expect(gate.signedCount).toBe(1);
    expect(gate.waivers[0]).toMatchObject({ participantName: 'Day Guest', version: 2, weightKg: 72 });
    expect(gate.history).toHaveLength(1);
    expect(gate.history[0]).toMatchObject({ version: 1, participantName: 'Day Guest' });
  });

  test('the desk uploads photos, tells the guest, and the guest downloads them from the ticket', async ({ page }) => {
    const b = await book(page, [{ id: 'zipline', adults: 2 }, { id: 'product:photo:rr:0', adults: 2, kids: 0 }]);
    const up = await page.request.post(`/api/staff/bookings/${b.ref}/photos`, { multipart: { file: { name: 'zip-01.png', mimeType: 'image/png', buffer: PNG }, caption: 'Signature line' } });
    expect(up.ok(), await up.text()).toBeTruthy();
    const set = await up.json() as { count: number; packageLabel: string | null; photos: { id: string; url: string }[] };
    expect(set.count).toBe(1);
    expect(set.packageLabel).toMatch(/Bronze/);
    // a text file is refused, an unknown booking too
    expect((await page.request.post(`/api/staff/bookings/${b.ref}/photos`, { multipart: { file: { name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('no') } } })).status()).toBe(400);
    expect((await page.request.post(`/api/staff/bookings/VAL-0000-00/photos`, { multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: PNG } } })).status()).toBe(404);
    const ready = await page.request.post(`/api/staff/bookings/${b.ref}/photos/ready`);
    expect(ready.ok()).toBeTruthy();

    // guest side: list with the token, the file itself, and a wrong token refused
    const guest = await (await page.request.get(`/api/tickets/${b.ref}/photos?t=${b.token}`)).json() as { count: number; photosReadyAt: string | null; photos: { url: string; caption: string }[] };
    expect(guest.count).toBe(1);
    expect(guest.photosReadyAt).toBeTruthy();
    expect(guest.photos[0].caption).toBe('Signature line');
    const file = await page.request.get(guest.photos[0].url + '&download=1');
    expect(file.ok()).toBeTruthy();
    expect(file.headers()['content-type']).toBe('image/png');
    expect(file.headers()['content-disposition']).toContain('attachment');
    expect((await file.body()).length).toBe(PNG.length);
    expect((await page.request.get(guest.photos[0].url.replace(/t=[^&]+/, 't=AAAAAAAAAAAAAAAAAAAAAAAA'))).status()).toBe(403);

    await page.goto(b.path);
    const photos = page.getByTestId('ticket-photos');
    await expect(photos).toContainText('1 photos from your visit');
    await expect(photos.getByTestId('ticket-photo')).toHaveCount(1);
    await photos.getByTestId('ticket-photo').click();
    await expect(photos.getByRole('link', { name: 'Download' })).toBeVisible();

    // staff drawer shows the section
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder(/search/i).first().fill(b.ref).catch(() => undefined);
    await expect(page.getByText(b.ref).first()).toBeVisible({ timeout: 15000 });
    await page.getByText(b.ref).first().click();
    await expect(page.getByTestId('photos-section')).toContainText('1 photo');
  });

  test('a booking without a photo package can add one from the ticket, priced for the party', async ({ page }) => {
    const b = await book(page, [{ id: 'zipline', adults: 2 }]);
    await page.goto(b.path);
    const photos = page.getByTestId('ticket-photos');
    await expect(photos).toContainText('Book the park photographer');
    await photos.getByTestId('add-photo-photo:rr:1').click();
    await expect(photos).toContainText('Your photo package is booked');
    const tk = await (await page.request.get(`/api/tickets/${b.ref}?t=${b.token}`)).json() as { lines: { productKey: string | null; amount: number }[] };
    const line = tk.lines.find((l) => l.productKey === 'photo:rr:1');
    expect(line?.amount).toBe(1250); // Silver, two people at the pair price
  });
});
