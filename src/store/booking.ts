import type { Activity, BookingSummary, Catalog, RateKey, Sel, SelLine } from '../types';
import { money, partyLabel } from '../lib/format';
import { parseSelKey } from '../lib/sel';

/** Rate-aware "from" price for an activity. Defaults to resident (rr) until a rate is chosen. */
export function priceFor(catalog: Catalog, act: Activity, rate: RateKey | null): number {
  const rp = catalog.RATEP[act.id];
  if (!rp) return act.price;
  return rate === 'nr' ? rp[1] : rp[0];
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
): BookingSummary {
  // Lines in catalog order (then key order), each priced by its option when one was chosen.
  const selLines: SelLine[] = [];
  const keys = Object.keys(sel);
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
  const entry = catalog.ENTRY_A * adults + catalog.ENTRY_C * kids;
  lines.push({ label: 'Park entry · ' + partyLabel(adults, kids), amt: money(entry) });
  let total = entry;
  let advSubtotal = 0;
  const advIds = new Set<string>();

  for (const l of selLines) {
    const a = l.act;
    const c = l.qty;
    const price = l.price;
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
      advIds.add(a.id);
    }
    lines.push({ label: a.name + (l.variant ? ' · ' + l.variant : '') + ' · ' + q, amt: money(amt) });
  }
  const advCount = advIds.size;

  const hasDiscount = advCount >= 3;
  const discount = hasDiscount ? Math.round(advSubtotal * 0.15) : 0;
  total -= discount;
  return { selActs, selLines, lines, hasDiscount, discount, total, advCount };
}
