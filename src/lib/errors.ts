/**
 * Reading what a failed request threw. The api helpers (lib/api, staffApi,
 * careersApi, hrApi) throw an Error carrying the server's message and the
 * HTTP `status`; a request that never got an answer throws without a status.
 */

/** The error's message, or `fallback` when it has none. */
export function errorMessage(e: unknown, fallback = ''): string {
  const m = e instanceof Error ? e.message : undefined;
  return m || fallback;
}

/** The HTTP status of a refused request; undefined when the server never answered. */
export function httpStatus(e: unknown): number | undefined {
  return e instanceof Error && 'status' in e && typeof e.status === 'number' ? e.status : undefined;
}
