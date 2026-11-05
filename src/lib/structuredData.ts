import type { Activity, Catalog, Product } from '../types';

/**
 * schema.org records for Google's rich results, built from the catalog the page
 * renders. Every caller passes text already in the page's language and absolute
 * URLs; prices are plain numbers in MUR (the 2026 price list, VAT inclusive).
 */

type Ld = Record<string, unknown>;
const CONTEXT = 'https://schema.org';
const IN_STOCK = 'https://schema.org/InStock';
const BRAND = { '@type': 'Brand', name: 'VALLÉ' } as const;

/** Every price an experience sells at, resident and visitor alike: its price-list rows, else its rate pair, else its list price. */
export function activityPrices(act: Pick<Activity, 'id' | 'price'>, catalog: Pick<Catalog, 'PL' | 'RATEP'>): number[] {
  const rows = catalog.PL[act.id] ?? [];
  const fromRows = rows.flatMap((r) => [r.rr, r.nr]);
  const pair = catalog.RATEP[act.id] ?? [];
  const all = fromRows.length ? fromRows : pair.length ? [...pair] : [act.price];
  return all.filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0);
}

/** An experience as a Product with its price range (null when it has no price of its own, e.g. included with entry). */
export function activityProduct(input: { name: string; description: string; image: string; url: string; prices: number[] }): Ld | null {
  if (!input.prices.length) return null;
  const low = Math.min(...input.prices);
  const high = Math.max(...input.prices);
  return {
    '@context': CONTEXT,
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.image,
    url: input.url,
    brand: BRAND,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'MUR',
      lowPrice: low,
      highPrice: high,
      offerCount: new Set(input.prices).size,
      availability: IN_STOCK,
      url: input.url,
    },
  };
}

/** The lowest per-person price a product is sold at (its own rate when it is resident- or visitor-only). */
export function productPrice(p: Pick<Product, 'rr' | 'nr' | 'rateOnly'>): number | null {
  const prices = (p.rateOnly ? [p[p.rateOnly]] : [p.rr, p.nr]).filter((n) => typeof n === 'number' && n > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** A package class page: its products as an ItemList, each linking to its section on the page. */
export function packageItemList(input: { name: string; url: string; items: { name: string; image?: string; url: string; price: number; description?: string }[] }): Ld | null {
  if (!input.items.length) return null;
  return {
    '@context': CONTEXT,
    '@type': 'ItemList',
    name: input.name,
    url: input.url,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: it.name,
        ...(it.image ? { image: it.image } : {}),
        url: it.url,
        brand: BRAND,
        ...(it.description ? { description: it.description } : {}),
        offers: { '@type': 'Offer', price: it.price, priceCurrency: 'MUR', availability: IN_STOCK, url: it.url },
      },
    })),
  };
}

/** The visible FAQ as FAQPage: questions and answers exactly as the page shows them. */
export function faqPage(items: { question: string; answer: string }[]): Ld {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer } })),
  };
}
