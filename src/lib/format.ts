export function money(n: number): string {
  return 'Rs ' + n.toLocaleString('en-US');
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return n + ' ' + (n === 1 ? word : (pluralWord || word + 's'));
}

/** "2 adults · 1 child" party label */
export function partyLabel(adults: number, kids: number): string {
  return (
    adults + ' adult' + (adults > 1 ? 's' : '') +
    (kids > 0 ? ' · ' + kids + ' child' + (kids > 1 ? 'ren' : '') : '')
  );
}

const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface DateOpt {
  i: number;
  dow: string;    // "TODAY" | "MON" ...
  dd: string;
  mm: string;     // "JAN"
  label: string;  // "Today, 6 Aug"
  full: string;   // "Thu 6 Aug 2026"
  iso: string;    // "2026-08-06"
}

export function dateOpts(days = 14): DateOpt[] {
  const out: DateOpt[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      i,
      dow: i === 0 ? 'TODAY' : DOWS[d.getDay()].toUpperCase(),
      dd: String(d.getDate()),
      mm: MONS[d.getMonth()].toUpperCase(),
      label: (i === 0 ? 'Today' : DOWS[d.getDay()]) + ', ' + d.getDate() + ' ' + MONS[d.getMonth()],
      full: DOWS[d.getDay()] + ' ' + d.getDate() + ' ' + MONS[d.getMonth()] + ' ' + d.getFullYear(),
      iso: toIso(d),
    });
  }
  return out;
}

export function toIso(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function todayIso(): string {
  return toIso(new Date());
}

/** Format an ISO date as "Thu 6 Aug 2026"; returns '' when invalid. */
export function fullDateFromIso(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return DOWS[d.getDay()] + ' ' + d.getDate() + ' ' + MONS[d.getMonth()] + ' ' + d.getFullYear();
}

export const NATC: Record<string, string> = {
  'Mauritius': '+230',
  'Réunion / France': '+262',
  'United Kingdom': '+44',
  'Germany': '+49',
  'Italy': '+39',
  'India': '+91',
  'China': '+86',
  'South Africa': '+27',
  'UAE': '+971',
  'Australia': '+61',
  'USA': '+1',
};
