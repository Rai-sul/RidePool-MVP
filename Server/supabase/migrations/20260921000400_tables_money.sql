-- Purpose: money and driver-economics tables — ride payments, promo codes,
-- the "promise money" deposit ledger, and driver sessions/earnings/stats.
--
-- Currency is BDT throughout; gateways are SSLCommerz and bKash, which write
-- into payments.transaction_id and payments.metadata.
--
-- Foreign keys live in 20260921000700_foreign_keys.sql.

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  transaction_id VARCHAR(100),
  -- Retries reuse the same key so a double-tap cannot charge twice; enforced
  -- by the partial unique index in 20260921000800_indexes.sql.
  idempotency_key VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount_amount DECIMAL(10,2),
  min_ride_amount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_promo_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  promo_code_id UUID NOT NULL,
  ride_id UUID,
  discount_amount DECIMAL(10,2),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Append-only ledger behind users.promise_money_balance. Written only by
-- deposit_promise_money() and deduct_promise_money().
CREATE TABLE public.promise_money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'DEDUCTION', 'REFUND')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reason TEXT,
  ride_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.driver_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  vehicle_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'BUSY', 'OFFLINE')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  initial_lat DECIMAL(10,8),
  initial_lng DECIMAL(11,8),
  earnings_session DECIMAL(10,2) DEFAULT 0,
  rides_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.driver_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  ride_id UUID,
  pool_id UUID,
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

CREATE TABLE public.driver_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  date DATE NOT NULL,
  trips_completed INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  bonus_earned DECIMAL(10,2) DEFAULT 0,
  peak_hours_trips INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (driver_id, date)
);
