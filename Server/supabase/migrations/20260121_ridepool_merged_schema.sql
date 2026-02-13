-- ===============================
-- RIDEPOOL COMPLETE MERGED SCHEMA
-- Merged Migration: 2026-01-21
-- ===============================
-- This file consolidates all migrations into a single deployable schema.
-- Includes fixes for RLS recursion issues from 20260121_fix_rls_recursion.sql
-- Order: Base Schema → Design Fixes → Race Conditions → Critical → High → Medium → Low → Scalability

-- ============================================
-- SECTION 1: EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- SECTION 2: DROP EXISTING OBJECTS (CLEAN SLATE)
-- ============================================

DROP TABLE IF EXISTS public.historical_demand_patterns CASCADE;
DROP TABLE IF EXISTS public.navigation_route_cache CASCADE;
DROP TABLE IF EXISTS public.demand_heatmap_cache CASCADE;
DROP TABLE IF EXISTS public.sync_logs CASCADE;
DROP TABLE IF EXISTS public.offline_actions CASCADE;
DROP TABLE IF EXISTS public.driver_shifts CASCADE;
DROP TABLE IF EXISTS public.fraud_reports CASCADE;
DROP TABLE IF EXISTS public.geo_zones CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.device_tokens CASCADE;
DROP TABLE IF EXISTS public.driver_daily_stats CASCADE;
DROP TABLE IF EXISTS public.demand_snapshot CASCADE;
DROP TABLE IF EXISTS public.route_cache CASCADE;
DROP TABLE IF EXISTS public.emergency_service_logs CASCADE;
DROP TABLE IF EXISTS public.emergency_notifications CASCADE;
DROP TABLE IF EXISTS public.cooldown_periods CASCADE;
DROP TABLE IF EXISTS public.user_cancellations CASCADE;
DROP TABLE IF EXISTS public.driver_earnings CASCADE;
DROP TABLE IF EXISTS public.driver_sessions CASCADE;
DROP TABLE IF EXISTS public.promise_money_transactions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.safety_incidents CASCADE;
DROP TABLE IF EXISTS public.ride_sharing CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.user_promo_usage CASCADE;
DROP TABLE IF EXISTS public.promo_codes CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.priyo_sathi CASCADE;
DROP TABLE IF EXISTS public.pool_members CASCADE;
DROP TABLE IF EXISTS public.rides CASCADE;
DROP TABLE IF EXISTS public.pools CASCADE;
DROP TABLE IF EXISTS public.vehicle_locations CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
DROP TABLE IF EXISTS public.saved_places CASCADE;
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.app_metadata CASCADE;

DROP VIEW IF EXISTS v_active_pools CASCADE;

