/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Sentry browser DSN; monitoring is off when unset (local dev, compose). */
  readonly VITE_SENTRY_DSN?: string;
  /** Sentry environment label, e.g. production or staging. */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /** Release identifier (git sha) so issues are tied to a deploy. */
  readonly VITE_SENTRY_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
