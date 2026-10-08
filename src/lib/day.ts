import { _t } from '../i18n';

/** GET /api/park-live and the ticket photo set, shaped by the API. */
export interface LiveActivity { name: string; waitMin: number | null; meetingPoint: string; note: string; paused: boolean }
export interface LiveOps { updatedAt: string | null; activities: Record<string, LiveActivity> }
export interface PhotoView { id: string; name: string; mime: string; size: number; caption: string; createdAt: string; url: string }
export interface PhotoSet { refCode: string; packageLabel: string | null; photosReadyAt: string | null; count: number; photos: PhotoView[] }

const BASE = import.meta.env.VITE_API_URL || '/api';
export function fetchParkLive(): Promise<LiveOps> {
  return fetch(`${BASE}/park-live`, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<LiveOps>; });
}
export function fetchPhotos(refCode: string, token: string): Promise<PhotoSet> {
  return fetch(`${BASE}/tickets/${encodeURIComponent(refCode)}/photos?t=${encodeURIComponent(token)}`, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<PhotoSet>; });
}

/** Park clock as "HH:MM" and today's date as YYYY-MM-DD, Mauritius time. */
export function parkClock(now = new Date()): { time: string; date: string } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Indian/Mauritius', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(now);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { time: `${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`, date: `${g('year')}-${g('month')}-${g('day')}` };
}
const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const addMinutes = (hhmm: string, n: number) => { const t = mins(hhmm) + n; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

export interface DayStep { experienceId: string; label: string; time: string | null; endTime: string | null }
/**
 * Where the guest is in their day: the step running now (started, not yet
 * over) and the next one to head for. Steps without a session time are free
 * to do any time and never "next".
 */
export function dayPosition(steps: DayStep[], clock: string): { now: DayStep | null; next: DayStep | null; done: DayStep[] } {
  const timed = steps.filter((s) => s.time).sort((a, b) => (a.time as string).localeCompare(b.time as string));
  const c = mins(clock);
  const now = timed.find((s) => mins(s.time as string) <= c && (s.endTime ? mins(s.endTime) > c : mins(s.time as string) + 60 > c)) ?? null;
  const next = timed.find((s) => mins(s.time as string) > c) ?? null;
  const done = timed.filter((s) => s !== now && s !== next && (s.endTime ? mins(s.endTime) <= c : mins(s.time as string) + 60 <= c));
  return { now, next, done };
}

/** A wait in words. */
export function waitLabel(waitMin: number | null): string {
  if (waitMin === null) return '';
  if (waitMin <= 5) return _t('No queue');
  return _t('About {n} min wait');
}

/**
 * The park sitemap is a drawing, not a survey, so a phone position is placed
 * on it with one anchor (the entrance pin = the park's coordinates) and a
 * scale estimated from the 1.8 km loop. Good enough to show which side of
 * the valley you are on; the distance to the entrance is exact.
 */
export const MAP_GEO = { lat: -20.457614, lon: 57.4826031, px: 49.4, py: 59.6, mPerPx: 11, mPerPy: 7.8 };
export function geoToMap(lat: number, lon: number): { px: number; py: number; distanceM: number } | null {
  const dLat = (lat - MAP_GEO.lat) * 111_320;
  const dLon = (lon - MAP_GEO.lon) * 111_320 * Math.cos((MAP_GEO.lat * Math.PI) / 180);
  const distanceM = Math.round(Math.hypot(dLat, dLon));
  const px = MAP_GEO.px + dLon / MAP_GEO.mPerPx;
  const py = MAP_GEO.py - dLat / MAP_GEO.mPerPy;
  if (px < 0 || px > 100 || py < 0 || py > 100) return { px: -1, py: -1, distanceM };
  return { px, py, distanceM };
}
