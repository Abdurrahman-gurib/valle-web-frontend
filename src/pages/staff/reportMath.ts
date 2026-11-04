import type { SalesSummary } from '../../lib/staffApi';

/** One term of the "how this adds up" line under the sales KPIs. */
export interface RevenuePart { label: string; amount: number; sign: 1 | -1 }

/**
 * Entry + experiences + packages & products + other − Explorer Pass − codes /
 * FOC = revenue. Zero terms are left out (except entry, which always opens the
 * sum); an older API without the split falls back to a single discount term.
 */
export function revenueParts(t: SalesSummary['totals']): RevenuePart[] {
  const parts: RevenuePart[] = [
    { label: 'ENTRY', amount: t.entryRevenue, sign: 1 },
    { label: 'EXPERIENCES', amount: t.experienceRevenue, sign: 1 },
    { label: 'PACKAGES & PRODUCTS', amount: t.productRevenue ?? 0, sign: 1 },
    { label: 'OTHER', amount: t.otherRevenue ?? 0, sign: 1 },
  ];
  if (t.passDiscounts !== undefined || t.offerDiscounts !== undefined) {
    parts.push({ label: 'EXPLORER PASS', amount: t.passDiscounts ?? 0, sign: -1 });
    parts.push({ label: 'CODES & FOC', amount: t.offerDiscounts ?? 0, sign: -1 });
  } else {
    parts.push({ label: 'DISCOUNTS', amount: t.discounts, sign: -1 });
  }
  return parts.filter((p, i) => i === 0 || p.amount !== 0);
}

/** The parts' sum, which the API guarantees equals the revenue. */
export const sumParts = (parts: RevenuePart[]): number => parts.reduce((s, p) => s + p.sign * p.amount, 0);
