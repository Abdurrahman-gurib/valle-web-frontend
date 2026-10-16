/**
 * Booking-funnel counter: anonymous step events (no cookies, no personal
 * data, no identifiers beyond a per-tab random id) so the team can see where
 * guests drop off. Sent with sendBeacon to POST /api/funnel; failures are
 * ignored. Steps: view_booking, pick_items, pick_date, details, submit,
 * booked, package_click, addon_add, suggestion_shown, suggestion_taken.
 */
export type FunnelStep =
  | 'view_booking' | 'pick_items' | 'pick_date' | 'details' | 'submit' | 'booked'
  | 'package_click' | 'addon_add' | 'suggestion_shown' | 'suggestion_taken';

const BASE = import.meta.env.VITE_API_URL || '/api';
let session = '';
const sent = new Set<string>();

function sid(): string {
  if (session) return session;
  try { session = sessionStorage.getItem('valle_fs') || ''; } catch { /* private mode */ }
  if (!session) {
    session = Math.random().toString(36).slice(2, 12);
    try { sessionStorage.setItem('valle_fs', session); } catch { /* ignore */ }
  }
  return session;
}

/** Records a step once per tab session (repeat calls are ignored), plus an optional short label (e.g. a package key). */
export function track(step: FunnelStep, label = ''): void {
  if (typeof window === 'undefined') return;
  const key = step + ':' + label;
  if (sent.has(key)) return;
  sent.add(key);
  const body = JSON.stringify({ step, label: label.slice(0, 60), sid: sid(), path: location.pathname.slice(0, 80) });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon(BASE + '/funnel', new Blob([body], { type: 'application/json' }));
    else void fetch(BASE + '/funnel', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
  } catch { /* never block the guest */ }
}
