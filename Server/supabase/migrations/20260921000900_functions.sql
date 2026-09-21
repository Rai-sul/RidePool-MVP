-- Purpose: the callable database functions — everything the backend reaches
-- through supabase.rpc(), plus two small helpers.
--
-- Anything that must hold under concurrency lives here rather than in
-- application code, because only the database can take the row lock: seat
-- capacity, driver assignment, wallet balance, payment idempotency. The
-- application layer owns scoring and routing; these functions own the parts
-- that two simultaneous requests could otherwise both win.
--
-- Trigger functions are in 20260921001000_triggers.sql.

-- Helpers -------------------------------------------------------------------

-- Vehicle capacity is an app-wide rule: CNG carries 2, CAR carries 3.
-- CONSTANTS.VEHICLE_CAPACITY in the backend is the source of truth;
-- this mirrors it for SQL-side use.
CREATE OR REPLACE FUNCTION public.vehicle_capacity(p_vehicle_type TEXT)
RETURNS INTEGER AS $fn$
  SELECT CASE UPPER(p_vehicle_type) WHEN 'CNG' THEN 2 ELSE 3 END;
$fn$ LANGUAGE sql IMMUTABLE;

-- Returns the active pool ids for the calling user. SECURITY DEFINER lets a
-- policy use it without re-entering row-level security on pool_members.
CREATE OR REPLACE FUNCTION public.get_my_pool_ids()
RETURNS TABLE (pool_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT pool_id FROM public.pool_members WHERE user_id = auth.uid() AND left_at IS NULL;
$fn$;

-- Pool lifecycle ------------------------------------------------------------

-- Join a pool: instant rider, or an instant rider backfilling a confirmed
-- advance pool. Every condition is evaluated under the same row lock using
-- server time, so a stale discovery result can never be replayed into a join.
CREATE OR REPLACE FUNCTION public.atomic_join_pool(
  p_pool_id UUID,
  p_user_id UUID,
  p_ride_id UUID
) RETURNS JSON AS $fn$
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
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Driver claims a pool. SKIP LOCKED means two drivers racing for the same
-- pool produce one winner and one clean "already assigned", never a deadlock.
CREATE OR REPLACE FUNCTION public.atomic_accept_pool(
  p_pool_id UUID,
  p_driver_id UUID,
  p_vehicle_id UUID
) RETURNS JSON AS $fn$
DECLARE
  v_pool RECORD;
BEGIN
  SELECT * INTO v_pool FROM pools
  WHERE id = p_pool_id AND driver_id IS NULL AND status IN ('WAITING_FOR_DRIVER', 'WAITING_FOR_RIDERS')
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'ALREADY_ASSIGNED', 'message', 'Pool is no longer available or already has a driver');
  END IF;

  IF v_pool.current_passengers < 2 THEN
    RETURN json_build_object('success', false, 'reason', 'INSUFFICIENT_PASSENGERS', 'message', 'Pool needs at least 2 passengers');
  END IF;

  UPDATE pools
  SET driver_id = p_driver_id, vehicle_id = p_vehicle_id, status = 'READY_TO_START', updated_at = NOW()
  WHERE id = p_pool_id;

  RETURN json_build_object('success', true, 'pool_id', p_pool_id, 'assigned_at', NOW());
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.atomic_leave_pool(
  p_pool_id UUID,
  p_user_id UUID
) RETURNS JSON AS $fn$
DECLARE
  v_member RECORD;
  v_pool RECORD;
BEGIN
  SELECT * INTO v_member FROM pool_members WHERE pool_id = p_pool_id AND user_id = p_user_id AND left_at IS NULL FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'NOT_MEMBER', 'message', 'User is not a member of this pool');
  END IF;

  SELECT * INTO v_pool FROM pools WHERE id = p_pool_id FOR UPDATE;

  IF v_pool.status IN ('STARTED', 'COMPLETED') THEN
    RETURN json_build_object('success', false, 'reason', 'RIDE_IN_PROGRESS', 'message', 'Cannot leave a pool that has started');
  END IF;

  UPDATE pool_members SET left_at = NOW() WHERE id = v_member.id;

  UPDATE pools
  SET current_passengers = GREATEST(current_passengers - 1, 0),
      status = CASE WHEN current_passengers - 1 < 2 THEN 'WAITING_FOR_RIDERS'::text ELSE status END,
      updated_at = NOW()
  WHERE id = p_pool_id;

  UPDATE rides SET pool_id = NULL, status = 'CANCELLED', cancelled_reason = 'Left pool', updated_at = NOW() WHERE id = v_member.ride_id;

  RETURN json_build_object('success', true, 'member_id', v_member.id, 'ride_id', v_member.ride_id);
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Advance booking -----------------------------------------------------------

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
) RETURNS JSON AS $fn$
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
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Marks one member confirmed and, on the transition to 2 confirmed members,
-- opens the Active Pickup Range so instant riders can backfill the pool.
CREATE OR REPLACE FUNCTION public.atomic_confirm_advance_member(
  p_pool_id UUID,
  p_user_id UUID
) RETURNS JSON AS $fn$
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
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wallet --------------------------------------------------------------------

