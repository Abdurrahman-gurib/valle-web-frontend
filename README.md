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
- `src/pages/`: one folder per area, loaded per route through `src/lib/lazyPage.tsx` (see `src/App.tsx`):
  `Home.tsx` + `home/` (its sections), `activities/` (Explore, Detail), `Packages.tsx` + `packages/`,
  `dine/` (Restaurant), `booking/` (Booking, Ticket, ManageBooking, Waiver), `careers/` (Vacancies,
  VacancyDetail), Groups, Story, Legal, NotFound; the back office under `staff/` and `hr/`.
- Styling is inline per component (ported 1:1 from the original design) over a small
  `src/styles/global.css` (fonts, keyframes, resets).

Static assets live in `public/`: `images/` (photos, map art, videos), `fonts/` (woff2 subsets),
`menus/` (restaurant PDFs).

## Build variables

Read by Vite at build time (`import.meta.env`); none is required, and there is no
`.env` file in this repository. Set them in the shell or as Docker build args.

| Variable        | Default | Purpose |
| --------------- | ------- | ------- |
| `VITE_API_URL`  | `/api`  | Base URL of the API. The default works with the dev-server proxy (`vite.config.ts`) and the nginx proxy in production; set an absolute URL only when the API lives on another host |
| `VITE_SITE_URL` | resolved at runtime | Canonical origin baked into the prerendered pages (canonical, Open Graph, sitemap links); the Railway `web` service and the e2e stack set it |
| `VITE_ONLINE_PAYMENT` | unset | `1` shows the online-payment step even before the API reports a payment provider |
| `VITE_API_PROXY` | `http://localhost:3001` | Where `npm run dev` / `npm run preview` proxy `/api` (dev server only) |

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

<!-- CI deploys to Railway via the RAILWAY_TOKEN secret (added 2026-09-24). -->