DROP FUNCTION IF EXISTS update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS calc_geography() CASCADE;
DROP FUNCTION IF EXISTS generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS update_user_rating() CASCADE;
DROP FUNCTION IF EXISTS set_ride_cancelled_at() CASCADE;
DROP FUNCTION IF EXISTS increment_promo_usage(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_demand_patterns() CASCADE;
DROP FUNCTION IF EXISTS clean_expired_cache() CASCADE;
DROP FUNCTION IF EXISTS auto_complete_expired_shifts() CASCADE;
DROP FUNCTION IF EXISTS deposit_promise_money(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS deduct_promise_money(UUID, DECIMAL, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS atomic_join_pool(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS atomic_accept_pool(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_vehicle_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS atomic_wallet_debit(UUID, DECIMAL, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS atomic_wallet_credit(UUID, DECIMAL, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS atomic_process_payment(UUID, UUID, DECIMAL, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS complete_payment(UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS fail_payment(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS atomic_leave_pool(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS search_pools_optimized(TEXT[], TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_cached_route(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS record_demand(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_route_cache() CASCADE;

-- ============================================
-- SECTION 3: METADATA
-- ============================================

CREATE TABLE public.app_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_metadata_key ON public.app_metadata(key);

INSERT INTO public.app_metadata (key, value, description, category, is_public) VALUES
('h3_resolution', '{"pickup": 9, "destination": 7, "driver_search": 8}', 'H3 resolution levels for different purposes', 'h3_config', TRUE),
('h3_search_ring', '{"pickup": 1, "destination": 2, "driver": 2}', 'H3 k-ring search radius', 'h3_config', TRUE);

-- ============================================
-- SECTION 4: USERS
-- ============================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) UNIQUE,
  phone_verified BOOLEAN DEFAULT FALSE,
  gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  gender_preference VARCHAR(20) CHECK (gender_preference IN ('FEMALE_ONLY', 'ANY')) DEFAULT 'ANY',
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
  preferred_language VARCHAR(5) DEFAULT 'en',
  penalty_points INTEGER DEFAULT 0,
  promise_money_balance DECIMAL(10,2) DEFAULT 0,
  promise_money_deposited BOOLEAN DEFAULT FALSE,
  promise_money_deposited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON public.users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_driver ON public.users(is_driver) WHERE is_driver = TRUE;
CREATE INDEX idx_users_priority_loc ON public.users USING GIST(driver_priority_location);
CREATE INDEX idx_users_priority_h3 ON public.users(driver_priority_h3_index) WHERE driver_priority_h3_index IS NOT NULL;

-- ============================================
-- SECTION 5: WALLETS
-- ============================================

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency VARCHAR(3) DEFAULT 'BDT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT', 'REFUND', 'BONUS')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_type VARCHAR(20),
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_txn_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_txn_reference ON public.wallet_transactions(reference_type, reference_id);

-- ============================================
-- SECTION 6: SAVED PLACES
-- ============================================

CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  h3_index VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_places_user ON public.saved_places(user_id);
CREATE UNIQUE INDEX idx_saved_places_user_label ON public.saved_places(user_id, label);
CREATE INDEX idx_saved_places_h3 ON public.saved_places(h3_index);
CREATE INDEX idx_saved_places_location ON public.saved_places USING GIST(location);

-- ============================================
-- SECTION 7: EMERGENCY CONTACTS
-- ============================================

CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  relationship VARCHAR(50),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_user ON public.emergency_contacts(user_id);

-- ============================================
-- SECTION 8: VEHICLES
-- ============================================

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(10) NOT NULL CHECK (vehicle_type IN ('CAR', 'CNG')),
  vehicle_number VARCHAR(20) UNIQUE NOT NULL,
  model VARCHAR(100),
  color VARCHAR(50),
  max_passengers INTEGER NOT NULL DEFAULT 4 CHECK (max_passengers > 0),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_driver ON public.vehicles(driver_id);
CREATE INDEX idx_vehicles_active ON public.vehicles(is_active) WHERE is_active = TRUE;

-- ============================================
-- SECTION 9: POOLS (moved before vehicle_locations due to FK dependency)
-- ============================================

CREATE TABLE public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'WAITING_FOR_RIDERS' CHECK (status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER', 'DRIVER_ASSIGNED', 'READY_TO_START', 'STARTED', 'COMPLETED', 'CANCELLED')),
  destination_lat DECIMAL(10,8) NOT NULL,
  destination_lng DECIMAL(11,8) NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326),
  destination_address TEXT,
  destination_h3_index VARCHAR(20),
  vehicle_type VARCHAR(10) NOT NULL,
  gender_restriction VARCHAR(20) DEFAULT 'ANY',
  current_passengers INTEGER NOT NULL DEFAULT 0,
  max_passengers INTEGER NOT NULL DEFAULT 4,
  viability_score DECIMAL(5,2),
  score_breakdown JSONB,
  fare_per_person DECIMAL(10,2),
  total_surcharge_collected DECIMAL(10,2) DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_pools_dest ON public.pools USING GIST(destination_location);
CREATE INDEX idx_pools_status ON public.pools(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pools_search ON public.pools(status, vehicle_type, gender_restriction) WHERE deleted_at IS NULL;
CREATE INDEX idx_pools_driver ON public.pools(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_pools_dest_h3 ON public.pools(destination_h3_index, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pools_matching ON public.pools(destination_h3_index, vehicle_type, gender_restriction, status) 
  WHERE deleted_at IS NULL AND status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER');
CREATE INDEX idx_pools_h3_status ON public.pools(destination_h3_index, status) 
  WHERE status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER');
CREATE INDEX idx_pools_driver_active ON public.pools(driver_id, status) 
  WHERE driver_id IS NOT NULL AND status IN ('DRIVER_ASSIGNED', 'STARTED');

-- ============================================
-- SECTION 10: VEHICLE LOCATIONS
-- ============================================

CREATE TABLE public.vehicle_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES public.pools(id) ON DELETE SET NULL,
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

CREATE INDEX idx_vehicle_loc_active ON public.vehicle_locations(vehicle_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_vehicle_loc_geo ON public.vehicle_locations USING GIST(location) WHERE is_active = TRUE;
CREATE INDEX idx_vehicle_loc_time ON public.vehicle_locations USING BRIN(recorded_at);
CREATE INDEX idx_vehicle_loc_h3_res8 ON public.vehicle_locations(h3_index_res8) WHERE is_active = TRUE;
CREATE INDEX idx_vehicle_loc_h3_res9 ON public.vehicle_locations(h3_index_res9) WHERE is_active = TRUE;
CREATE INDEX idx_vehicle_loc_available ON public.vehicle_locations(is_available, h3_index_res8) WHERE is_active = TRUE;
CREATE INDEX idx_vehicle_locations_vehicle ON public.vehicle_locations(vehicle_id);

-- ============================================
-- SECTION 11: RIDES
-- ============================================

CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES public.pools(id) ON DELETE SET NULL,
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
  status VARCHAR(20) NOT NULL DEFAULT 'CREATING_POOL' CHECK (status IN ('CREATING_POOL', 'PENDING', 'MATCHED', 'WAITING_FOR_DRIVER', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
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
  cancelled_reason TEXT
);

CREATE INDEX idx_rides_user ON public.rides(user_id, created_at DESC);
CREATE INDEX idx_rides_pool ON public.rides(pool_id) WHERE pool_id IS NOT NULL;
CREATE INDEX idx_rides_pickup ON public.rides USING GIST(pickup_location);
CREATE INDEX idx_rides_dropoff ON public.rides USING GIST(dropoff_location);
CREATE INDEX idx_rides_pickup_h3 ON public.rides(pickup_h3_index, status);
CREATE INDEX idx_rides_dropoff_h3 ON public.rides(dropoff_h3_index, status);
CREATE INDEX idx_rides_matching ON public.rides(dropoff_h3_index, vehicle_type, gender_restriction, status)
  WHERE status = 'CREATING_POOL';
CREATE INDEX idx_rides_user_status ON public.rides(user_id, status) 
  WHERE status IN ('PENDING', 'MATCHED', 'IN_PROGRESS');

-- ============================================
-- SECTION 12: POOL MEMBERS
-- ============================================

CREATE TABLE public.pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  join_type VARCHAR(20) DEFAULT 'INITIAL',
  join_score DECIMAL(5,2),
  is_front_route BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(pool_id, user_id),
  UNIQUE(ride_id)
);

CREATE INDEX idx_pool_members_pool ON public.pool_members(pool_id) WHERE left_at IS NULL;
CREATE INDEX idx_pool_members_user ON public.pool_members(user_id);
CREATE INDEX idx_pool_members_active ON public.pool_members(pool_id, user_id) WHERE left_at IS NULL;

-- ============================================
-- SECTION 13: PRIYO SATHI
-- ============================================

CREATE TABLE public.priyo_sathi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, companion_id),
  CHECK (user_id != companion_id)
);

-- Index for finding user's companions by status
CREATE INDEX idx_priyo_sathi_user ON public.priyo_sathi(user_id, status);

-- Index for finding pending requests (where user is the companion receiving request)
CREATE INDEX idx_priyo_sathi_companion_pending ON public.priyo_sathi(companion_id, status) WHERE status = 'PENDING';

-- Index for checking mutual relationships (for arePriyoSathi lookups)
CREATE INDEX idx_priyo_sathi_mutual ON public.priyo_sathi(user_id, companion_id, status) WHERE status = 'ACCEPTED';

-- ============================================
-- SECTION 14: PAYMENTS
-- ============================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  transaction_id VARCHAR(100),
  idempotency_key VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_ride ON public.payments(ride_id);
CREATE INDEX idx_payments_user ON public.payments(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_payments_idempotency ON public.payments(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_payments_ride_status ON public.payments(ride_id, status);

-- ============================================
-- SECTION 15: PROMO CODES
-- ============================================

CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
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
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id),
  discount_amount DECIMAL(10,2),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_promo_user ON public.user_promo_usage(user_id);

-- ============================================
-- SECTION 16: RATINGS
-- ============================================

CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ride_id, rater_id, rated_id)
);

CREATE INDEX idx_ratings_rated ON public.ratings(rated_id);

-- ============================================
-- SECTION 17: SAFETY
-- ============================================

CREATE TABLE public.ride_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  shared_with_name VARCHAR(100),
  shared_with_phone VARCHAR(20),
  tracking_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id),
  reported_by UUID NOT NULL REFERENCES public.users(id),
  incident_type VARCHAR(50) NOT NULL,
  description TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  status VARCHAR(20) DEFAULT 'REPORTED',
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_incidents_reported ON public.safety_incidents(reported_by);

-- ============================================
-- SECTION 18: MESSAGING
-- ============================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE,
  last_message_id UUID,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message_text TEXT,
  message_type VARCHAR(20) DEFAULT 'TEXT',
  is_system BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations 
  ADD CONSTRAINT fk_last_message 
  FOREIGN KEY (last_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX idx_messages_conv ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_conv_participants_user ON public.conversation_participants(user_id);

-- ============================================
-- SECTION 19: NOTIFICATIONS
-- ============================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- SECTION 20: AUDIT LOG (Consolidated)
-- ============================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  table_name VARCHAR(50),
  record_id UUID,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  old_data JSONB,
  new_data JSONB,
  details JSONB,
  changed_by UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_time ON public.audit_logs USING BRIN(created_at);

-- ============================================
-- SECTION 21: PROMISE MONEY
-- ============================================

CREATE TABLE public.promise_money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'DEDUCTION', 'REFUND')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reason TEXT,
  ride_id UUID REFERENCES public.rides(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promise_money_user ON public.promise_money_transactions(user_id, created_at DESC);

-- ============================================
-- SECTION 22: DRIVER MANAGEMENT
-- ============================================

CREATE TABLE public.driver_sessions (
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

CREATE INDEX idx_driver_sessions_driver ON public.driver_sessions(driver_id);
CREATE INDEX idx_driver_sessions_status ON public.driver_sessions(status) WHERE status = 'ONLINE';
CREATE INDEX idx_driver_sessions_active ON public.driver_sessions(driver_id, status) WHERE status IN ('ONLINE', 'BUSY');

CREATE TABLE public.driver_earnings (
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

CREATE INDEX idx_driver_earnings_driver ON public.driver_earnings(driver_id);
CREATE INDEX idx_driver_earnings_date ON public.driver_earnings(created_at);
CREATE INDEX idx_driver_earnings_status ON public.driver_earnings(driver_id, payment_status);

CREATE TABLE public.driver_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  trips_completed INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  bonus_earned DECIMAL(10,2) DEFAULT 0,
  peak_hours_trips INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, date)
);

CREATE INDEX idx_driver_daily_stats_driver_date ON public.driver_daily_stats(driver_id, date DESC);
CREATE INDEX idx_driver_daily_stats_date ON public.driver_daily_stats(date DESC);

CREATE TABLE public.driver_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_shift_times CHECK (start_time < end_time)
);

CREATE INDEX idx_driver_shifts_driver_id ON public.driver_shifts(driver_id);
CREATE INDEX idx_driver_shifts_day_status ON public.driver_shifts(day_of_week, status);

-- ============================================
-- SECTION 23: USER PENALTIES & COOLDOWNS
-- ============================================

CREATE TABLE public.user_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancellation_time_seconds INTEGER NOT NULL,
  is_deliberate BOOLEAN NOT NULL DEFAULT FALSE,
  penalty_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_cancellations_user ON public.user_cancellations(user_id);
CREATE INDEX idx_user_cancellations_deliberate ON public.user_cancellations(user_id, is_deliberate) WHERE is_deliberate = TRUE;
CREATE INDEX idx_user_cancellations_recent ON public.user_cancellations(user_id, cancelled_at DESC);

CREATE TABLE public.cooldown_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  reason VARCHAR(50) NOT NULL,
  penalty_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cooldown_periods_user ON public.cooldown_periods(user_id);
CREATE INDEX idx_cooldown_periods_active ON public.cooldown_periods(user_id, ends_at);

-- ============================================
-- SECTION 24: EMERGENCY MANAGEMENT
-- ============================================

CREATE TABLE public.emergency_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.safety_incidents(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.emergency_contacts(id) ON DELETE SET NULL,
  contact_phone VARCHAR(20),
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED'))
);

CREATE INDEX idx_emergency_notifications_incident ON public.emergency_notifications(incident_id);

CREATE TABLE public.emergency_service_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.safety_incidents(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL,
  data JSONB,
  status VARCHAR(20) DEFAULT 'PENDING',
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_service_logs_incident ON public.emergency_service_logs(incident_id);

-- ============================================
-- SECTION 25: DEVICE & NOTIFICATIONS
-- ============================================

CREATE TABLE public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_user ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON public.device_tokens(user_id) WHERE is_active = TRUE;

CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  type_preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_prefs_user ON public.notification_preferences(user_id);

-- ============================================
-- SECTION 26: GEO ZONES & FRAUD REPORTS
-- ============================================

CREATE TABLE public.geo_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('SERVICE_AREA', 'RESTRICTED', 'SURGE', 'HIGH_DEMAND', 'LOW_DEMAND')),
  polygon JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_zones_type ON public.geo_zones(type) WHERE is_active = TRUE;

CREATE TABLE public.fraud_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  suspect_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_reports_status ON public.fraud_reports(status, created_at DESC);
CREATE INDEX idx_fraud_reports_suspect ON public.fraud_reports(suspect_id);

-- ============================================
-- SECTION 27: CACHING & PERFORMANCE
-- ============================================

CREATE TABLE public.route_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_h3 TEXT NOT NULL,
  destination_h3 TEXT NOT NULL,
  distance_meters INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  polyline TEXT,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(origin_h3, destination_h3)
);

CREATE INDEX idx_route_cache_lookup ON public.route_cache(origin_h3, destination_h3);
CREATE INDEX idx_route_cache_expiry ON public.route_cache(expires_at);

CREATE TABLE public.demand_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  h3_cell TEXT NOT NULL,
  resolution INTEGER NOT NULL DEFAULT 7,
  request_count INTEGER NOT NULL DEFAULT 0,
  snapshot_time TIMESTAMPTZ DEFAULT NOW(),
  time_bucket TIMESTAMPTZ NOT NULL,
  UNIQUE(h3_cell, time_bucket)
);

CREATE INDEX idx_demand_snapshot_time ON public.demand_snapshot(time_bucket DESC);
CREATE INDEX idx_demand_snapshot_cell ON public.demand_snapshot(h3_cell);

CREATE TABLE public.demand_heatmap_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  h3_index VARCHAR(20) NOT NULL,
  h3_resolution INTEGER NOT NULL,
  demand_count INTEGER DEFAULT 0,
  surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
  demand_level VARCHAR(20) DEFAULT 'LOW' CHECK (demand_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  UNIQUE(h3_index, h3_resolution)
);

CREATE INDEX idx_heatmap_cache_h3 ON public.demand_heatmap_cache(h3_index);
CREATE INDEX idx_heatmap_cache_expires ON public.demand_heatmap_cache(expires_at);

CREATE TABLE public.navigation_route_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_h3 VARCHAR(20) NOT NULL,
  destination_h3 VARCHAR(20) NOT NULL,
  route_data JSONB NOT NULL,
  total_distance_m INTEGER,
  total_duration_s INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  UNIQUE(origin_h3, destination_h3)
);

CREATE INDEX idx_nav_route_cache_origin_dest ON public.navigation_route_cache(origin_h3, destination_h3);
CREATE INDEX idx_nav_route_cache_expires ON public.navigation_route_cache(expires_at);

CREATE TABLE public.historical_demand_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  h3_index VARCHAR(20) NOT NULL,
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  avg_demand DECIMAL(10,2) DEFAULT 0,
  peak_demand INTEGER DEFAULT 0,
  sample_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(h3_index, hour_of_day, day_of_week)
);

CREATE INDEX idx_demand_patterns_h3 ON public.historical_demand_patterns(h3_index);
CREATE INDEX idx_demand_patterns_time ON public.historical_demand_patterns(hour_of_day, day_of_week);

-- ============================================
-- SECTION 28: OFFLINE SUPPORT
-- ============================================

CREATE TABLE public.offline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'UPDATE_LOCATION', 'CANCEL_RIDE', 'RATE_RIDE', 'SEND_MESSAGE',
    'UPDATE_PROFILE', 'TRIGGER_SOS', 'MARK_PICKUP', 'MARK_DROPOFF'
  )),
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCED', 'FAILED', 'CONFLICT')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX idx_offline_actions_user_status ON public.offline_actions(user_id, status);
CREATE INDEX idx_offline_actions_created ON public.offline_actions(created_at);

CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  synced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  conflict_count INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_user_id ON public.sync_logs(user_id);
CREATE INDEX idx_sync_logs_synced_at ON public.sync_logs(synced_at);

-- ============================================
-- SECTION 29: TRIGGERS & FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_users_ts BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_wallets_ts BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_saved_places_ts BEFORE UPDATE ON public.saved_places FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_vehicles_ts BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_pools_ts BEFORE UPDATE ON public.pools FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_rides_ts BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE FUNCTION calc_geography()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'users' THEN
    IF NEW.driver_priority_lat IS NOT NULL AND NEW.driver_priority_lng IS NOT NULL THEN
      NEW.driver_priority_location = ST_SetSRID(ST_MakePoint(NEW.driver_priority_lng, NEW.driver_priority_lat), 4326)::geography;
    END IF;
  ELSIF TG_TABLE_NAME = 'saved_places' THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'vehicle_locations' THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'pools' THEN
    NEW.destination_location = ST_SetSRID(ST_MakePoint(NEW.destination_lng, NEW.destination_lat), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'rides' THEN
    NEW.pickup_location = ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
    NEW.dropoff_location = ST_SetSRID(ST_MakePoint(NEW.dropoff_lng, NEW.dropoff_lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_users_geo BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION calc_geography();
CREATE TRIGGER t_saved_places_geo BEFORE INSERT OR UPDATE ON public.saved_places FOR EACH ROW EXECUTE FUNCTION calc_geography();
CREATE TRIGGER t_vehicle_loc_geo BEFORE INSERT OR UPDATE ON public.vehicle_locations FOR EACH ROW EXECUTE FUNCTION calc_geography();
CREATE TRIGGER t_pools_geo BEFORE INSERT OR UPDATE ON public.pools FOR EACH ROW EXECUTE FUNCTION calc_geography();
CREATE TRIGGER t_rides_geo BEFORE INSERT OR UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION calc_geography();

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg DECIMAL(3,2);
  v_count INTEGER;
BEGIN
  SELECT AVG(rating), COUNT(*) INTO v_avg, v_count
  FROM public.ratings
  WHERE rated_id = NEW.rated_id;
  
  UPDATE public.users
  SET average_rating = v_avg, total_ratings = v_count
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_rating
  AFTER INSERT OR UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

CREATE OR REPLACE FUNCTION set_ride_cancelled_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    NEW.cancelled_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ride_cancelled_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION set_ride_cancelled_at();

CREATE OR REPLACE FUNCTION update_demand_patterns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    INSERT INTO public.historical_demand_patterns (
      h3_index, hour_of_day, day_of_week, avg_demand, peak_demand, sample_count
    )
    VALUES (
      NEW.pickup_h3_index,
      EXTRACT(HOUR FROM NEW.created_at)::INTEGER,
      EXTRACT(DOW FROM NEW.created_at)::INTEGER,
      1, 1, 1
    )
    ON CONFLICT (h3_index, hour_of_day, day_of_week)
    DO UPDATE SET
      avg_demand = (historical_demand_patterns.avg_demand * historical_demand_patterns.sample_count + 1) / (historical_demand_patterns.sample_count + 1),
      peak_demand = GREATEST(historical_demand_patterns.peak_demand, 1),
      sample_count = historical_demand_patterns.sample_count + 1,
      last_updated = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_demand_patterns
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION update_demand_patterns();

-- ============================================
-- SECTION 30: ATOMIC BUSINESS FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.deposit_promise_money(
  p_user_id UUID,
  p_amount DECIMAL DEFAULT 50.00
) RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.deduct_promise_money(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reason TEXT,
  p_ride_id UUID DEFAULT NULL
) RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  SELECT * INTO v_pool FROM pools WHERE id = p_pool_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POOL_NOT_FOUND: Pool does not exist';
  END IF;
  
  IF v_pool.status NOT IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER') THEN
    RAISE EXCEPTION 'POOL_NOT_AVAILABLE: Pool is no longer accepting riders';
  END IF;
  
  IF v_pool.current_passengers >= v_pool.max_passengers THEN
    RAISE EXCEPTION 'POOL_FULL: Pool has reached maximum capacity';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pool_members WHERE pool_id = p_pool_id AND user_id = p_user_id AND left_at IS NULL) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER: User is already in this pool';
  END IF;
  
  v_member_id := gen_random_uuid();
  v_new_count := v_pool.current_passengers + 1;
  
  INSERT INTO pool_members (id, pool_id, user_id, ride_id, join_type, joined_at)
  VALUES (v_member_id, p_pool_id, p_user_id, p_ride_id, 'MATCHED', NOW());
  
  UPDATE pools 
  SET current_passengers = v_new_count,
      status = CASE WHEN v_new_count >= max_passengers THEN 'WAITING_FOR_DRIVER'::text ELSE status END,
      updated_at = NOW()
  WHERE id = p_pool_id;
  
  UPDATE rides SET pool_id = p_pool_id, status = 'WAITING_FOR_DRIVER', updated_at = NOW() WHERE id = p_ride_id;
  
  RETURN json_build_object(
    'success', true, 'member_id', v_member_id, 'current_passengers', v_new_count,
    'pool_status', CASE WHEN v_new_count >= v_pool.max_passengers THEN 'WAITING_FOR_DRIVER' ELSE v_pool.status END
  );
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.atomic_accept_pool(
  p_pool_id UUID,
  p_driver_id UUID,
  p_vehicle_id UUID
) RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.atomic_leave_pool(
  p_pool_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.complete_payment(
  p_payment_id UUID,
  p_transaction_id TEXT,
  p_gateway_response JSONB DEFAULT NULL
) RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fail_payment(
  p_payment_id UUID,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL
) RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 31: OPTIMIZATION FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.search_pools_optimized(
  p_destination_h3_cells TEXT[],
  p_gender_preference TEXT DEFAULT 'ANY',
  p_max_results INTEGER DEFAULT 20
) RETURNS TABLE (
  pool_id UUID,
  creator_user_id UUID,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  destination_h3_index TEXT,
  current_passengers INTEGER,
  max_passengers INTEGER,
  status TEXT,
  gender_restriction TEXT,
  driver_id UUID,
  vehicle_id UUID,
  created_at TIMESTAMPTZ,
  members JSONB,
  creator_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS pool_id, p.creator_user_id,
    p.destination_lat::DOUBLE PRECISION, p.destination_lng::DOUBLE PRECISION,
    p.destination_h3_index::TEXT, p.current_passengers, p.max_passengers,
    p.status::TEXT, p.gender_restriction::TEXT, p.driver_id, p.vehicle_id, p.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', pm.user_id, 'joined_at', pm.joined_at, 'join_score', pm.join_score)) FROM pool_members pm WHERE pm.pool_id = p.id AND pm.left_at IS NULL), '[]'::jsonb) AS members,
    (SELECT jsonb_build_object('id', u.id, 'full_name', u.full_name, 'gender', u.gender, 'rating', u.average_rating) FROM users u WHERE u.id = p.creator_user_id) AS creator_info
  FROM pools p
  WHERE p.destination_h3_index = ANY(p_destination_h3_cells)
    AND p.status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER')
    AND p.current_passengers < p.max_passengers
    AND (p_gender_preference = 'ANY' OR p.gender_restriction = 'ANY' OR p.gender_restriction = p_gender_preference)
  ORDER BY p.created_at DESC
  LIMIT p_max_results;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_cached_route(
  p_origin_h3 TEXT,
  p_destination_h3 TEXT
) RETURNS TABLE (
  distance_meters INTEGER,
  duration_seconds INTEGER,
  polyline TEXT,
  from_cache BOOLEAN
) AS $$
DECLARE
  v_route RECORD;
BEGIN
  SELECT rc.distance_meters, rc.duration_seconds, rc.polyline INTO v_route
  FROM route_cache rc
  WHERE rc.origin_h3 = p_origin_h3 AND rc.destination_h3 = p_destination_h3 AND rc.expires_at > NOW();
  
  IF FOUND THEN
    RETURN QUERY SELECT v_route.distance_meters, v_route.duration_seconds, v_route.polyline, TRUE;
  ELSE
    RETURN QUERY SELECT NULL::INTEGER, NULL::INTEGER, NULL::TEXT, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.record_demand(
  p_h3_cell TEXT,
  p_resolution INTEGER DEFAULT 7
) RETURNS VOID AS $$
DECLARE
  v_bucket TIMESTAMPTZ;
BEGIN
  v_bucket := date_trunc('hour', NOW());
  INSERT INTO demand_snapshot (h3_cell, resolution, request_count, time_bucket)
  VALUES (p_h3_cell, p_resolution, 1, v_bucket)
  ON CONFLICT (h3_cell, time_bucket)
  DO UPDATE SET request_count = demand_snapshot.request_count + 1, snapshot_time = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cleanup_route_cache() RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM route_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM demand_heatmap_cache WHERE expires_at < NOW();
  DELETE FROM navigation_route_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.auto_complete_expired_shifts()
RETURNS void AS $$
DECLARE
  current_dow INTEGER := EXTRACT(DOW FROM NOW())::INTEGER;
  current_time TIME := NOW()::TIME;
BEGIN
  UPDATE driver_shifts
  SET status = 'COMPLETED', updated_at = NOW()
  WHERE status = 'ACTIVE'
    AND ((day_of_week < current_dow) OR (day_of_week = current_dow AND end_time < current_time));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_vehicle_location(
  p_vehicle_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_heading DOUBLE PRECISION DEFAULT 0,
  p_speed DOUBLE PRECISION DEFAULT 0,
  p_recorded_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 32: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priyo_sathi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promise_money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooldown_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_promo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Users policies (simplified to avoid recursion)
CREATE POLICY p_users_own ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY p_users_update ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY p_users_insert ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY p_users_public_read ON public.users FOR SELECT USING (deleted_at IS NULL);

-- Wallet policies
CREATE POLICY p_wallets ON public.wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_wallet_txn ON public.wallet_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM wallets WHERE wallets.id = wallet_transactions.wallet_id AND wallets.user_id = auth.uid())
);

-- Saved places and emergency contacts
CREATE POLICY p_saved_places ON public.saved_places FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_emergency ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id);

-- Vehicles policies
CREATE POLICY p_vehicles_read ON public.vehicles FOR SELECT USING (is_active = TRUE);
CREATE POLICY p_vehicles_write ON public.vehicles FOR ALL USING (auth.uid() = driver_id);

-- Vehicle locations - simplified to avoid recursion
CREATE POLICY p_vehicle_loc_driver ON public.vehicle_locations FOR ALL USING (auth.uid() = driver_id);
CREATE POLICY p_vehicle_loc_pool ON public.vehicle_locations FOR SELECT USING (
  pool_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pools WHERE pools.id = vehicle_locations.pool_id 
    AND (pools.driver_id = auth.uid() OR pools.creator_user_id = auth.uid())
  )
);

-- Pools policies
CREATE POLICY p_pools_read ON public.pools FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY p_pools_create ON public.pools FOR INSERT WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY p_pools_update ON public.pools FOR UPDATE USING (auth.uid() = creator_user_id OR auth.uid() = driver_id);

-- Rides policies
CREATE POLICY p_rides_own ON public.rides FOR ALL USING (auth.uid() = user_id);

-- Pool members - simplified to avoid recursion
CREATE POLICY p_pool_members_own ON public.pool_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY p_pool_members_join ON public.pool_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY p_pool_members_update ON public.pool_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY p_pool_members_pool_read ON public.pool_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_members.pool_id AND (pools.driver_id = auth.uid() OR pools.creator_user_id = auth.uid()))
);

-- Priyo Sathi
CREATE POLICY p_priyo_sathi ON public.priyo_sathi FOR ALL USING (auth.uid() = user_id OR auth.uid() = companion_id);

-- Payments
CREATE POLICY p_payments ON public.payments FOR ALL USING (auth.uid() = user_id);

-- Promo codes
CREATE POLICY p_promo_read ON public.promo_codes FOR SELECT USING (is_active = TRUE);
CREATE POLICY p_user_promo_usage_own ON public.user_promo_usage FOR ALL USING (auth.uid() = user_id);

-- Ratings
CREATE POLICY p_ratings_read ON public.ratings FOR SELECT USING (true);
CREATE POLICY p_ratings_write ON public.ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Safety
CREATE POLICY p_ride_sharing ON public.ride_sharing FOR ALL USING (
  EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_sharing.ride_id AND rides.user_id = auth.uid())
);
CREATE POLICY p_safety ON public.safety_incidents FOR ALL USING (auth.uid() = reported_by);

-- Messaging
CREATE POLICY p_conv_participants ON public.conversation_participants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_conversations ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = conversations.id AND conversation_participants.user_id = auth.uid())
);
CREATE POLICY p_messages_read ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = messages.conversation_id AND conversation_participants.user_id = auth.uid())
);
CREATE POLICY p_messages_write ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND 
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = messages.conversation_id AND conversation_participants.user_id = auth.uid())
);

