## SmartRouteService Algorithms

### 1. Exact pickup/drop-off sequence search

**Purpose**: Select the fastest combined route from a single traffic snapshot while ensuring every pickup occurs before its matching drop-off.

**Algorithm**:
- Before assignment, optimize every passenger stop with a free first pickup and final drop-off.
- After assignment, add the driver as the fixed origin and optimize the passenger stops again.
- Fetch a Google Routes traffic matrix for every stop participating in that phase.
- Enumerate every precedence-valid stop sequence. The final drop-off is not fixed.
- Reject sequences with missing matrix edges.
- Prefer routes satisfying every passenger detour cap (at most 7 extra minutes and 25% extra in-vehicle time).
- Rank feasible sequences by traffic duration, then road distance. If none are feasible, minimize the largest normalized cap violation before applying the same duration/distance tie-breakers.

With four passengers there are at most `8! / 2^4 = 2,520` precedence-valid passenger-stop sequences, which is small enough for exact in-memory evaluation.

### 2. Fixed-order traffic route

After selecting the sequence, the server calls Google Routes `computeRoutes` with `TRAFFIC_AWARE_OPTIMAL`. Google waypoint optimization is intentionally disabled, so the provider cannot break pickup/drop-off precedence. Whole response legs are paired directly with the same ordered stops.

### 3. Two-phase traffic optimization and provider fallbacks

- Before driver assignment, the service traffic-optimizes the passenger-only route and marks only the driver leg as pending.
- After assignment, it captures a new traffic matrix with the driver fixed as the origin.
- If the traffic matrix fails, it returns a geometric fallback marked `trafficAware: false` and `degraded: true`.
- If only final geometry fails, it retains the traffic-optimized matrix order and ETA but marks geometry as degraded.

### 4. One-shot caching

- Preview and final routes use separate pool cache keys.
- The first request in each phase performs one route-matrix request and one fixed-order route request, then caches that immutable phase result for two hours.
- Exact member coordinates are fingerprinted to prevent topology changes from reusing stale routes.
- Simultaneous cold requests share one in-flight calculation.
- Cached durations are never reduced merely because time elapsed.
- Driver location and off-route updates do not recalculate the route; driver reassignment, membership changes, and trip completion clear the pool route.
- A degraded road fallback keeps the same two-hour route TTL; it is not put on a separate 60-second cache policy.
- Provider failures have an in-memory retry cooldown instead. Disabled/forbidden Routes API responses pause matrix attempts for 30 minutes, while transient failures use shorter cooldowns. When the provider becomes retryable, a degraded cached route is bypassed once and replaced by a traffic-aware snapshot after a successful request.
- Restarting the backend clears the provider cooldown, so enabling Routes API and restarting immediately retries Google without waiting for the cached fallback to expire.
