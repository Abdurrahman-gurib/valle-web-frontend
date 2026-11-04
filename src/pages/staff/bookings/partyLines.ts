/**
 * The back office's rules for a party change, mirroring the API's
 * `fitLinesToParty` (Backend src/staff/bookings/booking-patch.ts) so the drawer
 * can show what a save will do before it is sent:
 *  - a count that covered the whole of its side of the old party (all the
 *    adults, all the children) follows the new party;
 *  - any other count is clamped to the new party;
 *  - per-unit lines are left alone; a line left with nobody on it is dropped.
 */

export interface Party { adults: number; kids: number }
export interface CountedLine { id: string; variant?: string; adults: number; kids: number; units: number }

export function fitLinesToParty<T extends CountedLine>(lines: T[], from: Party, to: Party): T[] {
  const fit = (v: number, old: number, next: number): number => {
    if (v <= 0) return 0;
    if (old > 0 && v === old) return next;
    return Math.min(v, next);
  };
  return lines
    .map((l) => (l.units > 0 && !l.adults && !l.kids
      ? l
      : { ...l, adults: fit(l.adults, from.adults, to.adults), kids: fit(l.kids, from.kids, to.kids) }))
    .filter((l) => l.adults + l.kids + l.units > 0);
}

/** One line whose head-count a save would change. `after` null = the line goes. */
export interface LineChange { id: string; variant?: string; before: string; after: string | null }

const key = (l: CountedLine) => l.id + '::' + (l.variant ?? '');
const count = (l: CountedLine) => (l.units > 0 && !l.adults && !l.kids ? `${l.units} unit${l.units === 1 ? '' : 's'}` : partyText(l.adults, l.kids));

export function lineChanges(before: CountedLine[], after: CountedLine[]): LineChange[] {
  const out: LineChange[] = [];
  for (const b of before) {
    const a = after.find((x) => key(x) === key(b));
    if (!a || a.adults !== b.adults || a.kids !== b.kids || a.units !== b.units) {
      out.push({ id: b.id, variant: b.variant, before: count(b), after: a ? count(a) : null });
    }
  }
  return out;
}

/**
 * "2 adults · 1 child", "1 child", "3 adults": zero parts hidden, plurals right.
 * Staff screens are English only, so this does not go through t().
 */
export function partyText(adults: number, kids: number): string {
  const parts = [
    adults > 0 ? `${adults} adult${adults === 1 ? '' : 's'}` : '',
    kids > 0 ? `${kids} child${kids === 1 ? '' : 'ren'}` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'nobody';
}

/** Party limits of one booking (the API's DTO); a bigger party is a group booking. */
export const MAX_ADULTS = 12;
export const MAX_KIDS = 12;
