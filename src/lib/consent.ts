/**
 * Cookie / storage consent.
 *
 * The site sets no advertising or third-party cookies. What it stores:
 *   essential  - your rate (resident / visitor), My Day selections, the chat
 *                visitor key and the chat intro flag (localStorage), the
 *                Explore filters for the back button (sessionStorage).
 *   analytics  - Sentry performance tracing and the short on-error replay,
 *                which set Sentry's own cookies/storage. Error reports
 *                themselves (no PII) are sent regardless, to keep the site up.
 *
 * The choice is stored in localStorage under CONSENT_KEY as { level, at } and
 * the "valle:consent" event is dispatched on every change.
 */
export type ConsentLevel = 'all' | 'essential';
export interface Consent { level: ConsentLevel; at: string }

export const CONSENT_KEY = 'valle_consent';
export const CONSENT_VERSION = 1;
const EVENT = 'valle:consent';
const OPEN_EVENT = 'valle:consent-open';

export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent & { v?: number };
    if (c.v !== CONSENT_VERSION || (c.level !== 'all' && c.level !== 'essential')) return null;
    return { level: c.level, at: c.at };
  } catch {
    return null;
  }
}

export function setConsent(level: ConsentLevel): Consent {
  const c: Consent = { level, at: new Date().toISOString() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...c, v: CONSENT_VERSION })); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: c }));
  return c;
}

export const analyticsAllowed = (): boolean => getConsent()?.level === 'all';

export function onConsentChange(fn: (c: Consent) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<Consent>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

/** Reopen the consent panel (footer "Cookie settings"). */
export const openConsentSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));
export function onConsentOpen(fn: () => void): () => void {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
}
