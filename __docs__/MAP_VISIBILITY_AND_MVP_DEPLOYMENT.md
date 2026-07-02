# Map Visibility and MVP Deployment (Combined)

**Last Updated:** 2026-05-31

---

## 1. Map Visibility (Current Conditions)

### In-App Map (Passenger and Driver)

What is visible now:
- Combined route polyline and ordered pickup/dropoff markers.
- Live driver marker and user location marker.
- ETA values returned from the server when a Google Maps key is configured.

What is not enabled:
- Traffic layer visualization (no colored traffic overlay).
- Turn-by-turn voice guidance inside the app.
- Road hazard overlays (closures, accidents, construction).

Implementation notes:
- Native maps are used when the app is not running in Expo Go. Expo Go falls back to a static map view.
- The route polyline is rendered from `routePolyline` or `routeCoordinates` supplied by the server. When unavailable, the client may fetch a simple route from Google Maps using `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

Exact files and endpoints:
- Client map rendering: `Client/CarPoolApp/components/GoogleMapView.native.tsx` and `Client/CarPoolApp/components/GoogleMapView.web.tsx`.
- Combined route fetch: `GET /api/pools/:poolId/combined-route`.
- Pool route fetch: `GET /api/pools/:poolId/route`.
- Navigation deep link: `GET /api/pools/:poolId/navigation-link` and `POST /api/navigation/deep-link`.
- Server routes: `Server/src/routes/pool.routes.ts` and `Server/src/routes/navigation.routes.ts`.
- Server controllers: `Server/src/controllers/pool.controller.ts` and `Server/src/controllers/navigation.controller.ts`.

How to enable traffic overlay (native only):
- Add `showsTraffic={true}` in the native map component at Client/CarPoolApp/components/GoogleMapView.native.tsx.
- Note: Expo Go does not render the native map, so traffic overlay will only appear in custom dev clients or production builds.

### Google Maps App (Deep Link)

When a deep link is opened:
- Full multi-stop route is shown with traffic visualization.
- Turn-by-turn navigation, rerouting, and live ETA updates are handled by Google Maps.

Relevant server endpoints:
- `GET /api/pools/:poolId/navigation-link`
- `POST /api/navigation/deep-link`

Endpoint references:
- `Server/src/routes/pool.routes.ts` -> `getNavigationDeepLink()` in `Server/src/controllers/pool.controller.ts`.
- `Server/src/routes/navigation.routes.ts` -> `getNavigationDeepLink()` in `Server/src/controllers/navigation.controller.ts`.

---

## 2. MVP Deployment (Current)

MVP mode simplifies infrastructure by:
- Using in-memory cache via `unifiedCacheService`.
- Skipping Redis and queue workers by default.
- Running a single server instance without an external load balancer.

Exact files and controls:
- Cache adapter: `Server/src/services/unifiedCache.service.ts`.
- In-memory cache: `Server/src/services/memoryCache.service.ts`.
- Redis cache (non-MVP): `Server/src/services/cache.service.ts`.
- App startup log: `Server/src/app.ts` (cache connection and MVP log lines).

### Environment Variables

Required:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_MAPS_API_KEY`

MVP flags:
- `MVP_MODE=true`
- `SKIP_REDIS=true`

Optional cache tuning:
- `MEMORY_CACHE_MAX_SIZE=1000`
- `MEMORY_CACHE_TTL=300`

### Docker (MVP)

Use the MVP compose file:
- `Server/docker-compose.mvp.yml`

This starts a single `api` service with MVP flags enabled.

### Docker (Production)

Use the full compose file:
- `Server/docker-compose.yml`

This enables Redis and an nginx reverse proxy, and scales the `app` service.

### Health Checks

The compose files use:
- `GET /health/live` for container health probes.

Endpoint and file reference:
- Health routes: `Server/src/controllers/health.controller.ts` (mounted in `Server/src/app.ts`).

---

## 3. Notes and Limitations

- Push notifications require `FCM_SERVER_KEY` to send; otherwise they are stored in the database only.
- Card/mobile banking payments are placeholders; only wallet and cash flows are fully wired.
- If you want background queues, wire BullMQ workers separately.
