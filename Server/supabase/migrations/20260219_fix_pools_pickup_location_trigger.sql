-- Fix: calc_geography() was not populating pickup_location for pools.
-- The GIST index idx_pools_pickup existed but was always NULL.

CREATE OR REPLACE FUNCTION calc_geography()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'users' THEN
    IF NEW.driver_priority_lat IS NOT NULL AND NEW.driver_priority_lng IS NOT NULL THEN
      NEW.driver_priority_location = ST_SetSRID(ST_MakePoint(NEW.driver_priority_lng, NEW.driver_priority_lat), 4326)::geography;
    END IF;
  ELSIF TG_TABLE_NAME = 'saved_places' THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'vehicle_locations' THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'pools' THEN
    NEW.pickup_location = ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
    NEW.destination_location = ST_SetSRID(ST_MakePoint(NEW.destination_lng, NEW.destination_lat), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'rides' THEN
    NEW.pickup_location = ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
    NEW.dropoff_location = ST_SetSRID(ST_MakePoint(NEW.dropoff_lng, NEW.dropoff_lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing pools that have NULL pickup_location
UPDATE public.pools
SET pickup_location = ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326)::geography
WHERE pickup_location IS NULL
  AND pickup_lat IS NOT NULL
  AND pickup_lng IS NOT NULL;
