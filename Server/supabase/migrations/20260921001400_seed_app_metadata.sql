-- Purpose: seed the app_metadata configuration rows.
--
-- These describe the H3 grid the matcher uses. The backend reads its own
-- values from config/env.ts (config.h3); these rows are the published,
-- client-readable copy, which is why is_public is TRUE.
--
--   resolution 7  ~5.2 km  destination area matching
--   resolution 8  ~461 m   driver search radius
--   resolution 9  ~174 m   pickup point matching
--
-- ON CONFLICT keeps this file safe to re-run without overwriting values that
-- were tuned in place.

INSERT INTO public.app_metadata (key, value, description, category, is_public) VALUES
  ('h3_resolution', '{"pickup": 9, "destination": 7, "driver_search": 8}', 'H3 resolution levels for different purposes', 'h3_config', TRUE),
  ('h3_search_ring', '{"pickup": 1, "destination": 2, "driver": 2}', 'H3 k-ring search radius', 'h3_config', TRUE)
ON CONFLICT (key) DO NOTHING;
