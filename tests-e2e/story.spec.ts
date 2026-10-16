import { expect, test, type Page } from '@playwright/test';

/** /story: the chaptered history page with the 1998 archive, the then-and-now slider and the home teaser link. */
function preset(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem('valle_rate', 'rr');
    localStorage.setItem('valle_sel', '{}');
    localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 }));
    localStorage.setItem('valle_lang_dismissed', '1');
  });
}

test.describe('our story', () => {
  test.beforeEach(async ({ page }) => { await preset(page); });

  test('tells the story in seven chapters with the archive prints and no broken images', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/story');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('From a tea field');
    for (const id of ['land', 'colours', 'trails', 'gates', 'air', 'guardians', 'today']) await expect(page.locator('#' + id)).toHaveCount(1);
    // every chapter nav link scrolls to its chapter
    await page.getByRole('navigation', { name: 'Chapters' }).getByRole('link', { name: /OPENING|GATES OPEN/ }).click();
    await expect(page.locator('#gates')).toBeInViewport();
    // archive prints carry the year tag and the captions
    expect(await page.locator('figure').count()).toBeGreaterThan(20);
    await expect(page.locator('figure').filter({ hasText: 'FAMILY ARCHIVE' }).first()).toBeVisible();
    // founder, the seven differences and the numbers
    await expect(page.getByText('ASIFF POLIN')).toBeVisible();
    await expect(page.getByText('you will not find anywhere else.')).toBeVisible();
    await expect(page.getByText('THE GATES OPEN', { exact: true })).toBeVisible();
    // bring every image into view and make sure none failed
    const broken = await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      for (const img of imgs) { img.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 40)); }
      await new Promise((r) => setTimeout(r, 1500));
      return imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src'));
    });
    expect(broken).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the then-and-now slider moves with the keyboard and the pointer', async ({ page }) => {
    await page.goto('/story#colours');
    const slider = page.getByRole('slider', { name: 'Compare 1998 with today' });
    await slider.scrollIntoViewIfNeeded();
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(before);
    const box = (await slider.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 200, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeLessThan(before);
  });

  test('the home teaser links to the full story and the header entry opens it', async ({ page }, info) => {
    await page.goto('/');
    await page.getByRole('link', { name: /READ THE FULL STORY/ }).click();
    await expect(page).toHaveURL(/\/story$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('to the sky');
    if (info.project.name === 'desktop') {
      await page.goto('/fr');
      await page.getByRole('navigation').getByRole('link', { name: /histoire/i }).first().click();
      await expect(page).toHaveURL(/\/fr\/story$/);
      await expect(page.getByRole('heading', { level: 1 })).toContainText("D'un champ de thé");
    }
  });
});
