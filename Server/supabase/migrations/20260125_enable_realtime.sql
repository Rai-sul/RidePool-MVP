-- Enable Realtime for tables that need live updates
-- This migration enables Supabase Realtime for pool, messaging, and notification tables

-- Enable Realtime for pools table (co-rider status, driver assignment)
ALTER PUBLICATION supabase_realtime ADD TABLE public.pools;

-- Enable Realtime for pool_members table (new riders joining/leaving)
ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_members;

-- Enable Realtime for messages table (new chat messages)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable Realtime for conversations table (new conversations, last message updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Enable Realtime for conversation_participants table (read status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

-- Enable Realtime for notifications table (push notifications, alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable Realtime for rides table (ride status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;

-- Enable Realtime for vehicle_locations table (live driver tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_locations;

-- =====================================================
-- FIX RLS POLICIES FOR POOL MEMBERS
-- =====================================================
-- The existing policy only allows drivers/creators to see pool members.
-- Pool members should be able to see other members in the same pool.

-- Drop the restrictive policy
DROP POLICY IF EXISTS p_pool_members_pool_read ON public.pool_members;

-- Create a new policy that allows pool members to see all members in pools they belong to
CREATE POLICY p_pool_members_same_pool ON public.pool_members FOR SELECT USING (
  -- User can see all members in any pool they are part of
  EXISTS (
    SELECT 1 FROM pool_members my_membership 
    WHERE my_membership.pool_id = pool_members.pool_id 
    AND my_membership.user_id = auth.uid()
  )
  OR
  -- Drivers and creators can also see members
  EXISTS (
    SELECT 1 FROM pools 
    WHERE pools.id = pool_members.pool_id 
    AND (pools.driver_id = auth.uid() OR pools.creator_user_id = auth.uid())
  )
);

-- =====================================================
-- FIX RLS POLICIES FOR MESSAGES
-- =====================================================
-- Ensure pool members can see messages in pool conversations

-- Add policy for pool members to access pool conversation messages
DROP POLICY IF EXISTS p_messages_pool ON public.messages;
CREATE POLICY p_messages_pool ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN pool_members pm ON pm.pool_id = c.pool_id
    WHERE c.id = messages.conversation_id
    AND pm.user_id = auth.uid()
    AND c.type = 'POOL'
  )
);

-- Allow pool members to send messages in pool conversations
DROP POLICY IF EXISTS p_messages_pool_write ON public.messages;
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

-- Note: After running this migration, you also need to ensure RLS policies allow
-- users to SELECT the rows they should receive realtime updates for.
-- The client-side Supabase SDK uses the anon key and respects RLS.
