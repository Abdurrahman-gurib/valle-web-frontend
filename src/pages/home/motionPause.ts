import { useSyncExternalStore } from 'react';

/**
 * One switch for the moving parts of the home page (the hero slideshow and the
 * marquee): the hero's pause button flips it, so a guest stops both at once
 * (WCAG 2.2.2 Pause, Stop, Hide).
 */
let paused = false;
const subs = new Set<() => void>();
export function setHomeMotionPaused(v: boolean) { paused = v; subs.forEach((f) => f()); }
export function useHomeMotionPaused(): boolean {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => paused, () => false);
}
