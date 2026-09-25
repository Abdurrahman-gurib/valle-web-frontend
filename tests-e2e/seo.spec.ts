import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Technical SEO: what a crawler gets WITHOUT running JavaScript, plus the
 * status codes nginx answers. Runs against the preview server (which mirrors
 * the nginx rules, see scripts/preview-routes.ts); set SEO_BASE_URL to point
 * it at a deployed site instead, e.g.
 *   SEO_BASE_URL=https://web-production-ff60b.up.railway.app npx playwright test seo
 */
const BASE = process.env.SEO_BASE_URL || '';
if (BASE) test.use({ baseURL: BASE });

const PUBLIC_PAGES = ['/', '/explore', '/packages', '/booking', '/vacancies', '/activities/zipline', '/activities/quad', '/dine/chamouze', '/dine/citronelle'];

async function fetchHtml(request: APIRequestContext, path: string) {
  const res = await request.get(path, { maxRedirects: 0 });
  return { res, html: await res.text() };
}
const tag = (html: string, re: RegExp) => html.match(re)?.[1] ?? null;
const jsonLd = (html: string): Record<string, unknown>[] =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1].replace(/\\u003c/g, '<')));
const types = (html: string) => jsonLd(html).flatMap((o) => (Array.isArray(o['@type']) ? o['@type'] : [o['@type']])) as string[];

test.describe('prerendered head', () => {
  test('every public page has a unique title, a description, one H1 and Open Graph tags', async ({ request }) => {
    const titles = new Set<string>();
    for (const path of PUBLIC_PAGES) {
      const { res, html } = await fetchHtml(request, path);
      expect(res.status(), path).toBe(200);
      const title = tag(html, /<title>([^<]+)<\/title>/);
      expect(title, `${path} title`).toBeTruthy();
      expect(titles.has(title!), `${path} title must be unique: ${title}`).toBe(false);
      titles.add(title!);
      expect(tag(html, /<meta name="description" content="([^"]+)"/), `${path} description`).toBeTruthy();
      expect(html.match(/<h1[\s>]/g)?.length, `${path} must have exactly one H1`).toBe(1);
      expect(html, `${path} og:title`).toMatch(/<meta property="og:title"/);
      expect(html, `${path} og:description`).toMatch(/<meta property="og:description"/);
      expect(html, `${path} robots`).toMatch(/<meta name="robots" content="index, follow/);
    }
  });

  test('canonical, og:url and hreflang name the same absolute URL', async ({ request }) => {
    const { html } = await fetchHtml(request, '/activities/zipline');
    const canonical = tag(html, /<link rel="canonical" href="([^"]+)"/);
    test.skip(!canonical, 'build has no VITE_SITE_URL, URL tags are filled in by the browser');
    expect(canonical).toMatch(/^https?:\/\/[^/]+\/activities\/zipline$/);
    expect(tag(html, /<meta property="og:url" content="([^"]+)"/)).toBe(canonical);
    expect(tag(html, /hreflang="en" href="([^"]+)"/)).toBe(canonical);
    expect(tag(html, /hreflang="x-default" href="([^"]+)"/)).toBe(canonical);
  });

  test('structured data: Organization on every page, TouristAttraction + breadcrumbs on activities, Restaurant on dining', async ({ request }) => {
    const home = (await fetchHtml(request, '/')).html;
    expect(types(home)).toEqual(expect.arrayContaining(['Organization', 'WebSite']));
    const act = (await fetchHtml(request, '/activities/zipline')).html;
    expect(types(act)).toEqual(expect.arrayContaining(['TouristAttraction', 'BreadcrumbList']));
    const crumbs = jsonLd(act).find((o) => o['@type'] === 'BreadcrumbList') as { itemListElement: { name: string }[] };
    expect(crumbs.itemListElement.map((c) => c.name)).toEqual(['Home', 'Explore', 'Adventure', 'Zipline Adventures']);
    const dine = (await fetchHtml(request, '/dine/chamouze')).html;
    expect(types(dine)).toContain('Restaurant');
  });

  test('home page links to activities, dining, explore, packages and booking with real hrefs', async ({ request }) => {
    const { html } = await fetchHtml(request, '/');
    const hrefs = new Set([...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]));
    const activities = [...hrefs].filter((h) => h.startsWith('/activities/'));
    expect(activities.length, 'crawlable activity links').toBeGreaterThanOrEqual(8);
    for (const h of ['/explore', '/packages', '/booking', '/dine/chamouze', '/dine/citronelle', '/vacancies']) expect(hrefs, h).toContain(h);
  });

  test('every image in the prerendered markup has alt text', async ({ request }) => {
    for (const path of ['/', '/explore', '/activities/quad']) {
      const { html } = await fetchHtml(request, path);
      const imgs = html.match(/<img\b[^>]*>/g) ?? [];
      expect(imgs.length, `${path} has images`).toBeGreaterThan(0);
      for (const img of imgs) expect(img, `${path}: ${img.slice(0, 80)}`).toMatch(/\balt="/);
    }
  });
});

