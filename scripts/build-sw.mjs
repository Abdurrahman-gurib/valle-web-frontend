/**
 * Last build step: stamps dist/sw.js with the list of files that make up the
 * app shell and a version derived from them, so every deploy that changes the
 * app installs a new service worker and drops the previous shell.
 *
 *   node scripts/build-sw.mjs      (run by `npm run build` after the prerender)
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const swPath = join(dist, 'sw.js');
if (!existsSync(swPath)) throw new Error('dist/sw.js is missing: public/sw.js should have been copied by vite build');

const list = (dir, test) => (existsSync(join(dist, dir)) ? readdirSync(join(dist, dir)).filter(test).map((f) => `/${dir}/${f}`) : []);

// Kept out of the install download (it runs after the page has loaded, but on a slow
// phone it still competes with the photos further down): the staff gate scanner,
// the back office (Dashboard, reportUi = Recharts), the desktop-only Three.js layer,
// the other languages' dictionaries and the Arabic / Cyrillic / Devanagari fonts.
// The worker still caches each of them the first time a page uses it (cache-first
// on /assets/ and /fonts/), so a French or Hindi visitor keeps theirs offline.
const NOT_IN_SHELL = /^(jsQR|Dashboard|reportUi|three\.module|(fr|de|it|ar|ru|es|hi)-)[-\w]*\.js$/i;
const precache = [
  '/',
  ...list('assets', (f) => /\.(js|css)$/.test(f) && !NOT_IN_SHELL.test(f)),
  ...list('fonts', (f) => /^font-\d+\.woff2$/.test(f)),
  '/favicon.svg', '/favicon-192.png', '/favicon-512.png', '/apple-touch-icon.png',
  '/icon-maskable-192.png', '/icon-maskable-512.png',
].filter((url) => url === '/' || existsSync(join(dist, url.slice(1))));

const source = readFileSync(swPath, 'utf8');
if (!source.includes("'__VERSION__'") || !source.includes('/*__PRECACHE__*/[]')) throw new Error('dist/sw.js has no placeholders to fill');

// The home document changes whenever a hashed asset or the prerendered markup does.
const hash = createHash('sha256');
hash.update(source);
hash.update(precache.join('\n'));
hash.update(readFileSync(join(dist, 'index.html')));
const version = hash.digest('hex').slice(0, 12);

writeFileSync(swPath, source.replace("'__VERSION__'", JSON.stringify(version)).replace('/*__PRECACHE__*/[]', JSON.stringify(precache)));
console.log(`service worker ${version}: ${precache.length} files in the app shell`);
