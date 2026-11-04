import { describe, expect, it } from 'vitest';
import { fitLinesToParty, lineChanges, partyText } from './bookings/partyLines';
import { filterArrivals, refFromScan } from './GatePanel';
import { applyParams } from './urlState';
import { filtersFromParams, filtersToParams, normaliseSearch, STATUS_OPTIONS } from './bookings/BookingFilters';
import { expectOwnBooking, isOwnBooking, markOwnBooking } from './liveEvents';
import { revenueParts, sumParts } from './reportMath';
import { conflictKind } from './bookings/BookingDrawer';
import { partyLimitHint } from './bookings/BookingEditForm';
import { methodText } from './reportUi';
import type { GateDayRow, SalesSummary } from '../../lib/staffApi';

describe('party changes fit the activity lines', () => {
  const zipline = { id: 'zipline', adults: 2, kids: 2, units: 0 };
  const pirate = { id: 'pirate', adults: 0, kids: 2, units: 0 };
  const buggy = { id: 'buggy', adults: 0, kids: 0, units: 1 };

  it('2 + 2 → 3 + 1: whole-party lines follow, others are clamped, units stay', () => {
    const out = fitLinesToParty([zipline, pirate, buggy], { adults: 2, kids: 2 }, { adults: 3, kids: 1 });
    expect(out).toEqual([{ ...zipline, adults: 3, kids: 1 }, { ...pirate, kids: 1 }, buggy]);
  });

  it('drops a children-only line when no children are left, and lists what changes', () => {
    const before = [zipline, pirate];
    const after = fitLinesToParty(before, { adults: 2, kids: 2 }, { adults: 2, kids: 0 });
    expect(after).toEqual([{ ...zipline, kids: 0 }]);
    expect(lineChanges(before, after)).toEqual([
      { id: 'zipline', variant: undefined, before: '2 adults · 2 children', after: '2 adults' },
      { id: 'pirate', variant: undefined, before: '2 children', after: null },
    ]);
  });

  it('never adds new children to a line that had none', () => {
    const out = fitLinesToParty([{ id: 'zipline', adults: 2, kids: 0, units: 0 }], { adults: 2, kids: 0 }, { adults: 2, kids: 1 });
    expect(out[0].kids).toBe(0);
  });

  it('reads a party the way staff say it', () => {
    expect(partyText(0, 1)).toBe('1 child');
    expect(partyText(1, 0)).toBe('1 adult');
    expect(partyText(2, 3)).toBe('2 adults · 3 children');
  });

  it('says the limit instead of silently clamping 15 to 12', () => {
    expect(partyLimitHint('15', 12, 'adults')).toMatch(/At most 12 adults.*group booking/);
    expect(partyLimitHint('12', 12, 'adults')).toBeUndefined();
  });
});

describe('gate lookup', () => {
  it('accepts a reference in any case, with spaces or dashes', () => {
    expect(refFromScan('VAL-2857-26')).toBe('VAL-2857-26');
    expect(refFromScan('val-2857-26')).toBe('VAL-2857-26');
    expect(refFromScan('VAL 2857 26')).toBe('VAL-2857-26');
    expect(refFromScan('https://valle.example/ticket/VAL-2857-26?t=x')).toBe('VAL-2857-26');
    // a bare number, a name: those go through the search
    expect(refFromScan('2857')).toBeNull();
    expect(refFromScan('Peirce')).toBeNull();
  });

  it("filters today's arrivals by every typed word", () => {
    const rows = [
      { refCode: 'VAL-2857-26', guestName: 'Ana Peirce' },
      { refCode: 'VAL-1111-26', guestName: 'Omar Rahman' },
    ] as GateDayRow[];
    expect(filterArrivals(rows, '  ana   2857 ').map((r) => r.refCode)).toEqual(['VAL-2857-26']);
    expect(filterArrivals(rows, '')).toHaveLength(2);
  });
});

describe('bookings list state in the URL', () => {
  it('round-trips filters, and "no filter" leaves the URL clean', () => {
    const p = applyParams(new URLSearchParams('tab=gate'), { ...filtersToParams({ status: 'postponed', from: '2026-11-04', slot: 'all', sort: 'newest' }), q: 'ana', open: 'VAL-2857-26' });
    expect(p.toString()).toBe('tab=gate&status=postponed&from=2026-11-04&q=ana&open=VAL-2857-26');
    expect(filtersFromParams(p)).toMatchObject({ status: 'postponed', from: '2026-11-04', to: '', slot: 'all', sort: 'newest' });
    expect(applyParams(p, { open: null, q: '' }).has('open')).toBe(false);
  });

  it('collapses spaces in the search and offers every API status', () => {
    expect(normaliseSearch('  VAL   2857  26 ')).toBe('VAL 2857 26');
    expect(STATUS_OPTIONS.map((s) => s.value)).toEqual(['confirmed', 'arrived', 'postponed', 'cancelled']);
  });
});

describe("the operator's own booking", () => {
  it('is recognised before the POST answers (guest + date) and after (reference)', () => {
    const now = 1_000_000;
    expectOwnBooking('Ana Peirce ', '2026-11-04', now);
    expect(isOwnBooking({ refCode: 'VAL-1-26', guestName: 'ana peirce', visitDate: '2026-11-04' }, now + 1000)).toBe(true);
    expect(isOwnBooking({ refCode: 'VAL-1-26', guestName: 'ana peirce', visitDate: '2026-11-04' }, now + 60_000)).toBe(false);
    markOwnBooking('VAL-2-26');
    expect(isOwnBooking({ refCode: 'VAL-2-26', guestName: 'x', visitDate: '2026-11-05' })).toBe(true);
    expect(isOwnBooking({ refCode: 'VAL-3-26', guestName: 'Someone', visitDate: '2026-11-04' }, now + 1000)).toBe(false);
  });
});

describe('sales: how the revenue adds up', () => {
  it('entry + experiences + products + other − discounts = revenue, zero terms hidden', () => {
    const t = {
      revenue: 15000, entryRevenue: 4000, experienceRevenue: 9000, productRevenue: 3000, otherRevenue: 300,
      discounts: 1300, passDiscounts: 500, offerDiscounts: 800,
    } as SalesSummary['totals'];
    const parts = revenueParts(t);
    expect(sumParts(parts)).toBe(15000);
    expect(revenueParts({ ...t, otherRevenue: 0, productRevenue: 0, experienceRevenue: 12300 }).map((p) => p.label)).toEqual(['ENTRY', 'EXPERIENCES', 'EXPLORER PASS', 'CODES & FOC']);
  });

  it('names payment methods the way the till does', () => {
    expect(methodText('cash+card')).toBe('Cash + Card');
    expect(methodText('transfer')).toBe('Bank transfer');
  });
});

describe('409 from the booking API', () => {
  const err = (body: Record<string, unknown>, message = 'x') => Object.assign(new Error(message), { status: 409, body });
  it('tells a stale save from a waiver block', () => {
    expect(conflictKind(err({ code: 'STALE_BOOKING' }))).toBe('stale');
    expect(conflictKind(err({ code: 'WAIVERS_MISSING', missing: 4 }))).toBe('waivers');
    expect(conflictKind(Object.assign(new Error('nope'), { status: 400 }))).toBeNull();
  });
});
