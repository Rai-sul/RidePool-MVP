# Pool Status Flow: WAITING_FOR_DRIVER -> Driver Accepts

This document traces the end-to-end flow for when a pool transitions to `WAITING_FOR_DRIVER` and then a driver accepts it. It covers backend status transitions, API endpoints, DB functions, and frontend behavior in both rider and driver apps.

Important naming note:
- The status used in code is `WAITING_FOR_DRIVER` (singular), not `WAITING_FOR_DRIVERS`.

## Status Values Used

Backend and clients use these pool statuses (not exhaustive):
- `WAITING_FOR_RIDERS`
- `WAITING_FOR_DRIVER`
- `READY_TO_START`
- `STARTED`
- `COMPLETED`
- `CANCELLED`

## Backend: How a Pool Becomes WAITING_FOR_DRIVER

There are two main ways the pool status becomes `WAITING_FOR_DRIVER`:

### A) Atomic join makes the pool full
1. A rider joins a pool through the `joinPool` controller.
   - File: `Server/src/controllers/pool.controller.ts` (function `joinPool`)
2. The controller calls the database RPC `atomic_join_pool`.
   - File: `Server/supabase/migrations/20260121_ridepool_merged_schema.sql`
3. `atomic_join_pool` increments `current_passengers`.
4. If `current_passengers >= max_passengers`, it updates:
   - `pools.status = 'WAITING_FOR_DRIVER'`
   - `rides.status = 'WAITING_FOR_DRIVER'` for the joining ride
5. The controller recalculates fares, updates ride statuses to `MATCHED`, and then calls:
   - `lookupTimeService.handleMemberJoined(poolId)` to ensure routes and transitions are in sync.

### B) Lookup timer or member-join logic reaches the minimum passenger threshold
1. Pool creation starts the lookup timer.
   - File: `Server/src/controllers/pool.controller.ts` (function `createPool`)
   - Calls `lookupTimeService.startLookupTimer(pool.id)`
2. The lookup timer runs two phases (initial + extended).
   - File: `Server/src/services/lookupTime.service.ts`
3. If the pool reaches the minimum passengers at any point, the service transitions it:
   - `transitionToWaitingForDriver(poolId)`
4. This transition:
   - Updates pool status to `WAITING_FOR_DRIVER`
   - Updates member rides to `CONFIRMED`
   - Pre-calculates the combined route
   - Notifies all riders and notifies nearby drivers

## Backend: How Drivers See WAITING_FOR_DRIVER Pools

1. Driver app polls available pools via:
   - `GET /driver/available-pools`
2. The controller filters pools:
   - `status = WAITING_FOR_DRIVER`
   - `driver_id IS NULL`
   - `current_passengers >= 2`
   - Vehicle type must match the driver's vehicle type (if available)
3. It also filters by pickup proximity using H3.

Files involved:
- `Server/src/controllers/driver.controller.ts` (function `getAvailablePools`)
- `Server/src/types/index.ts` (Pool/PoolStatus typing)

## Backend: Driver Accepts the Pool

1. Driver app calls:
   - `POST /driver/pools/:poolId/accept`
2. Controller validates:
   - Driver is authenticated
   - Driver is online and has an active vehicle
   - Driver does not already have an active pool
   - Vehicle type matches pool requirement
3. Controller calls the DB RPC `atomic_accept_pool`:
   - It locks the pool row
   - Verifies the pool is `WAITING_FOR_DRIVER` (or `WAITING_FOR_RIDERS`)
   - Verifies at least 2 passengers
   - Sets `driver_id`, `vehicle_id`, and `status = READY_TO_START`
4. Controller updates:
   - `driver_sessions` to `BUSY`
   - `vehicle_locations` to mark the pool and availability
   - Clears cached pool route so it can be recalculated with driver location

Files involved:
- `Server/src/routes/driver.routes.ts`
- `Server/src/controllers/driver.controller.ts` (function `acceptPool`)
- `Server/supabase/migrations/20260121_ridepool_merged_schema.sql` (function `atomic_accept_pool`)
- `Server/src/services/smartRoute.service.ts` (route cache clearing)

## Rider App (CarPoolApp) Frontend Flow

1. Realtime hook polls and subscribes to pool updates:
   - `usePoolRealtime` calls `poolService.getPoolById(poolId)`
   - It stores `pool.status` as `poolStatus`
2. When `poolStatus` becomes `WAITING_FOR_DRIVER`:
   - Searching screens auto-navigate or update UI state
   - Trip progress UI updates to "waiting for driver"
3. When driver accepts (pool becomes `READY_TO_START`):
   - UI transitions to driver-assigned states

Files involved:
- `Client/CarPoolApp/hooks/usePoolRealtime.ts`
- `Client/CarPoolApp/services/pool.service.ts`
- `Client/CarPoolApp/components/SearchingDriver.native.tsx`
- `Client/CarPoolApp/components/SearchingDriver.web.tsx`
- `Client/CarPoolApp/components/TripProgress.native.tsx`
- `Client/CarPoolApp/components/TripProgress.web.tsx`
- `Client/CarPoolApp/components/ActiveTripButton.tsx`

## Driver App (DriverApp) Frontend Flow

1. Driver home screen polls `getAvailablePools()` every 15s when online.
2. Pools shown are all `WAITING_FOR_DRIVER` (filtered by backend).
3. Driver taps accept:
   - Calls `driverService.acceptPool(poolId)`
   - Updates `activePool` locally with the accept response
   - UI navigates to trip progress (watching `activePool`)

Files involved:
- `Client/DriverApp/app/(tabs)/home.tsx`
- `Client/DriverApp/src/services/driver.service.ts`
- `Client/DriverApp/src/config/api.config.ts`
- `Client/DriverApp/src/store/useDriverStore`

## Data/DB-Level Functions Involved

1. `atomic_join_pool` (DB function)
   - Updates `pools.current_passengers`
   - Sets `pools.status` to `WAITING_FOR_DRIVER` when full
2. `atomic_accept_pool` (DB function)
   - Assigns `driver_id` and `vehicle_id`
   - Sets `pools.status` to `READY_TO_START`

File:
- `Server/supabase/migrations/20260121_ridepool_merged_schema.sql`

## Optional: Related Status-Driven APIs

These are not part of acceptance, but often trigger after status changes:
- `GET /pool/:poolId/combined-route` (available for `WAITING_FOR_DRIVER` and beyond)
- `POST /pool/:poolId/update-combined-route` (driver only)

Files:
- `Server/src/controllers/pool.controller.ts`
- `Client/CarPoolApp/services/pool.service.ts`

## Quick Step-by-Step Summary

1. Pool created -> status `WAITING_FOR_RIDERS` and timer starts.
2. Rider joins -> DB function `atomic_join_pool` increments passengers.
3. If enough passengers -> pool transitions to `WAITING_FOR_DRIVER`.
4. Backend notifies riders + drivers.
5. Driver app polls -> sees pool in available list.
6. Driver accepts -> backend calls `atomic_accept_pool`.
7. Pool status becomes `READY_TO_START`.
8. Rider app updates UI via realtime/polling to show driver assigned.
