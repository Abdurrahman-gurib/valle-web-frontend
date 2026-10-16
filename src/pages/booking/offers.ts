/**
 * What the booking page suggests, computed only from catalog data:
 *  - the "best value" package strip (one tier per package family),
 *  - a combo that replaces the same experiences already in the cart for less,
 *  - one-tap extras (photo package, Waterfall Swing) priced for the party.
 * Every saving and price is the difference between two computeBooking() totals,
 * so it follows the exact cart rules (kids' half price, Explorer Pass, pair prices).
 */
import type { Catalog, PackTier, Product, RateKey, Sel, SelEntry } from '../../types';
import { PRODUCT_PREFIX } from '../../types';
import { computeBooking } from '../../store/booking';
import { parseSelKey, selKey } from '../../lib/sel';
import { _t } from '../../i18n';

export const PACKAGE_FAMILIES = ['ls', 'ex', 'diamond', 'resident', 'senior', 'combo'] as const;
export const FAMILY_TITLE: Record<string, string> = {
  ls: _t('Light & Standard'), ex: _t('Exclusive'), diamond: _t('Diamond'),
  resident: _t('Resident packages'), senior: _t('Senior citizens'), combo: _t('Combo packages'),
};

const fits = (p: Product, rate: RateKey) => !p.rateOnly || p.rateOnly === rate;
const tierIdx = (p: Product) => Number(p.key.split(':').pop()) || 0;

export interface BestValue { product: Product; family: string; popular: boolean }

/**
 * One card per package family available at this rate: the tier the catalog marks
 * "most popular", else the middle tier (families of three tiers or more carry the badge).
 */
export function bestValue(catalog: Catalog, rate: RateKey): BestValue[] {
  const out: BestValue[] = [];
  const packs = catalog.PACKS as unknown as Record<string, PackTier[] | undefined>;
  for (const family of PACKAGE_FAMILIES) {
    const tiers = (catalog.PRODUCTS ?? []).filter((p) => p.family === family && fits(p, rate)).sort((a, b) => tierIdx(a) - tierIdx(b));
    if (tiers.length === 0) continue;
    const printed = Array.isArray(packs[family]) ? packs[family]! : [];
    const marked = tiers.find((p) => printed.some((pt) => pt.key === p.key && /popular/i.test(pt.badge || '')));
    const product = marked ?? tiers[Math.floor((tiers.length - 1) / 2)];
    out.push({ product, family, popular: !!marked || tiers.length >= 3 });
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().split('·')[0].replace(/^the\s+/, '').replace(/\s+track\b/, '').trim();

export interface Swap { product: Product; remove: string[]; entry: SelEntry; save: number }

/**
 * A combo whose every item is exactly one single-seat option line in the cart
 * (same experience name at the start of the price-list label, same party on each line),
 * when swapping those lines for the combo makes the day cheaper.
 */
export function comboSwap(catalog: Catalog, sel: Sel, adults: number, kids: number, rate: RateKey): Swap | null {
  const base = computeBooking(catalog, sel, adults, kids, rate).total;
  let best: Swap | null = null;
  for (const cb of catalog.COMBO ?? []) {
    if (!cb.key || !cb.items.length || sel[PRODUCT_PREFIX + cb.key]) continue;
    const product = (catalog.PRODUCTS ?? []).find((p) => p.key === cb.key);
    if (!product || !fits(product, rate)) continue;
    const remove: string[] = [];
    for (const it of cb.items) {
      const head = norm(it.t);
      const hits = Object.keys(sel).filter((k) => {
        const { variant } = parseSelKey(k);
        return !!variant && !/double/i.test(variant) && norm(variant).startsWith(head) && !remove.includes(k);
      });
      if (hits.length !== 1) { remove.length = 0; break; }
      remove.push(hits[0]);
    }
    if (remove.length !== cb.items.length) continue;
    const q = remove.map((k) => sel[k]);
    if (q.some((e) => (e.u || 0) > 0 || (e.a || 0) !== (q[0].a || 0) || (e.k || 0) !== (q[0].k || 0))) continue;
    const entry: SelEntry = { a: q[0].a || 0, k: q[0].k || 0 };
    const next: Sel = { ...sel };
    for (const k of remove) delete next[k];
    next[PRODUCT_PREFIX + cb.key] = entry;
    const save = base - computeBooking(catalog, next, adults, kids, rate).total;
    if (save > 0 && (!best || save > best.save)) best = { product, remove, entry, save };
  }
  return best;
}

export interface Extra { kind: 'photo' | 'swing'; key: string; id: string; variant?: string; name: string; note: string; amount: number }

/** The photo package (cheapest tier at this rate) and the Waterfall Swing, unless already in the day. */
export function extras(catalog: Catalog, sel: Sel, adults: number, kids: number, rate: RateKey): Extra[] {
  const base = computeBooking(catalog, sel, adults, kids, rate).total;
  const entry: SelEntry = { a: Math.max(1, adults), k: kids };
  const priced = (key: string) => computeBooking(catalog, { ...sel, [key]: entry }, adults, kids, rate).total - base;
  const out: Extra[] = [];
  const photos = (catalog.PRODUCTS ?? []).filter((p) => p.family === 'photo' && fits(p, rate));
  const hasPhoto = Object.keys(sel).some((k) => photos.some((p) => k === PRODUCT_PREFIX + p.key));
  if (photos.length && !hasPhoto) {
    const p = [...photos].sort((a, b) => (rate === 'nr' ? a.nr - b.nr : a.rr - b.rr))[0];
    const key = PRODUCT_PREFIX + p.key;
    out.push({ kind: 'photo', key, id: key, name: p.name, note: p.note, amount: priced(key) });
  }
  const swing = catalog.ACTS.find((a) => a.id === 'swing');
  if (swing && !Object.keys(sel).some((k) => parseSelKey(k).id === 'swing')) {
    const variant = (catalog.PL.swing || [])[0]?.n;
    const key = selKey('swing', variant);
    out.push({ kind: 'swing', key, id: 'swing', variant, name: swing.name, note: variant || '', amount: priced(key) });
  }
  return out.filter((x) => x.amount > 0);
}
