import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM script without types
import { hasBuild, jsonLdOf } from '../../scripts/jsonld-read.mjs';
import catalog from '../data/fallback.json';
import type { Catalog } from '../types';
import { CLASS_LISTED } from './packageGroups';
import { activityPrices, activityProduct, faqPage, packageItemList, productPrice } from './structuredData';

const cat = catalog as unknown as Catalog;
const URL = 'https://example.test';

describe('structured data', () => {
  it('every priced experience is a Product with a numeric MUR AggregateOffer over both rates', () => {
    const priced = cat.ACTS.filter((a) => a.mode === 'pp' || a.mode === 'flat');
    expect(priced.length).toBeGreaterThan(5);
    for (const act of priced) {
      const prices = activityPrices(act, cat);
      const ld = activityProduct({ name: act.name, description: act.blurb, image: URL + act.img, url: `${URL}/activities/${act.id}`, prices }) as Record<string, any>;
      expect(ld, act.id).not.toBeNull();
      expect(ld['@context']).toBe('https://schema.org');
      expect(ld['@type']).toBe('Product');
      expect(ld.name && ld.description && ld.image && ld.url).toBeTruthy();
      expect(ld.brand).toEqual({ '@type': 'Brand', name: 'VALLÉ' });
      const o = ld.offers;
      expect(o['@type']).toBe('AggregateOffer');
      expect(o.priceCurrency).toBe('MUR');
      expect(typeof o.lowPrice).toBe('number');
      expect(typeof o.highPrice).toBe('number');
      expect(o.lowPrice).toBeGreaterThan(0);
      expect(o.lowPrice).toBeLessThanOrEqual(o.highPrice);
      expect(o.availability).toBe('https://schema.org/InStock');
    }
  });

  it('the zipline range spans its whole price list, resident low to visitor high', () => {
    const z = cat.ACTS.find((a) => a.id === 'zipline')!;
    const prices = activityPrices(z, cat);
    const rows = cat.PL.zipline;
    expect(Math.min(...prices)).toBe(Math.min(...rows.map((r) => Math.min(r.rr, r.nr))));
    expect(Math.max(...prices)).toBe(Math.max(...rows.map((r) => Math.max(r.rr, r.nr))));
  });

  it('no price, no Product', () => {
    expect(activityProduct({ name: 'x', description: 'y', image: '', url: '', prices: [] })).toBeNull();
  });

  it('class pages list their packages as Products with numeric offers and section anchors', () => {
    for (const [slug, listed] of Object.entries(CLASS_LISTED)) {
      const items = listed.flatMap(({ family, section }) => (cat.PRODUCTS ?? []).filter((p) => p.family === family)
        .flatMap((p) => { const price = productPrice(p); return price ? [{ name: p.name, image: URL + p.image, url: `${URL}/packages/${slug}#${section}`, price }] : []; }));
      const ld = packageItemList({ name: slug, url: `${URL}/packages/${slug}`, items }) as Record<string, any>;
      expect(ld, slug).not.toBeNull();
      expect(ld['@type']).toBe('ItemList');
      expect(ld.itemListElement.length).toBe(ld.numberOfItems);
      ld.itemListElement.forEach((el: any, i: number) => {
        expect(el['@type']).toBe('ListItem');
        expect(el.position).toBe(i + 1);
        expect(el.item['@type']).toBe('Product');
        expect(el.item.name).toBeTruthy();
        expect(el.item.url).toMatch(/#[a-z-]+$/);
        expect(typeof el.item.offers.price).toBe('number');
        expect(el.item.offers.priceCurrency).toBe('MUR');
      });
    }
  });

  it('FAQPage carries each question with its answer', () => {
    const ld = faqPage([{ question: 'Q?', answer: 'A.' }]) as Record<string, any>;
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toEqual([{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } }]);
  });
});

/** After `npm run build`: the prerendered pages' JSON-LD parses and carries the rich-result records. */
describe.skipIf(!hasBuild())('prerendered JSON-LD', () => {
  const blocks = (file: string): Record<string, any>[] => jsonLdOf(file);
  const types = (file: string) => blocks(file).flatMap((b) => [b['@type']].flat());

  it('home has an FAQPage in its language', () => {
    expect(types('index.html')).toContain('FAQPage');
    const fr = blocks('fr/index.html').find((b) => b['@type'] === 'FAQPage')!;
    expect(fr.mainEntity[0].name).not.toBe('Do I pay when I book?');
  });
  it('an activity page has a Product with an AggregateOffer and a BreadcrumbList', () => {
    const b = blocks('activities/zipline/index.html');
    expect(b.find((x) => x['@type'] === 'Product')?.offers['@type']).toBe('AggregateOffer');
    expect(types('de/activities/quad/index.html')).toContain('BreadcrumbList');
  });
  it('a package class page has an ItemList and a BreadcrumbList', () => {
    expect(types('packages/exclusive/index.html')).toEqual(expect.arrayContaining(['ItemList', 'BreadcrumbList']));
  });
});
