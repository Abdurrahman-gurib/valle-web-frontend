# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine
# nginx.conf.template is rendered by the image's entrypoint at start. ONLY the
# variables listed in the filter are substituted; nginx's own $vars stay intact.
# The defaults below are the docker compose values; Railway overrides them per
# service (see DEPLOYMENT.md in valle-web-backend).
ENV NGINX_ENVSUBST_FILTER="^(PORT|API_UPSTREAM|NGINX_RESOLVER|TRUST_EDGE_HEADERS)\$" \
    PORT=80 \
    API_UPSTREAM=api:3001 \
    TRUST_EDGE_HEADERS=""
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY docker/05-resolver.envsh /docker-entrypoint.d/05-resolver.envsh
RUN chmod +x /docker-entrypoint.d/05-resolver.envsh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://localhost:${PORT}/" >/dev/null || exit 1
