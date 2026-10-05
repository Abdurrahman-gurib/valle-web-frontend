import { useSyncExternalStore } from 'react';

/**
 * Installable app + offline support (public/sw.js).
 *
 *   registerServiceWorker()  once, from main.tsx (production builds only)
 *   useInstall()             whether the browser can install the site, and how
 *   useOnline()              navigator.onLine as state
 *   warmOfflineImages(urls)  asks the worker to keep the activity photos
 */

/** Chrome / Edge / Android fire this when the site can be installed; Safari never does. */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

/**
 * prompt     the browser offers its own install dialog (Android, desktop Chrome/Edge)
 * ios        Safari on iPhone/iPad: installing is a manual "Add to Home Screen"
 * installed  already running from the home screen, or just installed
 * none       nothing to offer (unsupported browser, or the prompt has not fired)
 */
export type InstallState = 'prompt' | 'ios' | 'installed' | 'none';

let deferred: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const hasWindow = typeof window !== 'undefined';

function standalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function iosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Chrome, Firefox and in-app browsers on iOS word the step differently or lack it: only describe Safari's
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios|fban|fbav|instagram/i.test(ua);
}

if (hasWindow) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep the event: the site decides when to show the dialog
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    justInstalled = true;
    emit();
  });
}

function snapshot(): InstallState {
  if (justInstalled || standalone()) return 'installed';
  if (deferred) return 'prompt';
  if (iosSafari()) return 'ios';
  return 'none';
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Opens the browser's install dialog; resolves true when the guest accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null; // a prompt event can be used once
  emit();
  await event.prompt();
  const choice = await event.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
  return choice.outcome === 'accepted';
}

export function useInstall(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, () => 'none' as InstallState);
}

// navigator.onLine only knows about airplane mode and unplugged cables. In the
// valley a phone is usually "connected" with no usable signal, so the site also
// asks the API directly: one tiny request when the page opens, when the tab comes
// back, when the browser reports a change, and every 30 s while offline.
let reachable = true;
let probing = false;
let retry: number | undefined;
const onlineListeners = new Set<() => void>();

async function probe(): Promise<void> {
  if (probing) return;
  probing = true;
  let ok = false;
  if (navigator.onLine) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 5000);
    try {
      // /api/health is never cached by the service worker, so this is the real network
      const res = await fetch((import.meta.env.VITE_API_URL || '/api') + '/health', { cache: 'no-store', signal: ctrl.signal });
      ok = res.ok || res.status < 500;
    } catch { ok = false; }
    window.clearTimeout(timer);
  }
  probing = false;
  window.clearTimeout(retry);
  if (!ok) retry = window.setTimeout(() => { void probe(); }, 30000);
  if (ok !== reachable) { reachable = ok; onlineListeners.forEach((l) => l()); }
}

function subscribeOnline(l: () => void) {
  const first = onlineListeners.size === 0;
  onlineListeners.add(l);
  const check = () => { void probe(); };
  const visible = () => { if (document.visibilityState === 'visible') check(); };
  window.addEventListener('online', check);
  window.addEventListener('offline', check);
  document.addEventListener('visibilitychange', visible);
  if (first) check();
  return () => {
    onlineListeners.delete(l);
    window.removeEventListener('online', check);
    window.removeEventListener('offline', check);
    document.removeEventListener('visibilitychange', visible);
    if (onlineListeners.size === 0) window.clearTimeout(retry);
  };
}

/** False when the park's servers cannot be reached, whatever the browser thinks of the connection. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => reachable, () => true);
}

/** Registers the worker after the page has loaded, so it never competes with the first paint. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !hasWindow || !('serviceWorker' in navigator)) return;
  // the back office is online-only; a guest's phone is where offline matters
  if (/^\/(staff|hr)(\/|$)/.test(window.location.pathname)) return;
  const register = () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* private mode, blocked storage: the site works without it */ }); };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Hands the worker the activity-card photos to keep, unless the guest is saving data or on a slow link. */
export function warmOfflineImages(urls: string[]): void {
  if (!hasWindow || !('serviceWorker' in navigator) || urls.length === 0) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;
  navigator.serviceWorker.ready
    .then((reg) => reg.active?.postMessage({ type: 'warm', urls }))
    .catch(() => undefined);
}