-- Notifications
CREATE POLICY p_notifications ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Promise money
CREATE POLICY p_promise_money ON public.promise_money_transactions FOR SELECT USING (auth.uid() = user_id);

-- Driver management
CREATE POLICY p_driver_sessions ON public.driver_sessions FOR ALL USING (auth.uid() = driver_id);
CREATE POLICY p_driver_earnings ON public.driver_earnings FOR ALL USING (auth.uid() = driver_id);
CREATE POLICY p_driver_daily_stats ON public.driver_daily_stats FOR ALL USING (auth.uid() = driver_id);
CREATE POLICY p_driver_shifts ON public.driver_shifts FOR ALL USING (auth.uid() = driver_id);

-- Penalties
CREATE POLICY p_user_cancellations ON public.user_cancellations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_cooldown_periods ON public.cooldown_periods FOR ALL USING (auth.uid() = user_id);

-- Emergency
CREATE POLICY p_emergency_notifications ON public.emergency_notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM safety_incidents WHERE safety_incidents.id = emergency_notifications.incident_id AND safety_incidents.reported_by = auth.uid())
);
CREATE POLICY p_emergency_service_logs ON public.emergency_service_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM safety_incidents WHERE safety_incidents.id = emergency_service_logs.incident_id AND safety_incidents.reported_by = auth.uid())
);

