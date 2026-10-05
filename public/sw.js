/*
 * VALLÉ service worker: makes the site installable and keeps it usable with no
 * signal in the valley.
 *
 *   shell   the app itself (home document, JS, CSS, fonts, icons), precached at
 *           install. scripts/build-sw.mjs fills in the list and the version.
 *   pages   prerendered pages, network first; offline they come from the cache,
 *           and a page never visited falls back to the shell, which renders any
 *           route from the catalog bundled in the app.
 *   data    /api/catalog and /api/fx (activities, packages, prices, exchange
 *           rates) and the guest's own ticket + QR, network first so prices are
 *           fresh online and still there offline.
 *   media   photos and menus, cache first, trimmed to a fixed number of entries.
 *
 * Never touched: anything that is not a same-origin GET, the back office
 * (/staff, /hr), the chat socket, bookings, waivers, the sitemap.
 */
const VERSION = '__VERSION__';
const PRECACHE = /*__PRECACHE__*/[];

const SHELL = 'valle-shell-' + VERSION;
const PAGES = 'valle-pages-v1';
const DATA = 'valle-data-v1';
const MEDIA = 'valle-media-v1';
const PAGES_MAX = 80;
const DATA_MAX = 30;
const MEDIA_MAX = 260;
const NETWORK_WAIT_MS = 4000;

const LANG_PREFIX = /^\/(fr|de|it|ar|ru|es|hi)(?=\/|$)/;
const PRIVATE_PAGE = /^(\/(fr|de|it|ar|ru|es|hi))?\/(ticket|waiver)\//;
const OFFLINE_API = /^\/api\/(catalog|fx)$/;
const TICKET_API = /^\/api\/tickets\/[^/]+(\/qr\.png)?$/;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // One missing file must not block the install; the shell document is checked on its own.
    await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const stale = names.filter((n) => n.startsWith('valle-shell-') && n !== SHELL);
    // Cached pages reference the previous build's hashed files: drop them with the old shell.
    if (stale.length) await caches.delete(PAGES);
    await Promise.all(stale.map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function store(cacheName, request, response, max) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  if (!max) return;
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

const cacheable = (response) => response && response.ok && response.type === 'basic';

/** Fresh when the network answers in time, the saved copy otherwise. */
async function networkFirst(event, cacheName, max, options) {
  const request = event.request;
  const opts = options || {};
  const cached = await caches.match(request, { ignoreSearch: !!opts.ignoreSearch });
  const network = fetch(request).then((response) => {
    if (cacheable(response) && (!opts.skipStore || !opts.skipStore(response))) {
      event.waitUntil(store(cacheName, request, response.clone(), max).catch(() => undefined));
    }
    return response;
  });
  if (cached) {
    const late = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_WAIT_MS));
    return Promise.race([network.catch(() => cached), late]);
  }
  try {
    return await network;
  } catch (err) {
    const fallback = opts.fallback ? await opts.fallback() : undefined;
    if (fallback) return fallback;
    throw err;
  }
}

/** Saved copy when there is one; otherwise fetch it and keep it. */
async function cacheFirst(event, cacheName, max) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const response = await fetch(event.request);
  if (cacheable(response)) event.waitUntil(store(cacheName, event.request, response.clone(), max).catch(() => undefined));
  return response;
}

/** The app document for a route that was never visited: the language's home page, else the root. */
async function shellFor(pathname) {
  const lang = pathname.match(LANG_PREFIX);
  return (lang && (await caches.match(lang[0]))) || (await caches.match('/')) || undefined;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (path.startsWith('/socket.io') || /^\/(staff|hr)(\/|$)/.test(path) || path === '/sitemap.xml' || path === '/robots.txt' || path === '/sw.js') return;

  if (path.startsWith('/api/')) {
    if (OFFLINE_API.test(path) || TICKET_API.test(path)) event.respondWith(networkFirst(event, DATA, DATA_MAX));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, PAGES, PAGES_MAX, {
      ignoreSearch: true,
      // tickets and waivers are personal, served no-store: the shell renders them from the data cache
      skipStore: () => PRIVATE_PAGE.test(path),
      fallback: () => shellFor(path),
    }));
    return;
  }

  if (path.startsWith('/assets/') || path.startsWith('/fonts/') || /^\/(favicon|apple-touch-icon|icon-)/.test(path)) {
    event.respondWith(cacheFirst(event, SHELL));
    return;
  }
  if (path.startsWith('/images/') || path.startsWith('/menus/')) {
    event.respondWith(cacheFirst(event, MEDIA, MEDIA_MAX));
  }
});

/** The page hands over the photos of the activity cards so they are there offline too. */
async function warm(urls) {
  const cache = await caches.open(MEDIA);
  for (const url of urls) {
    if (typeof url !== 'string' || !url.startsWith('/images/')) continue;
    try {
      if (await caches.match(url)) continue;
      const response = await fetch(url);
      if (cacheable(response)) await cache.put(url, response);
    } catch (err) {
      return; // offline or flaky: stop quietly, the next visit carries on
    }
  }
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'warm' && Array.isArray(data.urls)) event.waitUntil(warm(data.urls.slice(0, 60)));
});
