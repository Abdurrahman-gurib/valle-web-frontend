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
  /** Older API versions may not send these. */
  waiverUrl?: string; waiversSigned?: number; waiversRequired?: number;
}
export function fetchTicket(refCode: string, token: string): Promise<TicketView> {
  return request<TicketView>(`/tickets/${encodeURIComponent(refCode)}?t=${encodeURIComponent(token)}`);
}

/** GET/POST /api/tickets/:ref/waivers?t= : the party's digital waivers. */
export interface WaiverActivity { name: string; minAge?: number; maxAge?: number; driveMinAge?: number; minWeightKg?: number; maxWeightKg?: number; minHeightCm?: number; maxHeightCm?: number }
export interface WaiverView {
  refCode: string; guestName: string; visitDate: string; slot: 'morning' | 'afternoon';
  required: number; signed: { participantName: string; isMinor: boolean; signedAt: string }[];
  open: boolean; termsVersion: string; activities: WaiverActivity[];
}
export interface WaiverRequest {
  participantName: string; birthDate: string; heightCm: number; weightKg: number; guardianName?: string;
  address?: string; email?: string; phone: string; nationality: string; idNumber?: string; marketingConsent?: boolean;
  emergencyName: string; emergencyPhone: string; medicalNotes?: string;
  declarations: { terms: boolean; health: boolean; consent: boolean };
  signature: string; lang?: string;
}
const waiverPath = (refCode: string, token: string) => `/tickets/${encodeURIComponent(refCode)}/waivers?t=${encodeURIComponent(token)}`;
export function fetchWaivers(refCode: string, token: string): Promise<WaiverView> {
  return request<WaiverView>(waiverPath(refCode, token));
}
export function signWaiver(refCode: string, token: string, body: WaiverRequest): Promise<WaiverView> {
  return request<WaiverView>(waiverPath(refCode, token), { method: 'POST', body: JSON.stringify(body) });
}

export function createBooking(body: BookingRequest): Promise<BookingResponse> {
  return request<BookingResponse>('/bookings', { method: 'POST', body: JSON.stringify(body) });
}

export function createQuote(body: QuoteRequest): Promise<{ id: string }> {
  return request<{ id: string }>('/quotes', { method: 'POST', body: JSON.stringify(body) });
}
