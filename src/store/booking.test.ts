import { describe, expect, it } from 'vitest';
import { computeBooking, priceFor } from './booking';
import type { Activity, Catalog } from '../types';
import fallback from '../data/fallback.json';

const catalog = fallback as unknown as Catalog;

const act = (id: string): Activity => {
  const a = catalog.ACTS.find((x) => x.id === id);
  if (!a) throw new Error('missing fixture activity ' + id);
  return a;
};

describe('priceFor', () => {
  it('uses resident rate by default (null rate)', () => {
    expect(priceFor(catalog, act('zipline'), null)).toBe(875);
    expect(priceFor(catalog, act('zipline'), 'rr')).toBe(875);
  });

  it('uses non-resident rate when nr', () => {
    expect(priceFor(catalog, act('zipline'), 'nr')).toBe(1375);
    expect(priceFor(catalog, act('quad'), 'nr')).toBe(3600);
  });

  it('falls back to base price for non rate-dependent activities', () => {
    expect(priceFor(catalog, act('pirate'), 'rr')).toBe(350);
    expect(priceFor(catalog, act('pirate'), 'nr')).toBe(350);
  });
});

describe('computeBooking', () => {
  it('charges park entry only with empty selection', () => {
    const b = computeBooking(catalog, {}, 2, 1, 'rr');
    expect(b.total).toBe(2 * 500 + 250);
    expect(b.lines).toHaveLength(1);
    expect(b.lines[0].label).toBe('Park entry · 2 adults · 1 child');
    expect(b.hasDiscount).toBe(false);
  });

  it('prices per-person activities with half-price kids (rounded)', () => {
    // zipline rr 875: 2 adults + 1 kid = 1750 + round(437.5)=438 → 2188
    const b = computeBooking(catalog, { zipline: { a: 2, k: 1 } }, 2, 1, 'rr');
    expect(b.lines[1].label).toBe('Zipline Adventures · 2 adults · 1 child');
    expect(b.total).toBe(1250 + 2 * 875 + Math.round(875 * 0.5));
  });

  it('prices flat-mode activities per unit', () => {
    // buggy rr 6200 × 2 buggies
    const b = computeBooking(catalog, { buggy: { u: 2 } }, 1, 0, 'rr');
    expect(b.lines[1].label).toBe('Buggy · 2 × buggy');
    expect(b.total).toBe(500 + 2 * 6200);
  });

  it('applies the 15% Explorer Pass on 3+ adventure pp activities', () => {
    const sel = { zipline: { a: 2, k: 0 }, nepalese: { a: 2, k: 0 }, luge: { a: 2, k: 0 } };
    const b = computeBooking(catalog, sel, 2, 0, 'rr');
    const advSubtotal = 2 * 875 + 2 * 700 + 2 * 500;
    expect(b.hasDiscount).toBe(true);
    expect(b.discount).toBe(Math.round(advSubtotal * 0.15));
    expect(b.total).toBe(1000 + advSubtotal - Math.round(advSubtotal * 0.15));
  });

  it('does not discount with only 2 adventure activities', () => {
    const b = computeBooking(catalog, { zipline: { a: 2 }, luge: { a: 2 } }, 2, 0, 'rr');
    expect(b.hasDiscount).toBe(false);
    expect(b.discount).toBe(0);
  });

  it('does not count tours/flat items toward the Explorer Pass', () => {
    // 2 adventure pp + 1 flat adventure (buggy is adventure but flat) → no discount
    const sel = { zipline: { a: 1 }, luge: { a: 1 }, buggy: { u: 1 } };
    const b = computeBooking(catalog, sel, 1, 0, 'rr');
    expect(b.advCount).toBe(2);
    expect(b.hasDiscount).toBe(false);
  });

  it('uses non-resident prices when rate is nr', () => {
    const b = computeBooking(catalog, { zipline: { a: 1, k: 0 } }, 1, 0, 'nr');
    expect(b.total).toBe(500 + 1375);
  });
});
