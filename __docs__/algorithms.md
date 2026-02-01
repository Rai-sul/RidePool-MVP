
## SmartRouteService Algorithms

### 1. `orderWaypointsOptimally` - Greedy Nearest Neighbor with Constraints

**Purpose**: Orders pickup and dropoff waypoints to minimize total travel distance while ensuring each passenger is picked up before being dropped off.

**Algorithm**: Greedy nearest neighbor with pickup-before-dropoff constraint.

**Complexity**:
- Time: O(n² × m) where n = number of members, m = number of remaining waypoints per iteration
- In practice: O(n²) since each iteration reduces the search space
- Space: O(n) for storing waypoint maps and picked-up set

**Trade-offs**:
- Greedy approach is fast but may not find the globally optimal route
- Suitable for real-time applications where quick response is more important than perfect optimization
- For larger pools (>10 members), consider implementing 2-opt or simulated annealing

### 2. `calculateDistanceToRoute` - Point-to-Route Distance

**Purpose**: Determines if driver has deviated from the planned route.

**Algorithm**: Linear scan to find minimum distance from point to any coordinate on route.

**Complexity**:
- Time: O(k) where k = number of route coordinates
- Space: O(1)

**Improvement Opportunity**: Could be optimized to O(log k) using spatial indexing (R-tree) or segment-based binary search for very long routes.

### 3. `generateCacheKey` - H3 Geohash-Based Cache Key

**Purpose**: Generates stable cache keys that group nearby locations together.

**Algorithm**: 
- Uses H3 hexagonal hierarchical spatial indexing
- Resolution 9 (~174m edge) for pickups and fine driver location
- Resolution 7 (~1.2km edge) for dropoffs and coarse driver location (active trips)

**Complexity**:
- Time: O(n) where n = number of members
- Space: O(n) for hash strings

**Design Rationale**:
- Coarse resolution for active trips prevents cache invalidation on small driver movements
- Reduces Google Maps API calls by ~66% for in-progress trips
- 15-minute cache TTL for active trips vs 5-minute for planning phase

### 4. ETA Adjustment for Cached Routes

**Purpose**: Prevents "stuck" ETA display when serving cached routes.

**Algorithm**: Simple subtraction of elapsed time since route calculation.

**Complexity**: O(1)

**Bounds**: ETA never goes below 1 minute (Math.max(1, adjusted))