test.describe('status codes and redirects', () => {
  test('missing pages are real 404s, marked noindex, with the not-found page as body', async ({ request }) => {
    for (const path of ['/this-does-not-exist', '/activities/nope', '/dine/nope']) {
      const { res, html } = await fetchHtml(request, path);
      expect(res.status(), path).toBe(404);
      expect(res.headers()['x-robots-tag'], path).toMatch(/noindex/);
      expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
      expect(html).toMatch(/<title>Page not found/);
    }
  });

  test('old URLs answer 301 to the new page, or 410 when there is none', async ({ request }) => {
    const cases: [string, string][] = [
      ['/experience/quad', '/activities/quad'],
      ['/adventure-activities/quad-bike', '/activities/quad'],
      ['/explore/', '/explore'],
      ['/explore/?cat=kids', '/explore?cat=kids'],
      ['/index.html', '/'],
    ];
    for (const [from, to] of cases) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(301);
      expect(res.headers()['location'], from).toMatch(new RegExp(`(^|/)${to.replace(/[?.]/g, '\\$&')}$`));
    }
    for (const gone of ['/cart', '/wp-admin/x']) expect((await request.get(gone, { maxRedirects: 0 })).status(), gone).toBe(410);
  });

  test('back office is served but never indexed', async ({ request }) => {
    const res = await request.get('/staff', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()['x-robots-tag']).toMatch(/noindex/);
  });

  test('sitemap lists the public pages and robots.txt points at it', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    test.skip(!robots.ok() || !(await robots.text()).includes('Sitemap:'), 'API not reachable: robots.txt falls back to the static file');
    expect(await robots.text()).toMatch(/Disallow: \/staff/);
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toMatch(/xml/);
    const xml = await sitemap.text();
    expect(xml).toMatch(/<urlset/);
    for (const p of ['/explore', '/packages', '/activities/zipline', '/dine/chamouze']) expect(xml, p).toMatch(new RegExp(`<loc>https?://[^<]+${p}</loc>`));
    expect(xml).not.toMatch(/\/staff|\/hr\b|\/api\//);
    expect(xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)?.length).toBeGreaterThan(20);
  });
});

test.describe('in the browser', () => {
  test('card links are real anchors that still navigate client-side', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('valle_rate', 'rr'); localStorage.setItem('valle_sel', '{}'); });
    await page.goto('/');
    const link = page.locator('a[href="/activities/zipline"]').first();
    await expect(link).toHaveAttribute('href', '/activities/zipline');
    await link.click();
    await expect(page).toHaveURL(/\/activities\/zipline$/);
    await expect(page.getByRole('heading', { name: /Zipline Adventures/i }).first()).toBeVisible();
    await expect(page).toHaveTitle(/Zipline Adventures/);
  });

  test('the not-found page keeps its noindex tag after hydration', async ({ page }) => {
    await page.goto('/nowhere');
    await expect(page.getByRole('heading', { name: /Off the/i })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
