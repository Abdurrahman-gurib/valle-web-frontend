import type { BookingRequest, BookingResponse, Catalog, QuoteRequest } from '../types';

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

export function createBooking(body: BookingRequest): Promise<BookingResponse> {
  return request<BookingResponse>('/bookings', { method: 'POST', body: JSON.stringify(body) });
}

export function createQuote(body: QuoteRequest): Promise<{ id: string }> {
  return request<{ id: string }>('/quotes', { method: 'POST', body: JSON.stringify(body) });
}
