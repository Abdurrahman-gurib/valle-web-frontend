import { chromium, devices } from '@playwright/test';
const B = process.env.BASE || 'http://127.0.0.1:18081';
const langs = ['', '/fr', '/de', '/it', '/ar'];
const paths = ['', '/explore', '/explore?cat=kids', '/packages', '/booking', '/vacancies', '/activities/zipline', '/activities/quad', '/activities/buggy', '/activities/pirate', '/dine/chamouze', '/nope-404'];
const b = await chromium.launch();
const problems = [];
for (const [name, ctxOpts] of [['desktop', { viewport: { width: 1366, height: 900 } }], ['mobile', { ...devices['iPhone 13'] }]]) {
  const ctx = await b.newContext(ctxOpts);
  const pg = await ctx.newPage();
  await pg.addInitScript(() => { localStorage.setItem('valle_rate', 'nr'); localStorage.setItem('valle_consent', JSON.stringify({ level: 'essential', at: '2026-09-28T00:00:00.000Z', v: 1 })); localStorage.setItem('valle_lang_dismissed', '1'); });
  let current = '';
  pg.on('console', (m) => { if (m.type() === 'error') problems.push(`${name} ${current}: console ${m.text().slice(0, 160)}`); });
  pg.on('pageerror', (e) => problems.push(`${name} ${current}: pageerror ${String(e).slice(0, 160)}`));
  pg.on('response', (r) => { if (r.status() >= 400 && !/nope-404|favicon|\/api\/coupons/.test(r.url())) problems.push(`${name} ${current}: ${r.status()} ${r.url().replace(B, '')}`); });
  for (const l of langs) for (const p of paths) {
    current = l + (p || '/');
    try {
      await pg.goto(B + l + (p || '/'), { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) { problems.push(`${name} ${current}: nav ${String(e).slice(0, 100)}`); continue; }
    const r = await pg.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      h1: document.querySelectorAll('h1').length,
      lang: document.documentElement.lang,
      empty: document.body.innerText.trim().length < 200,
      brokenImgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).map((i) => i.getAttribute('src')).slice(0, 3),
    }));
    if (r.overflow > 1) problems.push(`${name} ${current}: overflow ${r.overflow}px`);
    if (!p.includes('nope') && r.h1 !== 1) problems.push(`${name} ${current}: ${r.h1} h1`);
    if (r.empty) problems.push(`${name} ${current}: page nearly empty`);
    if (r.brokenImgs.length) problems.push(`${name} ${current}: broken images ${r.brokenImgs.join(', ')}`);
    const expectLang = l ? l.slice(1) : 'en';
    if (r.lang !== expectLang) problems.push(`${name} ${current}: html lang ${r.lang}`);
  }
  await ctx.close();
}
await b.close();
console.log(problems.length ? problems.join('\n') : 'no problems');
