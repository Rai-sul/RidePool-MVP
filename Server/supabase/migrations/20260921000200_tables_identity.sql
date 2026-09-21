-- Purpose: identity and per-user preference tables.
-- users is the root of almost every foreign key in the schema; it hangs off
-- the Supabase auth.users table, so a deleted account cascades away cleanly.
--
-- Foreign keys are NOT declared here. They live in
-- 20260921000700_foreign_keys.sql so table creation order never matters.
-- The auth.users reference is the one exception: it points outside this
-- schema and has no ordering risk.

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) UNIQUE,
  phone_verified BOOLEAN DEFAULT FALSE,
  gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  gender_preference VARCHAR(20) DEFAULT 'ANY' CHECK (gender_preference IN ('FEMALE_ONLY', 'ANY')),
  is_driver BOOLEAN DEFAULT FALSE,
  driver_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  full_name VARCHAR(100),
  average_rating DECIMAL(3,2),
  total_ratings INTEGER DEFAULT 0,
  total_rides INTEGER DEFAULT 0,
  driver_priority_lat DECIMAL(10,8),
  driver_priority_lng DECIMAL(11,8),
  driver_priority_location GEOGRAPHY(POINT, 4326),
  driver_priority_address TEXT,
  driver_priority_h3_index VARCHAR(20),
  referral_code VARCHAR(10) UNIQUE,
  penalty_points INTEGER DEFAULT 0,
  promise_money_balance DECIMAL(10,2) DEFAULT 0,
  promise_money_deposited BOOLEAN DEFAULT FALSE,
  promise_money_deposited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency VARCHAR(3) DEFAULT 'BDT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT', 'REFUND', 'BONUS')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_type VARCHAR(20),
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  h3_index VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trusted-companion graph used by the FEMALE_ONLY / safety features.
-- A row is one direction of the relationship; mutual trust is two rows.
CREATE TABLE public.priyo_sathi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  companion_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, companion_id),
  CHECK (user_id <> companion_id)
);

CREATE TABLE public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  app_type VARCHAR(10) NOT NULL DEFAULT 'rider'
);

CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  type_preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.device_tokens.app_type IS 'Identifies which app registered this token: rider or driver';
