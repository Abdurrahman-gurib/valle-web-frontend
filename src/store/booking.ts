import type { Activity, BookingSummary, Catalog, RateKey, Sel } from '../types';
import { money, partyLabel } from '../lib/format';

/** Rate-aware "from" price for an activity. Defaults to resident (rr) until a rate is chosen. */
export function priceFor(catalog: Catalog, act: Activity, rate: RateKey | null): number {
  const rp = catalog.RATEP[act.id];
  if (!rp) return act.price;
  return rate === 'nr' ? rp[1] : rp[0];
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
): BookingSummary {
  const selActs = catalog.ACTS.filter((a) => sel[a.id]);
  const lines: { label: string; amt: string }[] = [];
  const entry = catalog.ENTRY_A * adults + catalog.ENTRY_C * kids;
  lines.push({ label: 'Park entry · ' + partyLabel(adults, kids), amt: money(entry) });
  let total = entry;
  let advSubtotal = 0;
  let advCount = 0;

  for (const a of selActs) {
    const c = sel[a.id] || {};
    const price = priceFor(catalog, a, rate);
    let amt = 0;
    let q = '';
    if (a.mode === 'flat') {
      amt = price * (c.u || 0);
      q = (c.u || 0) + ' × ' + (a.flatLabel ? a.flatLabel.replace('/', '').trim() : 'unit');
    } else {
      amt = price * (c.a || 0) + Math.round(price * 0.5) * (c.k || 0);
      q = partyLabel(c.a || 0, c.k || 0);
    }
    total += amt;
    if (a.cat === 'adventure' && a.mode === 'pp' && amt > 0) {
      advSubtotal += amt;
      advCount++;
    }
    lines.push({ label: a.name + ' · ' + q, amt: money(amt) });
  }

  const hasDiscount = advCount >= 3;
  const discount = hasDiscount ? Math.round(advSubtotal * 0.15) : 0;
  total -= discount;
  return { selActs, lines, hasDiscount, discount, total, advCount };
}
