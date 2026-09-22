# Deployment

Two supported shapes: **MVP** (single instance, no Redis) and **production**
(Redis + nginx, scalable).

---

## MVP

Simplifies infrastructure by:

- using the in-memory cache behind `unifiedCacheService`
- skipping Redis and queue workers
- running one server instance with no external load balancer

```sh
cd Server
docker compose -f docker-compose.mvp.yml up
```

Starts a single `api` service with the MVP flags set.

**Trade-off**: the cache is per-process. It is not shared between instances and
is lost on restart, so this shape does not scale horizontally.

## Production

```sh
cd Server
docker compose up
```

Enables Redis and an nginx reverse proxy, and scales the `app` service.

Files: `Server/Dockerfile`, `Server/docker-compose.yml`,
`Server/docker-compose.mvp.yml`.

## Environment

Required in both shapes:

`SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` ·
`GOOGLE_MAPS_API_KEY`

MVP flags: `MVP_MODE=true`, `SKIP_REDIS=true`
Cache tuning: `MEMORY_CACHE_MAX_SIZE`, `MEMORY_CACHE_TTL`

Full list, including which variables are dead: [../reference/environment.md](../reference/environment.md).

## Health checks

Mounted before `/api` in `app.ts` (`controllers/health.controller.ts`), so they
are not rate-limited:

| Endpoint | Use |
|---|---|
| `GET /health/live` | Container liveness probe — used by both compose files |
| `GET /health/ready` | Readiness (also served at `GET /health`) |
| `GET /health/detailed` | Dependency-by-dependency status |
| `GET /health/cache` | Cache provider and hit/miss stats |

## Before going live

- Set `NODE_ENV=production` — this switches CORS from `*` to the
  `ALLOWED_ORIGINS` allow-list.
- Set `ALLOWED_ORIGINS` to the real client origins.
- Restrict the Google Maps **server** key to the Directions and Routes APIs, and
  the **client** key by bundle ID.
- Use Redis. In MVP mode a second instance cannot see the first's cache, which
  multiplies billed Google Maps calls.
- Confirm `ADVANCE_TIME_UNIT` is unset or `minutes`. `seconds` is a QA-only
  setting that compresses every advance-booking window.
- Rotate anything that was ever committed to `.env.example`.

## Known gaps

- Card and mobile-banking payments are placeholders; only wallet and cash flows
  are wired end to end.
- Push notifications need `FCM_SERVER_KEY`, otherwise they are stored in the
  database only.
- `bullmq` is installed but no worker is started — wire one separately if you
  need background queues.
