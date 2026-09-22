# API Reference

Base path: `/api`. Mounted in `Server/src/routes/index.ts`.

This is the endpoint **map** — the authoritative request/response shapes are the
Zod schemas in each controller and the types in `shared/src/`.

---

## Conventions

**Success**

```json
{ "success": true, "data": { }, "timestamp": "2026-09-23T…Z" }
```

**Error**

```json
{ "success": false, "error": { "code": "POOL_NOT_FOUND", "message": "Pool not found" }, "timestamp": "…" }
```

Built by `src/utils/response.ts`. Validation failures add
`error.details` (the Zod `issues` array). A few endpoints attach extra
context directly to `error` — for example `ends_at` on a cooldown, `pool_id` on
a conflicting pool.

**Auth**: every route except `/auth/*` public entries requires
`Authorization: Bearer <supabase-jwt>`.

**Rate limits** (`src/middleware/rateLimiter.ts`, applied in `app.ts`): a
general limiter on `/api`, stricter ones on `/api/auth/login`, `/register`,
`/reset-password`, `/api/pools/search`, `/api/payments`, `/api/wallet`.

---

## Endpoints

### `/auth`
`POST /register` · `POST /login` · `POST /logout` · `POST /refresh` ·
`GET /verify-email` · `POST /reset-password` · `GET /me`

### `/users`
`GET|PUT /profile` · `PUT /gender-preference` · `POST|DELETE /device-token` ·
`GET /notifications` · `POST /notifications/:notificationId/read` ·
`POST /notifications/read-all` · `GET|PUT /notifications/preferences` ·
`DELETE /account`

### `/pools`
| Method | Path | Notes |
|---|---|---|
| GET | `/search` | Rate-limited. H3 matching, 3 passes. |
| POST | `/`, `/create` | Create a pool |
| GET | `/:poolId` | Detail |
| GET | `/:poolId/preview` | Pre-join preview |
| GET | `/:poolId/combined-route` | **Current** traffic-optimized route |
| POST | `/:poolId/combined-route/update` | Always `needsRecalculation: false` |
| GET | `/:poolId/route` | **Legacy** geometric route |
| GET | `/:poolId/fare` | Fare breakdown |
| POST | `/:poolId/join`, `/leave`, `/cancel` | `join` goes through `atomic_join_pool` |
| POST | `/:poolId/extend-search`, `/complete-search` | Two-phase lookup timer |
| GET | `/:poolId/navigation-link` | Free Google Maps deep link |

### `/advance-bookings`
`GET /` · `POST /` · `PATCH /:rideId` · `DELETE /:rideId` ·
`POST /:poolId/confirm`

### `/rides`
`GET /estimate` · `POST /request` · `GET /history` · `PUT /:rideId/cancel`

### `/driver`
`POST /go-online` · `POST /go-offline` · `GET /status` · `PUT /location` ·
`GET /available-pools` · `POST /pools/:poolId/accept|reject|unassign` ·
`GET /active-pool` · `POST /ride/start|complete` ·
`POST /pickup/:passengerId` · `POST /dropoff/:passengerId` ·
`GET /earnings/today` · `GET /earnings/history` · `GET /stats` ·
`POST /vehicle`

`accept` goes through `atomic_accept_pool` (`SKIP LOCKED`).

### `/wallet`
`GET /balance` · `POST /topup` · `POST /add-funds` · `POST /withdraw` ·
`GET /transactions` · `GET /check-balance` · `POST /pay`

### `/payments`
`POST /process` · `GET /history`

### `/promos`
`POST /validate` · `GET /active` · `GET /history` · `POST /` ·
`DELETE /:promoId`

### `/priyo-sathi`
`GET /` · `POST /` · `GET /requests` · `GET /nearby` · `GET /invite/:rideId` ·
`POST /invite/:rideId/accept` · `POST /requests/:requestId/respond` ·
`DELETE /:companionId` · `POST /:companionId/block` ·
`POST /:companionId/invite`

### `/messages`
`POST /` · `GET /conversations` · `GET /conversations/:conversationId` ·
`GET /unread-count` · `GET /:conversationId` ·
`POST /conversations/:conversationId/read` · `POST /messages/:messageId/read` ·
`POST /:messageId/read`

### `/ratings`
`POST /` · `GET /me` · `GET /user/:userId` · `GET /user/:userId/breakdown` ·
`GET /ride/:rideId`

### `/saved-places`
`GET /` · `POST /` · `GET|PUT|DELETE /:placeId`

### `/offline`
`GET /package` · `POST /sync` · `POST /resolve-conflicts` · `GET /pending` ·
`GET /status` · `DELETE /clear`

### `/navigation`
`POST /deep-link` — builds a Google Maps URL. **Free**, no API call.

### `/analytics`
`GET /dashboard` · `GET /rides` · `GET /drivers` · `GET /users` · `GET /revenue`

### Health
`GET /health` and friends, mounted before `/api` in `app.ts`
(`controllers/health.controller.ts`).
