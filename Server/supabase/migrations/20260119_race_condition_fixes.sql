-- Migration: Race Condition Fixes
-- Atomic database functions for pool joining, driver assignment, wallet operations, and payment processing

-- 5.1 FIX: Atomic Pool Join (prevents overbooking)
CREATE OR REPLACE FUNCTION public.atomic_join_pool(
  p_pool_id UUID,
  p_user_id UUID,
  p_ride_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pool RECORD;
  v_member_id UUID;
  v_new_count INTEGER;
BEGIN
  SELECT * INTO v_pool 
  FROM pools 
  WHERE id = p_pool_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POOL_NOT_FOUND: Pool does not exist';
  END IF;
  
  IF v_pool.status NOT IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER') THEN
    RAISE EXCEPTION 'POOL_NOT_AVAILABLE: Pool is no longer accepting riders';
  END IF;
  
  IF v_pool.current_passengers >= v_pool.max_passengers THEN
    RAISE EXCEPTION 'POOL_FULL: Pool has reached maximum capacity';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pool_members 
    WHERE pool_id = p_pool_id 
    AND user_id = p_user_id 
    AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER: User is already in this pool';
  END IF;
  
  v_member_id := gen_random_uuid();
  v_new_count := v_pool.current_passengers + 1;
  
  INSERT INTO pool_members (id, pool_id, user_id, ride_id, joined_at)
  VALUES (v_member_id, p_pool_id, p_user_id, p_ride_id, NOW());
  
  UPDATE pools 
  SET 
    current_passengers = v_new_count,
    status = CASE 
      WHEN v_new_count >= max_passengers THEN 'WAITING_FOR_DRIVER'::text
      ELSE status 
    END,
    updated_at = NOW()
  WHERE id = p_pool_id;
  
  UPDATE rides
  SET pool_id = p_pool_id, status = 'MATCHED', updated_at = NOW()
  WHERE id = p_ride_id;
  
  RETURN json_build_object(
    'success', true,
    'member_id', v_member_id,
    'current_passengers', v_new_count,
    'pool_status', CASE 
      WHEN v_new_count >= v_pool.max_passengers THEN 'WAITING_FOR_DRIVER'
      ELSE v_pool.status 
    END
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 FIX: Atomic Driver Assignment (prevents double assignment)
CREATE OR REPLACE FUNCTION public.atomic_accept_pool(
  p_pool_id UUID,
  p_driver_id UUID,
  p_vehicle_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pool RECORD;
BEGIN
  SELECT * INTO v_pool 
  FROM pools 
  WHERE id = p_pool_id 
  AND driver_id IS NULL
  AND status IN ('WAITING_FOR_DRIVER', 'WAITING_FOR_RIDERS')
  FOR UPDATE SKIP LOCKED;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'ALREADY_ASSIGNED',
      'message', 'Pool is no longer available or already has a driver'
    );
  END IF;
  
  IF v_pool.current_passengers < 2 THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'INSUFFICIENT_PASSENGERS',
      'message', 'Pool needs at least 2 passengers'
    );
  END IF;
  
  UPDATE pools 
  SET 
    driver_id = p_driver_id,
    vehicle_id = p_vehicle_id,
    status = 'DRIVER_ASSIGNED',
    updated_at = NOW()
  WHERE id = p_pool_id;
  
  RETURN json_build_object(
    'success', true,
    'pool_id', p_pool_id,
    'assigned_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 FIX: Vehicle Location Update with Timestamp Conflict Resolution
CREATE OR REPLACE FUNCTION public.update_vehicle_location(
  p_vehicle_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_heading DOUBLE PRECISION,
  p_speed DOUBLE PRECISION,
  p_recorded_at TIMESTAMPTZ
) RETURNS JSON AS $$
DECLARE
  v_existing_timestamp TIMESTAMPTZ;
BEGIN
  SELECT recorded_at INTO v_existing_timestamp
  FROM vehicle_locations
  WHERE vehicle_id = p_vehicle_id;
  
  IF v_existing_timestamp IS NOT NULL AND p_recorded_at <= v_existing_timestamp THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'STALE_UPDATE',
      'message', 'Location update is older than current location'
    );
  END IF;
  
  INSERT INTO vehicle_locations (vehicle_id, latitude, longitude, heading, speed, recorded_at, updated_at)
  VALUES (p_vehicle_id, p_latitude, p_longitude, p_heading, p_speed, p_recorded_at, NOW())
  ON CONFLICT (vehicle_id) 
  DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    recorded_at = EXCLUDED.recorded_at,
    updated_at = NOW()
  WHERE vehicle_locations.recorded_at < EXCLUDED.recorded_at;
  
  RETURN json_build_object(
    'success', true,
    'vehicle_id', p_vehicle_id,
    'recorded_at', p_recorded_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.5 FIX: Atomic Wallet Debit (prevents negative balance)
ALTER TABLE wallets ADD CONSTRAINT IF NOT EXISTS positive_balance CHECK (balance >= 0);

CREATE OR REPLACE FUNCTION public.atomic_wallet_debit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_wallet RECORD;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'INVALID_AMOUNT',
      'message', 'Amount must be positive'
    );
  END IF;
  
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'WALLET_NOT_FOUND',
      'message', 'User wallet not found'
    );
  END IF;
  
  IF v_wallet.balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'INSUFFICIENT_BALANCE',
      'message', 'Insufficient wallet balance',
      'current_balance', v_wallet.balance,
      'required_amount', p_amount
    );
  END IF;
  
  v_new_balance := v_wallet.balance - p_amount;
  v_transaction_id := gen_random_uuid();
  
  INSERT INTO wallet_transactions (
    id, wallet_id, type, amount, balance_before, balance_after,
    reference_type, reference_id, metadata, created_at
  ) VALUES (
    v_transaction_id, v_wallet.id, 'DEBIT', p_amount, v_wallet.balance,
    v_new_balance, p_reference_type, p_reference_id, p_metadata, NOW()
  );
  
  UPDATE wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet.id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'amount_debited', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Wallet Credit
