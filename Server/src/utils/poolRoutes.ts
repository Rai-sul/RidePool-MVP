/**
 * Mapping from `rides` database rows to the routing services' input shape.
 *
 * Both `smartRoute.service.ts` (`PoolMemberRoute`) and
 * `rideEstimation.service.ts` (`PoolMemberLocation`) accept this exact shape, so
 * one mapper serves both.
 *
 * WHY THIS EXISTS
 * Before this module the same nine-line `rides.map(...)` literal was repeated in
 * nine places across the pool controller, the lookup-time service and the
 * advance-dispatch service. Any new field the routing layer needs (a pickup
 * note, a stop priority, an accessibility flag) had to be threaded through all
 * of them, and one missed copy produced a route that silently ignored it.
 *
 * ADDING A FIELD
 * Add it to `RideRouteRow`, map it in `toPoolMemberRoute`, and add it to
 * `RIDE_ROUTE_COLUMNS` so callers' `select()` keeps fetching what the mapper
 * reads. Every call site then picks it up for free.
 */

/** Columns a `rides` row must carry to be mapped into a routing input. */
export const RIDE_ROUTE_COLUMNS =
  'user_id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address';

/** The subset of a `rides` row that routing cares about. */
export interface RideRouteRow {
  user_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address?: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address?: string;
}

/** Shape shared by `PoolMemberRoute` and `PoolMemberLocation`. */
export interface PoolMemberRouteInput {
  userId: string;
  pickup: { latitude: number; longitude: number };
  dropoff: { latitude: number; longitude: number };
  pickupAddress?: string;
  dropoffAddress?: string;
}

/** Map a single `rides` row into a routing input. */
export const toPoolMemberRoute = (ride: RideRouteRow): PoolMemberRouteInput => ({
  userId: ride.user_id,
  pickup: { latitude: ride.pickup_lat, longitude: ride.pickup_lng },
  dropoff: { latitude: ride.dropoff_lat, longitude: ride.dropoff_lng },
  pickupAddress: ride.pickup_address,
  dropoffAddress: ride.dropoff_address,
});

/** Map a set of `rides` rows into routing inputs, preserving order. */
export const toPoolMemberRoutes = (rides: RideRouteRow[]): PoolMemberRouteInput[] =>
  rides.map(toPoolMemberRoute);
