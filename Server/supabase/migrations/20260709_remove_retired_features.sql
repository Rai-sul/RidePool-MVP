-- Remove retired feature surfaces:
-- i18n/language switching, demand heatmaps, shifts, safety/SOS,
-- emergency contacts/incidents/logs, and live trip sharing.

BEGIN;

-- Demand heatmap objects.
DROP TRIGGER IF EXISTS trigger_update_demand_patterns ON public.rides;
DROP FUNCTION IF EXISTS public.update_demand_patterns() CASCADE;
DROP FUNCTION IF EXISTS public.record_demand(TEXT, INTEGER) CASCADE;
DROP TABLE IF EXISTS public.historical_demand_patterns CASCADE;
DROP TABLE IF EXISTS public.demand_heatmap_cache CASCADE;
DROP TABLE IF EXISTS public.demand_snapshot CASCADE;

-- Driver shift scheduling.
DROP FUNCTION IF EXISTS public.auto_complete_expired_shifts() CASCADE;
DROP TABLE IF EXISTS public.driver_shifts CASCADE;

-- Safety, SOS, emergency contacts/logs, and live trip sharing.
DROP TABLE IF EXISTS public.emergency_service_logs CASCADE;
DROP TABLE IF EXISTS public.emergency_notifications CASCADE;
DROP TABLE IF EXISTS public.safety_incidents CASCADE;
DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
DROP TABLE IF EXISTS public.ride_sharing CASCADE;

-- User language preference column belonged to the removed i18n feature.
ALTER TABLE public.users
  DROP COLUMN IF EXISTS preferred_language;

-- Remove offline SOS replay support while keeping other offline actions.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'offline_actions'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%TRIGGER_SOS%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.offline_actions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.offline_actions
  ADD CONSTRAINT offline_actions_action_type_check
  CHECK (action_type IN (
    'UPDATE_LOCATION',
    'CANCEL_RIDE',
    'RATE_RIDE',
    'SEND_MESSAGE',
    'UPDATE_PROFILE',
    'MARK_PICKUP',
    'MARK_DROPOFF'
  ));

-- Preserve navigation route cache cleanup; remove heatmap cache cleanup.
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM navigation_route_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMIT;
