-- Add unique constraint on vehicle_id in vehicle_locations
-- This ensures only one location row per vehicle, enabling safe upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_loc_vehicle_unique ON public.vehicle_locations(vehicle_id);
