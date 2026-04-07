# CarPool Server - Pool Management Flow Analysis

## Overview
This document details the complete flow for pool operations:
1. Driver accepting a pool
2. Passenger joining a pool
3. Passenger leaving a pool

---

## 1. DRIVER ACCEPTS A POOL

### Controller: `driver.controller.ts` (Lines 626-827)

#### Endpoint
```
POST /driver/pools/:poolId/accept
```

#### Request Parameters
- `poolId` (URL param): UUID of pool to accept

#### Validation Checks (Before RPC Call)
1. **Authorization**: User must be authenticated
2. **Driver Active Pool**: Driver cannot accept a new pool if they already have one with status in ['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED']
3. **Driver Online**: Driver must have an active vehicle_locations record with `is_active = true`
4. **Vehicle Type Match**: Pool's vehicle_type must match driver's vehicle type

#### Database RPC Function: `atomic_accept_pool`
**File**: `Server/supabase/migrations/20260121_ridepool_merged_schema.sql`

```sql
CREATE OR REPLACE FUNCTION public.atomic_accept_pool(
  p_pool_id UUID,
  p_driver_id UUID,
  p_vehicle_id UUID
)
```

**What it does:**
1. Locks the pool for update (SELECT FOR UPDATE SKIP LOCKED)
2. Checks if pool exists with status IN ('WAITING_FOR_DRIVER', 'WAITING_FOR_RIDERS')
3. Checks if pool is still unassigned (driver_id IS NULL)
4. Validates pool has at least 2 passengers (current_passengers >= 2)
5. Updates pool:
   - Sets `driver_id` = driver
   - Sets `vehicle_id` = vehicle
   - Sets `status` = 'READY_TO_START'
   - Sets `updated_at` = NOW()
6. Returns: `{success: true, pool_id, assigned_at}`

#### Post-RPC Actions

After successful RPC call:

1. **Update Driver Session Status**
   ```
   UPDATE driver_sessions 
   SET status = 'BUSY' 
   WHERE driver_id = userId AND status = 'ONLINE'
   ```

2. **Update Vehicle Location**
   ```
   UPDATE vehicle_locations 
   SET pool_id = poolId, is_available = false 
   WHERE driver_id = userId
   ```

3. **Clear Cached Route**
   ```
   smartRouteService.clearPoolRoute(poolId)
   ```

4. **Fetch Pool Details with Members**
   - Selects pools with all pool_members joined
   - Gets user info (name, rating) for each member
   - Fetches ride details (pickup/dropoff locations, addresses) for each member

5. **Calculate Navigation Data**
   - Finds nearest pickup point to driver's current location
   - Builds Google Maps navigation URL to nearest pickup

#### Response to Driver
```json
{
  "success": true,
  "data": {
    "pool_id": "UUID",
    "status": "READY_TO_START",
    "passengers": [
      {
        "user_id": "UUID",
        "name": "Rider Name",
        "rating": 4.8,
        "pickup": { "lat": 0, "lng": 0, "address": "..." },
        "dropoff": { "lat": 0, "lng": 0, "address": "..." }
      }
    ],
    "destination": { "lat": 0, "lng": 0, "address": "..." },
    "nearest_pickup": { "lat": 0, "lng": 0 },
    "navigation_url": "https://www.google.com/maps/dir/?api=1&..."
  },
  "timestamp": "ISO8601"
}
```

#### Notification Status
⚠️ **NO NOTIFICATIONS SENT TO PASSENGERS** - This is a gap in the current implementation!
- The `sendDriverAssignedNotification()` method exists in notification.service.ts but is never called when a driver accepts
- Passengers rely on Supabase realtime subscriptions to detect pool status changes

---

## 2. PASSENGER JOINS A POOL

### Controller: `pool.controller.ts` (Lines 290-480)

#### Endpoint
```
POST /pools/:poolId/join
```

#### Request Parameters
- `poolId` (URL param): UUID of pool
- `ride_id` (body): UUID of passenger's ride

#### Validation Checks
1. **Cooldown Check**: User must not be in penalty cooldown
2. **Ride Exists**: Ride must exist and belong to authenticated user
3. **Pool Exists**: Pool must exist
4. **Compatibility Check**: Ride route must be compatible with pool route

#### Database RPC Function: `atomic_join_pool`

```sql
CREATE OR REPLACE FUNCTION public.atomic_join_pool(
  p_pool_id UUID,
  p_user_id UUID,
  p_ride_id UUID
)
```

**What it does:**
1. Locks the pool for update
2. Validates pool exists
3. Checks pool status is in ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER')
4. Validates pool is not full (current_passengers < max_passengers)
5. Checks user is not already a member
6. Inserts into pool_members:
   - `pool_id`, `user_id`, `ride_id`
   - `join_type` = 'MATCHED'
   - `joined_at` = NOW()
