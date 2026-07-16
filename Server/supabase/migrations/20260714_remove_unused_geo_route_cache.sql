-- Remove unused database-backed geo and route cache tables.
-- Runtime route caching uses the application cache layer, not these tables.

BEGIN;

DROP FUNCTION IF EXISTS public.get_cached_route(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_route_cache() CASCADE;
DROP FUNCTION IF EXISTS public.clean_expired_cache() CASCADE;

DROP TABLE IF EXISTS public.geo_zones CASCADE;
DROP TABLE IF EXISTS public.navigation_route_cache CASCADE;
DROP TABLE IF EXISTS public.route_cache CASCADE;

COMMIT;
