import type { ApplicationRequest, VacancyCard, VacancyDetail } from '../types';

/**
 * Public careers endpoints (see CONTRACT-v3 "Careers API").
 *
 * These are the only three calls the public site makes: they are unauthenticated
 * and never return HR-only fields, so this client deliberately does NOT send
 * credentials. The back office talks to `/api/hr/**` through its own client.
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

export interface HttpError extends Error { status: number }

/** True when the server answered and refused, rather than the network dying. */
export function isHttpError(e: unknown): e is HttpError {
  return e instanceof Error && typeof (e as HttpError).status === 'number';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body: unknown = await res.json();
      const m = (body as { message?: string | string[] } | null)?.message;
      if (m) msg = Array.isArray(m) ? m.join(', ') : m;
    } catch { /* keep statusText */ }
    throw Object.assign(new Error(msg || 'Request failed'), { status: res.status });
  }
  return res.json() as Promise<T>;
}

/** Published roles only, newest first. */
export function listVacancies(): Promise<{ items: VacancyCard[] }> {
  return request<{ items: VacancyCard[] }>('/vacancies');
}

/** One published role. Rejects with a 404 HttpError when it is gone or unpublished. */
export function getVacancy(slug: string): Promise<VacancyDetail> {
  return request<VacancyDetail>('/vacancies/' + encodeURIComponent(slug));
}

/** Send an application. Rate limited server-side (5 per 10 minutes per IP). */
export function applyToVacancy(slug: string, body: ApplicationRequest): Promise<{ id: string }> {
  return request<{ id: string }>('/vacancies/' + encodeURIComponent(slug) + '/apply', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
