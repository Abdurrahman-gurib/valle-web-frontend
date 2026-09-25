#!/usr/bin/env node
/**
 * Static generation for the public pages. Runs after `vite build`:
 *   1. builds the server entry (src/entry-server.tsx) into dist-ssr/,
 *   2. renders every public route with the bundled catalog,
 *   3. writes dist/<route>/index.html (dist/index.html for "/") with the rendered
 *      markup, per-page <title>, meta, canonical, Open Graph and JSON-LD,
 *   4. writes dist/404/index.html, which nginx serves with a 404 status.
 * No browser is involved, so it runs inside the alpine build image.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');
const origin = (process.env.VITE_SITE_URL || '').replace(/\/+$/, '');

execSync('npx vite build --ssr src/entry-server.tsx --outDir dist-ssr --emptyOutDir', { cwd: root, stdio: 'inherit' });
const { render } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);
const catalog = JSON.parse(readFileSync(join(root, 'src/data/fallback.json'), 'utf8'));

const routes = [
  '/', '/explore', '/packages', '/booking', '/vacancies',
  ...catalog.ACTS.map((a) => `/activities/${a.id}`),
  ...Object.keys(catalog.RESTOS).map((id) => `/dine/${id}`),
];
const template = readFileSync(join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--seo-head-->') || !template.includes('<div id="root"></div>')) {
  throw new Error('index.html is missing the <!--seo-head--> marker or the empty #root');
}

let count = 0;
const write = (route, outFile) => {
  const { html, head, title } = render(route, origin);
  const page = template
    .replace(/<title>[^<]*<\/title>/, `<title>${title.replace(/</g, '&lt;')}</title>`)
    .replace('<!--seo-head-->', head)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, page);
  count++;
};
for (const route of routes) write(route, route === '/' ? join(dist, 'index.html') : join(dist, route.slice(1), 'index.html'));
write('/this-page-does-not-exist', join(dist, '404', 'index.html'));
rmSync(ssrDir, { recursive: true, force: true });
console.log(`prerendered ${count} pages${origin ? ' for ' + origin : ' (canonical origin resolved at runtime; set VITE_SITE_URL)'}`);
