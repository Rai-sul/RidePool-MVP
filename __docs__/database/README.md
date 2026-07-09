# Database Schema - Critical Features

## New Tables Added

### driver_sessions
Tracks driver online/offline sessions.

```
+-------------------+--------------+--------------------------------+
| Column            | Type         | Description                    |
+-------------------+--------------+--------------------------------+
| id                | UUID PK      | Session identifier             |
| driver_id         | UUID FK      | Reference to users table       |
| vehicle_id        | UUID FK      | Reference to vehicles table    |
| status            | VARCHAR(20)  | ONLINE, BUSY, OFFLINE          |
| started_at        | TIMESTAMPTZ  | Session start time             |
| ended_at          | TIMESTAMPTZ  | Session end time (null=active) |
| initial_lat       | DECIMAL      | Starting latitude              |
| initial_lng       | DECIMAL      | Starting longitude             |
| earnings_session  | DECIMAL      | Earnings during session        |
| rides_completed   | INTEGER      | Rides completed in session     |
+-------------------+--------------+--------------------------------+
```

### driver_earnings
Records driver earnings per ride/pool.

```
+-------------------+--------------+--------------------------------+
| Column            | Type         | Description                    |
+-------------------+--------------+--------------------------------+
| id                | UUID PK      | Earning record ID              |
| driver_id         | UUID FK      | Reference to users table       |
| ride_id           | UUID FK      | Reference to rides table       |
| pool_id           | UUID FK      | Reference to pools table       |
| base_fare         | DECIMAL      | Total fare before commission   |
| distance_fare     | DECIMAL      | Distance-based fare component  |
| time_fare         | DECIMAL      | Time-based fare component      |
| tips              | DECIMAL      | Tips received                  |
| bonuses           | DECIMAL      | Bonus amounts                  |
| platform_commission | DECIMAL    | 20% platform commission        |
| net_earnings      | DECIMAL      | Driver take-home amount        |
| payment_status    | VARCHAR(20)  | PENDING, PROCESSED, PAID       |
+-------------------+--------------+--------------------------------+
```

### user_cancellations
Tracks ride cancellations for penalty system.

```
+-------------------------+--------------+--------------------------------+
| Column                  | Type         | Description                    |
+-------------------------+--------------+--------------------------------+
| id                      | UUID PK      | Record ID                      |
| user_id                 | UUID FK      | User who cancelled             |
| ride_id                 | UUID FK      | Cancelled ride                 |
| cancelled_at            | TIMESTAMPTZ  | Cancellation timestamp         |
| cancellation_time_seconds| INTEGER     | Seconds since ride creation    |
| is_deliberate           | BOOLEAN      | TRUE if >30 seconds            |
| penalty_applied         | BOOLEAN      | TRUE if led to cooldown        |
+-------------------------+--------------+--------------------------------+
```

### cooldown_periods
Active cooldown penalties.

```
+-------------------+--------------+--------------------------------+
| Column            | Type         | Description                    |
+-------------------+--------------+--------------------------------+
| id                | UUID PK      | Cooldown record ID             |
| user_id           | UUID FK      | User under cooldown            |
| starts_at         | TIMESTAMPTZ  | Cooldown start                 |
| ends_at           | TIMESTAMPTZ  | Cooldown end                   |
| reason            | VARCHAR(50)  | Reason code                    |
| penalty_count     | INTEGER      | Number of penalties            |
+-------------------+--------------+--------------------------------+
```

## Database Functions

### atomic_join_pool(p_pool_id, p_user_id, p_ride_id)
Atomically joins a user to a pool with row locking.
- Prevents overbooking race condition
- Returns JSON with success status and member_id

### atomic_accept_pool(p_pool_id, p_driver_id, p_vehicle_id)
Atomically assigns a driver to a pool.
- Uses SKIP LOCKED to prevent deadlocks
- Prevents multiple drivers accepting same pool

### atomic_wallet_debit(p_user_id, p_amount, p_reference_type, p_reference_id)
Atomically deducts from wallet balance.
- Prevents negative balance
- Creates transaction record

## Indexes

Performance indexes added:
- `idx_driver_sessions_active` - Active driver lookup
- `idx_driver_earnings_date` - Earnings by date
- `idx_user_cancellations_recent` - Recent cancellations lookup
- `idx_cooldown_periods_active` - Active cooldowns

## Migration File

Location: `Server/supabase/migrations/20260119_critical_features.sql`

Apply with:
```bash
cd Server && npx supabase db push
```
