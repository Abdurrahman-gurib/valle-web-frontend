# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
# Sentry is compiled in at build time. Railway passes service variables as build
# args, so set VITE_SENTRY_DSN (and optionally VITE_SENTRY_ENVIRONMENT) on the web
# service; unset = monitoring off (compose, local builds).
ARG VITE_SENTRY_DSN=
ARG VITE_SENTRY_ENVIRONMENT=
ARG VITE_SENTRY_RELEASE=
# Build-time only (this stage is discarded): lets vite.config.ts upload source maps.
ARG SENTRY_AUTH_TOKEN=
# Canonical public origin baked into <link rel=canonical>, Open Graph and JSON-LD
# of the prerendered pages. Set VITE_SITE_URL=https://vallepark.com on the web service.
ARG VITE_SITE_URL=
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT
ENV VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine
# nginx.conf.template is rendered by the image's entrypoint at start. ONLY the
# variables listed in the filter are substituted; nginx's own $vars stay intact.
# The defaults below are the docker compose values; Railway overrides them per
# service (see DEPLOYMENT.md in valle-web-backend).
ENV NGINX_ENVSUBST_FILTER="^(PORT|API_UPSTREAM|NGINX_RESOLVER|TRUST_EDGE_HEADERS|CANONICAL_HOST|MAINTENANCE)\$" \
    PORT=80 \
    API_UPSTREAM=api:3001 \
    TRUST_EDGE_HEADERS="" \
    CANONICAL_HOST="" \
    MAINTENANCE=""
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY security-headers.conf /etc/nginx/security-headers.conf
# 301/410 table for the previous site's URLs (map $uri, see nginx.conf.template)
COPY redirects.map /etc/nginx/redirects.map
COPY docker/05-resolver.envsh /docker-entrypoint.d/05-resolver.envsh
RUN chmod +x /docker-entrypoint.d/05-resolver.envsh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://localhost:${PORT}/" >/dev/null || exit 1
