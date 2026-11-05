/**
 * Privacy-friendly funnel events (Plausible). public/plausible-init.js decides
 * whether Plausible runs at all: only on the production hostnames and never on
 * the staff / HR back office. When it does not run, window.plausible is absent
 * and track() does nothing. Props are labels and counts only, never a name,
 * e-mail, phone or amount.
 */
export type AnalyticsEvent =
  | 'Package book'
  | 'Package prices'
  | 'Add to My Day'
  | 'Booking viewed'
  | 'Booking confirmed'
  | 'Quote sent'
  | 'Group booking sent'
  | 'Waiver signed'
  | 'Language switched'
  | 'Rate chosen';

export type AnalyticsProps = Record<string, string | number | boolean>;

type PlausibleFn = (event: string, options?: { props?: Record<string, string> }) => void;

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === 'undefined') return;
  const plausible = (window as unknown as { plausible?: PlausibleFn }).plausible;
  if (typeof plausible !== 'function') return;
  try {
    plausible(event, props ? { props: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, String(v)])) } : undefined);
  } catch { /* analytics must never break the page */ }
}
