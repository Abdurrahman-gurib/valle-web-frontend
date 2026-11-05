import { tr } from '../i18n';

/**
 * The park photographer's tiers are named Bronze / Silver / Gold / Platinum in
 * the catalog, the same words as the Exclusive packages. Guests see them by
 * what they cover instead: "Photos · 2 activities". `act` is the tier's
 * activity count as the catalog writes it ("1 activity", "Full activities").
 */
const COUNTS: [string, number][] = [['1 activity', 1], ['2 activities', 2], ['3 activities', 3], ['4 activities', 4], ['5 activities', 5]];

/** The count in the catalog's text, which may already be translated ("نشاطان"); 0 for "Full activities". */
function activityCount(act: string): number {
  const known = COUNTS.find(([en]) => act === en || act === tr(en));
  if (known) return known[1];
  const n = parseInt(act, 10);
  return Number.isFinite(n) ? n : 0;
}

export function photoTierLabel(act: string | null | undefined): string {
  const n = activityCount(act ?? '');
  if (n === 1) return tr('Photos · 1 activity');
  if (n > 1) return tr('Photos · {n} activities', { n });
  return tr('Photos · all activities');
}

/** Display name of a catalog product: photo tiers by their activity count, the rest by name. */
export function productDisplayName(p: { family?: string; name: string; note?: string | null }): string {
  return p.family === 'photo' ? photoTierLabel(p.note) : p.name;
}
