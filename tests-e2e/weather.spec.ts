import { expect, test } from '@playwright/test';
import { STAFF_STATE } from './auth-state';

/**
 * Live weather on the home-page map and the park status the desk sets:
 * the site banner, the week-ahead badge, the activity page and the ticket
 * all read the same status. The weather itself comes from Open-Meteo through
 * the API, so the shape is checked, not the numbers.
 */

test.describe('weather and park status', () => {
  test.use({ storageState: STAFF_STATE });

  test('GET /api/weather returns now, the next hours and the week for the park', async ({ page }) => {
    const res = await page.request.get('/api/weather');
    expect(res.ok()).toBeTruthy();
    const w = await res.json() as { place: string; now: { tempC: number; condition: string; windKmh: number; isDay: boolean }; hours: unknown[]; days: { date: string; maxC: number; minC: number; rainPct: number; sunrise: string }[] };
    expect(w.place).toContain('Chamouny');
    expect(typeof w.now.tempC).toBe('number');
    expect(w.now.condition).toMatch(/^[a-z-]+$/);
    expect(w.hours.length).toBeGreaterThanOrEqual(6);
    expect(w.days.length).toBeGreaterThanOrEqual(5);
    expect(w.days[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(w.days[0].sunrise).toMatch(/^\d{2}:\d{2}$/);
  });

  test('the home map shows live weather and the park status; a partial status reaches the banner, the activity page and the status API', async ({ page }) => {
    // a clean, open park to start
    const reset = () => page.request.put('/api/staff/ops/park-status', { data: { state: 'open', message: '', pausedActivities: [] } });
    expect((await reset()).ok()).toBeTruthy();
    try {
      await page.goto('/');
      const card = page.getByTestId('weather-card');
      await card.scrollIntoViewIfNeeded();
      await expect(page.getByTestId('weather-temp')).toContainText('°C', { timeout: 20_000 });
      await expect(page.getByTestId('weather-days').locator('> div')).toHaveCount(7);
      await expect(page.getByTestId('park-state')).toHaveAttribute('data-state', 'open');
      await expect(page.getByTestId('park-status-banner')).toHaveCount(0);

      // the desk pauses the zipline for wind
      const put = await page.request.put('/api/staff/ops/park-status', { data: { state: 'open', message: 'Ziplines paused until the wind drops.', pausedActivities: ['zipline'] } });
      expect(put.ok()).toBeTruthy();
      const saved = await put.json() as { state: string; pausedActivities: string[]; pausedNames: string[] };
      expect(saved.state).toBe('partial'); // a paused activity makes the park partly open
      expect(saved.pausedActivities).toEqual(['zipline']);
      expect(saved.pausedNames[0]).toMatch(/zipline/i);

      const pub = await (await page.request.get('/api/park-status')).json() as { state: string; message: string; pausedNames: string[] };
      expect(pub.state).toBe('partial');
      expect(pub.message).toBe('Ziplines paused until the wind drops.');

      await page.goto('/');
      const banner = page.getByTestId('park-status-banner');
      await expect(banner).toHaveAttribute('data-state', 'partial');
      await expect(banner).toContainText('Ziplines paused until the wind drops.');
      await expect(banner).toContainText(/paused right now/i);

      await page.goto('/activities/zipline');
      await expect(page.getByTestId('activity-paused')).toBeVisible();
      await page.goto('/activities/quad');
      await expect(page.getByTestId('activity-paused')).toHaveCount(0);

      // unknown ids are dropped, closed clears the paused list
      const closed = await (await page.request.put('/api/staff/ops/park-status', { data: { state: 'closed', message: 'Cyclone warning class 2.', pausedActivities: ['zipline', 'nope'] } })).json() as { state: string; pausedActivities: string[] };
      expect(closed.state).toBe('closed');
      expect(closed.pausedActivities).toEqual([]);
      await page.goto('/');
      await expect(page.getByTestId('park-status-banner')).toHaveAttribute('data-state', 'closed');
    } finally {
      expect((await reset()).ok()).toBeTruthy();
    }
  });

  test('the staff Gate tab publishes the status from the panel', async ({ page }) => {
    const reset = () => page.request.put('/api/staff/ops/park-status', { data: { state: 'open', message: '', pausedActivities: [] } });
    await reset();
    try {
      await page.goto('/staff');
      await page.getByRole('button', { name: /gate/i }).first().click();
      const panel = page.getByTestId('park-status-panel');
      await expect(panel).toBeVisible();
      await panel.getByTestId('pause-zipline').check();
      await panel.getByTestId('park-message').fill('Back around 14:00.');
      await panel.getByRole('button', { name: 'Publish status' }).click();
      await expect(panel.getByTestId('park-status-saved')).toContainText(/partly open/);
      const pub = await (await page.request.get('/api/park-status')).json() as { state: string; message: string };
      expect(pub).toMatchObject({ state: 'partial', message: 'Back around 14:00.' });
      await panel.getByRole('button', { name: 'Back to open, clear notice' }).click();
      await expect(panel.getByTestId('park-status-saved')).toContainText(/"open"/);
    } finally {
      await reset();
    }
  });
});
