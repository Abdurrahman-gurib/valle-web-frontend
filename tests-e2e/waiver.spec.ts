import { expect, test, type Page } from '@playwright/test';
import { STAFF_STATE } from './auth-state';

/**
 * Digital waivers: the guest signs one per participant on their phone from the
 * ticket link, and the gate sees who has signed before checking the party in.
 * Needs the API; skips itself otherwise.
 */

async function apiUp(page: Page): Promise<boolean> {
  try {
    return (await page.request.get('/api/health', { timeout: 4000 })).ok();
  } catch {
    return false;
  }
}

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

async function book(page: Page, adults: number, kids: number, name: string) {
  const res = await page.request.post('/api/bookings', {
    data: { visitDate: tomorrow(), slot: 'morning', adults, kids, rate: 'nr', items: [{ id: 'zipline', adults, kids }], name, email: 'waiver@example.mu', payMode: 'gate' },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { refCode: string; ticketUrl: string };
  const u = new URL(body.ticketUrl);
  return { ref: body.refCode, token: u.searchParams.get('t') || '', waiverPath: u.pathname.replace('/ticket/', '/waiver/') + u.search, ticketPath: u.pathname + u.search };
}

async function sign(page: Page) {
  const pad = page.getByTestId('signature-pad');
  // centre it: the fixed header would otherwise sit over the top of the pad
  await pad.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 110);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + 30 + i * 18, box.y + 110 - (i % 2) * 40);
  await page.mouse.up();
}

async function fillParticipant(page: Page, p: { name: string; birth: string; height: string; weight: string; guardian?: string }) {
  await page.getByTestId('w-name').fill(p.name);
  await page.getByTestId('w-birth').fill(p.birth);
  await page.getByTestId('w-height').fill(p.height);
  await page.getByTestId('w-weight').fill(p.weight);
  if (p.guardian) await page.getByTestId('w-guardian').fill(p.guardian);
  const em = page.getByTestId('w-em-name');
  if (!(await em.inputValue())) {
    await page.getByTestId('w-address').fill('Lux Le Morne');
    await page.getByTestId('w-email').fill('waiver-copy@example.mu');
    await page.getByTestId('w-phone').fill('+971 50 111 2222');
    await page.getByTestId('w-nationality').fill('UAE');
    await em.fill('Omar Rahman');
    await page.getByTestId('w-em-phone').fill('+971 50 123 4567');
  }
  for (const k of ['terms', 'health', 'consent']) await page.getByTestId('w-decl-' + k).check();
  await sign(page);
}

test.describe('digital waiver (guest)', () => {
  test('each participant signs on the phone, a child is signed by a guardian and warned about limits', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    await page.addInitScript(() => {
      localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 }));
      localStorage.setItem('valle_lang_dismissed', '1');
    });
    const b = await book(page, 1, 1, 'Waiver Family');

    // the ticket invites the party to sign
    await page.goto(b.ticketPath);
    await expect(page.getByTestId('ticket-waivers')).toContainText('0 of 2 signed');

    await page.goto(b.waiverPath);
    await expect(page.getByTestId('waiver-progress')).toContainText('0 of 2 signed');
    await expect(page.getByTestId('waiver-terms')).toContainText('Mare Anguilles Farms Ltd');
    await expect(page.getByTestId('waiver-terms')).toContainText('strictly forbidden to swim in the park');

    // nothing filled in: the form says what is missing instead of sending
    await page.getByTestId('w-submit').click();
    await expect(page.getByRole('alert')).toContainText('a signature');

    await fillParticipant(page, { name: 'Aisha Rahman', birth: '1990-04-12', height: '165', weight: '60' });
    await page.getByTestId('w-submit').click();
    await expect(page.getByRole('status')).toContainText('Aisha Rahman');
    // the guest's PDF copy is one click away and really is a PDF
    const pdfHref = await page.getByTestId('waiver-pdf').first().getAttribute('href');
    const pdf = await page.request.get(pdfHref!);
    expect(pdf.ok()).toBeTruthy();
    expect(pdf.headers()['content-type']).toContain('application/pdf');
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
    await expect(page.getByTestId('waiver-progress')).toContainText('1 of 2 signed');

    // a six-year-old: guardian field appears and the zipline age limit is shown
    const year = Number(tomorrow().slice(0, 4)) - 6;
    await page.getByTestId('w-birth').fill(`${year}-01-15`);
    await expect(page.getByTestId('w-guardian')).toBeVisible();
    await expect(page.getByTestId('w-warnings')).toContainText('minimum age 8');
    await fillParticipant(page, { name: 'Sami Rahman', birth: `${year}-01-15`, height: '118', weight: '21', guardian: 'Aisha Rahman' });
    await page.getByTestId('w-submit').click();
    await expect(page.getByText('Everyone is signed. See you at the gate!')).toBeVisible();
    await expect(page.getByTestId('waiver-progress')).toContainText('UNDER 18 · SIGNED BY GUARDIAN');

    await page.goto(b.ticketPath);
    await expect(page.getByTestId('ticket-waivers')).toContainText('2 of 2 signed');
  });

  test('a wrong link is refused', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    await page.goto('/waiver/VAL-0000-26?t=AAAAAAAAAAAAAAAAAAAAAAAA');
    await expect(page.getByText('This waiver link is not valid')).toBeVisible();
  });
});

test.describe('gate check-in', () => {
  test.use({ storageState: STAFF_STATE });
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'one gate run is enough'); });

  test('the gate shows who signed, refuses a short party, and records an override', async ({ page }) => {
    test.skip(!(await apiUp(page)), 'API not running');
    const b = await book(page, 2, 0, 'Gate Test');
    const signed = await page.request.post(`/api/tickets/${b.ref}/waivers?t=${b.token}`, {
      data: {
        participantName: 'Lead Guest', birthDate: '1985-06-01', heightCm: 180, weightKg: 82,
        phone: '+32 477 59 26 59', nationality: 'Belgium', emergencyName: 'Friend', emergencyPhone: '+230 5123 4567',
        declarations: { terms: true, health: true, consent: true },
        signature: 'data:image/png;base64,' + 'iVBORw0KGgo'.padEnd(400, 'A'),
      },
    });
    expect(signed.ok(), await signed.text()).toBeTruthy();

    await page.goto('/staff');
    await page.getByRole('button', { name: 'Gate & waivers' }).click();
    await page.getByTestId('gate-ref').fill(b.ref);
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.getByTestId('gate-waiver-count')).toHaveText('WAIVERS 1/2');
    await expect(page.getByTestId('gate-waiver')).toContainText('Lead Guest');

    // the API refuses a plain check-in while someone has not signed
    const refused = await page.request.post(`/api/staff/gate/${b.ref}/check-in`, { data: {} });
    expect(refused.status()).toBe(409);

    await page.getByRole('button', { name: 'Check in anyway…' }).click();
    await page.getByTestId('gate-reason').fill('second guest signed on paper');
    await page.getByRole('button', { name: 'Confirm check-in' }).click();
    await expect(page.getByText('✓ CHECKED IN')).toBeVisible();

    const detail = await (await page.request.get(`/api/staff/bookings/${b.ref}`)).json() as { status: string; audit: { changes: Record<string, { to: unknown }> }[] };
    expect(detail.status).toBe('arrived');
    expect(JSON.stringify(detail.audit)).toContain('second guest signed on paper');
  });
});