-- Locks the wallet row before reading the balance, so two concurrent debits
-- cannot both see enough money.
CREATE OR REPLACE FUNCTION public.atomic_wallet_debit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS JSON AS $fn$
DECLARE
  v_wallet RECORD;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'reason', 'INVALID_AMOUNT', 'message', 'Amount must be positive');
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'WALLET_NOT_FOUND', 'message', 'User wallet not found');
  END IF;

  IF v_wallet.balance < p_amount THEN
    RETURN json_build_object('success', false, 'reason', 'INSUFFICIENT_BALANCE', 'message', 'Insufficient wallet balance', 'current_balance', v_wallet.balance, 'required_amount', p_amount);
  END IF;

  v_new_balance := v_wallet.balance - p_amount;
  v_transaction_id := gen_random_uuid();

  INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, metadata, created_at)
  VALUES (v_transaction_id, v_wallet.id, 'DEBIT', p_amount, v_wallet.balance, v_new_balance, p_reference_type, p_reference_id, p_metadata, NOW());

  UPDATE wallets SET balance = v_new_balance, updated_at = NOW() WHERE id = v_wallet.id;

  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id, 'new_balance', v_new_balance, 'amount_debited', p_amount);
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.atomic_wallet_credit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS JSON AS $fn$
DECLARE
  v_wallet RECORD;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'reason', 'INVALID_AMOUNT', 'message', 'Amount must be positive');
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance, currency, created_at, updated_at)
    VALUES (p_user_id, 0, 'BDT', NOW(), NOW())
    RETURNING * INTO v_wallet;
  END IF;

  v_new_balance := v_wallet.balance + p_amount;
  v_transaction_id := gen_random_uuid();

  INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, metadata, created_at)
  VALUES (v_transaction_id, v_wallet.id, 'CREDIT', p_amount, v_wallet.balance, v_new_balance, p_reference_type, p_reference_id, p_metadata, NOW());

  UPDATE wallets SET balance = v_new_balance, updated_at = NOW() WHERE id = v_wallet.id;

  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id, 'new_balance', v_new_balance, 'amount_credited', p_amount);
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Payments ------------------------------------------------------------------