7. Increments pool's `current_passengers`
8. Updates ride: `pool_id` = poolId, `status` = 'WAITING_FOR_DRIVER'
9. If pool reaches max capacity, updates pool status to 'WAITING_FOR_DRIVER'
10. Returns: `{success: true, member_id, current_passengers, pool_status}`

#### Pool Members Table
**File**: `Server/supabase/migrations/20260121_ridepool_merged_schema.sql`

```sql
CREATE TABLE public.pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ride_id UUID NOT NULL,
  join_type VARCHAR(20) DEFAULT 'INITIAL',  -- 'INITIAL', 'MATCHED', etc.
  join_score DECIMAL(5,2),
  is_front_route BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,  -- NULL while member is active
  UNIQUE(pool_id, user_id),
  UNIQUE(ride_id)
);
```

**Active members**: `WHERE left_at IS NULL`

#### Post-RPC Actions

1. **Recalculate Fare** based on all pool members
   - Calls `rideEstimationService.recalculatePoolFare()`
   - Applies pool discount based on passenger count

2. **Notify Existing Members**
   - Sends push notification to other pool members about new rider and updated fare:
   ```
   await notificationService.sendPushNotification(member.user_id, {
     title: 'Fare Updated - New Rider Joined!',
     message: `A new rider joined your pool. Your fare is now ৳${farePerPerson} per person.`,
     type: 'POOL_MATCH',
     metadata: { poolId, farePerPerson, newPassengers: joinResult.current_passengers }
   });
   ```

3. **Handle Pool Creator Notification**
   - If pool creator not yet notified: `sendPoolFoundNotification()`

4. **Trigger Lookup Timer**
   - `lookupTimeService.handleMemberJoined(poolId)` to ensure smart route refreshes

#### Response to Passenger
```json
{
  "success": true,
  "data": {
    "pool_id": "UUID",
    "member_id": "UUID",
    "compatibility_score": 0.95,
    "fare_per_person": 120,
    "current_passengers": 3
  },
  "timestamp": "ISO8601"
}
```

#### Notifications Sent
✅ **Existing members** notified about fare update and new member
✅ **Pool creator** notified if not already notified about pool matching

---

## 3. PASSENGER LEAVES A POOL

### Controller: `pool.controller.ts` (Lines 585-850)

#### Endpoint
```
POST /pools/:poolId/leave
```

#### Request Parameters
- `poolId` (URL param): UUID of pool

#### Database RPC Function: `atomic_leave_pool`

```sql
CREATE OR REPLACE FUNCTION public.atomic_leave_pool(
  p_pool_id UUID,
  p_user_id UUID
)
```

