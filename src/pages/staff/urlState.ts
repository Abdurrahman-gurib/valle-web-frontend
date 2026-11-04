import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Back-office screen state kept in the query string (`?tab=bookings&q=ana&open=VAL-2857-26`),
 * so a refresh mid-edit, a bookmark or a link sent to a colleague lands on the
 * same tab, search, filters and open booking. Writes replace the history entry:
 * typing a search does not fill the back button.
 */
export function useUrlState(): [URLSearchParams, (patch: Record<string, string | null | undefined>) => void] {
  const [params, setParams] = useSearchParams();
  const update = useCallback((patch: Record<string, string | null | undefined>) => {
    setParams((prev) => applyParams(prev, patch), { replace: true });
  }, [setParams]);
  return [params, update];
}

/** Pure: the params with `patch` applied; null, undefined and '' remove a key. */
export function applyParams(prev: URLSearchParams, patch: Record<string, string | null | undefined>): URLSearchParams {
  const next = new URLSearchParams(prev);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') next.delete(k);
    else next.set(k, v);
  }
  return next;
}