-- Idempotency first: a retried request returns the original payment instead
-- of creating a second one.
CREATE OR REPLACE FUNCTION public.atomic_process_payment(
  p_ride_id UUID,
  p_user_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_idempotency_key TEXT
) RETURNS JSON AS $fn$
DECLARE
  v_existing_payment RECORD;
  v_payment_id UUID;
  v_ride RECORD;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_payment FROM payments WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN json_build_object('success', true, 'duplicate', true, 'payment_id', v_existing_payment.id, 'status', v_existing_payment.status, 'message', 'Payment already processed');
    END IF;
  END IF;

  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id AND user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'RIDE_NOT_FOUND', 'message', 'Ride not found or does not belong to user');
  END IF;

  IF v_ride.status != 'COMPLETED' THEN
    RETURN json_build_object('success', false, 'reason', 'RIDE_NOT_COMPLETED', 'message', 'Ride must be completed before payment');
  END IF;

  IF EXISTS (SELECT 1 FROM payments WHERE ride_id = p_ride_id AND user_id = p_user_id AND status = 'COMPLETED') THEN
    RETURN json_build_object('success', false, 'reason', 'ALREADY_PAID', 'message', 'This ride has already been paid');
  END IF;

  v_payment_id := gen_random_uuid();

  INSERT INTO payments (id, ride_id, user_id, amount, payment_method, status, idempotency_key, created_at, updated_at)
  VALUES (v_payment_id, p_ride_id, p_user_id, p_amount, p_payment_method, 'PENDING', p_idempotency_key, NOW(), NOW());

  RETURN json_build_object('success', true, 'payment_id', v_payment_id, 'status', 'PENDING', 'amount', p_amount);
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.complete_payment(
  p_payment_id UUID,
  p_transaction_id TEXT,
  p_gateway_response JSONB DEFAULT NULL
) RETURNS JSON AS $fn$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'PAYMENT_NOT_FOUND');
  END IF;

  IF v_payment.status != 'PENDING' THEN
    RETURN json_build_object('success', false, 'reason', 'INVALID_STATUS', 'current_status', v_payment.status);
  END IF;

  UPDATE payments
  SET status = 'COMPLETED',
      transaction_id = p_transaction_id,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('gateway_response', p_gateway_response, 'completed_at', NOW()),
      updated_at = NOW()
  WHERE id = p_payment_id;

  RETURN json_build_object('success', true, 'payment_id', p_payment_id, 'status', 'COMPLETED');
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fail_payment(
  p_payment_id UUID,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL
) RETURNS JSON AS $fn$
BEGIN
  UPDATE payments
  SET status = 'FAILED',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('error_message', p_error_message, 'error_code', p_error_code, 'failed_at', NOW()),
      updated_at = NOW()
  WHERE id = p_payment_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'PAYMENT_NOT_FOUND_OR_NOT_PENDING');
  END IF;

  RETURN json_build_object('success', true, 'payment_id', p_payment_id, 'status', 'FAILED');
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Promise money -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.deposit_promise_money(
  p_user_id UUID,
  p_amount DECIMAL DEFAULT 50.00
) RETURNS JSON AS $fn$
DECLARE
  v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'USER_NOT_FOUND');
  END IF;

  IF v_user.promise_money_deposited THEN
    RETURN json_build_object('success', false, 'reason', 'ALREADY_DEPOSITED');
  END IF;

  INSERT INTO promise_money_transactions (user_id, type, amount, balance_before, balance_after, reason)
  VALUES (p_user_id, 'DEPOSIT', p_amount, 0, p_amount, 'Initial deposit');

  UPDATE users
  SET promise_money_balance = p_amount, promise_money_deposited = TRUE, promise_money_deposited_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'balance', p_amount, 'deposited_at', NOW());
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deducting more than the balance empties it rather than going negative.
CREATE OR REPLACE FUNCTION public.deduct_promise_money(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reason TEXT,
  p_ride_id UUID DEFAULT NULL
) RETURNS JSON AS $fn$
DECLARE
  v_user RECORD;
  v_new_balance DECIMAL;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'USER_NOT_FOUND');
  END IF;

  IF v_user.promise_money_balance < p_amount THEN
    v_new_balance := 0;
  ELSE
    v_new_balance := v_user.promise_money_balance - p_amount;
  END IF;

  INSERT INTO promise_money_transactions (user_id, type, amount, balance_before, balance_after, reason, ride_id)
  VALUES (p_user_id, 'DEDUCTION', p_amount, v_user.promise_money_balance, v_new_balance, p_reason, p_ride_id);

  UPDATE users SET promise_money_balance = v_new_balance WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'deducted', LEAST(p_amount, v_user.promise_money_balance), 'new_balance', v_new_balance);
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

-- Miscellaneous -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_id UUID)
RETURNS VOID AS $fn$
BEGIN
  UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = promo_id;
END;
$fn$ LANGUAGE plpgsql;

-- Rejects out-of-order GPS pings, which arrive regularly on mobile networks.
CREATE OR REPLACE FUNCTION public.update_vehicle_location(
  p_vehicle_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_heading DOUBLE PRECISION DEFAULT 0,
  p_speed DOUBLE PRECISION DEFAULT 0,
  p_recorded_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $fn$
DECLARE
  v_current RECORD;
  v_h3_res8 VARCHAR(20);
  v_h3_res9 VARCHAR(20);
BEGIN
  SELECT * INTO v_current FROM vehicle_locations
  WHERE vehicle_id = p_vehicle_id AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'VEHICLE_NOT_FOUND');
  END IF;

  IF v_current.recorded_at > p_recorded_at THEN
    RETURN json_build_object('success', false, 'reason', 'STALE_UPDATE', 'message', 'Location update is older than current');
  END IF;

  UPDATE vehicle_locations
  SET lat = p_latitude,
      lng = p_longitude,
      heading = p_heading,
      speed_kmh = p_speed,
      recorded_at = p_recorded_at
  WHERE vehicle_id = p_vehicle_id AND is_active = TRUE;

  RETURN json_build_object('success', true, 'vehicle_id', p_vehicle_id, 'updated_at', p_recorded_at);
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;
