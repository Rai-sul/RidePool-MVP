-- Purpose: every foreign key in the schema, in one place.
--
-- Keeping them here rather than inline means the table migrations can be
-- read and reordered freely without breaking dependency order — by the time
-- this file runs, all 30 tables exist. It also makes the delete behaviour of
-- the whole schema reviewable on one screen.
--
-- The rule of thumb used throughout:
--   ON DELETE CASCADE   — the row is meaningless without its parent
--                         (a wallet without its user, a member without its pool)
--   ON DELETE SET NULL  — the row survives its parent
--                         (earnings outlive a deleted ride; a pool outlives
--                          the driver account that was assigned to it)
--   no action           — historical ledger rows that must never be orphaned
--                         silently (promise money, promo usage)
--
-- users.id -> auth.users(id) is declared inline in
-- 20260921000200_tables_identity.sql because it points outside this schema.

-- Identity ------------------------------------------------------------------

ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;

ALTER TABLE public.saved_places
  ADD CONSTRAINT saved_places_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.priyo_sathi
  ADD CONSTRAINT priyo_sathi_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT priyo_sathi_companion_id_fkey FOREIGN KEY (companion_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.device_tokens
  ADD CONSTRAINT device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Rides ---------------------------------------------------------------------

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.pools
  ADD CONSTRAINT pools_creator_user_id_fkey FOREIGN KEY (creator_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT pools_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT pools_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE public.rides
  ADD CONSTRAINT rides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT rides_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE SET NULL;

ALTER TABLE public.pool_members
  ADD CONSTRAINT pool_members_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE,
  ADD CONSTRAINT pool_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT pool_members_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id) ON DELETE CASCADE;

ALTER TABLE public.vehicle_locations
  ADD CONSTRAINT vehicle_locations_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE,
  ADD CONSTRAINT vehicle_locations_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT vehicle_locations_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE SET NULL;

-- Money ---------------------------------------------------------------------

ALTER TABLE public.payments
  ADD CONSTRAINT payments_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id) ON DELETE CASCADE,
  ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_promo_usage
  ADD CONSTRAINT user_promo_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT user_promo_usage_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  ADD CONSTRAINT user_promo_usage_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id);

ALTER TABLE public.promise_money_transactions
  ADD CONSTRAINT promise_money_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT promise_money_transactions_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id);

ALTER TABLE public.driver_sessions
  ADD CONSTRAINT driver_sessions_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT driver_sessions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE public.driver_earnings
  ADD CONSTRAINT driver_earnings_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT driver_earnings_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id) ON DELETE SET NULL,
  ADD CONSTRAINT driver_earnings_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE SET NULL;

ALTER TABLE public.driver_daily_stats
  ADD CONSTRAINT driver_daily_stats_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Messaging -----------------------------------------------------------------

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE,
  -- Circular by nature: a conversation points at its newest message, and
  -- every message points back at its conversation.
  ADD CONSTRAINT fk_last_message FOREIGN KEY (last_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;

ALTER TABLE public.conversation_participants
  ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Operations ----------------------------------------------------------------

ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id) ON DELETE CASCADE,
  ADD CONSTRAINT ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT ratings_rated_id_fkey FOREIGN KEY (rated_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_cancellations
  ADD CONSTRAINT user_cancellations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT user_cancellations_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id) ON DELETE SET NULL;

ALTER TABLE public.cooldown_periods
  ADD CONSTRAINT cooldown_periods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- The audit trail outlives the account it describes.
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.offline_actions
  ADD CONSTRAINT offline_actions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.sync_logs
  ADD CONSTRAINT sync_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
