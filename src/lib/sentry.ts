import { useEffect } from 'react';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';
import * as Sentry from '@sentry/react';

/**
 * Sentry error + performance monitoring for the public site and the back office.
 *
 * Off unless VITE_SENTRY_DSN is set at build time (Vite inlines it), so the
 * compose stack and local dev never report. Production gets the DSN as a Railway
 * build variable (see DEPLOYMENT.md in valle-web-backend).
 */
const dsn = import.meta.env.VITE_SENTRY_DSN;

export const sentryEnabled = Boolean(dsn);

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || (typeof location !== 'undefined' && location.hostname === 'localhost' ? 'development' : 'production'),
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    integrations: [
      // Page loads and route changes as transactions, named by route pattern.
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // A short replay of what the visitor did before an error, never for normal sessions.
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Bookings carry names and phone numbers: the SDK sends no PII by default and we keep it that way.
    // Noise from browser extensions and aborted navigations.
    ignoreErrors: ['ResizeObserver loop', 'AbortError', /Loading chunk \d+ failed/],
  });
}

export { Sentry };
