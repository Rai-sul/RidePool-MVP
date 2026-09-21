-- Purpose: add tables to the supabase_realtime publication so the Expo apps
-- receive live updates over websockets.
--
-- Realtime respects row-level security: a client is pushed only the rows its
-- policies already allow it to SELECT. That is why this file runs after
-- 20260921001100_row_level_security.sql.
--
-- What each subscription is for:
--   pools                     co-rider count, driver assignment, status
--   pool_members              riders joining and leaving
--   rides                     ride status transitions
--   vehicle_locations         live driver tracking on the map
--   conversations / messages / conversation_participants   chat and read state
--   notifications             in-app alerts

ALTER PUBLICATION supabase_realtime ADD TABLE public.pools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
