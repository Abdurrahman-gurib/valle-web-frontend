/**
 * Cookie / storage notice.
 *
 * The site sets no advertising, analytics or third-party cookies. All it stores
 * is what it needs to work (essential): your rate (resident / visitor), My Day
 * selections, the chat visitor key and the chat intro flag (localStorage), the
 * Explore filters for the back button (sessionStorage).
 *
 * There is nothing optional to opt into, so the banner is a notice: it asks
 * once, and the acknowledgement is stored in localStorage under CONSENT_KEY as
 * { level, at }. Only 'essential' is written now; 'all' is still read so that
 * visitors who answered the earlier two-choice banner are not asked again.
 */
export type ConsentLevel = 'all' | 'essential';
export interface Consent { level: ConsentLevel; at: string }

export const CONSENT_KEY = 'valle_consent';
export const CONSENT_VERSION = 1;
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
  return c;
}

/** Reopen the consent panel (footer "Cookie settings"). */
export const openConsentSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));
export function onConsentOpen(fn: () => void): () => void {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
}
