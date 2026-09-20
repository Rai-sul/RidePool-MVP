-- ===============================
-- ADVANCE BOOKING / SCHEDULED RIDE POOLING
-- Migration: 2026-09-20
-- ===============================
-- Adds scheduled (advance) bookings that auto-pool together, plus the
-- "Active Pickup Range" that lets instant riders backfill a confirmed
-- advance pool. Also enforces the app-wide vehicle capacity rule
-- (CNG = 2, CAR = 3).

BEGIN;

-- ============================================
-- SECTION 1: ADVANCE BOOKING COLUMNS
-- ============================================

-- An advance booking is a ride row, not a separate entity. This keeps every
-- existing matching / fare / route / notification path working unchanged.
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS booking_type VARCHAR(10) NOT NULL DEFAULT 'INSTANT',
  ADD COLUMN IF NOT EXISTS scheduled_pickup_at TIMESTAMPTZ;

ALTER TABLE public.rides DROP CONSTRAINT IF EXISTS rides_booking_type_check;
ALTER TABLE public.rides
  ADD CONSTRAINT rides_booking_type_check CHECK (booking_type IN ('INSTANT', 'ADVANCE'));

-- An ADVANCE ride must carry a pickup time; an INSTANT ride must not.
ALTER TABLE public.rides DROP CONSTRAINT IF EXISTS rides_scheduled_pickup_check;
ALTER TABLE public.rides
  ADD CONSTRAINT rides_scheduled_pickup_check CHECK (
    (booking_type = 'ADVANCE' AND scheduled_pickup_at IS NOT NULL)
    OR (booking_type = 'INSTANT' AND scheduled_pickup_at IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_rides_advance_pending ON public.rides(scheduled_pickup_at)
  WHERE booking_type = 'ADVANCE' AND status NOT IN ('COMPLETED', 'CANCELLED');

-- Pool-level scheduling state.
ALTER TABLE public.pools
  ADD COLUMN IF NOT EXISTS is_advance BOOLEAN NOT NULL DEFAULT FALSE,
  -- Earliest member pickup time. This is when the vehicle starts its route,
  -- and the moment the Active Pickup Range closes.
  ADD COLUMN IF NOT EXISTS scheduled_pickup_at TIMESTAMPTZ,
  -- Latest member pickup time. (latest - earliest) is the pool's pickup span,
  -- which must stay within the configured pool window.
  ADD COLUMN IF NOT EXISTS scheduled_window_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_deadline_at TIMESTAMPTZ,
  -- Marks that riders have been asked to confirm, so the scheduler sweep
  -- never sends the same prompt twice.
  ADD COLUMN IF NOT EXISTS confirmation_notified_at TIMESTAMPTZ,
  -- Set the moment the pool first reaches 2 confirmed members. Until then the
  -- pool is invisible to instant riders.
  ADD COLUMN IF NOT EXISTS active_range_start_at TIMESTAMPTZ;

-- SCHEDULED is the resting state of an advance pool: it gathers advance
-- bookings and runs its confirmation step there. Every pre-existing query
-- filters on WAITING_FOR_RIDERS / WAITING_FOR_DRIVER, so advance pools stay
-- invisible to instant discovery unless a query opts them in explicitly.
ALTER TABLE public.pools DROP CONSTRAINT IF EXISTS pools_status_check;
ALTER TABLE public.pools
  ADD CONSTRAINT pools_status_check CHECK (status IN (
    'SCHEDULED', 'WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER',
    'DRIVER_ASSIGNED', 'READY_TO_START', 'STARTED', 'COMPLETED', 'CANCELLED'
  ));

-- Scheduler sweep: pools whose confirmation window has opened or expired.
CREATE INDEX IF NOT EXISTS idx_pools_advance_due ON public.pools(confirmation_opens_at, confirmation_deadline_at)
  WHERE is_advance = TRUE AND status = 'SCHEDULED' AND deleted_at IS NULL;

-- Advance matching: candidate pools for a given destination / time.
CREATE INDEX IF NOT EXISTS idx_pools_advance_matching
  ON public.pools(destination_h3_index, vehicle_type, gender_restriction, scheduled_pickup_at)
  WHERE is_advance = TRUE AND status = 'SCHEDULED' AND deleted_at IS NULL;

-- Per-member scheduling state.
ALTER TABLE public.pool_members
  ADD COLUMN IF NOT EXISTS scheduled_pickup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.pools.scheduled_pickup_at IS 'Advance pools: earliest member pickup time. Vehicle start time, and the close of the Active Pickup Range.';
COMMENT ON COLUMN public.pools.active_range_start_at IS 'Advance pools: set when the pool first reaches 2 confirmed members. Opens the pool to instant riders.';
COMMENT ON COLUMN public.rides.booking_type IS 'INSTANT riders pick a pool themselves; ADVANCE riders are auto-assigned by the server.';

-- ============================================
-- SECTION 2: VEHICLE CAPACITY (APP-WIDE)
-- ============================================
-- CNG carries 2 passengers, CAR carries 3. This is a global rule, not an
-- advance-booking rule.

CREATE OR REPLACE FUNCTION public.vehicle_capacity(p_vehicle_type TEXT)
RETURNS INTEGER AS $$
  SELECT CASE UPPER(p_vehicle_type) WHEN 'CNG' THEN 2 ELSE 3 END;
$$ LANGUAGE sql IMMUTABLE;

-- Backfill open pools. Pools that already hold more riders than the new cap
-- are left alone so nobody is retroactively squeezed out of a ride.
UPDATE public.pools
SET max_passengers = public.vehicle_capacity(vehicle_type),
    updated_at = NOW()
WHERE status IN ('SCHEDULED', 'WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER')
  AND current_passengers <= public.vehicle_capacity(vehicle_type)
  AND max_passengers <> public.vehicle_capacity(vehicle_type);

UPDATE public.vehicles
SET max_passengers = public.vehicle_capacity(vehicle_type),
    updated_at = NOW()
WHERE max_passengers <> public.vehicle_capacity(vehicle_type);

-- No CHECK constraint on max_passengers: completed and cancelled pools keep
-- the capacity they ran with, and a constraint would reject any later update
-- to those rows. The rule is enforced where every other pool rule lives, in
-- CONSTANTS.VEHICLE_CAPACITY, and max_passengers is no longer accepted from
-- the client. Dropping the default makes an omission fail loudly instead of
-- silently seating four.
ALTER TABLE public.pools ALTER COLUMN max_passengers DROP DEFAULT;

-- ============================================
-- SECTION 3: ATOMIC JOIN (INSTANT + ADVANCE BACKFILL)
-- ============================================
-- Extends the existing join with the Active Pickup Range gate and a trusted
-- gender check. Every condition is evaluated under the same row lock using
-- server time, so a discovery result can never be replayed into a stale join.

CREATE OR REPLACE FUNCTION public.atomic_join_pool(
  p_pool_id UUID,
  p_user_id UUID,
  p_ride_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pool RECORD;
  v_member_id UUID;
  v_new_count INTEGER;
  v_user_gender TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_join_type TEXT := 'MATCHED';
  v_confirmed_at TIMESTAMPTZ := NULL;
BEGIN
  SELECT * INTO v_pool FROM pools WHERE id = p_pool_id AND deleted_at IS NULL FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POOL_NOT_FOUND: Pool does not exist';
  END IF;

  IF v_pool.status NOT IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER', 'SCHEDULED') THEN
    RAISE EXCEPTION 'POOL_NO_LONGER_JOINABLE: Pool is no longer accepting riders';
  END IF;

  -- Advance pools open to instant riders only inside the Active Pickup Range:
  -- from the moment 2 members confirmed until the scheduled pickup time.
  IF v_pool.is_advance THEN
    IF v_pool.active_range_start_at IS NULL
       OR v_now < v_pool.active_range_start_at
       OR v_now >= v_pool.scheduled_pickup_at THEN
      RAISE EXCEPTION 'POOL_NO_LONGER_ACTIVE: Advance pool is outside its active pickup range';
    END IF;
    -- Tapping Join on an already-confirmed pool is itself the confirmation.
    v_join_type := 'BACKFILL';
    v_confirmed_at := v_now;
  END IF;

  IF v_pool.current_passengers >= v_pool.max_passengers THEN
    RAISE EXCEPTION 'POOL_FULL: Pool has reached maximum capacity';
  END IF;

  IF EXISTS (SELECT 1 FROM pool_members WHERE pool_id = p_pool_id AND user_id = p_user_id AND left_at IS NULL) THEN
    RAISE EXCEPTION 'ALREADY_IN_POOL: User is already in this pool';
  END IF;

  -- Gender restriction is checked against the stored profile, never against a
  -- flag supplied by the client.
  IF v_pool.gender_restriction = 'FEMALE_ONLY' THEN
    SELECT gender INTO v_user_gender FROM users WHERE id = p_user_id;
    IF v_user_gender IS DISTINCT FROM 'FEMALE' THEN
      RAISE EXCEPTION 'GENDER_NOT_COMPATIBLE: Pool is restricted to female riders';
    END IF;
  END IF;

  v_member_id := gen_random_uuid();
  v_new_count := v_pool.current_passengers + 1;

  INSERT INTO pool_members (id, pool_id, user_id, ride_id, join_type, joined_at, confirmed_at)
  VALUES (v_member_id, p_pool_id, p_user_id, p_ride_id, v_join_type, v_now, v_confirmed_at);

  UPDATE pools
  SET current_passengers = v_new_count,
      status = CASE
                 WHEN is_advance THEN status
                 WHEN v_new_count >= max_passengers THEN 'WAITING_FOR_DRIVER'::text
                 ELSE status
               END,
      updated_at = v_now
  WHERE id = p_pool_id;

  UPDATE rides SET pool_id = p_pool_id, status = 'WAITING_FOR_DRIVER', updated_at = v_now WHERE id = p_ride_id;

  RETURN json_build_object(
    'success', true,
    'member_id', v_member_id,
    'current_passengers', v_new_count,
    'pool_status', CASE
                     WHEN v_pool.is_advance THEN v_pool.status
                     WHEN v_new_count >= v_pool.max_passengers THEN 'WAITING_FOR_DRIVER'
                     ELSE v_pool.status
                   END
  );
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 4: ATOMIC ADVANCE ASSIGNMENT
-- ============================================
-- Auto-assignment for advance bookings. Route and location compatibility are
-- scored in the matching service; this function owns the parts that must hold
-- under a lock: seat capacity, trusted gender, the pool-wide pickup span, and
-- the window recalculation that follows a new earliest pickup time.

CREATE OR REPLACE FUNCTION public.atomic_assign_advance_booking(
  p_pool_id UUID,
  p_user_id UUID,
  p_ride_id UUID,
  p_scheduled_pickup_at TIMESTAMPTZ,
  p_window_seconds INTEGER,
  p_confirm_lead_seconds INTEGER,
  p_confirm_window_seconds INTEGER
) RETURNS JSON AS $$
DECLARE
  v_pool RECORD;
  v_member_id UUID;
  v_new_count INTEGER;
  v_user_gender TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_earliest TIMESTAMPTZ;
  v_latest TIMESTAMPTZ;
  v_opens_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_pool FROM pools WHERE id = p_pool_id AND deleted_at IS NULL FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POOL_NOT_FOUND: Pool does not exist';
  END IF;

  IF NOT v_pool.is_advance OR v_pool.status <> 'SCHEDULED' THEN
    RAISE EXCEPTION 'POOL_NO_LONGER_JOINABLE: Pool is not gathering advance bookings';
  END IF;

  -- Once the confirmation step has opened, the pool is heading for dispatch.
  -- A new advance booking starts its own pool rather than one about to leave.
  IF v_pool.confirmation_opens_at IS NOT NULL AND v_now >= v_pool.confirmation_opens_at THEN
    RAISE EXCEPTION 'POOL_NO_LONGER_JOINABLE: Pool has entered its confirmation window';
  END IF;

  IF v_pool.current_passengers >= v_pool.max_passengers THEN
    RAISE EXCEPTION 'POOL_FULL: Pool has reached maximum capacity';
  END IF;

  IF EXISTS (SELECT 1 FROM pool_members WHERE pool_id = p_pool_id AND user_id = p_user_id AND left_at IS NULL) THEN
    RAISE EXCEPTION 'ALREADY_IN_POOL: User is already in this pool';
  END IF;

  IF v_pool.gender_restriction = 'FEMALE_ONLY' THEN
    SELECT gender INTO v_user_gender FROM users WHERE id = p_user_id;
    IF v_user_gender IS DISTINCT FROM 'FEMALE' THEN
      RAISE EXCEPTION 'GENDER_NOT_COMPATIBLE: Pool is restricted to female riders';
    END IF;
  END IF;

  -- The pool-wide pickup span, including the incoming booking, must fit the
  -- configured window. 8:00 plus 8:30 is allowed; 8:00 plus 8:35 is not.
  SELECT LEAST(MIN(scheduled_pickup_at), p_scheduled_pickup_at),
         GREATEST(MAX(scheduled_pickup_at), p_scheduled_pickup_at)
    INTO v_earliest, v_latest
  FROM pool_members
  WHERE pool_id = p_pool_id AND left_at IS NULL AND scheduled_pickup_at IS NOT NULL;

  v_earliest := COALESCE(v_earliest, p_scheduled_pickup_at);
  v_latest := COALESCE(v_latest, p_scheduled_pickup_at);

  IF EXTRACT(EPOCH FROM (v_latest - v_earliest)) > p_window_seconds THEN
    RAISE EXCEPTION 'PICKUP_WINDOW_EXCEEDED: Pickup times span more than the allowed window';
  END IF;

  v_member_id := gen_random_uuid();
  v_new_count := v_pool.current_passengers + 1;
  v_opens_at := v_earliest - make_interval(secs => p_confirm_lead_seconds);

  INSERT INTO pool_members (id, pool_id, user_id, ride_id, join_type, joined_at, scheduled_pickup_at)
  VALUES (v_member_id, p_pool_id, p_user_id, p_ride_id, 'ADVANCE', v_now, p_scheduled_pickup_at);

  UPDATE pools
  SET current_passengers = v_new_count,
      scheduled_pickup_at = v_earliest,
      scheduled_window_end_at = v_latest,
      confirmation_opens_at = v_opens_at,
      confirmation_deadline_at = v_opens_at + make_interval(secs => p_confirm_window_seconds),
      updated_at = v_now
  WHERE id = p_pool_id;

  UPDATE rides SET pool_id = p_pool_id, status = 'MATCHED', updated_at = v_now WHERE id = p_ride_id;

  RETURN json_build_object(
    'success', true,
    'member_id', v_member_id,
    'current_passengers', v_new_count,
    'scheduled_pickup_at', v_earliest,
    'scheduled_window_end_at', v_latest
  );
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 5: ATOMIC CONFIRMATION
-- ============================================
-- Marks one member confirmed and, on the transition to 2 confirmed members,
-- opens the Active Pickup Range so instant riders can backfill the pool.

CREATE OR REPLACE FUNCTION public.atomic_confirm_advance_member(
  p_pool_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pool RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_updated INTEGER;
  v_confirmed_count INTEGER;
  v_range_opened BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_pool FROM pools WHERE id = p_pool_id AND deleted_at IS NULL FOR UPDATE;

  IF NOT FOUND OR NOT v_pool.is_advance THEN
    RAISE EXCEPTION 'POOL_NOT_FOUND: Advance pool does not exist';
  END IF;

  IF v_pool.status NOT IN ('SCHEDULED', 'WAITING_FOR_DRIVER') THEN
    RAISE EXCEPTION 'POOL_NO_LONGER_JOINABLE: Pool is no longer accepting confirmations';
  END IF;

  IF v_pool.confirmation_opens_at IS NULL OR v_now < v_pool.confirmation_opens_at THEN
    RAISE EXCEPTION 'CONFIRMATION_NOT_OPEN: Confirmation has not opened for this pool yet';
  END IF;

  IF v_now >= v_pool.scheduled_pickup_at THEN
    RAISE EXCEPTION 'POOL_NO_LONGER_ACTIVE: Scheduled pickup time has passed';
  END IF;

  UPDATE pool_members
  SET confirmed_at = COALESCE(confirmed_at, v_now)
  WHERE pool_id = p_pool_id AND user_id = p_user_id AND left_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'NOT_A_MEMBER: User is not in this pool';
  END IF;

  SELECT COUNT(*) INTO v_confirmed_count
  FROM pool_members
  WHERE pool_id = p_pool_id AND left_at IS NULL AND confirmed_at IS NOT NULL;

  IF v_confirmed_count >= 2 AND v_pool.active_range_start_at IS NULL THEN
    UPDATE pools SET active_range_start_at = v_now, updated_at = v_now WHERE id = p_pool_id;
    v_range_opened := TRUE;
  END IF;

  RETURN json_build_object(
    'success', true,
    'confirmed_count', v_confirmed_count,
    'active_range_opened', v_range_opened
  );
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.atomic_join_pool TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_assign_advance_booking TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_confirm_advance_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.vehicle_capacity TO authenticated;

COMMIT;
