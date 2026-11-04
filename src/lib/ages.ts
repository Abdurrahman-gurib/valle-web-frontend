/**
 * Who in the party may ride what, from the catalog age labels ("8+", "4–12",
 * "16+ DRIVE", "ALL AGES"). Frontend twin of Backend/src/waivers/waiver-rules.ts
 * parseAgeLabel: keep the two in step.
 *
 * The party has three bands: adults (12+), children (6–11) and under 6.
 */

export interface AgeLimits {
  minAge?: number;
  maxAge?: number;
  /** "16+ DRIVE": younger guests ride as passengers. */
  driveMinAge?: number;
}

/** "8+" -> min 8; "3–12" -> 3..12; "16+ DRIVE" -> drive 16; "ALL AGES" -> none. */
export function parseAgeLabel(label: string | null | undefined): AgeLimits {
  const s = (label ?? '').toUpperCase();
  const range = s.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (range) return { minAge: Number(range[1]), maxAge: Number(range[2]) };
  const plus = s.match(/(\d+)\s*\+/);
  if (!plus) return {};
  return /DRIVE/.test(s) ? { driveMinAge: Number(plus[1]) } : { minAge: Number(plus[1]) };
}

export interface Eligibility {
  /** Adults (12+) may be counted on the line. */
  adults: boolean;
  /** Children 6–11 may be counted on the line. */
  kids: boolean;
  /** Under-6s may be counted on the line (as children). */
  infants: boolean;
  /** A kids' ride: adults are not counted by default. */
  kidsRide: boolean;
  limits: AgeLimits;
}

/**
 * Which bands of the party fit an experience. A 12+ minimum keeps every 6–11
 * child off (the band sits below it, as the server refuses); a ride capped below
 * 18 is a kids' ride; under-6s fit only a ride that starts below 6 and are never
 * counted by default (a toddler may be under the minimum).
 */
export function eligibility(ageLabel: string | null | undefined): Eligibility {
  const limits = parseAgeLabel(ageLabel);
  const { minAge, maxAge } = limits;
  const kidsRide = maxAge !== undefined && maxAge < 18;
  return {
    adults: maxAge === undefined || maxAge >= 12,
    kids: (minAge === undefined || minAge < 12) && (maxAge === undefined || maxAge >= 6),
    infants: minAge !== undefined && minAge < 6,
    kidsRide,
    limits,
  };
}

/** The counts a new cart line starts with: eligible people only. */
export function defaultCounts(el: Eligibility, party: { adults: number; kids: number; infants: number }): { a: number; k: number } {
  return {
    a: el.adults && !el.kidsRide ? party.adults : 0,
    k: el.kids ? party.kids : 0,
  };
}

/** Most people of each kind a line may count for this party. */
export function lineCaps(el: Eligibility, party: { adults: number; kids: number; infants: number }): { a: number; k: number } {
  return {
    a: el.adults ? party.adults : 0,
    k: (el.kids ? party.kids : 0) + (el.infants ? party.infants : 0),
  };
}
