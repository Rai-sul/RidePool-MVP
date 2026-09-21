-- Purpose: every index that is not created automatically by a PRIMARY KEY or
-- UNIQUE constraint.
--
-- Grouped by table, and within a table by what the index is for. Most
-- partial indexes exist because the hot queries all filter the same way:
-- deleted_at IS NULL for pools, left_at IS NULL for members, is_active for
-- vehicle locations. Keeping the predicate on the index keeps it small.
--
-- GIST indexes cover the PostGIS geography columns; BRIN covers the two
-- append-only, time-ordered tables where a btree would be wasteful.

-- Users ---------------------------------------------------------------------

CREATE INDEX idx_users_phone ON public.users (phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_driver ON public.users (is_driver) WHERE is_driver = TRUE;
CREATE INDEX idx_users_priority_h3 ON public.users (driver_priority_h3_index) WHERE driver_priority_h3_index IS NOT NULL;
CREATE INDEX idx_users_priority_loc ON public.users USING GIST (driver_priority_location);

-- Wallets -------------------------------------------------------------------

CREATE INDEX idx_wallet_txn_wallet ON public.wallet_transactions (wallet_id, created_at DESC);
CREATE INDEX idx_wallet_txn_reference ON public.wallet_transactions (reference_type, reference_id);

-- Saved places --------------------------------------------------------------

-- One label per user ("Home", "Work"); also serves lookups by user_id alone.
CREATE UNIQUE INDEX idx_saved_places_user_label ON public.saved_places (user_id, label);
CREATE INDEX idx_saved_places_h3 ON public.saved_places (h3_index);
CREATE INDEX idx_saved_places_location ON public.saved_places USING GIST (location);

-- Priyo Sathi ---------------------------------------------------------------

CREATE INDEX idx_priyo_sathi_user ON public.priyo_sathi (user_id, status);
CREATE INDEX idx_priyo_sathi_companion_pending ON public.priyo_sathi (companion_id, status) WHERE status = 'PENDING';
CREATE INDEX idx_priyo_sathi_mutual ON public.priyo_sathi (user_id, companion_id, status) WHERE status = 'ACCEPTED';

-- Device tokens and notification preferences --------------------------------

CREATE INDEX idx_device_tokens_user ON public.device_tokens (user_id);
CREATE INDEX idx_device_tokens_active ON public.device_tokens (user_id) WHERE is_active = TRUE;
CREATE INDEX idx_device_tokens_app_type ON public.device_tokens (app_type);
CREATE INDEX idx_notification_prefs_user ON public.notification_preferences (user_id);

-- Vehicles ------------------------------------------------------------------

CREATE INDEX idx_vehicles_driver ON public.vehicles (driver_id);
CREATE INDEX idx_vehicles_active ON public.vehicles (is_active) WHERE is_active = TRUE;

-- Pools ---------------------------------------------------------------------

CREATE INDEX idx_pools_status ON public.pools (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pools_driver ON public.pools (driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_pools_driver_active ON public.pools (driver_id, status)
  WHERE driver_id IS NOT NULL AND status IN ('DRIVER_ASSIGNED', 'STARTED');
CREATE INDEX idx_pools_search ON public.pools (status, vehicle_type, gender_restriction) WHERE deleted_at IS NULL;
CREATE INDEX idx_pools_pickup_h3 ON public.pools (pickup_h3_index, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pools_dest_h3 ON public.pools (destination_h3_index, status) WHERE deleted_at IS NULL;
-- The instant-rider discovery path.
CREATE INDEX idx_pools_matching ON public.pools (destination_h3_index, vehicle_type, gender_restriction, status)
  WHERE deleted_at IS NULL AND status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER');
CREATE INDEX idx_pools_pickup ON public.pools USING GIST (pickup_location);
CREATE INDEX idx_pools_dest ON public.pools USING GIST (destination_location);
-- Advance booking: the scheduler sweep for pools whose confirmation window
-- has opened or expired.
CREATE INDEX idx_pools_advance_due ON public.pools (confirmation_opens_at, confirmation_deadline_at)
  WHERE is_advance = TRUE AND status = 'SCHEDULED' AND deleted_at IS NULL;
-- Advance booking: candidate pools for a given destination and time.
CREATE INDEX idx_pools_advance_matching ON public.pools (destination_h3_index, vehicle_type, gender_restriction, scheduled_pickup_at)
  WHERE is_advance = TRUE AND status = 'SCHEDULED' AND deleted_at IS NULL;

-- Rides ---------------------------------------------------------------------

CREATE INDEX idx_rides_user ON public.rides (user_id, created_at DESC);
CREATE INDEX idx_rides_user_status ON public.rides (user_id, status)
  WHERE status IN ('PENDING', 'MATCHED', 'IN_PROGRESS');
CREATE INDEX idx_rides_pool ON public.rides (pool_id) WHERE pool_id IS NOT NULL;
CREATE INDEX idx_rides_pickup_h3 ON public.rides (pickup_h3_index, status);
CREATE INDEX idx_rides_dropoff_h3 ON public.rides (dropoff_h3_index, status);
CREATE INDEX idx_rides_matching ON public.rides (dropoff_h3_index, vehicle_type, gender_restriction, status)
  WHERE status = 'CREATING_POOL';
CREATE INDEX idx_rides_pickup ON public.rides USING GIST (pickup_location);
CREATE INDEX idx_rides_dropoff ON public.rides USING GIST (dropoff_location);
CREATE INDEX idx_rides_advance_pending ON public.rides (scheduled_pickup_at)
  WHERE booking_type = 'ADVANCE' AND status NOT IN ('COMPLETED', 'CANCELLED');

-- Pool members --------------------------------------------------------------

CREATE INDEX idx_pool_members_active ON public.pool_members (pool_id, user_id) WHERE left_at IS NULL;
CREATE INDEX idx_pool_members_user ON public.pool_members (user_id);

-- Vehicle locations ---------------------------------------------------------

-- One live row per vehicle, which is what makes the upsert in
-- update_vehicle_location() safe.
CREATE UNIQUE INDEX idx_vehicle_loc_vehicle_unique ON public.vehicle_locations (vehicle_id);
CREATE INDEX idx_vehicle_loc_h3_res8 ON public.vehicle_locations (h3_index_res8) WHERE is_active = TRUE;
CREATE INDEX idx_vehicle_loc_h3_res9 ON public.vehicle_locations (h3_index_res9) WHERE is_active = TRUE;
CREATE INDEX idx_vehicle_loc_available ON public.vehicle_locations (is_available, h3_index_res8) WHERE is_active = TRUE;
CREATE INDEX idx_vehicle_loc_geo ON public.vehicle_locations USING GIST (location) WHERE is_active = TRUE;
CREATE INDEX idx_vehicle_loc_time ON public.vehicle_locations USING BRIN (recorded_at);

-- Payments and promos -------------------------------------------------------

CREATE INDEX idx_payments_user ON public.payments (user_id, created_at DESC);
CREATE INDEX idx_payments_ride_status ON public.payments (ride_id, status);
-- Enforces payment idempotency where a key was supplied.
CREATE UNIQUE INDEX idx_payments_idempotency ON public.payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_user_promo_user ON public.user_promo_usage (user_id);
CREATE INDEX idx_promise_money_user ON public.promise_money_transactions (user_id, created_at DESC);

-- Driver economics ----------------------------------------------------------

CREATE INDEX idx_driver_sessions_driver ON public.driver_sessions (driver_id);
CREATE INDEX idx_driver_sessions_status ON public.driver_sessions (status) WHERE status = 'ONLINE';
CREATE INDEX idx_driver_sessions_active ON public.driver_sessions (driver_id, status) WHERE status IN ('ONLINE', 'BUSY');
CREATE INDEX idx_driver_earnings_status ON public.driver_earnings (driver_id, payment_status);
CREATE INDEX idx_driver_earnings_date ON public.driver_earnings (created_at);
CREATE INDEX idx_driver_daily_stats_date ON public.driver_daily_stats (date DESC);

-- Messaging -----------------------------------------------------------------

CREATE INDEX idx_messages_conv ON public.messages (conversation_id, created_at DESC);
CREATE INDEX idx_conv_participants_user ON public.conversation_participants (user_id);
CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read) WHERE is_read = FALSE;

-- Operations ----------------------------------------------------------------

CREATE INDEX idx_ratings_rated ON public.ratings (rated_id);
CREATE INDEX idx_user_cancellations_recent ON public.user_cancellations (user_id, cancelled_at DESC);
CREATE INDEX idx_user_cancellations_deliberate ON public.user_cancellations (user_id, is_deliberate) WHERE is_deliberate = TRUE;
CREATE INDEX idx_cooldown_periods_active ON public.cooldown_periods (user_id, ends_at);
CREATE INDEX idx_audit_logs_user ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_time ON public.audit_logs USING BRIN (created_at);
CREATE INDEX idx_offline_actions_user_status ON public.offline_actions (user_id, status);
CREATE INDEX idx_offline_actions_created ON public.offline_actions (created_at);
CREATE INDEX idx_sync_logs_user_id ON public.sync_logs (user_id);
CREATE INDEX idx_sync_logs_synced_at ON public.sync_logs (synced_at);