-- Device tokens and preferences
CREATE POLICY p_device_tokens ON public.device_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_notification_preferences ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Audit logs
CREATE POLICY p_audit_logs_admin ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = TRUE)
);
CREATE POLICY p_audit_logs_own ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Geo zones
CREATE POLICY p_geo_zones_read ON public.geo_zones FOR SELECT USING (is_active = TRUE);

-- Fraud reports
CREATE POLICY p_fraud_reports_reporter ON public.fraud_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY p_fraud_reports_insert ON public.fraud_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Offline actions
CREATE POLICY p_offline_actions ON public.offline_actions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_sync_logs ON public.sync_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- SECTION 33: VIEWS
-- ============================================

CREATE VIEW v_active_pools AS
SELECT
  p.id, p.creator_user_id, p.driver_id, p.status,
  p.destination_lat, p.destination_lng, p.destination_address,
  p.destination_h3_index, p.vehicle_type, p.gender_restriction,
  p.current_passengers, p.max_passengers, p.fare_per_person, p.viability_score,
  p.created_at, v.vehicle_number, v.model
FROM pools p
LEFT JOIN vehicles v ON v.id = p.vehicle_id
WHERE p.deleted_at IS NULL
  AND p.status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED');

-- ============================================
-- SECTION 34: GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION public.deposit_promise_money TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_promise_money TO service_role;
GRANT SELECT ON public.promise_money_transactions TO authenticated;

