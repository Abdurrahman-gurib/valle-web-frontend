import { expect, test } from '@playwright/test';
import { STAFF_STATE } from './auth-state';

/**
 * Backup check in the back office: managers see last night's database backup
 * and this month's test restore under "Sales & reports". The log itself is
 * written by the db-backup cron service, so the API answer is stubbed here.
 */
const run = (over: Record<string, unknown>) => ({
  id: '1', kind: 'backup', ok: true, startedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(), finishedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
  file: 'valle-20261005-220000.dump', bytes: 106_000, tables: 37, rows: 418, detail: 'PostgreSQL 18.6, 248 archive entries', ...over,
});

test.describe('backup check', () => {
  test.use({ storageState: STAFF_STATE });
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'one viewport is enough for a read-only panel'); });

  test('the API only answers a signed-in manager', async ({ playwright, baseURL, request }) => {
    const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    expect((await anonymous.get('/api/staff/ops/backups')).status()).toBe(401);
    await anonymous.dispose();

    const res = await request.get('/api/staff/ops/backups');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(['ok', 'warning', 'failing', 'unknown']).toContain(body.state);
    expect(Array.isArray(body.recent)).toBe(true);
  });

  test('shows a green state with the last backup and the last restore test', async ({ page }) => {
    const backup = run({});
    const restore = run({ id: '2', kind: 'restore_test', detail: 'Restored into a scratch PostgreSQL in 2s; every table and row count matches the backup.' });
    await page.route('**/api/staff/ops/backups', (route) => route.fulfill({
      json: { state: 'ok', problems: [], lastBackup: backup, lastGoodBackup: backup, lastRestoreTest: restore, lastGoodRestoreTest: restore, recent: [backup, restore] },
    }));
    await page.goto('/staff');
    await page.getByRole('button', { name: 'Sales & reports' }).click();
    const panel = page.getByTestId('backups-panel');
    await expect(panel.getByTestId('backup-state')).toHaveText('ALL GOOD');
    await expect(panel).toContainText('LAST GOOD BACKUP');
    await expect(panel).toContainText('5 h ago');
    await expect(panel).toContainText('37 tables verified');
    await expect(panel.getByRole('row', { name: /Restore test/ })).toContainText('Passed');
    await expect(panel.getByTestId('backup-problems')).toHaveCount(0);
  });

  test('turns red and says why when the restore test failed', async ({ page }) => {
    const backup = run({});
    const bad = run({ id: '3', kind: 'restore_test', ok: false, bytes: 0, tables: 0, rows: 0, detail: 'checksum mismatch on valle-20261005-220000.dump' });
    await page.route('**/api/staff/ops/backups', (route) => route.fulfill({
      json: {
        state: 'failing', problems: ['The latest restore test failed: checksum mismatch on valle-20261005-220000.dump', 'No restore test has passed yet.'],
        lastBackup: backup, lastGoodBackup: backup, lastRestoreTest: bad, lastGoodRestoreTest: null, recent: [bad, backup],
      },
    }));
    await page.goto('/staff');
    await page.getByRole('button', { name: 'Sales & reports' }).click();
    const panel = page.getByTestId('backups-panel');
    await expect(panel.getByTestId('backup-state')).toHaveText('FAILING');
    await expect(panel.getByTestId('backup-problems')).toContainText('checksum mismatch');
    await expect(panel.getByRole('row', { name: /Restore test/ })).toContainText('Failed');
  });
});
