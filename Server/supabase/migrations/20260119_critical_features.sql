-- Driver Sessions Table
CREATE TABLE IF NOT EXISTS public.driver_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'BUSY', 'OFFLINE')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  initial_lat DECIMAL(10,8),
  initial_lng DECIMAL(11,8),
  earnings_session DECIMAL(10,2) DEFAULT 0,
  rides_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver ON public.driver_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_status ON public.driver_sessions(status) WHERE status = 'ONLINE';
CREATE INDEX IF NOT EXISTS idx_driver_sessions_active ON public.driver_sessions(driver_id, status) WHERE status IN ('ONLINE', 'BUSY');

-- Driver Earnings Table
CREATE TABLE IF NOT EXISTS public.driver_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  pool_id UUID REFERENCES public.pools(id) ON DELETE SET NULL,
  base_fare DECIMAL(10,2),
  distance_fare DECIMAL(10,2),
  time_fare DECIMAL(10,2),
  tips DECIMAL(10,2) DEFAULT 0,
  bonuses DECIMAL(10,2) DEFAULT 0,
  platform_commission DECIMAL(10,2),
  net_earnings DECIMAL(10,2),
  payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PROCESSED', 'PAID')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver ON public.driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_date ON public.driver_earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_status ON public.driver_earnings(driver_id, payment_status);

-- User Cancellations Table (for penalty tracking)
CREATE TABLE IF NOT EXISTS public.user_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancellation_time_seconds INTEGER NOT NULL,
  is_deliberate BOOLEAN NOT NULL DEFAULT FALSE,
  penalty_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_cancellations_user ON public.user_cancellations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cancellations_deliberate ON public.user_cancellations(user_id, is_deliberate) WHERE is_deliberate = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_cancellations_recent ON public.user_cancellations(user_id, cancelled_at DESC);

-- Cooldown Periods Table
CREATE TABLE IF NOT EXISTS public.cooldown_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  reason VARCHAR(50) NOT NULL,
  penalty_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cooldown_periods_user ON public.cooldown_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_cooldown_periods_active ON public.cooldown_periods(user_id, ends_at) WHERE ends_at > NOW();

-- Emergency Notifications Log Table
CREATE TABLE IF NOT EXISTS public.emergency_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.safety_incidents(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.emergency_contacts(id) ON DELETE SET NULL,
  contact_phone VARCHAR(20),
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_emergency_notifications_incident ON public.emergency_notifications(incident_id);

-- Emergency Service Logs Table
CREATE TABLE IF NOT EXISTS public.emergency_service_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.safety_incidents(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL,
  data JSONB,
  status VARCHAR(20) DEFAULT 'PENDING',
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_service_logs_incident ON public.emergency_service_logs(incident_id);

-- Add resolution fields to safety_incidents
ALTER TABLE public.safety_incidents 
ADD COLUMN IF NOT EXISTS resolution TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Atomic Pool Join Function (prevents race condition)
CREATE OR REPLACE FUNCTION atomic_join_pool(
  p_pool_id UUID,
  p_user_id UUID,
  p_ride_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pool RECORD;
  v_member_id UUID;
BEGIN
  SELECT * INTO v_pool FROM public.pools 
  WHERE id = p_pool_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POOL_NOT_FOUND';
  END IF;
  
  IF v_pool.status NOT IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER') THEN
    RAISE EXCEPTION 'POOL_NOT_AVAILABLE: Status is %', v_pool.status;
  END IF;
  
  IF v_pool.current_passengers >= v_pool.max_passengers THEN
    RAISE EXCEPTION 'POOL_FULL: % of % passengers', v_pool.current_passengers, v_pool.max_passengers;
  END IF;
  
  INSERT INTO public.pool_members (pool_id, user_id, ride_id, join_type, joined_at)
  VALUES (p_pool_id, p_user_id, p_ride_id, 'MATCHED', NOW())
  RETURNING id INTO v_member_id;
  
  UPDATE public.pools 
  SET current_passengers = current_passengers + 1,
      updated_at = NOW()
  WHERE id = p_pool_id;
  
  UPDATE public.rides
  SET pool_id = p_pool_id,
      status = 'WAITING_FOR_DRIVER',
      updated_at = NOW()
  WHERE id = p_ride_id;
  
  RETURN json_build_object(
    'success', true,
    'member_id', v_member_id,
    'current_passengers', v_pool.current_passengers + 1
  );
END;
$$ LANGUAGE plpgsql;

-- Atomic Pool Accept Function (prevents driver race condition)
CREATE OR REPLACE FUNCTION atomic_accept_pool(
  p_pool_id UUID,
  p_driver_id UUID,
  p_vehicle_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pool RECORD;
BEGIN
  SELECT * INTO v_pool FROM public.pools 
  WHERE id = p_pool_id 
  AND driver_id IS NULL
  AND status = 'WAITING_FOR_DRIVER'
  FOR UPDATE SKIP LOCKED;
  
  IF NOT FOUND THEN
    SELECT driver_id INTO v_pool FROM public.pools WHERE id = p_pool_id;
    IF v_pool.driver_id IS NOT NULL THEN
      RAISE EXCEPTION 'ALREADY_ASSIGNED';
    END IF;
    RAISE EXCEPTION 'POOL_NOT_FOUND';
  END IF;
  
  UPDATE public.pools 
  SET driver_id = p_driver_id,
      vehicle_id = p_vehicle_id,
      status = 'READY_TO_START',
      updated_at = NOW()
  WHERE id = p_pool_id;
  
  RETURN json_build_object(
    'success', true,
    'pool_id', p_pool_id,
    'status', 'READY_TO_START'
  );
END;
$$ LANGUAGE plpgsql;

-- Atomic Wallet Deduction Function (prevents negative balance)
CREATE OR REPLACE FUNCTION atomic_wallet_debit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference_type VARCHAR,
  p_reference_id UUID
) RETURNS JSON AS $$
DECLARE
  v_wallet RECORD;
  v_txn_id UUID;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets 
  WHERE user_id = p_user_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  
  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Available %, Required %', v_wallet.balance, p_amount;
  END IF;
  
  INSERT INTO public.wallet_transactions (
    wallet_id, type, amount, balance_before, balance_after,
    reference_type, reference_id
  ) VALUES (
    v_wallet.id, 'DEBIT', p_amount, v_wallet.balance, v_wallet.balance - p_amount,
    p_reference_type, p_reference_id
  ) RETURNING id INTO v_txn_id;
  
  UPDATE public.wallets 
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_wallet.id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_txn_id,
    'new_balance', v_wallet.balance - p_amount
  );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for new tables
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooldown_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_driver_sessions ON public.driver_sessions 
  FOR ALL USING (auth.uid() = driver_id);

CREATE POLICY p_driver_earnings ON public.driver_earnings 
  FOR ALL USING (auth.uid() = driver_id);

CREATE POLICY p_user_cancellations ON public.user_cancellations 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY p_cooldown_periods ON public.cooldown_periods 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY p_emergency_notifications ON public.emergency_notifications 
  FOR SELECT USING (
    incident_id IN (
      SELECT id FROM public.safety_incidents WHERE reported_by = auth.uid()
    )
  );

CREATE POLICY p_emergency_service_logs ON public.emergency_service_logs 
  FOR SELECT USING (
    incident_id IN (
      SELECT id FROM public.safety_incidents WHERE reported_by = auth.uid()
    )
  );
