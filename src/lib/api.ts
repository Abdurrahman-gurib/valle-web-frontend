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

export type BusyLevel = 'quiet' | 'busy' | 'very-busy' | 'full' | 'closed';
export interface SlotLoad { bookings: number; guests: number; level: BusyLevel; closure?: { kind: 'closed' | 'maintenance' | 'private'; reason: string } }
export interface AvailabilityDay {
  date: string; morning: SlotLoad; afternoon: SlotLoad;
  /** Only experiences with a capacity: how full each slot is for them. */
  activities?: Record<string, { morning: 'quiet' | 'busy' | 'full'; afternoon: 'quiet' | 'busy' | 'full' }>;
  /** Experiences that run in timed sessions: each start time and how full it is. */
  sessions?: Record<string, { durationMin: number; times: Record<string, 'quiet' | 'busy' | 'full'> }>;
}

/** POST /api/bookings/hold: keeps the party's places for a few minutes while the form is filled in. */
export interface HoldRequest { visitDate: string; slot: 'morning' | 'afternoon'; adults: number; kids: number; items: { id: string; adults?: number; kids?: number; units?: number; time?: string }[]; holdId?: string }
export function createHold(body: HoldRequest): Promise<{ holdId: string; expiresAt: string }> {
  return request<{ holdId: string; expiresAt: string }>('/bookings/hold', { method: 'POST', body: JSON.stringify(body) });
}
export function releaseHold(holdId: string): Promise<void> {
  return request<void>(`/bookings/hold/${encodeURIComponent(holdId)}`, { method: 'DELETE' }).catch(() => undefined);
}

/** How busy each arrival slot already is, for `days` days from `from` (YYYY-MM-DD). */
export function fetchAvailability(from: string, days: number): Promise<AvailabilityDay[]> {
  return request<AvailabilityDay[]>(`/bookings/availability?from=${encodeURIComponent(from)}&days=${days}`);
}

/** GET /api/tickets/:ref?t= : the guest's ticket, from the QR / e-mail link. */
export interface TicketView {
  refCode: string; guestName: string; visitDate: string; slot: 'morning' | 'afternoon'; adults: number; kids: number;
  rate: string; payMode: string; status: string; total: number; ticketUrl: string; qrUrl: string;
  lines: { label: string; amount: number; experienceId?: string | null; productKey?: string | null; variant?: string; adults?: number; kids?: number; units?: number; time?: string | null }[];
  /** Older API versions may not send these. */
  waiverUrl?: string; waiversSigned?: number; waiversRequired?: number;
  paidAmount?: number; balance?: number; adjustmentAmount?: number; adjustmentNote?: string; couponCode?: string; receiptUrl?: string; postponedFrom?: string | null;
  /** School / company / club booking. */
  group?: { kind: string; organisation: string; leaderName: string; participants: { name: string; age?: number | null }[]; depositAmount: number };
}
export function fetchTicket(refCode: string, token: string): Promise<TicketView> {
  return request<TicketView>(`/tickets/${encodeURIComponent(refCode)}?t=${encodeURIComponent(token)}`);
}
/** PATCH /api/tickets/:ref/booking?t= : the guest changes date, slot, party or experiences. */
export interface GuestChange { visitDate?: string; slot?: 'morning' | 'afternoon'; adults?: number; kids?: number; items?: { id: string; variant?: string; adults?: number; kids?: number; units?: number; time?: string }[] }
export function changeBooking(refCode: string, token: string, body: GuestChange): Promise<TicketView> {
  return request<TicketView>(`/tickets/${encodeURIComponent(refCode)}/booking?t=${encodeURIComponent(token)}`, { method: 'PATCH', body: JSON.stringify(body) });
}
export function cancelBooking(refCode: string, token: string, reason?: string): Promise<TicketView> {
  return request<TicketView>(`/tickets/${encodeURIComponent(refCode)}/cancel?t=${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ reason }) });
}

/** GET /api/coupons/:code : what a promo code gives today (404 when it cannot be used). */
export interface CouponOffer { code: string; kind: 'percent' | 'amount' | 'foc' | 'entry_free'; value: number; note: string }
export function checkCoupon(code: string): Promise<CouponOffer> {
  return request<CouponOffer>(`/coupons/${encodeURIComponent(code.trim().toUpperCase())}`);
}

/** GET/POST /api/tickets/:ref/waivers?t= : the party's digital waivers. */
export interface WaiverActivity { name: string; minAge?: number; maxAge?: number; driveMinAge?: number; minWeightKg?: number; maxWeightKg?: number; minHeightCm?: number; maxHeightCm?: number }
export interface WaiverView {
  refCode: string; guestName: string; visitDate: string; slot: 'morning' | 'afternoon';
  required: number; signed: { id: string; participantName: string; isMinor: boolean; signedAt: string }[];
  open: boolean; termsVersion: string; activities: WaiverActivity[];
  /** after signing: whether the guest's copy went out */
  copy?: { email: boolean; whatsapp: boolean };
  /** a group booking: the leader signs one pack for these participants */
  group?: { leaderName: string; participants: string[] } | null;
}
export interface WaiverRequest {
  participantName: string; birthDate: string; heightCm: number; weightKg: number; guardianName?: string;
  address?: string; email?: string; phone: string; nationality: string; idNumber?: string; marketingConsent?: boolean;
  emergencyName: string; emergencyPhone: string; medicalNotes?: string;
  declarations: { terms: boolean; health: boolean; consent: boolean };
  signature: string; lang?: string;
  /** group leader's pack: the participants this signature covers */
  groupParticipants?: string[];
}
/** PDF copy of one signed waiver. */
export const waiverPdfUrl = (refCode: string, id: string, token: string) => `${BASE}/tickets/${encodeURIComponent(refCode)}/waivers/${encodeURIComponent(id)}.pdf?t=${encodeURIComponent(token)}`;
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

// ---- online payment (hosted checkout through the configured provider) ----
export interface PaymentConfig { enabled: boolean; provider: string | null }
let paymentConfig: Promise<PaymentConfig> | null = null;
/** Whether the API offers online payment right now; cached for the page's life, off when the API is away. */
export function fetchPaymentConfig(): Promise<PaymentConfig> {
  if (!paymentConfig) paymentConfig = request<PaymentConfig>('/payments/config').catch(() => ({ enabled: false, provider: null }));
  return paymentConfig;
}
export interface PaymentStatus {
  id: string; status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'; amount: number; refundedAmount: number; provider: string; settledAt: string | null;
  booking: { refCode: string; total: number; paidAmount: number; balance: number };
}
export function fetchPaymentStatus(id: string, token: string): Promise<PaymentStatus> {
  return request<PaymentStatus>(`/payments/${encodeURIComponent(id)}/status?t=${encodeURIComponent(token)}`);
}
/** Opens a checkout for what the booking still owes (from the ticket page). */
export function startCheckout(refCode: string, token: string): Promise<{ paymentId: string; checkoutUrl: string }> {
  return request<{ paymentId: string; checkoutUrl: string }>('/payments/checkout', { method: 'POST', body: JSON.stringify({ refCode, t: token }) });
}

export function createQuote(body: QuoteRequest): Promise<{ id: string }> {
  return request<{ id: string }>('/quotes', { method: 'POST', body: JSON.stringify(body) });
}
