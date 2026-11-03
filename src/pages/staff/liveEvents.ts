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
