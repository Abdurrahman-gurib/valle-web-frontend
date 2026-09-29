import { FX_FALLBACK, formatMoney, type FxTable } from './fx';
import { LANG_META, currentLang, tr } from '../i18n';

let displayCurrency = 'MUR';
let fxTable: FxTable = FX_FALLBACK;

/** Set by AppStoreProvider on every render; the store re-renders every price when it changes. */
export function setDisplayCurrency(code: string, table: FxTable): void {
  displayCurrency = code;
  fxTable = table;
}

/** A rupee amount in the visitor's display currency ("Rs 4,700", or "≈ € 88.22"). */
export function money(n: number): string {
  return formatMoney(n, displayCurrency, fxTable);
}

/** Always rupees: what is actually charged (pay buttons, receipts, the back office). */
export function mur(n: number): string {
  return 'Rs ' + n.toLocaleString('en-US');
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return n + ' ' + (n === 1 ? word : (pluralWord || word + 's'));
}

/** "2 adults · 1 child" party label, in the page's language. */
export function partyLabel(adults: number, kids: number): string {
  const a = adults === 1 ? tr('1 adult') : tr('{n} adults', { n: adults });
  const k = kids > 0 ? ' · ' + (kids === 1 ? tr('1 child') : tr('{n} children', { n: kids })) : '';
  return a + k;
}

const intl = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LANG_META[currentLang()].locale, opts);
const clean = (s: string) => s.replace(/\.$/, '').replace(/\.(?=\s|$)/g, '');

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
  const lang = currentLang();
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (lang !== 'en') {
      const dow = clean(intl({ weekday: 'short' }).format(d));
      out.push({
        i,
        dow: i === 0 ? tr('TODAY') : dow.toUpperCase(),
        dd: String(d.getDate()),
        mm: clean(intl({ month: 'short' }).format(d)).toUpperCase(),
        label: (i === 0 ? tr('Today') : dow) + ', ' + intl({ day: 'numeric', month: 'short' }).format(d),
        full: fullDateFromIso(toIso(d)),
        iso: toIso(d),
      });
      continue;
    }
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
  if (currentLang() !== 'en') return intl({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
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
