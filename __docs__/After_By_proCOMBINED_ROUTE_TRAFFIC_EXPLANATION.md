# Optimized Combined Route: Traffic Awareness and Calculation Flow

## Short answer

Yes, the **combined smart route** path is traffic-aware.

When the backend calculates the combined route via `GET /pools/:poolId/combined-route`, it requests Google Directions with:

- `departure_time=now`
- `traffic_model=best_guess`
- multiple alternatives
- `waypoints=optimize:true|...`

Then it selects the route with the lowest `durationInTraffic`.

---

## Important distinction (current code behavior)

There are currently **two route endpoints**:

1. `GET /pools/:poolId/combined-route`  
   Implemented by `poolController.getCombinedRoute()` and `smartRouteService.calculateCombinedRoute()`.  
   This is the traffic-aware combined route path.

2. `GET /pools/:poolId/route`  
   Implemented by `poolController.getOptimizedRoute()` and `rideEstimationService.calculateOptimizedPoolRoute()`.  
   This is a legacy optimized route path.

In the current clients:

- Rider app has combined-route APIs in `Client/CarPoolApp/services/pool.service.ts`.
- Driver app service currently calls `/route` in `Client/DriverApp/src/services/driver.service.ts` (`getPoolRoute`), even though `COMBINED_ROUTE` endpoint exists in config.

So if you are specifically asking about **combined smart route**, traffic is considered.  
If you are looking at the **legacy `/route` flow**, optimization is mainly geometric stop ordering and does not use traffic as the optimization objective.

### Quick plain explanation (How / When / Why / Impact)

- **How is this happening?**  
  The backend exposes two valid endpoints, and different client code paths call different ones.  
  Rider flow is wired to `combined-route`; driver trip-progress flow is still wired to `route`.

- **When does each one run?**  
  When rider screens ask route data through `poolService.getCombinedRoute(...)`, server runs traffic-aware smart routing.  
  When driver trip-progress calls `driverService.getPoolRoute(...)`, server runs the legacy route calculation path.

- **Why is it like this?**  
  `combined-route` was introduced later to add traffic-aware optimization + one-shot caching, but driver trip-progress integration was not fully switched yet.

- **What is the impact?**  
  Rider and driver can see different ETA/route behavior for the same pool.  
  Driver may get less traffic-sensitive route timing than rider because `/route` is not optimized by traffic as the primary objective.

---

## End-to-end combined route calculation flow

## 1) Request enters pool controller

`Server/src/routes/pool.routes.ts` maps:

- `GET /:poolId/combined-route` -> `poolController.getCombinedRoute`

Inside `Server/src/controllers/pool.controller.ts` (`getCombinedRoute`):

- Authenticates user.
- Loads pool and active members (`left_at === null`).
- Fetches all member rides (pickup/dropoff points).
- Optionally loads driver location (from query params or latest `vehicle_locations`) when status is `WAITING_FOR_DRIVER` or `READY_TO_START`.
- Calls:

`smartRouteService.calculateCombinedRoute(memberRoutes, options, poolId)`

with:

- `optimizeFor: 'balanced'`
- `trafficModel: 'best_guess'`
- `useCoarseDriverLocation: true`

---

## 2) SmartRouteService prepares and caches

In `Server/src/services/smartRoute.service.ts`:

- Uses a **one-shot optimization strategy**:
  - First call for pool -> fetch from Google API.
  - Cache result for **2 hours** (`ONE_SHOT_ROUTE_CACHE_TTL = 7200`).
  - Later calls -> return cached route (no new API call).
- Cache key is stable per pool when `poolId` is provided: `smart-route:pool:<poolId>`.
- Builds an initial ordered waypoint list with constraints:
  - pickup must happen before that same user’s dropoff.
  - greedy nearest-neighbor heuristic for next stop selection.

Then it calls `fetchOptimizedRoute(...)`.

---

## 3) Google Maps traffic-aware route fetch

In `Server/src/services/googleMaps.service.ts`:

`getBestRouteWithTraffic(origin, destination, waypoints)`:

- Sends request to Google Directions API with:
  - `departure_time=now`
  - `traffic_model=best_guess`
  - `alternatives=true`
  - `waypoints=optimize:true|...` (when waypoints exist)
- Parses all returned routes.
- Computes each route's:
  - distance
  - base duration
  - `durationInTraffic`
  - traffic level (`low/moderate/high`) from traffic/base ratio.
- Sorts by `durationInTraffic` ascending and picks fastest-in-traffic route.
- Caches this best-route result for **10 minutes** (`ROUTE_CACHE_TTL = 600`) with H3-based cache keys.

`smartRouteService` then uses that result to construct:

- polyline/coordinates
- total distance and durations
- legs
- ETA per waypoint
- optimization stats (savings vs individual rides)

---

## 4) Response payload returned to app

`poolController.getCombinedRoute` returns:

- `route.totalDistanceKm`
- `route.totalDurationMinutes`
- `route.durationInTraffic`
- `route.trafficLevel`
- ordered `waypoints` with `estimatedArrivalMinutes`
- leg breakdown
- optimization metrics
- meta (`fromCache`, `calculatedAt`, memberCount, etc.)

---

## What “traffic-aware” means here

Traffic-aware means:

- ETA uses Google’s current traffic model (`duration_in_traffic`).
- Route selection is based on traffic-adjusted time, not only geometric distance.