GRANT EXECUTE ON FUNCTION public.atomic_join_pool TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_accept_pool TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_leave_pool TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_wallet_debit TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_wallet_credit TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_process_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_payment TO service_role;

GRANT EXECUTE ON FUNCTION public.search_pools_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_route TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_demand TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vehicle_location TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.route_cache TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.demand_snapshot TO service_role;

-- ============================================
-- SECTION 35: COMMENTS
-- ============================================

COMMENT ON TABLE public.pools IS 'Ride pools with H3 destination indexing for efficient matching (H3 calculated by backend using h3-js)';
COMMENT ON TABLE public.rides IS 'Individual ride requests with H3 pickup (res 9) and destination (res 7) indexes (backend calculated)';
COMMENT ON TABLE public.vehicle_locations IS 'Real-time vehicle locations with dual H3 indexes for driver search and pickup matching (backend calculated)';
COMMENT ON TABLE public.driver_shifts IS 'Driver shift scheduling for weekly recurring schedules';
COMMENT ON TABLE public.offline_actions IS 'Queued actions performed offline for later synchronization';
COMMENT ON TABLE public.sync_logs IS 'Log of sync attempts for offline actions';
COMMENT ON TABLE public.demand_heatmap_cache IS 'Cached demand heatmap data for driver recommendations';
COMMENT ON TABLE public.navigation_route_cache IS 'Cached navigation routes to reduce API calls';
COMMENT ON TABLE public.historical_demand_patterns IS 'Historical demand patterns by location and time';

