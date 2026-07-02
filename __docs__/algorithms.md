
## SmartRouteService Algorithms

### 1. `orderWaypointsOptimally` - Greedy Nearest Neighbor with Constraints

**Purpose**: Orders pickup and dropoff waypoints to minimize travel distance while ensuring each passenger is picked up before being dropped off.

**Algorithm**:
- Start at driver location when provided, otherwise pick the pickup closest to the pickup centroid.
- Greedy nearest neighbor selection across remaining pickups and eligible dropoffs.
- Dropoffs are only eligible after the corresponding pickup has occurred.

**Complexity**:
- Time: O(n^2) where n = number of total pickups and dropoffs
- Space: O(n) for waypoint maps and picked-up set

**Trade-offs**:
- Fast and deterministic, but not globally optimal
- Works well for small to medium pool sizes where responsiveness is preferred

### 2. `calculateDistanceToRoute` - Point-to-Route Distance

**Purpose**: Determines if driver has deviated from the planned route for off-route detection.

**Algorithm**: Linear scan to find minimum distance from a point to any coordinate in the route polyline.

**Complexity**:
- Time: O(k) where k = number of route coordinates
- Space: O(1)

**Notes**: For very long routes, spatial indexing could reduce lookup time.

### 3. `generateCacheKey` - H3 Cell-Based Cache Key

**Purpose**: Builds stable cache keys that cluster nearby locations for route caching.

**Algorithm**:
- Uses H3 hexagonal indexing.
- Pickups use resolution 9, dropoffs use resolution 7.
- Driver location uses resolution 9 unless `useCoarseDriverLocation` is true (then 7).
- Cache key also includes the `optimizeFor` option.

**Complexity**:
- Time: O(n) where n = number of members
- Space: O(n) for hash strings

### 4. One-Shot Route Caching and ETA Adjustment

**Purpose**: Minimize Google Maps calls while keeping ETA realistic for cached routes.

**Algorithm**:
- First request computes a Google Maps route and caches it for the full trip window.
- Subsequent requests return cached results and subtract elapsed time from ETA fields.
- ETA values are clamped to a minimum of 1 minute.

**Complexity**: O(1) per cached response

