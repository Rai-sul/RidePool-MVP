# Server

Node 20 + TypeScript (CommonJS) + Express 5, in `Server/`.

---

## 1. Boot sequence

Entry point: `Server/src/app.ts`

1. Load env via `dotenv` (`src/config/env.ts` is the only place env is read).
2. Security headers, CORS, compression, body parsing (10 kb limit).
3. Input sanitization (`stripNullBytes`, `inputSanitizer`).
4. Rate limiters — a general `/api` limiter plus stricter ones for auth,
   pool search, payments and wallet.
5. Mount `/api` routes from `src/routes/index.ts`.
6. Connect the cache via `unifiedCacheService`.
7. Start the advance-booking scheduler, listen, register graceful shutdown.

## 2. Request lifecycle

```
Routes → Controllers → Services → Supabase / external APIs
```

- **Routes** (`src/routes/*.routes.ts`) — declare endpoints, attach middleware.
- **Controllers** (`src/controllers/*.controller.ts`) — every method has the
  signature `(req: AuthRequest, res: Response, next: NextFunction)`: read
  `req.user?.id`, validate, call a service, respond, forward errors to `next`.
- **Services** (`src/services/*.service.ts`) — business logic only. No `req`/`res`.
- **Data** — Supabase (PostgreSQL + RLS + Realtime); Redis or in-memory cache.

Auth is Supabase Auth: the `authenticate` middleware validates a Bearer JWT via
`supabase.auth.getUser(token)` and attaches the user to `req.user`.

**Responses** go through `src/utils/response.ts` — `successResponse`,
`createdResponse`, `errorResponse`, `unauthorizedResponse`. The envelope is
`{ success, data | error, timestamp }` and its key order is defined in that one
file. A handful of endpoints that attach extra fields to `error` (for example
`ends_at`, `pool_id`) still build the object inline.

## 3. Cache modes

`config.mvpMode` is true when `MVP_MODE=true` **or** `SKIP_REDIS=true`. It
selects the provider behind `unifiedCacheService`:

| Mode | Provider | Notes |
|---|---|---|
| MVP | `memoryCache.service.ts` | In-process LRU + TTL. Not shared between instances. |
| Normal | `cache.service.ts` | Redis via ioredis. |

**Always go through `unifiedCacheService`.** Importing `cacheService` directly
bypasses the MVP-mode switch, so the cache silently does nothing whenever
`MVP_MODE=true` — every read misses and every write is dropped.

## 4. Service map

| Service | Responsibility |
|---|---|
| `poolMatching.service.ts` | H3 pool matching, scoring, route overlap. See [pool-matching.md](./pool-matching.md). |
| `smartRoute.service.ts` | Combined traffic-optimized route. See [combined-route.md](./combined-route.md). |
| `routeOverlap.service.ts` | Route-similarity scoring for candidate matches. |
| `googleMaps.service.ts` | Directions + Routes API, caching, request de-duplication. |
| `rideEstimation.service.ts` | Pre-booking distance/ETA/fare estimates; legacy pool route. |
| `fare.service.ts` | Fare breakdown. See [fares.md](./fares.md). |
| `advanceBooking.service.ts` / `advanceDispatch.service.ts` / `advanceScheduler.service.ts` | Scheduled rides. See [advance-booking.md](./advance-booking.md). |
| `lookupTime.service.ts` | Two-phase pool search timer: 30 s initial + 10 s extended (40 s total). |
| `wallet.service.ts` | Balance, top-up, debit, refund via atomic SQL functions. |
| `penalty.service.ts` | Cancellation tracking and cooldowns. |
| `notification.service.ts` | Persists notifications; pushes via FCM. See [notifications.md](./notifications.md). |
| `promo.service.ts`, `analytics.service.ts`, `audit.service.ts`, `offline.service.ts`, `priyoSathi.service.ts` | Supporting domains. |
| `cache.service.ts`, `memoryCache.service.ts`, `unifiedCache.service.ts` | Caching (see above). |
| `gracefulShutdown.service.ts` | Drain and cleanup on SIGTERM/SIGINT. |

## 5. Google Maps cost model

Every outbound call in `googleMaps.service.ts` is billed. Two products are used
and they are not interchangeable:

| Method | Product | Caching |
|---|---|---|
| `getRoute` | Directions | Read-through, 10 min, keyed on exact coordinates + options |
| `getBestRouteWithTraffic` | Directions | Read-through, 10 min |
| `getDistance` | wraps `getRoute` | 2 h, keyed on coarse H3 cells |
| `computeTrafficRouteMatrix` | Routes (`TRAFFIC_AWARE_OPTIMAL`) | None here — guarded by SmartRoute's 2 h pool cache |
| `computeFixedOrderTrafficRoute` | Routes | None here — same guard |

Rules that must hold:

- Anything returning **geometry** keys on exact coordinates. Two trips sharing a
  coarse H3 cell do not share a road route; reusing a polyline draws a visibly
  wrong line. Only `getDistance` may use H3 keys, because it returns scalars.
- **Never cache a failure.** A `null` means the provider was unavailable;
  caching it would stretch a blip into a TTL-long outage.
- Concurrent identical requests collapse into one billed call via the in-flight
  de-duplication map, so caching still helps on a cold start.
- **Deep links are free.** `generateNavigationDeepLink`,
  `generateViewRouteDeepLink` and `generatePlatformNavigationLinks` only build
  URL strings — no API call, no cost.

## 6. Testing

- Runner: `vitest`, specs in `Server/tests/**/*.test.ts`.
- `npm test` — everything; `npm run test:unit`; `npm run test:integration`.
- `npx tsc --noEmit` type-checks `src/` only. Test files are covered by
  `npx tsc --noEmit -p tsconfig.test.json`, which is **not** part of `npm test` —
  a test file can therefore have type errors that the suite never reports.

## 7. Known gaps

- Payment gateway integration (SSLCommerz, bKash) is a placeholder.
- FCM requires `FCM_SERVER_KEY`; without it notifications are stored in the
  database only and never pushed.
- `bullmq` is a dependency but no worker is initialized in `app.ts`.
- `GET /pools/:poolId/route` (legacy) is still routed although both apps have
  moved to `combined-route`.
