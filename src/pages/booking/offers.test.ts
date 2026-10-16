import { describe, expect, it } from 'vitest';
import { bestValue, comboSwap, extras } from './offers';
import { computeBooking } from '../../store/booking';
import type { Catalog, Sel } from '../../types';
import fallback from '../../data/fallback.json';

const catalog = fallback as unknown as Catalog;

describe('booking offers', () => {
  it('shows one package per family at the rate, badging the catalog favourite', () => {
    const nr = bestValue(catalog, 'nr');
    expect(nr.map((b) => b.family)).toEqual(['ls', 'ex', 'diamond', 'combo']);
    expect(nr[0].product.key).toBe('pkg:ls:1');
    expect(nr[0].popular).toBe(true);
    const rr = bestValue(catalog, 'rr').map((b) => b.family);
    expect(rr).toContain('resident');
    expect(rr).not.toContain('diamond');
  });

  it('offers a combo only when it covers the same single-seat lines and is cheaper', () => {
    const sel: Sel = { 'quad::Quad Adventure 1 h · standard, single': { a: 2, k: 0 }, 'zipline::Discovery Tour · 1.6 km, 7 lines': { a: 2, k: 0 } };
    const s = comboSwap(catalog, sel, 2, 0, 'nr');
    expect(s?.product.key).toBe('combo:0');
    const after: Sel = { 'product:combo:0': { a: 2, k: 0 } };
    expect(s?.save).toBe(computeBooking(catalog, sel, 2, 0, 'nr').total - computeBooking(catalog, after, 2, 0, 'nr').total);
    expect(s!.save).toBeGreaterThan(0);
    // different party per line, or a double quad: no suggestion
    expect(comboSwap(catalog, { ...sel, 'zipline::Discovery Tour · 1.6 km, 7 lines': { a: 1 } }, 2, 0, 'nr')).toBeNull();
    expect(comboSwap(catalog, { 'quad::Quad Adventure 1 h · standard, double': { a: 2 }, 'zipline::Discovery Tour · 1.6 km, 7 lines': { a: 2 } }, 2, 0, 'nr')).toBeNull();
  });

  it('prices extras for the party from the cart rules', () => {
    const x = extras(catalog, {}, 2, 1, 'rr');
    const swing = x.find((e) => e.kind === 'swing');
    expect(swing?.amount).toBe(2500 * 2 + 1250);
    expect(x.find((e) => e.kind === 'photo')?.key).toBe('product:photo:rr:0');
    expect(extras(catalog, { 'swing::Swing Experience': { a: 1 } }, 2, 0, 'rr').some((e) => e.kind === 'swing')).toBe(false);
  });
});
