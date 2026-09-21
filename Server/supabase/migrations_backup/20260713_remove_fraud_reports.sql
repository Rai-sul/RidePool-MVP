-- Remove retired fraud reporting storage.
-- CASCADE removes dependent indexes, RLS policies, and constraints.

BEGIN;

DROP TABLE IF EXISTS public.fraud_reports CASCADE;

COMMIT;
