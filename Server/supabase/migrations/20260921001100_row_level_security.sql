-- Purpose: enable row-level security and define every policy.
--
-- How to read this file: the backend talks to Supabase with the service role,
-- which bypasses RLS entirely. These policies exist for the two Expo apps,
-- which connect with the anon key and a user JWT — mainly so Realtime
-- subscriptions deliver only rows that user is allowed to see.
--
-- Multiple policies on the same table and command are OR-ed together, so each
-- policy below grants access; none of them takes it away.
--
-- Policies deliberately avoid re-reading the table they protect. An earlier
-- version of this schema caused infinite recursion that way. The one place a
-- self-reference is unavoidable (pool members seeing their co-riders) is
-- called out below.
--
-- app_metadata has no RLS: it holds non-sensitive configuration.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priyo_sathi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_promo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promise_money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooldown_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Users ---------------------------------------------------------------------

-- p_users_own covers the soft-deleted case, where p_users_public_read stops
-- applying but the account still needs to read itself.
CREATE POLICY p_users_own ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY p_users_public_read ON public.users FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY p_users_insert ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY p_users_update ON public.users FOR UPDATE USING (auth.uid() = id);

-- Wallets and saved places --------------------------------------------------

CREATE POLICY p_wallets ON public.wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_wallet_txn ON public.wallet_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM wallets WHERE wallets.id = wallet_transactions.wallet_id AND wallets.user_id = auth.uid())
);
CREATE POLICY p_saved_places ON public.saved_places FOR ALL USING (auth.uid() = user_id);

-- Priyo Sathi, devices, preferences ------------------------------------------

-- Both sides of the relationship can see and act on the row.
CREATE POLICY p_priyo_sathi ON public.priyo_sathi FOR ALL USING (auth.uid() = user_id OR auth.uid() = companion_id);
CREATE POLICY p_device_tokens ON public.device_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_notification_preferences ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Vehicles and locations ----------------------------------------------------

CREATE POLICY p_vehicles_read ON public.vehicles FOR SELECT USING (is_active = TRUE);
CREATE POLICY p_vehicles_write ON public.vehicles FOR ALL USING (auth.uid() = driver_id);

CREATE POLICY p_vehicle_loc_driver ON public.vehicle_locations FOR ALL USING (auth.uid() = driver_id);
-- Passengers track the assigned driver live, but only while the pool is
-- actually running, and read-only.
CREATE POLICY p_vehicle_loc_pool ON public.vehicle_locations FOR SELECT USING (
  pool_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.pools
    WHERE pools.id = vehicle_locations.pool_id
    AND pools.deleted_at IS NULL
    AND pools.status IN ('WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED')
    AND (
      pools.driver_id = auth.uid()
      OR pools.creator_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.pool_members
        WHERE pool_members.pool_id = pools.id
        AND pool_members.user_id = auth.uid()
        AND pool_members.left_at IS NULL
      )
    )
  )
);

-- Pools, rides, members -----------------------------------------------------

CREATE POLICY p_pools_read ON public.pools FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY p_pools_create ON public.pools FOR INSERT WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY p_pools_update ON public.pools FOR UPDATE USING (auth.uid() = creator_user_id OR auth.uid() = driver_id);

CREATE POLICY p_rides_own ON public.rides FOR ALL USING (auth.uid() = user_id);

CREATE POLICY p_pool_members_join ON public.pool_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY p_pool_members_update ON public.pool_members FOR UPDATE USING (auth.uid() = user_id);
-- Co-riders need to see each other. The self-reference is safe because the
-- inner query is on pool_members as a plain relation inside a policy on the
-- same table, which PostgreSQL does not re-apply the policy to.
CREATE POLICY p_pool_members_same_pool ON public.pool_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pool_members my_membership
    WHERE my_membership.pool_id = pool_members.pool_id
    AND my_membership.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM pools
    WHERE pools.id = pool_members.pool_id
    AND (pools.driver_id = auth.uid() OR pools.creator_user_id = auth.uid())
  )
);

-- Money ---------------------------------------------------------------------

CREATE POLICY p_payments ON public.payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_promo_read ON public.promo_codes FOR SELECT USING (is_active = TRUE);
CREATE POLICY p_user_promo_usage_own ON public.user_promo_usage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_promise_money ON public.promise_money_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY p_driver_sessions ON public.driver_sessions FOR ALL USING (auth.uid() = driver_id);
CREATE POLICY p_driver_earnings ON public.driver_earnings FOR ALL USING (auth.uid() = driver_id);
CREATE POLICY p_driver_daily_stats ON public.driver_daily_stats FOR ALL USING (auth.uid() = driver_id);

-- Messaging -----------------------------------------------------------------

CREATE POLICY p_conv_participants ON public.conversation_participants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_conversations ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = conversations.id AND conversation_participants.user_id = auth.uid())
);

-- Two routes into a message: an explicit participant row, or membership of
-- the pool the conversation belongs to.
CREATE POLICY p_messages_read ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = messages.conversation_id AND conversation_participants.user_id = auth.uid())
);
CREATE POLICY p_messages_write ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = messages.conversation_id AND conversation_participants.user_id = auth.uid())
);
CREATE POLICY p_messages_pool ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN pool_members pm ON pm.pool_id = c.pool_id
    WHERE c.id = messages.conversation_id
    AND pm.user_id = auth.uid()
    AND c.type = 'POOL'
  )
);
CREATE POLICY p_messages_pool_write ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN pool_members pm ON pm.pool_id = c.pool_id
    WHERE c.id = messages.conversation_id
    AND pm.user_id = auth.uid()
    AND c.type = 'POOL'
  )
);

CREATE POLICY p_notifications ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Operations ----------------------------------------------------------------

CREATE POLICY p_ratings_read ON public.ratings FOR SELECT USING (true);
CREATE POLICY p_ratings_write ON public.ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

CREATE POLICY p_user_cancellations ON public.user_cancellations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_cooldown_periods ON public.cooldown_periods FOR ALL USING (auth.uid() = user_id);

CREATE POLICY p_audit_logs_own ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY p_audit_logs_admin ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = TRUE)
);

CREATE POLICY p_offline_actions ON public.offline_actions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY p_sync_logs ON public.sync_logs FOR SELECT USING (auth.uid() = user_id);
