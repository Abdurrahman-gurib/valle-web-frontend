import type { Activity, BookingSummary, Catalog, RateKey, Sel, SelLine } from '../types';
import { ENTRY_INCLUDED_FAMILIES, PRODUCT_PREFIX, productAmount } from '../types';
import { money, partyLabel } from '../lib/format';
import { parseSelKey } from '../lib/sel';
import { tr } from '../i18n';
import { productDisplayName } from '../lib/photoTier';
import { defaultCounts, eligibility, lineCaps, type Eligibility } from '../lib/ages';

/** A product's own photo; a family picture only when the catalog has none. */
const PRODUCT_FALLBACK_IMG: Record<string, string> = {
  cine: '/images/shoot/cine-03.webp',
  photo: '/images/shoot/cine-01.webp',
};
const DEFAULT_PRODUCT_IMG = '/images/vip-ultimate-buggy-coloured-earth.avif';

/** Party at the gate: adults 12+, children 6–11, under 6 (free). */
export interface Party { adults: number; kids: number; infants: number }

/**
 * Who a cart line may count. Experiences follow their age label; packages take
 * adults and children (seniors' packages adults only), never under-6s.
 */
export function lineEligibility(catalog: Catalog, key: string): Eligibility {
  const { id } = parseSelKey(key);
  if (id.startsWith(PRODUCT_PREFIX)) {
    const p = (catalog.PRODUCTS ?? []).find((x) => PRODUCT_PREFIX + x.key === id);
    const senior = p?.family === 'senior';
    return { adults: true, kids: !senior, infants: false, kidsRide: false, limits: {} };
  }
  const act = catalog.ACTS.find((a) => a.id === id);
  return eligibility(act?.age);
}

/** Counts a new line starts with: the eligible people of the party only. */
export function newLineCounts(catalog: Catalog, key: string, party: Party): { a: number; k: number } {
  return defaultCounts(lineEligibility(catalog, key), party);
}

/**
 * The party changed: every per-person line follows. A line that counted
 * everyone eligible keeps counting everyone eligible; any other line is clamped
 * to what the new party allows. Flat lines (buggies, films) are left alone. Returns the
 * same object when nothing moves.
 */
export function fitSelToParty(catalog: Catalog, sel: Sel, prev: Party, next: Party): Sel {
  let changed = false;
  const out: Sel = {};
  for (const [key, e] of Object.entries(sel)) {
    const flat = isFlatKey(catalog, key);
    if (flat) { out[key] = e; continue; }
    const el = lineEligibility(catalog, key);
    const before = defaultCounts(el, prev);
    const caps = lineCaps(el, next);
    const fresh = defaultCounts(el, next);
    const a0 = e.a || 0;
    const k0 = e.k || 0;
    const a = Math.max(0, Math.min(caps.a, a0 === before.a ? fresh.a : a0));
    const k = Math.max(0, Math.min(caps.k, k0 === before.k ? fresh.k : k0));
    if (a !== a0 || k !== k0) changed = true;
    out[key] = { ...e, a, k };
  }
  return changed ? out : sel;
}

function isFlatKey(catalog: Catalog, key: string): boolean {
  const { id } = parseSelKey(key);
  if (id.startsWith(PRODUCT_PREFIX)) return (catalog.PRODUCTS ?? []).find((x) => PRODUCT_PREFIX + x.key === id)?.mode === 'flat';
  return catalog.ACTS.find((a) => a.id === id)?.mode === 'flat';
}

/** Lines that count more people than the party allows, by name (the server refuses them). */
export function linesOverParty(lines: SelLine[], party: Party): string[] {
  return lines.filter((l) => {
    if (l.product ? l.product.mode === 'flat' : l.act.mode === 'flat') return false;
    const a = l.qty.a || 0, k = l.qty.k || 0;
    return a > party.adults || k > party.kids + party.infants || a + k > party.adults + party.kids + party.infants;
  }).map((l) => l.act.name);
}

/** Per-person lines nobody in the party is counted on (nobody fits the age limits). */
export function emptyLines(lines: SelLine[]): string[] {
  return lines.filter((l) => !(l.product ? l.product.mode === 'flat' : l.act.mode === 'flat') && (l.qty.a || 0) + (l.qty.k || 0) === 0).map((l) => l.act.name);
}

/** Rate-aware "from" price for an activity. Defaults to resident (rr) until a rate is chosen. */
export function priceFor(catalog: Catalog, act: Activity, rate: RateKey | null): number {
  const rp = catalog.RATEP[act.id];
  if (!rp) return act.price;
  return rate === 'nr' ? rp[1] : rp[0];
}

/** Park entry per adult / per child at the given rate: the printed admission rows, else the flat settings. */
export function entryPrices(catalog: Catalog, rate: RateKey | null): { adult: number; child: number } {
  const rows = catalog.PL.admission || [];
  const find = (needle: string) => rows.find((r) => r.n.toLowerCase().includes(needle));
  const a = find('12 years'), c = find('6 to 11');
  const rk = rate === 'nr' ? 'nr' : 'rr';
  return { adult: a ? a[rk] : catalog.ENTRY_A, child: c ? c[rk] : catalog.ENTRY_C };
}

/** Price of one catalog.PL option of an experience at the given rate, or null when unknown. */
export function variantPrice(catalog: Catalog, id: string, variant: string, rate: RateKey | null): number | null {
  const row = (catalog.PL[id] || []).find((r) => r.n === variant);
  if (!row) return null;
  return rate === 'nr' ? row.nr : row.rr;
}

