import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';
import { ORGANIZATION, SeoProvider, headTags, type SeoCollector } from './lib/seo';

/**
 * Static generation entry (scripts/prerender.mjs). Renders one public route to
 * HTML with the bundled catalog, so crawlers and social scrapers get the full
 * page without JavaScript. The browser bundle then takes over on load.
 */
export function render(url: string, origin: string): { html: string; head: string; title: string; noindex: boolean } {
  const collector: SeoCollector = { current: null };
  const html = renderToString(
    <StrictMode>
      <SeoProvider collector={collector}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </SeoProvider>
    </StrictMode>,
  );
  const seo = collector.current ?? { title: 'VALLÉ Advenature™ Park · Chamouny, Mauritius', description: 'Where nature and adventure collide.', path: url };
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const head = headTags(seo, origin)
    .map((t) => {
      const attrs = Object.entries(t.attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
      return t.text ? `<${t.tag} ${attrs} data-seo="1">${t.text.replace(/</g, '\\u003c')}</${t.tag}>` : `<${t.tag} ${attrs} data-seo="1">`;
    })
    .join('\n    ');
  return { html, head, title: seo.title, noindex: !!seo.noindex };
}

/** Site-wide Organization / TouristAttraction record, injected once per page by the prerender. */
export function organizationScript(): string {
  return `<script type="application/ld+json">${JSON.stringify(ORGANIZATION).replace(/</g, '\u003c')}</script>`;
}
