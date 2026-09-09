# VALLÉ Advenature™ Park: Frontend

React 18 + Vite + TypeScript SPA. A faithful rebuild of the original park website:
21 experiences, packages, two restaurants, the "My Day" planner and a 3-step booking flow,
with dual resident/non-resident pricing.

## Scripts

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run dev`      | Dev server on :5173, proxies `/api` → :3001               |
| `npm run build`    | Typecheck + production bundle in `dist/`                  |
| `npm run preview`  | Serve the production build on :4173 (same `/api` proxy)   |
| `npm test`         | Vitest unit tests (cart/pricing engine)                   |
| `npm run test:e2e` | Playwright e2e at desktop/tablet/mobile viewports         |

## Architecture

- `src/store/CatalogContext.tsx`: loads `GET /api/catalog`; until it resolves (or when the
  API is down) the bundled `src/data/fallback.json` keeps the site fully browsable.
- `src/store/AppStore.tsx`: rate (RR/NR), "My Day" selection, party/date/slot; persisted
  to localStorage (`valle_rate`, `valle_sel`).
- `src/store/booking.ts`: the pricing engine (park entry, half-price kids, flat units,
  15% Explorer Pass). Mirrored server-side in `Backend/src/bookings/pricing.ts`; change both.
- `src/lib/`: api client, semantic navigation (`useGoto`), card decorator, formatting.
- `src/hooks/`: `useIsMobile` (1080px breakpoint), `useHover`, `useReveal` (scroll reveals).
- `src/pages/`: Home (10 sections under `home/`), Explore, Detail, Packages, Restaurant, Booking.
- Styling is inline per component (ported 1:1 from the original design) over a small
  `src/styles/global.css` (fonts, keyframes, resets).

Static assets live in `public/`: `images/` (69 photos), `fonts/` (15 woff2 subsets),
`menus/` (restaurant PDF).

## Container and deployment

`Dockerfile` builds the site and serves `dist/` with nginx. `nginx.conf.template` is
rendered when the container starts, from a handful of variables documented at the top
of that file:

| Variable             | docker compose default | Railway (`web` service)          |
| -------------------- | ---------------------- | -------------------------------- |
| `PORT`               | `80`                   | `80`                             |
| `API_UPSTREAM`       | `api:3001`             | `api.railway.internal:3001`      |
| `TRUST_EDGE_HEADERS` | empty                  | `1` (Railway's edge sets X-Real-IP) |
| `NGINX_RESOLVER`     | derived from `/etc/resolv.conf` by `docker/05-resolver.envsh` | same |

nginx proxies `/api/` and `/socket.io/` (WebSocket upgrade included) to the API, so the
site and the API share one origin. That is a requirement, not a convenience: the staff
session cookie is `SameSite=Strict`, so a cross-origin API would never receive it.
`VITE_API_URL` therefore stays at its default `/api`.

Production runs on Railway as the `web` service of the `valle-web` project, deployed
automatically from `main` of this repository (GitHub Actions CI runs first, see
`.github/workflows/ci.yml`). The Railway project itself (both services, the database, variables, healthchecks) is
defined in the backend repository's .railway/railway.ts, and the runbook lives there too:
[valle-web-backend/DEPLOYMENT.md](https://github.com/Abdurrahman-gurib/valle-web-backend/blob/main/DEPLOYMENT.md).
