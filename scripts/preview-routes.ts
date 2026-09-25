import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Makes `vite preview` answer like the production nginx (nginx.conf.template)
 * so the e2e suite exercises the same status codes, redirects and prerendered
 * pages that visitors and crawlers get:
 *
 *   - redirects.map: 301 to the replacement, 410 for "GONE" entries
 *   - trailing slash / index.html -> 301 to the clean URL
 *   - prerendered pages served from dist/<route>/index.html
 *   - /vacancies/<slug> -> SPA shell (rendered from the API)
 *   - /staff, /hr -> SPA shell with X-Robots-Tag noindex
 *   - anything else -> 404 with dist/404/index.html and X-Robots-Tag noindex
 *   - /sitemap.xml, /robots.txt -> the API (via the preview proxy)
 *
 * Runs only under preview; the dev server keeps serving the SPA shell.
 */
export function nginxLikeRoutes(): Plugin {
  return {
    name: 'valle:nginx-like-routes',
    configurePreviewServer(server) {
      const dist = server.config.build.outDir;
      const legacy = parseRedirectMap(readFileSync(join(server.config.root, 'redirects.map'), 'utf8'));
      const shell = () => readFileSync(join(dist, 'index.html'));

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://preview');
        const path = url.pathname;
        const query = url.search;

        if (path.startsWith('/api/') || path.startsWith('/socket.io/')) return next();
        if (path === '/sitemap.xml' || path === '/robots.txt') { req.url = '/api' + path; return next(); }

        const target = legacy(path);
        if (target === 'GONE') { res.statusCode = 410; return res.end(); }
        if (target) return redirect(res, target + query);

        const slash = path.match(/^\/(.+)\/$/);
        if (slash) return redirect(res, '/' + slash[1] + query);
        const idx = path.match(/^\/(.*)index\.html$/);
        if (idx) return redirect(res, '/' + idx[1] + query);

        if (/\.[a-z0-9]+$/i.test(path)) return next(); // assets: sirv
        if (/^\/(staff|hr)(\/.*)?$/.test(path)) return html(res, 200, shell(), { 'X-Robots-Tag': 'noindex, nofollow' });
        if (/^\/vacancies\/[a-z0-9-]+$/.test(path)) return html(res, 200, shell());

        const file = path === '/' ? join(dist, 'index.html') : join(dist, path.slice(1), 'index.html');
        if (path === '/' || /^\/[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(path)) {
          if (existsSync(file)) return html(res, 200, readFileSync(file));
        }
        return html(res, 404, readFileSync(join(dist, '404', 'index.html')), { 'X-Robots-Tag': 'noindex' });
      });
    },
  };
}

function redirect(res: import('node:http').ServerResponse, to: string) {
  res.statusCode = 301;
  res.setHeader('Location', to);
  res.end();
}

function html(res: import('node:http').ServerResponse, status: number, body: Buffer, headers: Record<string, string> = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(body);
}

/** nginx `map` syntax: `key value;` per line, `~regex` keys, `#` comments, `$1` back-references. */
function parseRedirectMap(text: string): (path: string) => string | null {
  const exact = new Map<string, string>();
  const regex: [RegExp, string][] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(\S+)\s+(\S+);$/);
    if (!m) continue;
    const [, key, value] = m;
    if (key.startsWith('~')) regex.push([new RegExp(key.slice(1)), value]);
    else exact.set(key, value);
  }
  return (path) => {
    const hit = exact.get(path);
    if (hit) return hit;
    for (const [re, value] of regex) {
      const m = path.match(re);
      if (m) return value.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
    }
    return null;
  };
}