/**
 * Cart summary: the exact pricing rules of the original site.
 * NOTE: the NestJS BookingsService mirrors this computation server-side;
 * any change here must be mirrored in Backend/src/bookings/pricing.ts.
 */
export function computeBooking(
  catalog: Catalog,
  sel: Sel,
  adults: number,
  kids: number,
  rate: RateKey | null,
  infants = 0,
): BookingSummary {
  // Lines in catalog order (then key order), each priced by its option when one was chosen.
  const selLines: SelLine[] = [];
  const keys = Object.keys(sel);
  // Products (packages, combos, VIP, photo, cinematic) ride in the same cart under "product:<key>",
  // shown through a stand-in activity so the cart and the receipt can render them.
  for (const p of catalog.PRODUCTS ?? []) {
    const key = PRODUCT_PREFIX + p.key;
    if (!sel[key]) continue;
    const act = {
      id: key, name: productDisplayName(p), img: p.image || PRODUCT_FALLBACK_IMG[p.family] || DEFAULT_PRODUCT_IMG, cat: 'package', mode: p.mode === 'flat' ? 'flat' : 'pp',
      flatLabel: p.family === 'cine' ? '/ film' : null, price: rate === 'nr' ? p.nr : p.rr, blurb: p.note, thrill: 0, duration: '', age: '', detail: '', facts: [],
    } as unknown as Activity;
    selLines.push({ key, act, variant: '', price: rate === 'nr' ? p.nr : p.rr, qty: sel[key] || {}, product: p });
  }
  for (const a of catalog.ACTS) {
    for (const key of keys) {
      const { id, variant } = parseSelKey(key);
      if (id !== a.id) continue;
      const vp = variant ? variantPrice(catalog, a.id, variant, rate) : null;
      selLines.push({ key, act: a, variant, price: vp ?? priceFor(catalog, a, rate), qty: sel[key] || {} });
    }
  }
  const selActs = selLines.map((l) => l.act).filter((a, i, arr) => arr.indexOf(a) === i);
  const lines: { label: string; amt: string }[] = [];
  const ep = entryPrices(catalog, rate);
  // Student rows, expo deals and senior packages include the entrance fee for the
  // people they count (as the server prices it): expo and senior lines add up,
  // student rows all cover the same pupils. Everyone else pays entry; under-6s are free.
  let sumA = 0, sumK = 0, maxA = 0, maxK = 0;
  let coverFamily: string | null = null;
  for (const l of selLines) {
    const f = l.product?.family;
    if (!f || !ENTRY_INCLUDED_FAMILIES.has(f)) continue;
    coverFamily ??= f;
    const a = l.qty.a || 0, k = l.qty.k || 0;
    if (f === 'student') { maxA = Math.max(maxA, a); maxK = Math.max(maxK, k); } else { sumA += a; sumK += k; }
  }
  const coveredA = Math.min(adults, sumA + maxA);
  const coveredK = Math.min(kids, sumK + maxK);
  const covered = coveredA + coveredK > 0;
  const payA = adults - coveredA;
  const payK = kids - coveredK;
  const entryIncludedBy = covered ? coverFamily : null;
  const entry = ep.adult * payA + ep.child * payK;
  const includedLabel = entryIncludedBy === 'expo'
    ? tr('Park entry · included with the expo deal')
    : entryIncludedBy === 'senior'
    ? tr('Park entry · included with the senior package')
    : tr('Park entry · included with the student rate');
  lines.push({
    label: !covered
      ? tr('Park entry · {party}', { party: partyLabel(adults, kids, infants) })
      : payA + payK === 0 ? includedLabel : tr('Park entry · {party}', { party: partyLabel(payA, payK) }),
    amt: money(entry),
  });
  let total = entry;
  let advSubtotal = 0;
  const advIds = new Set<string>();

  for (const l of selLines) {
    const a = l.act;
    const c = l.qty;
    const price = l.price;
    let amt = 0;
    let q = '';
    if (l.product) {
      amt = productAmount(l.product, rate, c.a || 0, c.k || 0, c.u || 0);
      q = l.product.mode === 'flat' ? (c.u || 0) + ' × ' + tr('film') : partyLabel(c.a || 0, c.k || 0);
    } else if (a.mode === 'flat') {
      amt = price * (c.u || 0);
      q = (c.u || 0) + ' × ' + (a.flatLabel ? tr(a.flatLabel).replace('/', '').trim() : tr('unit'));
    } else {
      amt = price * (c.a || 0) + Math.round(price * 0.5) * (c.k || 0);
      q = partyLabel(c.a || 0, c.k || 0);
    }
    total += amt;
    if (a.cat === 'adventure' && a.mode === 'pp' && amt > 0) {
      advSubtotal += amt;
      advIds.add(a.id);
    }
    lines.push({ label: a.name + (l.variant ? ' · ' + tr(l.variant) : '') + ' · ' + q, amt: money(amt) });
  }
  const advCount = advIds.size;

  const hasDiscount = advCount >= 3;
  const discount = hasDiscount ? Math.round(advSubtotal * 0.15) : 0;
  total -= discount;
  return { selActs, selLines, lines, hasDiscount, discount, total, advCount, advSubtotal, entry, entryIncludedBy, entryCovered: { a: coveredA, k: coveredK } };
}