**What it does:**
1. Locks pool_members for update
2. Checks user is an active member (left_at IS NULL)
3. Checks pool status is not 'STARTED' or 'COMPLETED' (can't leave mid-ride)
4. Updates pool_members: Sets `left_at` = NOW()
5. Decrements pool's `current_passengers`
6. Updates rides: Sets `pool_id` = NULL, `status` = 'CANCELLED', `cancelled_reason` = 'Left pool'
7. If current_passengers < 2, updates pool status to 'WAITING_FOR_RIDERS'
8. Returns: `{success: true, member_id, ride_id}`

#### Pool Member Removal Strategy
- **Soft delete**: Sets `left_at` timestamp instead of deleting row
- **Allows history tracking** and audit trails
- **Active members query**: `SELECT ... WHERE left_at IS NULL`

#### Post-Leave Actions

1. **Penalty Management**
   - Records cancellation in penalty service
   - If multiple cancellations trigger cooldown:
     ```
     await notificationService.sendPushNotification(userId, {
       title: 'Cooldown Applied',
       message: 'Due to multiple cancellations, you have a 7-minute cooldown.',
       type: 'SYSTEM',
       metadata: { cooldown_ends_at: penaltyResult.cooldownEndsAt }
     });
     ```

2. **Priyo Sathi Penalty** (Friend Mode)
   - Per requirements: "If one Priyo Sathi cancels, the other friend gets charged"
   - Applies penalty via `priyoSathiService.applyPriyoSathiCancellationPenalty()`

3. **Check Remaining Members**
   - Queries pool with `pool_members(user_id, ride_id, left_at)`
   - Filters to only active members: `WHERE left_at IS NULL`

4. **Auto-Cancel Pool if < 2 Members Remain**
   ```
   if (activeMembers.length <= 1) {
     // Cancel lookup timer
     lookupTimeService.cancelLookupTimer(poolId);
     
     // Update pool status to CANCELLED
     await supabaseAdmin.from('pools')
       .update({
         status: 'CANCELLED',
         updated_at: NOW()
       })
       .eq('id', poolId);
     
     // If 1 member remains, cancel their ride and notify
     if (activeMembers.length === 1) {
       const lastMember = activeMembers[0];
       
       // Cancel their ride
       await supabaseAdmin.from('rides')
         .update({
           pool_id: null,
           status: 'CANCELLED',
           cancelled_reason: 'Pool cancelled - not enough riders',
           updated_at: NOW()
         })
         .eq('id', lastMember.ride_id);
       
       // Notify remaining member
       await notificationService.sendPushNotification(lastMember.user_id, {
         title: 'Pool Cancelled',
         message: 'Your pool was automatically cancelled because all other riders left.',
         type: 'POOL_CANCELLED',
         metadata: { poolId, reason: 'not_enough_riders' }
       });
     }
   }
   ```

5. **Recalculate Fare if > 1 Member Remains**
   - Updates all remaining members with new fare
   - Sends notifications to all remaining members:
     ```
     await notificationService.sendPushNotification(member.user_id, {
       title: 'Fare Updated - Member Left',
       message: `A member left your pool. Your fare is now ৳${farePerPerson} per person.`,
       type: 'POOL_FARE_UPDATE',
       metadata: { poolId, farePerPerson, newPassengers: activeMembers.length }
     });
     ```

#### Response to Passenger
```json
{
  "success": true,
  "data": {
    "message": "Left pool successfully",
    "pool_cancelled": true,  // if applicable
    "reason": "..."
  },
  "timestamp": "ISO8601"
}
```

#### Notifications Sent
✅ **Penalty notification** if cooldown applied
✅ **Remaining member notification** if pool auto-cancelled
✅ **Remaining members notifications** if fare recalculated

---

## 4. POOL STATUS TRANSITIONS

### Status Values
```sql
status VARCHAR(20) CHECK (status IN (
  'WAITING_FOR_RIDERS',    -- Awaiting more passengers
  'WAITING_FOR_DRIVER',    -- Pool full, awaiting driver
  'DRIVER_ASSIGNED',       -- (Used but may be redundant with READY_TO_START)
  'READY_TO_START',        -- Driver accepted, ready to start
  'STARTED',               -- Ride in progress
  'COMPLETED',             -- Ride completed
  'CANCELLED'              -- Cancelled
))
```

### Status Transitions

| Event | From | To | Trigger |
|-------|------|----|----|
| Join Pool | WAITING_FOR_RIDERS | WAITING_FOR_DRIVER | When current_passengers >= max_passengers |
| Driver Accepts | WAITING_FOR_DRIVER | READY_TO_START | `atomic_accept_pool` RPC |
| Member Leaves | WAITING_FOR_DRIVER | WAITING_FOR_RIDERS | If current_passengers < 2 |
| Last Member Leaves | ANY | CANCELLED | Auto-cancel when ≤1 member remains |
| Ride Starts | READY_TO_START | STARTED | (Not in pool controller) |
| Ride Completes | STARTED | COMPLETED | (Not in pool controller) |

---

## 5. SUPABASE REALTIME & NOTIFICATIONS MECHANISM

### Notification Storage
- Notifications stored in `notifications` table (user_id, title, message, type, metadata, is_read)
- Table structure allows realtime subscriptions

### Notification Service: `notification.service.ts`

**Main Methods:**
1. `sendPushNotification(userId, payload)` - Sends notification + FCM push
2. `sendPoolFoundNotification(userId, poolId)` - Pool matched notification
3. `sendPoolReadyNotification(userId, poolId, message)` - Pool ready notification
4. `sendPoolCancelledNotification(userId, poolId, reason)` - Pool cancelled notification
5. `sendDriverAssignedNotification(userId, poolId, driverInfo)` - **Not currently used!**

**How it works:**
1. Inserts notification record into `notifications` table
2. If FCM_SERVER_KEY configured: Sends to Firebase Cloud Messaging
3. Fetches device_tokens from `device_tokens` table (must have is_active = true)
4. Sends FCM payload with title/body and optional data

### Realtime Configuration
- **Supabase Realtime enabled** via security headers:
  ```
  connectSrc: ["'self'", 'https://api.supabase.co', 'wss://realtime.supabase.co']
  ```

- **Client subscriptions** (in Client app, not Server):
  - Clients subscribe to `pools` table changes
  - Clients subscribe to `notifications` table changes
  - Clients subscribe to `pool_members` table changes
  - Changes broadcast automatically via Supabase realtime

### Push Notification Flow
```
Driver accepts pool
  ↓
RPC updates pools.driver_id (realtime broadcast to clients)
  ↓
Client detects pool status change (via subscription)
  ↓
Server should send FCM notification (NOT IMPLEMENTED)
  ↓
Client receives notification (iOS/Android/Web)
  ↓
Client refreshes pool state
```

⚠️ **Gap**: Server does NOT explicitly call `sendPushNotification()` after driver accepts pool. Clients detect status change via Supabase realtime subscription instead.

---

## 6. MESSAGE QUEUE SERVICE (Currently Unused)

**File**: `Server/src/services/messageQueue.service.ts`

- Uses **BullMQ** + **Redis** for job queue
- Supports: notifications, payments, analytics, driver-matching queues
- **Not currently utilized** in pool or driver controllers
- Could be extended for asynchronous notifications

---

## 7. KEY TABLES

### `pools` Table
```sql
- id: UUID (PK)
- creator_user_id: UUID (FK to users)
- driver_id: UUID (FK to users, nullable)
- vehicle_id: UUID (FK to vehicles, nullable)
- status: VARCHAR (WAITING_FOR_RIDERS, WAITING_FOR_DRIVER, READY_TO_START, etc.)
- current_passengers: INT
- max_passengers: INT
- pickup_lat, pickup_lng, destination_lat, destination_lng: DECIMAL
- pickup_address, destination_address: TEXT
- vehicle_type: VARCHAR
- fare_per_person: DECIMAL
- created_at, updated_at, started_at, completed_at: TIMESTAMPTZ
```

### `pool_members` Table
```sql
- id: UUID (PK)
- pool_id: UUID (FK)
- user_id: UUID (FK)
- ride_id: UUID (FK)
- join_type: VARCHAR ('INITIAL', 'MATCHED', etc.)
- joined_at: TIMESTAMPTZ
- left_at: TIMESTAMPTZ (NULL = active member, SET = left pool)
- UNIQUE(pool_id, user_id)
- UNIQUE(ride_id)
```

### `rides` Table (Related)
```sql
- pool_id: UUID (FK, nullable)
- status: VARCHAR (WAITING_FOR_DRIVER, CANCELLED, etc.)
- cancelled_reason: TEXT
```

### `notifications` Table
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- title: TEXT
- message: TEXT
- type: VARCHAR (POOL_MATCH, DRIVER_ASSIGNED, POOL_CANCELLED, etc.)
- metadata: JSONB
- is_read: BOOLEAN
```

---

## 8. PENALTIES & COOLDOWN

**Trigger**: When passenger cancels multiple times

**Penalty System** (`penaltyService`):
- Tracks cancellations per user
- Applies 7-minute cooldown after threshold
- Prevents user from joining new pools during cooldown

**Priyo Sathi Penalty** (Friend Mode):
- If one friend cancels a Priyo Sathi pool
- Other friend gets charged as penalty
- Encourages partner reliability

---

## 9. SUMMARY OF FLOWS

### Driver Accepts Pool
1. Validates driver online + no active pool
2. Calls `atomic_accept_pool` RPC
3. Updates driver session → BUSY
4. Marks vehicle unavailable
5. Clears cached route
6. **NO notification sent to passengers** ⚠️
7. Returns pool details + passenger list + navigation link to driver

### Passenger Joins Pool
1. Validates cooldown, ride, pool, compatibility
2. Calls `atomic_join_pool` RPC
3. Increments pool passengers
4. Updates ride status → WAITING_FOR_DRIVER
5. **Notifies other members** about fare change ✅
6. Notifies pool creator if not yet notified ✅
7. Triggers lookup timer refresh

### Passenger Leaves Pool
1. Validates they're a member + ride not started
2. Calls `atomic_leave_pool` RPC
3. Soft-deletes member (sets left_at)
4. Decrements pool passengers
5. Records cancellation penalty
6. **Auto-cancels pool if < 2 members** ✅
7. **Notifies remaining members** about fare change ✅
8. **Notifies last remaining member** if pool cancelled ✅
9. Applies Priyo Sathi penalty if applicable

---

## 10. ARCHITECTURE OBSERVATIONS

✅ **Strengths:**
- Atomic RPC functions ensure consistency
- Soft-delete approach for audit trail
- Supabase realtime enables real-time updates
- Comprehensive penalty system
- Fare recalculation on member changes
- Auto-cancel safety mechanism

⚠️ **Gaps/Improvements Needed:**
- No explicit notification when driver accepts pool
- `sendDriverAssignedNotification()` never called
- Message queue service not utilized
- No webhook-style event broadcasting
- Relies on client-side realtime subscriptions for all updates

---
