import type { BookingRow } from '../../types';
import type { QuoteAlert } from '../../lib/chatClient';

/**
 * New bookings and quote requests arrive on the chat console's staff socket and
 * are re-broadcast on window, so the bookings panel and the stats strip need no
 * socket of their own.
 */
interface LiveEvents {
  'valle:booking-new': BookingRow;
  'valle:quote-new': QuoteAlert;
}

export function emitLive<K extends keyof LiveEvents>(name: K, detail: LiveEvents[K]): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Listens for one live event; returns the unsubscribe. */
export function onLive<K extends keyof LiveEvents>(name: K, fn: (detail: LiveEvents[K] | undefined) => void): () => void {
  const h = (e: Event) => { if (e instanceof CustomEvent) fn(e.detail); };
  window.addEventListener(name, h);
  return () => window.removeEventListener(name, h);
}

// ------------------------------------------------- the operator's own bookings

/**
 * A booking this operator just took in the New-booking drawer comes back on the
 * socket like any website booking. It is not news to them, so the toast and the
 * "just came in" banner skip it. The socket can announce it before the POST
 * answers, so the drawer registers what it is about to create (guest + date)
 * and then the reference it got.
 */
const ownRefs = new Set<string>();
let pending: { guestName: string; visitDate: string; until: number }[] = [];
const PENDING_MS = 30_000;

export function expectOwnBooking(guestName: string, visitDate: string, now = Date.now()): void {
  pending = pending.filter((p) => p.until > now);
  pending.push({ guestName: guestName.trim().toLowerCase(), visitDate, until: now + PENDING_MS });
}

export function markOwnBooking(refCode: string): void {
  ownRefs.add(refCode);
}

export function isOwnBooking(b: Pick<BookingRow, 'refCode' | 'guestName' | 'visitDate'>, now = Date.now()): boolean {
  if (ownRefs.has(b.refCode)) return true;
  const name = (b.guestName || '').trim().toLowerCase();
  return pending.some((p) => p.until > now && p.guestName === name && p.visitDate === b.visitDate);
}