COMMENT ON COLUMN public.pools.destination_h3_index IS 'H3 resolution 7 (~5.2km avg hexagon edge) for destination area matching - calculated by backend';
COMMENT ON COLUMN public.rides.pickup_h3_index IS 'H3 resolution 9 (~174m avg hexagon edge) for precise pickup location matching - calculated by backend';
COMMENT ON COLUMN public.rides.dropoff_h3_index IS 'H3 resolution 7 (~5.2km avg hexagon edge) for destination area matching - calculated by backend';
COMMENT ON COLUMN public.vehicle_locations.h3_index_res8 IS 'H3 resolution 8 (~461m avg hexagon edge) for driver search area - calculated by backend';
COMMENT ON COLUMN public.vehicle_locations.h3_index_res9 IS 'H3 resolution 9 (~174m avg hexagon edge) for precise driver location - calculated by backend';
COMMENT ON COLUMN public.users.preferred_language IS 'User preferred language code (en, bn)';

-- ============================================
-- H3 RESOLUTION GUIDE
-- ============================================
-- Resolution | Avg Hexagon Edge | Use Case
-- -----------|------------------|---------------------------
-- 7          | ~5.2 km          | Destination area matching
-- 8          | ~461 m           | Driver search radius
-- 9          | ~174 m           | Pickup point matching
-- 10         | ~65 m            | Not used (too precise)
-- ============================================

-- ============================================
-- SCHEMA COMPLETE - 2026-01-21 (MERGED)
-- Includes RLS recursion fixes from 20260121_fix_rls_recursion.sql
-- ============================================
