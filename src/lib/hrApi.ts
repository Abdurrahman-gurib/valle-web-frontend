import type { Paged } from '../types';

/**
 * Careers back office client (see CONTRACT-v3 "Careers API").
 *
 * Kept separate from `staffApi.ts` so the HR surface owns its own types, but it
 * speaks the same protocol: same `/api` base, same cookie, same 401 handling.
 * Every response is typed: nothing here returns `any`.
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

/** Where an expired / missing operator session sends the user. */
export const STAFF_LOGIN_PATH = '/staff/login';

let onUnauthorized: () => void = () => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === STAFF_LOGIN_PATH) return;
  window.location.assign(STAFF_LOGIN_PATH);
};

/**
 * `StaffAuth` swaps the hard redirect for dropping the user, so the route guard
 * can render the sign-in card without a full page load.
 */
export function setHrUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

export interface HrHttpError extends Error { status: number }

/** True when the server answered and refused, rather than the network dying. */
export function isHrHttpError(e: unknown): e is HrHttpError {
  return e instanceof Error && typeof (e as HrHttpError).status === 'number';
}

/** Message worth putting in front of an operator, with a sane fallback. */
export function errorText(e: unknown, fallback: string): string {
  if (isHrHttpError(e) && e.message && e.status !== 500) return e.message;
  if (e instanceof Error && e.message && e.message !== 'Failed to fetch') return e.message;
  return fallback;
}

interface JsonErrorBody { message?: string | string[] }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
    let msg = res.statusText;
    try {
      const body = (await res.json()) as JsonErrorBody;
      if (body && body.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch { /* keep statusText */ }
    throw Object.assign(new Error(msg || 'Request failed'), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

type QueryValue = string | number | undefined | null;

function qs(params: Record<string, QueryValue>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? '?' + s : '';
}

// ---------------------------------------------------------------- roles ----

/** `staff_users.role` since v3. */
export type OperatorRole = 'agent' | 'hr' | 'manager';

/**
 * Role checks take a plain `string` on purpose: `StaffUser.role` is typed in
 * `types.ts`, which this feature does not own, so comparing against the v3
 * values here keeps the gate honest whatever that union currently says.
 */
export function canAccessHr(role: string | null | undefined): boolean {
  return role === 'hr' || role === 'manager';
}

/** Reservations is open to everyone except a pure HR account. */
export function canAccessReservations(role: string | null | undefined): boolean {
  return !!role && role !== 'hr';
}

/** Where an operator lands after signing in. */
export function landingPathFor(role: string | null | undefined): string {
  return role === 'hr' ? '/hr' : '/staff';
}

export function roleLabel(role: string | null | undefined): string {
  if (role === 'hr') return 'People & hiring';
  if (role === 'manager') return 'Manager';
  if (role === 'agent') return 'Reservations agent';
  return 'Operator';
}

// ------------------------------------------------------------ vacancies ----

export type VacancyStatus = 'draft' | 'published' | 'closed';
export type EmploymentType = 'full-time' | 'part-time' | 'seasonal' | 'internship';

export const EMPLOYMENT_TYPES: readonly { value: EmploymentType; label: string }[] = [
  { value: 'full-time', label: 'Full time' },
  { value: 'part-time', label: 'Part time' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'internship', label: 'Internship' },
];

export const VACANCY_STATUSES: readonly { value: VacancyStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
];

export function employmentLabel(v: string): string {
  const hit = EMPLOYMENT_TYPES.find((e) => e.value === v);
  return hit ? hit.label : v;
}

/** GET /api/hr/vacancies row. `applicationCount` drives the "close it instead" rule. */
export interface HrVacancy {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employment: EmploymentType;
  summary: string;
  description: string;
  requirements: string;   // one per line
  benefits: string;
  salaryRange: string;
  status: VacancyStatus;
  closesOn: string | null;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Body of POST /api/hr/vacancies. */
export interface VacancyInput {
  title: string;
  department: string;
  location: string;
  employment: EmploymentType;
  summary: string;
  description: string;
  requirements: string;
  benefits: string;
  salaryRange: string;
  status: VacancyStatus;
  closesOn: string | null;
}

export type VacancyPatch = Partial<VacancyInput>;

export function listVacancies(status?: VacancyStatus | 'all'): Promise<{ items: HrVacancy[] }> {
  return request<{ items: HrVacancy[] }>(
    '/hr/vacancies' + qs({ status: status && status !== 'all' ? status : undefined }),
  );
}

export function createVacancy(body: VacancyInput): Promise<HrVacancy> {
  return request<HrVacancy>('/hr/vacancies', { method: 'POST', body: JSON.stringify(body) });
}

export function updateVacancy(id: string, body: VacancyPatch): Promise<HrVacancy> {
  return request<HrVacancy>('/hr/vacancies/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** 409 when the role already has applications: close it instead of deleting. */
export function deleteVacancy(id: string): Promise<void> {
  return request<void>('/hr/vacancies/' + encodeURIComponent(id), { method: 'DELETE' });
}

// ----------------------------------------------------------- applicants ----

export type ApplicationStatus =
  | 'new' | 'reviewing' | 'shortlisted' | 'interviewed' | 'offered' | 'rejected' | 'hired';

export const APPLICATION_STATUSES: readonly { value: ApplicationStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' },
];

export function applicationStatusLabel(v: string): string {
  const hit = APPLICATION_STATUSES.find((s) => s.value === v);
  return hit ? hit.label : v;
}

/**
 * One row of GET /api/hr/applications. Contact details and `hrNote` are HR-only:
 * they must never be requested from a public endpoint.
 */
export interface HrApplication {
  id: string;
  vacancyId: string;
  /** Denormalised by the API where available; the panel falls back to its own map. */
  vacancyTitle?: string | null;
  vacancySlug?: string | null;
  fullName: string;
  email: string;
  phone: string;
  cvUrl: string;
  coverLetter: string;
  yearsExperience: number | null;
  status: ApplicationStatus;
  hrNote: string;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationQuery {
  vacancyId?: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export function listApplications(query: ApplicationQuery = {}): Promise<Paged<HrApplication>> {
  return request<Paged<HrApplication>>('/hr/applications' + qs({ ...query }));
}

export interface ApplicationPatch {
  status?: ApplicationStatus;
  hrNote?: string;
}

export function updateApplication(id: string, body: ApplicationPatch): Promise<HrApplication> {
  return request<HrApplication>('/hr/applications/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------- stats ----

export interface HrStats {
  openVacancies: number;
  draftVacancies: number;
  newApplications: number;
  applicationsThisWeek: number;
}

export function getHrStats(): Promise<HrStats> {
  return request<HrStats>('/hr/stats');
}

// --------------------------------------------------------------- helpers ---

/** `<input type="date">` wants a bare YYYY-MM-DD, whatever the API sent. */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
}

/**
 * Only `http(s)` links may reach an href: a stored `javascript:` or `data:` CV
 * link would otherwise execute on click. The API validates too; this is the
 * second lock on the same door.
 */
export function safeCvHref(url: string | null | undefined): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Requirements are stored as one per line; blank lines are noise. */
export function requirementLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
}
