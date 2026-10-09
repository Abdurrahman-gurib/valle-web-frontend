import { _t } from '../i18n';

/**
 * The six classes the park sells its packages under. Each has its own page
 * (/packages/<slug>) carrying the price-list sections listed in `keys`; the
 * header menu, the index page and the section anchors all read this.
 */
export interface PackageGroup { slug: string; title: string; intro: string; keys: string[] }
export const PACKAGE_GROUPS: PackageGroup[] = [
  { slug: 'exclusive', title: _t('Exclusive package'), intro: _t('Curated adventure days from a relaxed first taste of the valley to the VIP and Diamond escapes, plus the quad + zipline combos.'), keys: ['ls', 'ex', 'vip', 'diamond', 'combo'] },
  { slug: 'resident', title: _t('Resident package'), intro: _t('Per-person days at the resident rate, with a Mauritian ID or permit, and the Kids Park points pricelist.'), keys: ['resident', 'kids'] },
  { slug: 'senior', title: _t('Senior citizen'), intro: _t('Gentler days in the valley for guests aged 55 and above.'), keys: ['senior'] },
  { slug: 'student', title: _t('Student package'), intro: _t('School outings from pre-primary to secondary: entry and activities at the student rate.'), keys: ['student'] },
  { slug: 'corporate', title: _t('Corporate package'), intro: _t('Team building days for companies, from Rs 2,850 per person, with a quote within one working day.'), keys: ['team'] },
  { slug: 'photo-video', title: _t('Photo & video package'), intro: _t('The park photographer and the cinematic shoot: edited photos and film of your day, delivered on your ticket page.'), keys: ['photo', 'cine'] },
];
export const packageGroupOf = (slug?: string) => (slug ? PACKAGE_GROUPS.find((g) => g.slug === slug) : undefined);
/** The class page a price-list section lives on ('' for the quote form, which is on every page). */
export const groupOfSection = (key: string) => PACKAGE_GROUPS.find((g) => g.keys.includes(key))?.slug ?? '';
