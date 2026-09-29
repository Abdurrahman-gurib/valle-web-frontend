import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { LANGS, LANG_META, currentLang, localizePath, stripLang, tr, type Lang } from '../i18n';

/**
 * Per-page head management without a library. Pages call useSeo() during render;
 * in the browser the effect writes the tags into document.head, and during static
 * generation (entry-server.tsx) the same call records them in a collector that the
 * prerender script injects into the HTML, so crawlers get the real title, meta,
 * canonical, Open Graph, hreflang and JSON-LD without executing JavaScript.
 *
 * Every public page exists in each language (/explore, /fr/explore, /de/explore,
 * /it/explore): the canonical is the page's own language, and hreflang lists all
 * of them with English as x-default.
 */

/** Public origin for canonical / Open Graph URLs. Set VITE_SITE_URL to the canonical domain at build time. */
export const SITE_URL: string = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '');
export const SITE_NAME = 'VALLÉ Advenature™ Park';
export const DEFAULT_IMAGE = '/images/valle-zipline-adventure-mauritius.avif';

export interface SeoInput {
  title: string;
  description: string;
  /** Language-neutral path of this page, e.g. "/activities/zipline". Defaults to the current path. */
  canonicalPath?: string;
  /** Absolute or site-relative image for social sharing. */
  image?: string;
  /** Keep this page out of search results (back office, 404, transactional confirmations). */
  noindex?: boolean;
  /** JSON-LD objects describing the visible content. */
  jsonLd?: Record<string, unknown>[];
  type?: 'website' | 'article';
}

export interface SeoCollector { current: (SeoInput & { path: string; lang: Lang }) | null; url?: string }
const Ctx = createContext<SeoCollector | null>(null);

/** Wraps the tree during static generation so useSeo() can report what it rendered. */
export function SeoProvider({ collector, children }: { collector: SeoCollector; children: ReactNode }) {
  return <Ctx.Provider value={collector}>{children}</Ctx.Provider>;
}

/** The origin URLs are built against: VITE_SITE_URL, else the prerender's origin, else the browser's. */
const originOf = (origin?: string): string => SITE_URL || origin || (typeof window !== 'undefined' ? window.location.origin : '');

export const abs = (pathOrUrl: string, origin?: string): string => {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return originOf(origin) + pathOrUrl;
};

/** Every head tag for a page, as [tagName, attributes]. Shared by the browser and the prerender. */
export function headTags(seo: SeoInput & { path: string; lang?: Lang }, origin?: string): { tag: string; attrs: Record<string, string>; text?: string }[] {
  // Without a known origin (a prerender built without VITE_SITE_URL) the URL-bearing tags are
  // left out rather than emitted relative; the browser fills them in from its own origin.
  const hasOrigin = Boolean(originOf(origin));
  const lang = seo.lang ?? currentLang();
  const neutral = stripLang(seo.canonicalPath || seo.path);
  const canonical = abs(localizePath(neutral, lang), origin);
  const image = abs(seo.image || DEFAULT_IMAGE, origin);
  const tags: { tag: string; attrs: Record<string, string>; text?: string }[] = [
    { tag: 'meta', attrs: { name: 'description', content: seo.description } },
    { tag: 'meta', attrs: { name: 'robots', content: seo.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: SITE_NAME } },
    { tag: 'meta', attrs: { property: 'og:type', content: seo.type || 'website' } },
    { tag: 'meta', attrs: { property: 'og:title', content: seo.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: seo.description } },
    { tag: 'meta', attrs: { property: 'og:locale', content: LANG_META[lang].og } },
    ...LANGS.filter((l) => l !== lang).map((l) => ({ tag: 'meta', attrs: { property: 'og:locale:alternate', content: LANG_META[l].og } })),
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: seo.title } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: seo.description } },
  ];
  if (hasOrigin) {
    tags.push(
      { tag: 'link', attrs: { rel: 'canonical', href: canonical } },
      { tag: 'meta', attrs: { property: 'og:url', content: canonical } },
      { tag: 'meta', attrs: { property: 'og:image', content: image } },
      { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
    );
  }
  if (!seo.noindex && hasOrigin) {
    for (const l of LANGS) tags.push({ tag: 'link', attrs: { rel: 'alternate', hreflang: l, href: abs(localizePath(neutral, l), origin) } });
    tags.push({ tag: 'link', attrs: { rel: 'alternate', hreflang: 'x-default', href: abs(localizePath(neutral, 'en'), origin) } });
  }
  for (const ld of seo.jsonLd || []) {
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: JSON.stringify(ld) });
  }
  return tags;
}

const MARK = 'data-seo';

function applyToDocument(seo: SeoInput & { path: string; lang: Lang }) {
  document.title = seo.title;
  document.head.querySelectorAll(`[${MARK}]`).forEach((n) => n.remove());
  for (const t of headTags(seo)) {
    const el = document.createElement(t.tag);
    for (const [k, v] of Object.entries(t.attrs)) el.setAttribute(k, v);
    if (t.text) el.textContent = t.text;
    el.setAttribute(MARK, '1');
    document.head.appendChild(el);
  }
}

/** Declare this page's title, description, canonical, robots directive, social tags and structured data. */
export function useSeo(seo: SeoInput): void {
  const collector = useContext(Ctx);
  const lang = currentLang();
  const path = typeof window !== 'undefined' ? window.location.pathname + window.location.search : (collector?.url ?? '');
  if (collector) collector.current = { ...seo, path: seo.canonicalPath || stripLang(path), lang };
  const key = JSON.stringify(seo) + lang;
  useEffect(() => {
    applyToDocument({ ...seo, path: stripLang(window.location.pathname + window.location.search), lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** Organisation record, matches the footer and Google Business details. */
export const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'TouristAttraction'],
  '@id': abs('/#organization'),
  name: SITE_NAME,
  alternateName: ['Vallé Advenature Park', 'La Vallée des Couleurs'],
  url: abs('/'),
  logo: abs('/favicon-512.png'),
  image: abs(DEFAULT_IMAGE),
  description: 'Adventure and nature park in Chamouny, Mauritius: ziplines, quad and buggy trails, waterfalls, the 23 Coloured Earth, giant tortoises and a kids park.',
  telephone: '+230 660 44 77',
  email: 'sales@vallepark.com',
  address: { '@type': 'PostalAddress', streetAddress: 'B102, Mare Anguilles', addressLocality: 'Chamouny', addressCountry: 'MU' },
  geo: { '@type': 'GeoCoordinates', latitude: -20.457614, longitude: 57.4826031 },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '09:00', closes: '17:30' }],
  sameAs: ['https://www.instagram.com/valleadvenaturepark/', 'https://www.facebook.com/share/1ADvErZgRi/', 'https://www.youtube.com/channel/UCfHmy2KfmQk32tiT0zcxbTQ'],
  isAccessibleForFree: false,
  touristType: ['families', 'adventure travellers', 'nature lovers'],
  availableLanguage: ['English', 'French', 'German', 'Italian'],
};

/** Breadcrumb names are translated and item URLs point at the current language. */
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: tr(it.name), item: abs(localizePath(it.path)) })),
  };
}