It does **not** mean:

- continuous per-second rerouting for every location update.

The system intentionally prefers cached one-shot route results for cost control.

---

## Driver-location updates and rerouting behavior

There are two related pieces:

- `POST /pools/:poolId/combined-route/update` exists, but currently returns `needsRecalculation: false` in controller.
- `smartRouteService` has off-route recalculation methods, but controller currently does not invoke full recalculation flow yet.

So today, core optimization is done on initial combined-route calculation + cache reuse.

---

## Legacy `/route` endpoint behavior (why results can differ)

`GET /pools/:poolId/route` uses `rideEstimationService.calculateOptimizedPoolRoute()`:

- Stop ordering: nearest-neighbor with pickup-before-dropoff constraint.
- Leg metrics often use `googleMapsService.getRoute(from, to)`.
- It accumulates `routeResult.duration` (base duration), not `durationInTraffic`, for total duration.

This is why `/route` may be less traffic-sensitive than `/combined-route`.

---

## Practical takeaway

If you want route optimization that explicitly considers current traffic, use:

- `GET /pools/:poolId/combined-route`

and read:

- `route.durationInTraffic`
- `route.trafficLevel`

If a screen still calls `/route`, it is using the older path and may not fully reflect traffic-optimized behavior.






## Cost impact if DriverApp switches to `/combined-route`

### Short answer

Usually **no extra cost**. In many cases, cost is the same or lower.

### Why it may NOT increase cost

- `combined-route` uses a **pool-level one-shot cache** (`smart-route:pool:<poolId>`) with ~2 hour TTL.
- First request calculates once using Google; later requests (rider + driver) reuse cached data.
- `googleMapsService` also has a secondary cache (~10 minutes) for best-route lookups.

So if rider already requested combined-route, driver typically reads cached route (no additional Google call).

### When it could increase cost

- If both rider and driver request combined-route for a pool before cache exists (near-simultaneous cold start), more than one call can still happen in edge cases.
- If cache is evicted/expired and route is requested again, a new call is needed.

### Why it can be cheaper than keeping `/route`

- Legacy `/route` can trigger multiple per-leg route calls for multi-stop pools.
- `combined-route` is designed to avoid repeated recalculation by reusing one cached result for the trip window.

### Practical conclusion

Switching DriverApp to `/combined-route` is generally **cost-safer and more consistent** with rider ETA/route behavior, not a guaranteed cost increase.

## Current system vs after DriverApp switch (brief)

### What is happening now

- Rider route view can use `/pools/:poolId/combined-route` (traffic-aware smart route).
- Driver trip-progress is still calling `/pools/:poolId/route` (legacy flow).
- Result: rider and driver may see slightly different ETA/route behavior for the same pool.

### What will happen after the code change

- Driver trip-progress will also call `/pools/:poolId/combined-route`.
- Both rider and driver will read the same route model (`durationInTraffic`, ordered waypoints, same optimization data).
- Result: consistent ETA/route behavior across both apps.

### Why this is better

- Single source of truth for active pool route.
- Better UX consistency (fewer “why is my ETA different?” cases).
- Easier debugging and support because both apps consume the same route payload.

### API cost (money) impact

- Not expected to be a major increase; often neutral or lower.
- Because combined-route uses pool-level one-shot caching, many rider+driver reads hit cache.
- Some edge cases can still create extra calls (cold start race, cache expiry), but overall design is cost-control oriented.

#=================================================================================================================================================================

Implementation prompt:

   Task: Update DriverApp to use traffic-aware combined route endpoint instead of legacy /route.
   
   Repo: /home/raisul/RaisulFiles/CarPool-Dev/Carpool-dev
   
   Goal:
   Make DriverApp route fetching use `GET /pools/:poolId/combined-route` so driver and rider use the same smart route + ETA model.
   
   Critical requirement:
   If rider already called `/combined-route` for the same `poolId` and cache is valid, driver must reuse cached route (no new Google API call). Do not introduce 
  cache-busting behavior.
   
   Files to inspect/update:
   - Client/DriverApp/src/services/driver.service.ts
   - Client/DriverApp/src/config/api.config.ts
   - Client/DriverApp/src/components/pool/TripProgress.native.tsx
   - Any DriverApp types needed for combined-route response shape
   
   Implementation requirements:
   1) Replace DriverApp `/route` usage with `/combined-route`.
   2) Ensure response mapping supports:
      - `route.coordinates`
      - `route.totalDistanceKm`
      - `route.totalDurationMinutes`
      - `route.durationInTraffic`
      - `waypoints`, `legs`, and `meta.fromCache`
   3) Keep current UI behavior intact (route card, ETA badge, waypoint list, map polyline).
   4) Keep existing polling/realtime triggers; avoid adding unnecessary refetch loops.
   5) Do not modify server cache key logic; rely on pool-level cache reuse as designed.
   
   Validation:
   - `cd Client/DriverApp && npx tsc --noEmit`
   - `cd Client/DriverApp && npm run lint`
   - `cd Server && npm run build`
   - Manual check:
     - First open may be uncached
     - Reopen trip-progress for same pool should show cached behavior (`meta.fromCache` true when available)
   
   Deliverables:
   - Code changes
   - Short summary of why cache reuse prevents extra Google calls in normal same-pool flow.