CREATE OR REPLACE FUNCTION public.atomic_wallet_credit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_wallet RECORD;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'INVALID_AMOUNT',
      'message', 'Amount must be positive'
    );
  END IF;
  
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance, currency, created_at, updated_at)
    VALUES (p_user_id, 0, 'BDT', NOW(), NOW())
    RETURNING * INTO v_wallet;
  END IF;
  
  v_new_balance := v_wallet.balance + p_amount;
  v_transaction_id := gen_random_uuid();
  
  INSERT INTO wallet_transactions (
    id, wallet_id, type, amount, balance_before, balance_after,
    reference_type, reference_id, metadata, created_at
  ) VALUES (
    v_transaction_id, v_wallet.id, 'CREDIT', p_amount, v_wallet.balance,
    v_new_balance, p_reference_type, p_reference_id, p_metadata, NOW()
  );
  
  UPDATE wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet.id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'amount_credited', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 FIX: Atomic Payment Processing with Idempotency
CREATE OR REPLACE FUNCTION public.atomic_process_payment(
  p_ride_id UUID,
  p_user_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_idempotency_key TEXT
) RETURNS JSON AS $$
DECLARE
  v_existing_payment RECORD;
  v_payment_id UUID;
  v_ride RECORD;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_payment
    FROM payments
    WHERE idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
      RETURN json_build_object(
        'success', true,
        'duplicate', true,
        'payment_id', v_existing_payment.id,
        'status', v_existing_payment.status,
        'message', 'Payment already processed'
      );
    END IF;
  END IF;
  
  SELECT * INTO v_ride
  FROM rides
  WHERE id = p_ride_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'RIDE_NOT_FOUND',
      'message', 'Ride not found or does not belong to user'
    );
  END IF;
  
  IF v_ride.status != 'COMPLETED' THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'RIDE_NOT_COMPLETED',
      'message', 'Ride must be completed before payment'
    );
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM payments 
    WHERE ride_id = p_ride_id 
    AND user_id = p_user_id 
    AND status = 'COMPLETED'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'ALREADY_PAID',
      'message', 'This ride has already been paid'
    );
  END IF;
  
  v_payment_id := gen_random_uuid();
  
  INSERT INTO payments (
    id, ride_id, user_id, amount, payment_method, status,
    idempotency_key, created_at, updated_at
  ) VALUES (
    v_payment_id, p_ride_id, p_user_id, p_amount, p_payment_method,
    'PENDING', p_idempotency_key, NOW(), NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'status', 'PENDING',
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete payment after gateway confirmation
CREATE OR REPLACE FUNCTION public.complete_payment(
  p_payment_id UUID,
  p_transaction_id TEXT,
  p_gateway_response JSONB DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'PAYMENT_NOT_FOUND'
    );
  END IF;
  
  IF v_payment.status != 'PENDING' THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'INVALID_STATUS',
      'current_status', v_payment.status
    );
  END IF;
  
  UPDATE payments
  SET 
    status = 'COMPLETED',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'transaction_id', p_transaction_id,
      'gateway_response', p_gateway_response,
      'completed_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_payment_id;
  
  RETURN json_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'status', 'COMPLETED'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fail payment
CREATE OR REPLACE FUNCTION public.fail_payment(
  p_payment_id UUID,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
  UPDATE payments
  SET 
    status = 'FAILED',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'error_message', p_error_message,
      'error_code', p_error_code,
      'failed_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_payment_id AND status = 'PENDING';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'PAYMENT_NOT_FOUND_OR_NOT_PENDING');
  END IF;
  
  RETURN json_build_object('success', true, 'payment_id', p_payment_id, 'status', 'FAILED');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Decrement pool passengers atomically
CREATE OR REPLACE FUNCTION public.atomic_leave_pool(
  p_pool_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_member RECORD;
  v_pool RECORD;
BEGIN
  SELECT * INTO v_member
  FROM pool_members
  WHERE pool_id = p_pool_id AND user_id = p_user_id AND left_at IS NULL
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'NOT_MEMBER',
      'message', 'User is not a member of this pool'
    );
  END IF;
  
  SELECT * INTO v_pool
  FROM pools
  WHERE id = p_pool_id
  FOR UPDATE;
  
  IF v_pool.status IN ('STARTED', 'COMPLETED') THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'RIDE_IN_PROGRESS',
      'message', 'Cannot leave a pool that has started'
    );
  END IF;
  
  UPDATE pool_members
  SET left_at = NOW()
  WHERE id = v_member.id;
  
  UPDATE pools
  SET 
    current_passengers = GREATEST(current_passengers - 1, 0),
    status = CASE 
      WHEN current_passengers - 1 < 2 THEN 'WAITING_FOR_RIDERS'::text
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_pool_id;
  
  UPDATE rides
  SET pool_id = NULL, status = 'CANCELLED', cancelled_reason = 'Left pool', updated_at = NOW()
  WHERE id = v_member.ride_id;
  
  RETURN json_build_object(
    'success', true,
    'member_id', v_member.id,
    'ride_id', v_member.ride_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.atomic_join_pool TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_accept_pool TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vehicle_location TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_wallet_debit TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_wallet_credit TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_process_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_payment TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_leave_pool TO authenticated;
