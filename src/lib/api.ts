import type { BookingRequest, BookingResponse, Catalog, QuoteRequest } from '../types';
import type { FxTable } from './fx';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      if (body && body.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch { /* keep statusText */ }
    // status lets callers tell "the server said no" from "there was no server"
    throw Object.assign(new Error(msg || 'Request failed'), { status: res.status });
  }
  return res.json() as Promise<T>;
}

export function fetchCatalog(): Promise<Catalog> {
  return request<Catalog>('/catalog');
}

/** Indicative MUR exchange rates (Bank of Mauritius) for the currency picker. */
export function fetchFx(): Promise<FxTable> {
  return request<FxTable>('/fx');
}

export type BusyLevel = 'quiet' | 'busy' | 'very-busy' | 'full';
export interface SlotLoad { bookings: number; guests: number; level: BusyLevel }
export interface AvailabilityDay { date: string; morning: SlotLoad; afternoon: SlotLoad }

/** How busy each arrival slot already is, for `days` days from `from` (YYYY-MM-DD). */
export function fetchAvailability(from: string, days: number): Promise<AvailabilityDay[]> {
  return request<AvailabilityDay[]>(`/bookings/availability?from=${encodeURIComponent(from)}&days=${days}`);
}

/** GET /api/tickets/:ref?t= : the guest's ticket, from the QR / e-mail link. */
export interface TicketView {
  refCode: string; guestName: string; visitDate: string; slot: 'morning' | 'afternoon'; adults: number; kids: number;
  rate: string; payMode: string; status: string; total: number; lines: { label: string; amount: number }[]; ticketUrl: string; qrUrl: string;
}
export function fetchTicket(refCode: string, token: string): Promise<TicketView> {
  return request<TicketView>(`/tickets/${encodeURIComponent(refCode)}?t=${encodeURIComponent(token)}`);
}

export function createBooking(body: BookingRequest): Promise<BookingResponse> {
  return request<BookingResponse>('/bookings', { method: 'POST', body: JSON.stringify(body) });
}

export function createQuote(body: QuoteRequest): Promise<{ id: string }> {
  return request<{ id: string }>('/quotes', { method: 'POST', body: JSON.stringify(body) });
}
