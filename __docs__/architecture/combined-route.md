# Combined Route (SmartRoute)

How one pool's pickups and drop-offs become a single traffic-optimized route.

Owner: `Server/src/services/smartRoute.service.ts`
Provider: `Server/src/services/googleMaps.service.ts` (Google **Routes API**)

> Do not change the ordering algorithm, the detour caps, or the cache keys
> without reading this whole page. Each one exists to stop a specific failure.

---

## Endpoints

| Endpoint | Handler | Status |
|---|---|---|
| `GET /api/pools/:poolId/combined-route` | `poolController.getCombinedRoute` → `smartRouteService` | **Current.** Traffic-optimized, one-shot cached. |
| `POST /api/pools/:poolId/combined-route/update` | `poolController.updateCombinedRoute` | Returns `needsRecalculation: false` — the route is immutable (see [One-shot caching](#4-one-shot-caching)). |
| `GET /api/pools/:poolId/route` | `poolController.getOptimizedRoute` → `rideEstimationService` | **Legacy.** Geometric stop ordering; traffic is *not* the optimization objective. |

Both client apps now read `combined-route`. The rider app still keeps a
`getPoolRoute()` method pointing at the legacy `/route` endpoint
(`Client/CarPoolApp/services/pool.service.ts`); the driver app no longer calls
it. The legacy endpoint is therefore a cleanup candidate, not an active path.

---

## 1. Exact pickup/drop-off sequence search

**Purpose**: select the fastest combined route from a single traffic snapshot
while guaranteeing every pickup happens before its matching drop-off.

- Before driver assignment, optimize every passenger stop with a free first
  pickup and final drop-off.
- After assignment, add the driver as the **fixed origin** and optimize the
  passenger stops again.
- Fetch a Routes API traffic matrix covering every stop in that phase.
- Enumerate every precedence-valid stop sequence. The final drop-off is not
  fixed.
- Reject sequences with missing matrix edges.
- Prefer sequences satisfying every passenger detour cap: **at most 7 extra
  minutes and 25% extra in-vehicle time**.
- Rank feasible sequences by traffic duration, then road distance. If none are
  feasible, minimize the largest normalized cap violation first, then apply the
  same duration/distance tie-breakers.

With four passengers there are at most `8! / 2^4 = 2,520` precedence-valid
sequences — small enough to evaluate exactly, in memory, with no heuristic.

## 2. Fixed-order traffic route

After the sequence is chosen, the server calls Routes API `computeRoutes` with
`TRAFFIC_AWARE_OPTIMAL`. Google's own waypoint optimization is **deliberately
disabled**, so the provider cannot break pickup/drop-off precedence. Response
legs pair one-to-one with the ordered stops.

## 3. Two-phase optimization and provider fallbacks

- **Pre-driver**: traffic-optimize the passenger-only route; the driver leg is
  marked pending.
- **Post-driver**: capture a fresh traffic matrix with the driver as origin.
- **Matrix fails** → geometric fallback, marked `trafficAware: false` and
  `degraded: true`.
- **Only final geometry fails** → keep the traffic-optimized order and ETA, mark
  the geometry degraded.

## 4. One-shot caching

- Preview and final routes use **separate** pool cache keys.
- The first request per phase performs one matrix call plus one fixed-order
  call, then caches that immutable result for **two hours**.
- Exact member coordinates are fingerprinted, so a topology change can never
  reuse a stale route.
- Simultaneous cold requests share one in-flight calculation.
- Cached durations are **never** reduced just because time has passed.
- Driver location updates and off-route checks do **not** recalculate. Driver
  reassignment, membership changes and trip completion clear the pool route.
- A degraded road fallback keeps the same two-hour TTL — there is no separate
  short-TTL policy for it.
- Provider failures use an in-memory cooldown instead: a disabled or forbidden
  Routes API response pauses matrix attempts for 30 minutes; transient failures
  use shorter cooldowns. Once retryable, a degraded cached route is bypassed
  once and replaced after a successful call.
- Restarting the backend clears the cooldown, so enabling the Routes API and
  restarting retries immediately rather than waiting out the cached fallback.

---

## Cost

Every Routes API call is billed, and `TRAFFIC_AWARE_OPTIMAL` is the most
expensive tier. The caching above is what keeps a pool to **two** billed calls
for its whole lifetime per phase. See
[Google Maps cost model](./server.md#google-maps-cost-model) for the
service-level caching and request de-duplication that sits underneath.
