-- Purpose: the core ride-pooling tables — vehicles, pools, rides, pool
-- membership, and live vehicle positions.
--
-- Two ideas drive the shape of these tables:
--   * H3 indexing. pickup_h3_index is resolution 9, destination/dropoff_h3_index
--     is resolution 7, vehicle h3_index_res8/res9 are 8 and 9. The backend
--     computes these with h3-js; the database only stores and indexes them.
--   * Advance booking. A scheduled ride is a rides row with
--     booking_type='ADVANCE' and a scheduled_pickup_at — not a separate
--     entity — so every existing matching, fare and notification path keeps
--     working unchanged.
--
-- Foreign keys live in 20260921000700_foreign_keys.sql.

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  vehicle_type VARCHAR(10) NOT NULL CHECK (vehicle_type IN ('CAR', 'CNG')),
  vehicle_number VARCHAR(20) NOT NULL UNIQUE,
  model VARCHAR(100),
  color VARCHAR(50),
  max_passengers INTEGER NOT NULL DEFAULT 4 CHECK (max_passengers > 0),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL,
  driver_id UUID,
  vehicle_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'WAITING_FOR_RIDERS',
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_location GEOGRAPHY(POINT, 4326),
  pickup_address TEXT,
  pickup_h3_index VARCHAR(20),
  destination_lat DECIMAL(10,8) NOT NULL,
  destination_lng DECIMAL(11,8) NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326),
  destination_address TEXT,
  destination_h3_index VARCHAR(20),
  vehicle_type VARCHAR(10) NOT NULL,
  gender_restriction VARCHAR(20) DEFAULT 'ANY',
  current_passengers INTEGER NOT NULL DEFAULT 0,
  -- No DEFAULT on purpose. Capacity is CNG=2 / CAR=3, owned by
  -- CONSTANTS.VEHICLE_CAPACITY in the backend and never accepted from the
  -- client. Omitting it fails loudly instead of silently seating four.
  max_passengers INTEGER NOT NULL,
  viability_score DECIMAL(5,2),
  base_distance_km DECIMAL(10,2),
  base_duration_minutes DECIMAL(10,2),
  extended_search_h3 TEXT[],
  extended_pickup_h3 TEXT[],
  fare_per_person DECIMAL(10,2),
  total_surcharge_collected DECIMAL(10,2) DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Advance-booking scheduling state.
  is_advance BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_pickup_at TIMESTAMPTZ,
  scheduled_window_end_at TIMESTAMPTZ,
  confirmation_opens_at TIMESTAMPTZ,
  confirmation_deadline_at TIMESTAMPTZ,
  confirmation_notified_at TIMESTAMPTZ,
  active_range_start_at TIMESTAMPTZ,
  -- SCHEDULED is the resting state of an advance pool: it gathers advance
  -- bookings and runs its confirmation step there. Every pre-existing query
  -- filters on WAITING_FOR_RIDERS / WAITING_FOR_DRIVER, so advance pools stay
  -- invisible to instant discovery unless a query opts them in explicitly.
  CONSTRAINT pools_status_check CHECK (status IN (
    'SCHEDULED', 'WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER',
    'DRIVER_ASSIGNED', 'READY_TO_START', 'STARTED', 'COMPLETED', 'CANCELLED'
  ))
);

CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pool_id UUID,
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_location GEOGRAPHY(POINT, 4326),
  pickup_address TEXT,
  pickup_h3_index VARCHAR(20),
  dropoff_lat DECIMAL(10,8) NOT NULL,
  dropoff_lng DECIMAL(11,8) NOT NULL,
  dropoff_location GEOGRAPHY(POINT, 4326),
  dropoff_address TEXT,
  dropoff_h3_index VARCHAR(20),
  vehicle_type VARCHAR(10) NOT NULL,
  gender_restriction VARCHAR(20) DEFAULT 'ANY',
  status VARCHAR(20) NOT NULL DEFAULT 'CREATING_POOL'
    CHECK (status IN ('CREATING_POOL', 'PENDING', 'MATCHED', 'WAITING_FOR_DRIVER', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  fare DECIMAL(10,2),
  distance_km DECIMAL(10,2),
  is_on_front_route BOOLEAN DEFAULT TRUE,
  route_deviation_km DECIMAL(5,2),
  base_fare DECIMAL(10,2),
  distance_fare DECIMAL(10,2),
  time_fare DECIMAL(10,2),
  pool_discount DECIMAL(10,2),
  full_pool_bonus DECIMAL(10,2),
  platform_surcharge DECIMAL(10,2) DEFAULT 10,
  displayed_fare DECIMAL(10,2),
  actual_charge DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  booking_type VARCHAR(10) NOT NULL DEFAULT 'INSTANT',
  scheduled_pickup_at TIMESTAMPTZ,
  CONSTRAINT rides_booking_type_check CHECK (booking_type IN ('INSTANT', 'ADVANCE')),
  -- An ADVANCE ride must carry a pickup time; an INSTANT ride must not.
  CONSTRAINT rides_scheduled_pickup_check CHECK (
    (booking_type = 'ADVANCE' AND scheduled_pickup_at IS NOT NULL)
    OR (booking_type = 'INSTANT' AND scheduled_pickup_at IS NULL)
  )
);

CREATE TABLE public.pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ride_id UUID NOT NULL,
  join_type VARCHAR(20) DEFAULT 'INITIAL',
  join_score DECIMAL(5,2),
  is_front_route BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  -- Per-member advance scheduling state.
  scheduled_pickup_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  UNIQUE (pool_id, user_id),
  UNIQUE (ride_id)
);

CREATE TABLE public.vehicle_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  pool_id UUID,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  h3_index_res8 VARCHAR(20),
  h3_index_res9 VARCHAR(20),
  heading DECIMAL(5,2),
  speed_kmh DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.pools IS 'Ride pools with H3 destination indexing for efficient matching (H3 calculated by backend using h3-js)';
COMMENT ON TABLE public.rides IS 'Individual ride requests with H3 pickup (res 9) and destination (res 7) indexes (backend calculated)';
COMMENT ON TABLE public.vehicle_locations IS 'Real-time vehicle locations with dual H3 indexes for driver search and pickup matching (backend calculated)';

COMMENT ON COLUMN public.pools.destination_h3_index IS 'H3 resolution 7 (~5.2km avg hexagon edge) for destination area matching - calculated by backend';
COMMENT ON COLUMN public.pools.scheduled_pickup_at IS 'Advance pools: earliest member pickup time. Vehicle start time, and the close of the Active Pickup Range.';
COMMENT ON COLUMN public.pools.active_range_start_at IS 'Advance pools: set when the pool first reaches 2 confirmed members. Opens the pool to instant riders.';
COMMENT ON COLUMN public.rides.pickup_h3_index IS 'H3 resolution 9 (~174m avg hexagon edge) for precise pickup location matching - calculated by backend';
COMMENT ON COLUMN public.rides.dropoff_h3_index IS 'H3 resolution 7 (~5.2km avg hexagon edge) for destination area matching - calculated by backend';
COMMENT ON COLUMN public.rides.booking_type IS 'INSTANT riders pick a pool themselves; ADVANCE riders are auto-assigned by the server.';
COMMENT ON COLUMN public.vehicle_locations.h3_index_res8 IS 'H3 resolution 8 (~461m avg hexagon edge) for driver search area - calculated by backend';
COMMENT ON COLUMN public.vehicle_locations.h3_index_res9 IS 'H3 resolution 9 (~174m avg hexagon edge) for precise driver location - calculated by backend';
