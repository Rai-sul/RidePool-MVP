# Environment Variables

Everything the **server** actually reads. All env access goes through
`Server/src/config/env.ts` — if a variable is not listed there, adding it to
`.env` does nothing.

> `Server/.env.example` has drifted from the code. It advertises variables that
> are never read and omits ones that are. Trust this page; see
> [Dead and missing config](#dead-and-missing-config).

---

## Required

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Client-side key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server key — bypasses RLS, never ship to a client |

## Core

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Enables production CORS allow-list |
| `PORT` | `3000` | Listen port |
| `HOST` | `0.0.0.0` | Bind address |
| `FRONTEND_URL` | — | Used in emails/redirects |
| `ALLOWED_ORIGINS` | `https://ridepool.app` | Comma-separated; production CORS only |
| `LOG_LEVEL` | — | Winston level |
| `SHUTDOWN_TIMEOUT` | — | Graceful shutdown drain window |

## Caching

| Variable | Default | Purpose |
|---|---|---|
| `MVP_MODE` | `false` | `true` → in-memory cache, no Redis |
| `SKIP_REDIS` | `false` | Same effect as `MVP_MODE=true` |
| `REDIS_URL` | `redis://localhost:6379` | |
| `REDIS_KEY_PREFIX` | `ridepool:` | |
| `REDIS_DEFAULT_TTL` | `300` | Seconds |
| `MEMORY_CACHE_MAX_SIZE` | `1000` | Entries (MVP mode) |
| `MEMORY_CACHE_TTL` | `300` | Seconds (MVP mode) |

In MVP mode the cache is per-process — it is not shared between instances.

## Maps

| Variable | Purpose |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Server-side key. Enable **both** Directions API and Routes API. |

Without it the server falls back to haversine estimates and geometric routing;
nothing crashes, but ETAs and polylines degrade.

## H3 geospatial

| Variable | Default | Purpose |
|---|---|---|
| `H3_RESOLUTION_PICKUP` | `9` | ~0.35 km cells |
| `H3_RESOLUTION_DESTINATION` | `7` | ~2.4 km cells |
| `H3_RESOLUTION_DRIVER` | `8` | |
| `H3_SEARCH_RADIUS` | `2` | Generic fallback radius |
| `H3_SEARCH_RADIUS_PICKUP` | `6` | ~2.1 km |
| `H3_SEARCH_RADIUS_DESTINATION` | `2` | ~4.8 km |

## Advance booking

Every window is in **units**; `ADVANCE_TIME_UNIT` decides whether a unit is a
minute or a second. Never hardcode a duration — read it from
`config.advanceBooking` via `utils/advanceWindow.ts`.

| Variable | Default | Purpose |
|---|---|---|
| `ADVANCE_TIME_UNIT` | `minutes` | `seconds` compresses every window for dev/QA |
| `ADVANCE_POOL_WINDOW` | `30` | Max pickup spread within one pool |
| `ADVANCE_CONFIRM_LEAD` | `10` | How far ahead confirmation opens |
| `ADVANCE_CONFIRM_WINDOW` | `5` | How long riders have to confirm |
| `ADVANCE_MAX_LEAD_DAYS` | `7` | Furthest ahead a pickup may be booked |
| `ADVANCE_SOLO_FALLBACK` | `false` | Allow dispatching a single-rider pool |

**None of these are in `.env.example`.** Production must keep
`ADVANCE_TIME_UNIT` at the default.

## Notifications

| Variable | Purpose |
|---|---|
| `FCM_SERVER_KEY` | Firebase Cloud Messaging. Without it, notifications are stored in the database but never pushed. |

---

## Dead and missing config

**Declared in `.env.example`, never read by the code** — setting these has no
effect:

`KNOCK_API_KEY`, `KNOCK_PUSH_CHANNEL_ID` (Knock was never implemented; FCM is
the transport) · `MAPBOX_ACCESS_TOKEN`, `ROUTING_PROVIDER` (no Mapbox code
path exists) · `SSLCOMMERZ_*`, `BKASH_*` (gateways are placeholders) ·
`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` (limits are hardcoded in
`middleware/rateLimiter.ts`) · `PLATFORM_SURCHARGE_BDT`,
`DRIVER_COMMISSION_RATE` (hardcoded in `fare.service.ts`) · `LOOKUP_TIME_MS`
(hardcoded in `lookupTime.service.ts`) · `COOLDOWN_DURATION_MS`,
`MAX_CANCELLATIONS_BEFORE_PENALTY` · `H3_WORKER_POOL_SIZE` ·
`METRICS_ENABLED`, `METRICS_PORT`, `TRACE_SAMPLE_RATE`, `SESSION_SECRET`,
`PROMISE_MONEY_AMOUNT_BDT`.

**Read by the code, missing from `.env.example`**: every `ADVANCE_*` variable,
plus `H3_SEARCH_RADIUS_PICKUP`, `H3_SEARCH_RADIUS_DESTINATION`, `HOST`,
`FRONTEND_URL`, `LOG_LEVEL`, `SHUTDOWN_TIMEOUT`.

> **Security**: the committed `Server/.env.example` contains real-looking
> Supabase keys and a real-looking Google Maps key rather than placeholders. If
> those are live credentials, rotate them and replace the file's values with
> obvious dummies.

## Client apps

Client variables must be prefixed `EXPO_PUBLIC_` to reach the bundle — which
also means they are **public**. Never put a server key there.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Client-side maps key — restrict it by app bundle ID |

See [../guides/google-maps-setup.md](../guides/google-maps-setup.md).
