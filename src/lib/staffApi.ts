import type {
  BookingDetail, BookingDetailLine, BookingRow, BookingStatus, ChatMessage, ConversationStatus,
  ConversationSummary, Paged, PayMode, QuoteRow, RateKey, SlotKey, StaffStats, StaffUser,
} from '../types';

const BASE = import.meta.env.VITE_API_URL || '/api';

/** Where an expired / missing staff session sends the operator. */
export const STAFF_LOGIN_PATH = '/staff/login';

let onUnauthorized: () => void = () => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === STAFF_LOGIN_PATH) return;
  window.location.assign(STAFF_LOGIN_PATH);
};

/**
 * StaffAuth swaps the hard redirect for a router navigation once it is mounted,
 * so a 401 mid-session drops straight back to the sign-in card.
 */
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

export interface HttpError extends Error { status: number }

/** True when the failure came from the server rather than from a dead network. */
export function isHttpError(e: unknown): e is HttpError {
  return e instanceof Error && typeof (e as HttpError).status === 'number';
}

interface Opts {
  /** Auth probes and the login POST handle their own 401 instead of redirecting. */
  allow401?: boolean;
}

async function request<T>(path: string, init?: RequestInit, opts?: Opts): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    if (res.status === 401 && !opts?.allow401) onUnauthorized();
    let msg = res.statusText;
    try {
      const body = await res.json();
      if (body && body.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch { /* keep statusText */ }
    throw Object.assign(new Error(msg || 'Request failed'), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? '?' + s : '';
}

// ---- auth ----

export function staffLogin(email: string, password: string): Promise<StaffUser> {
  return request<StaffUser>('/staff/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, { allow401: true });
}

export function staffLogout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/staff/auth/logout', { method: 'POST' }, { allow401: true });
}

/** Resolves with the signed-in staff user, or rejects with a 401 HttpError. */
export function staffMe(): Promise<StaffUser> {
  return request<StaffUser>('/staff/auth/me', undefined, { allow401: true });
}

// ---- bookings ----

export interface BookingQuery {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export function listBookings(query: BookingQuery = {}): Promise<Paged<BookingRow>> {
  return request<Paged<BookingRow>>('/staff/bookings' + qs({ ...query }));
}

/**
 * One recorded change. `from`/`to` arrive as whatever JSON scalar the column
 * held, so they stay `unknown` and are formatted at the render site rather than
 * being cast to a shape the server never promised.
 */
export interface BookingAuditChange {
  from: unknown;
  to: unknown;
}

/** One row of `booking_audit`, most recent first, capped at 20 by the server. */
export interface BookingAuditEntry {
  at: string;
  staffEmail: string;
  action: string;
  changes: Record<string, BookingAuditChange>;
}

/**
 * `GET /api/staff/bookings/:refCode`. The note and the audit trail are staff-only
 * and are optional here so the drawer keeps working against an API that has not
 * shipped them yet.
 */
export interface BookingDetailFull extends BookingDetail {
  staffNote?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  audit?: BookingAuditEntry[];
}

/**
 * Body of `PATCH /api/staff/bookings/:refCode`. Every field is optional and at
 * least one is required; the server re-prices from its own catalogue whenever
 * `adults`, `kids` or `rate` move, so no total is ever sent from here.
 */
export interface BookingPatch {
  visitDate?: string;
  slot?: SlotKey;
  adults?: number;
  kids?: number;
  rate?: RateKey;
  guestName?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  payMode?: PayMode;
  status?: BookingStatus;
  staffNote?: string;
}

/** The updated row plus its re-priced lines (and the fresh audit when sent). */
export interface BookingUpdated extends BookingRow {
  lines?: BookingDetailLine[];
  staffNote?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  audit?: BookingAuditEntry[];
}

export function getBooking(refCode: string): Promise<BookingDetailFull> {
  return request<BookingDetailFull>('/staff/bookings/' + encodeURIComponent(refCode));
}

/** Full edit. Send only the fields that actually changed. */
export function updateBooking(refCode: string, patch: BookingPatch): Promise<BookingUpdated> {
  return request<BookingUpdated>('/staff/bookings/' + encodeURIComponent(refCode), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function setBookingStatus(refCode: string, status: BookingStatus): Promise<BookingUpdated> {
  return updateBooking(refCode, { status });
}

// ---- quotes & stats ----

export function listQuotes(page = 1, pageSize = 20): Promise<Paged<QuoteRow>> {
  return request<Paged<QuoteRow>>('/staff/quotes' + qs({ page, pageSize }));
}

export function getStats(): Promise<StaffStats> {
  return request<StaffStats>('/staff/stats');
}

// ---- chat (staff side; used for first paint and as the socket fallback) ----

export function listConversations(status?: ConversationStatus): Promise<{ items: ConversationSummary[] }> {
  return request<{ items: ConversationSummary[] }>('/staff/chat/conversations' + qs({ status }));
}

/**
 * Socket-free reply path. The console uses this whenever the websocket is not
 * connected, so an operator can still answer during a network blip; the server
 * fans the message out over the gateway to any visitor who IS connected.
 */
export function postStaffMessage(conversationId: string, body: string): Promise<{ message: ChatMessage }> {
  return request<{ message: ChatMessage }>(
    `/staff/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', body: JSON.stringify({ body }) },
  );
}

export function closeConversation(conversationId: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(
    `/staff/chat/conversations/${encodeURIComponent(conversationId)}/close`,
    { method: 'POST' },
  );
}

export function listConversationMessages(id: string): Promise<{ messages: ChatMessage[] }> {
  return request<{ messages: ChatMessage[] }>('/staff/chat/conversations/' + encodeURIComponent(id) + '/messages');
}

// ---- chat (public visitor side; no session, but harmless to send the cookie) ----

export function openVisitorSession(visitorKey: string, name?: string, email?: string):
Promise<{ conversationId: string; messages: ChatMessage[] }> {
  return request<{ conversationId: string; messages: ChatMessage[] }>('/chat/session', {
    method: 'POST',
    body: JSON.stringify({ visitorKey, name: name || undefined, email: email || undefined }),
  }, { allow401: true });
}

export function fetchVisitorMessages(conversationId: string, visitorKey: string): Promise<{ messages: ChatMessage[] }> {
  return request<{ messages: ChatMessage[] }>(
    '/chat/session/' + encodeURIComponent(conversationId) + '/messages' + qs({ visitorKey }),
    undefined,
    { allow401: true },
  );
}

export function postVisitorMessage(conversationId: string, visitorKey: string, body: string): Promise<{ message: ChatMessage }> {
  return request<{ message: ChatMessage }>(
    '/chat/session/' + encodeURIComponent(conversationId) + '/messages',
    { method: 'POST', body: JSON.stringify({ visitorKey, body }) },
    { allow401: true },
  );
}
