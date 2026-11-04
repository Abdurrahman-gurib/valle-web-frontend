import { _t } from '../i18n';

/**
 * The classes the park sells its packages under (the special deals first,
 * shown only while a deal is on sale). Each has its own page
 * (/packages/<slug>) carrying the price-list sections listed in `keys`; the
 * header menu, the index page and the section anchors all read this.
 */
export interface PackageGroup { slug: string; title: string; intro: string; keys: string[] }
export const PACKAGE_GROUPS: PackageGroup[] = [
  { slug: 'deals', title: _t('Special deals'), intro: _t('The expo deals: four adventure packages at a special resident price, park entrance included. For visits from 23 October 2026 to 15 January 2027.'), keys: ['deals'] },
  { slug: 'exclusive', title: _t('Exclusive package'), intro: _t('Curated adventure days from a relaxed first taste of the valley to the VIP and Diamond escapes, plus the quad + zipline combos.'), keys: ['ls', 'ex', 'vip', 'diamond', 'combo'] },
  { slug: 'resident', title: _t('Resident package'), intro: _t('Per-person days at the resident rate, with a Mauritian ID or permit, and the Kids Park points pricelist.'), keys: ['resident', 'kids'] },
  { slug: 'senior', title: _t('Senior citizen'), intro: _t('Two gentle day packages for guests aged 55 and above: a visit of the park on foot or by jeep, lunch and a tea break.'), keys: ['senior'] },
  { slug: 'student', title: _t('Student package'), intro: _t('School outings from pre-primary to secondary: entry and activities at the student rate.'), keys: ['student'] },
  { slug: 'corporate', title: _t('Corporate package'), intro: _t('Team building days for companies, from Rs 2,850 per person, with a quote within one working day.'), keys: ['team'] },
  { slug: 'photo-video', title: _t('Photo & video package'), intro: _t('The park photographer and the cinematic shoot: edited photos and film of your day, delivered on your ticket page.'), keys: ['photo', 'cine'] },
];
export const packageGroupOf = (slug?: string) => (slug ? PACKAGE_GROUPS.find((g) => g.slug === slug) : undefined);
/** The class page a price-list section lives on ('' for the quote form, which is on every page). */
export const groupOfSection = (key: string) => PACKAGE_GROUPS.find((g) => g.keys.includes(key))?.slug ?? '';

/** The product families each class sells (catalog PRODUCTS[].family). */
const CLASS_FAMILIES: Record<string, string[]> = {
  deals: ['expo'],
  exclusive: ['ls', 'ex', 'vip', 'diamond', 'combo'],
  resident: ['resident'],
  senior: ['senior'],
  photo: ['photo', 'cine'],
};

interface PricedProduct { family: string; rr: number; nr: number; rateOnly: 'rr' | 'nr' | null }

/**
 * The lowest per-person price of a class, from the catalog, at the guest's rate when the class
 * sells at it, else at the rate it is sold at. Null when the catalog has no price for it
 * (corporate programmes are quoted).
 */
export function classFrom(
  slug: string,
  catalog: { PRODUCTS?: PricedProduct[]; PL: Record<string, { n: string; rr: number; nr: number }[]> },
  rate: 'rr' | 'nr',
): { price: number; rate: 'rr' | 'nr' } | null {
  if (slug === 'student') {
    const entry = (catalog.PL.student || []).find((r) => /^entrance/i.test(r.n));
    return entry ? { price: entry[rate], rate } : null;
  }
  const fams = CLASS_FAMILIES[slug === 'photo-video' ? 'photo' : slug];
  if (!fams) return null;
  const items = (catalog.PRODUCTS || []).filter((p) => fams.includes(p.family));
  const at = (r: 'rr' | 'nr') => items.filter((p) => !p.rateOnly || p.rateOnly === r).map((p) => p[r]).filter((n) => n > 0);
  const mine = at(rate);
  if (mine.length) return { price: Math.min(...mine), rate };
  const other: 'rr' | 'nr' = rate === 'nr' ? 'rr' : 'nr';
  const theirs = at(other);
  return theirs.length ? { price: Math.min(...theirs), rate: other } : null;
}
