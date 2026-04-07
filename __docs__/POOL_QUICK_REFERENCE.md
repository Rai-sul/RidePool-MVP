# CarPool Pool Management - Quick Reference

## File Locations

| Component | File Path | Lines |
|-----------|-----------|-------|
| Driver Accept Pool | `Server/src/controllers/driver.controller.ts` | 626-827 |
| Pool Join | `Server/src/controllers/pool.controller.ts` | 290-480 |
| Pool Leave | `Server/src/controllers/pool.controller.ts` | 585-850 |
| RPC Functions | `Server/supabase/migrations/20260121_ridepool_merged_schema.sql` | - |
| Notifications | `Server/src/services/notification.service.ts` | - |
| Routes | `Server/src/routes/driver.routes.ts` line 21, `Server/src/routes/pool.routes.ts` line 17-18 | - |

---

## API Endpoints

### Driver Accept Pool
```
POST /driver/pools/:poolId/accept
Authorization: Bearer <token>

Response: {pool_id, status, passengers[], destination, navigation_url}
```

### Passenger Join Pool
```
POST /pools/:poolId/join
Body: {ride_id: UUID}
Authorization: Bearer <token>

Response: {pool_id, member_id, fare_per_person, current_passengers}
```

### Passenger Leave Pool
```
POST /pools/:poolId/leave
Authorization: Bearer <token>

Response: {message, pool_cancelled: boolean}
```

---

## Database Operations

### RPC Function: atomic_accept_pool
**Purpose**: Atomically assign driver to pool and update status
- **Input**: pool_id, driver_id, vehicle_id
- **Actions**: Lock pool → Validate → Update driver_id, vehicle_id, status
- **Output**: {success, pool_id, assigned_at}

### RPC Function: atomic_join_pool
**Purpose**: Atomically add member to pool and update pool status
- **Input**: pool_id, user_id, ride_id
- **Actions**: Lock pool → Validate capacity → Insert pool_members → Update counters
- **Output**: {success, member_id, current_passengers}

### RPC Function: atomic_leave_pool
**Purpose**: Atomically remove member from pool (soft delete)
- **Input**: pool_id, user_id
- **Actions**: Lock members → Set left_at → Decrement → Update ride status
- **Output**: {success, ride_id}

---

## Pool Status Flow

```
WAITING_FOR_RIDERS
    ↓ [1+ join]
WAITING_FOR_RIDERS (if <max passengers)
    ↓ [pool full]
WAITING_FOR_DRIVER
    ↓ [driver accepts]
READY_TO_START
    ↓ [ride starts]
STARTED
    ↓ [ride completes]
COMPLETED

Or at any point: → CANCELLED (auto if <2 members, or manual)
```

---

## Notifications Sent

### When Passenger Joins
- **To**: Other pool members
- **Message**: "New rider joined your pool. Fare updated to ৳XYZ"

### When Pool Cancelled (auto)
- **To**: Remaining member (if 1 left)
- **Message**: "Pool cancelled - not enough riders"

### When Passenger Leaves (fare recalc)
- **To**: All remaining members
- **Message**: "Member left your pool. New fare ৳XYZ"

### When Penalty Applied
- **To**: User who left
- **Message**: "Cooldown applied - 7 minute wait"

### ⚠️ Missing: Driver Accepted
- **Should go to**: All pool members
- **But**: Currently NOT sent (clients detect via realtime)

---

## Key Data Structures

### Pool Member (soft delete)
```sql
- id: UUID
- pool_id: UUID
- user_id: UUID
- ride_id: UUID
- joined_at: TIMESTAMP
- left_at: TIMESTAMP (NULL = active)
```

### Pool Status Updates
```sql
UPDATE pools SET
  driver_id = ?, 
  vehicle_id = ?,
  status = 'READY_TO_START',
  updated_at = NOW()
WHERE id = ?
```

### Ride Status Updates
```sql
UPDATE rides SET
  pool_id = ?,
  status = 'WAITING_FOR_DRIVER' | 'CANCELLED',
  updated_at = NOW()
WHERE id = ?
```

---

## Important Implementation Details

### Soft Delete in pool_members
- Members are NOT deleted, `left_at` is SET to timestamp
- Allows audit trail and recovery
- Active members query: `WHERE left_at IS NULL`

### Atomic RPC Functions
- Use `SELECT FOR UPDATE` for locking
- Prevent race conditions (multiple joins, driver acceptance simultaneously)
- Return structured JSON responses

### Fare Recalculation
- Called after every member join/leave
- Uses pool's vehicle_type and all member routes
- Applies discount based on passenger count

### Auto-Cancel Safety
- Pool auto-cancels if ≤1 member remains
- Last remaining member notified + ride cancelled
- Prevents wasteful lookup

### Priyo Sathi (Friend Mode)
- If one friend cancels, other friend penalized
- Encourages mutual reliability
- Applied via `priyoSathiService.applyPriyoSathiCancellationPenalty()`

---

## Realtime Mechanism

### Supabase Realtime Subscriptions (Client-side)
- Clients subscribe to `pools` table
- Clients subscribe to `pool_members` table
- Clients subscribe to `notifications` table
- Server updates database → Changes broadcast to all subscribers

### Push Notifications (Server-side)
- Stored in `notifications` table
- Sent to Firebase Cloud Messaging (FCM) if FCM_SERVER_KEY configured
- Delivered to all active device_tokens for user

### Current Gap
- Driver acceptance: Status updated in DB (realtime broadcasts) but NO explicit push notification

---

## Testing Checklist

- [ ] Driver accepts pool → pool.status = 'READY_TO_START', driver_id set
- [ ] Driver session → status = 'BUSY'
- [ ] Vehicle location → is_available = false
- [ ] Passenger joins → pool_members record created, left_at IS NULL
- [ ] Pool full → status changes to 'WAITING_FOR_DRIVER'
- [ ] Fare recalculates → Multiple members notified
- [ ] Passenger leaves → left_at timestamp set (not deleted)
- [ ] < 2 members remain → Pool auto-cancelled
- [ ] Remaining member → Receives cancellation notification
- [ ] Cooldown applied → User receives notification
- [ ] Priyo Sathi penalty → Other friend charged

---

## Performance Considerations

1. **Lock Contention**: RPC functions use SKIP LOCKED to avoid blocking
2. **Indexing**: Active members: `idx_pool_members_active (pool_id, user_id) WHERE left_at IS NULL`
3. **Notification Queue**: Message queue service available but not currently used
4. **Fare Calculation**: Could be cached/optimized for large pools

---

## Known Gaps & TODOs

1. ⚠️ No push notification when driver accepts pool
2. ⚠️ Message queue service not utilized
3. ⚠️ No server-side event listeners (all client-driven realtime)
4. ⚠️ No webhook mechanism for integrations

---

## Related Services

- **penaltyService**: Cooldown management
- **priyoSathiService**: Friend mode penalties
- **fareService**: Fare calculation with discounts
- **notificationService**: Push notifications & FCM
- **smartRouteService**: Route optimization & caching
- **lookupTimeService**: Pool matching timer
- **rideEstimationService**: Fare recalculation
