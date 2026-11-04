import { describe, expect, it } from 'vitest';
import { computeBooking, emptyLines, fitSelToParty, linesOverParty, newLineCounts } from './booking';
import { eligibility, parseAgeLabel } from '../lib/ages';
import { partyLabel } from '../lib/format';
import { defaultRowQty, splitRowQty } from '../pages/Groups';
import { limitWarnings } from '../pages/booking/Waiver';
import type { Activity, Catalog, Product } from '../types';
import fallback from '../data/fallback.json';

const base = fallback as unknown as Catalog;
const product = (key: string, family: string, rr: number, name = key): Product => ({
  key, family, name, mode: 'pp', rr, nr: rr, dblRr: null, dblNr: null, rateOnly: null, image: '', note: '',
});
const withAge = (id: string, age: string): Activity => ({ ...(base.ACTS.find((a) => a.id === id) as Activity), age });
// the live catalog's labels (028 / 029): Pirate Ship 12+, Giant Swing 12+, Coaster 4–12
const catalog: Catalog = {
  ...base,
  ACTS: [...base.ACTS.filter((a) => !['pirate', 'coaster'].includes(a.id)).map((a) => (a.id === 'luge' ? { ...a, age: '6+' } : a)),
    withAge('pirate', '12+'), withAge('coaster', '4–12'), { ...withAge('luge', '12+'), id: 'giantswing', name: 'The Giant Swing' }],
  PRODUCTS: [product('expo:go', 'expo', 1975), product('pkg:senior:0', 'senior', 1100), product('student:0', 'student', 200, 'Entrance fee · visit of the park')],
};
const party = (adults: number, kids: number, infants = 0) => ({ adults, kids, infants });

describe('age labels (twin of the server parseAgeLabel)', () => {
  it('parses minimums, ranges and drive ages', () => {
    expect(parseAgeLabel('12+')).toEqual({ minAge: 12 });
    expect(parseAgeLabel('4–12')).toEqual({ minAge: 4, maxAge: 12 });
    expect(parseAgeLabel('16+ DRIVE')).toEqual({ driveMinAge: 16 });
    expect(parseAgeLabel('ALL AGES')).toEqual({});
  });
  it('keeps 6–11 children off a 12+ ride and adults off a kids ride by default', () => {
    expect(eligibility('12+').kids).toBe(false);
    expect(eligibility('8+').kids).toBe(true);
    expect(eligibility('4–12').kidsRide).toBe(true);
    expect(eligibility('4–12').infants).toBe(true);
  });
});

describe('new cart lines count eligible people only', () => {
  it('Giant Swing 12+ with a 6–11 child: adults only', () => {
    expect(newLineCounts(catalog, 'giantswing', party(2, 1))).toEqual({ a: 2, k: 0 });
  });
  it('a kids ride with kids: no adults at adult price', () => {
    expect(newLineCounts(catalog, 'coaster', party(2, 1))).toEqual({ a: 0, k: 1 });
  });
  it('a kids ride nobody fits: nobody, and the cart says so', () => {
    expect(newLineCounts(catalog, 'coaster', party(2, 0))).toEqual({ a: 0, k: 0 });
    const b = computeBooking(catalog, { coaster: { a: 0, k: 0 } }, 2, 0, 'rr');
    expect(emptyLines(b.selLines)).toEqual(['Roller Coaster Express']);
  });
});

describe('party changes follow the cart', () => {
  it('a line counting everyone keeps counting everyone; others are clamped', () => {
    const sel = { zipline: { a: 2, k: 1 }, luge: { a: 1, k: 0 } };
    const next = fitSelToParty(catalog, sel, party(2, 1), party(3, 2));
    expect(next.zipline).toEqual({ a: 3, k: 2 });
    expect(next.luge).toEqual({ a: 1, k: 0 });
    const fewer = fitSelToParty(catalog, sel, party(2, 1), party(1, 0));
    expect(fewer.zipline).toEqual({ a: 1, k: 0 });
    expect(fewer.luge).toEqual({ a: 1, k: 0 });
  });
  it('flags lines over the party by name', () => {
    const b = computeBooking(catalog, { zipline: { a: 3, k: 0 } }, 2, 0, 'rr');
    expect(linesOverParty(b.selLines, party(2, 0))).toEqual(['Zipline Adventures']);
  });
});

describe('park entry included only for the people a line covers', () => {
  it('senior packages include entry', () => {
    const b = computeBooking(catalog, { 'product:pkg:senior:0': { a: 2, k: 0 } }, 2, 0, 'rr');
    expect(b.entry).toBe(0);
    expect(b.entryIncludedBy).toBe('senior');
    expect(b.lines[0].label).toBe('Park entry · included with the senior package');
  });
  it('an expo deal for 2 of 4: the other two pay entry', () => {
    const b = computeBooking(catalog, { 'product:expo:go': { a: 2, k: 0 } }, 3, 1, 'rr');
    expect(b.entry).toBe(400 + 275);
    expect(b.lines[0].label).toBe('Park entry · 1 adult · 1 child');
    expect(b.total).toBe(400 + 275 + 2 * 1975);
  });
  it('under-6s are free and named on the entry line', () => {
    const b = computeBooking(catalog, {}, 2, 0, 'rr', 1);
    expect(b.entry).toBe(800);
    expect(b.lines[0].label).toBe('Park entry · 2 adults · 1 under 6');
  });
});

describe('party labels', () => {
  it('leave zero parts out and pluralise', () => {
    expect(partyLabel(0, 1)).toBe('1 child');
    expect(partyLabel(1, 0, 2)).toBe('1 adult · 2 under 6');
  });
});

describe('school rows', () => {
  const pupils = { under6: 4, kids: 20, teens: 10 };
  it('lunch 4–11 and Kids Park default to the under-12s, the 12+ lunch to the teens, the rest to pupils 6+', () => {
    expect(defaultRowQty({ name: 'Lunch menu · 4 to 11 yrs' }, pupils)).toBe(24);
    expect(defaultRowQty({ name: 'Lunch menu · 12 yrs and over' }, pupils)).toBe(10);
    expect(defaultRowQty({ name: 'Kids Park · Mini Quad' }, pupils)).toBe(24);
    expect(defaultRowQty({ name: 'Nepalese Bridge · 350 m' }, pupils)).toBe(30);
  });
  it('splits a row into the booking’s adults (12+) and children', () => {
    expect(splitRowQty({ name: 'Lunch menu · 12 yrs and over' }, 10, pupils)).toEqual({ adults: 10, kids: 0 });
    expect(splitRowQty({ name: 'Kids Park · Mini Quad' }, 24, pupils)).toEqual({ adults: 0, kids: 24 });
    expect(splitRowQty({ name: 'Nepalese Bridge · 350 m' }, 30, pupils)).toEqual({ adults: 10, kids: 20 });
  });
});

describe('waiver form warnings', () => {
  const zip = { name: 'Zipline Adventures', minAge: 8, bands: { adults: 'all', kids: 'none', infants: 'none' } } as const;
  const swing = { name: 'The Giant Swing', minAge: 12, bands: { adults: 'some', kids: 'none', infants: 'none' } } as const;
  it('a 4-year-old not on the zipline gets no zipline warning', () => {
    expect(limitWarnings([zip], 4, 100, 16)).toEqual([]);
  });
  it('rides only some of the party do are named once, for the gate', () => {
    const w = limitWarnings([{ ...swing, maxWeightKg: 85 }], 30, 180, 95);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('The Giant Swing');
  });
});
