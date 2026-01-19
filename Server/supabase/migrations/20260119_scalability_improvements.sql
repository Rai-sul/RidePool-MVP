-- Migration: Scalability Improvements
-- Optimized queries, caching support tables, and performance indexes

-- 7.5 FIX: Optimized Pool Search Query with Batch Loading
-- Create a function that performs batch pool lookup with all related data
CREATE OR REPLACE FUNCTION public.search_pools_optimized(
  p_destination_h3_cells TEXT[],
  p_gender_preference TEXT DEFAULT 'ANY',
  p_max_results INTEGER DEFAULT 20
) RETURNS TABLE (
  pool_id UUID,
  creator_user_id UUID,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  destination_h3_index TEXT,
  current_passengers INTEGER,
  max_passengers INTEGER,
  status TEXT,
  gender_restriction TEXT,
  driver_id UUID,
  vehicle_id UUID,
  created_at TIMESTAMPTZ,
  members JSONB,
  creator_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS pool_id,
    p.creator_user_id,
    p.destination_lat,
    p.destination_lng,
    p.destination_h3_index,
    p.current_passengers,
    p.max_passengers,
    p.status,
    p.gender_restriction,
    p.driver_id,
    p.vehicle_id,
    p.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', pm.user_id,
          'joined_at', pm.joined_at,
          'join_score', pm.join_score
        ))
        FROM pool_members pm
        WHERE pm.pool_id = p.id AND pm.left_at IS NULL
      ),
      '[]'::jsonb
    ) AS members,
    (
      SELECT jsonb_build_object(
        'id', u.id,
        'full_name', u.full_name,
        'gender', u.gender,
        'rating', u.average_rating
      )
      FROM users u WHERE u.id = p.creator_user_id
    ) AS creator_info
  FROM pools p
  WHERE 
    p.destination_h3_index = ANY(p_destination_h3_cells)
    AND p.status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER')
    AND p.current_passengers < p.max_passengers
    AND (
      p_gender_preference = 'ANY' 
      OR p.gender_restriction = 'ANY'
      OR p.gender_restriction = p_gender_preference
    )
  ORDER BY p.created_at DESC
  LIMIT p_max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pools_h3_status ON pools(destination_h3_index, status) 
  WHERE status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER');

CREATE INDEX IF NOT EXISTS idx_pools_driver_active ON pools(driver_id, status) 
  WHERE driver_id IS NOT NULL AND status IN ('DRIVER_ASSIGNED', 'STARTED');

CREATE INDEX IF NOT EXISTS idx_pool_members_active ON pool_members(pool_id, user_id) 
  WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rides_user_status ON rides(user_id, status) 
  WHERE status IN ('PENDING', 'MATCHED', 'IN_PROGRESS');

CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle ON vehicle_locations(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_payments_ride_status ON payments(ride_id, status);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id, created_at DESC);

-- Route cache table for precomputed routes
CREATE TABLE IF NOT EXISTS public.route_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_h3 TEXT NOT NULL,
  destination_h3 TEXT NOT NULL,
  distance_meters INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  polyline TEXT,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(origin_h3, destination_h3)
);

CREATE INDEX IF NOT EXISTS idx_route_cache_lookup ON route_cache(origin_h3, destination_h3);
CREATE INDEX IF NOT EXISTS idx_route_cache_expiry ON route_cache(expires_at);

-- Function to get or create cached route
CREATE OR REPLACE FUNCTION public.get_cached_route(
  p_origin_h3 TEXT,
  p_destination_h3 TEXT
) RETURNS TABLE (
  distance_meters INTEGER,
  duration_seconds INTEGER,
  polyline TEXT,
  from_cache BOOLEAN
) AS $$
DECLARE
  v_route RECORD;
BEGIN
  SELECT rc.distance_meters, rc.duration_seconds, rc.polyline
  INTO v_route
  FROM route_cache rc
  WHERE rc.origin_h3 = p_origin_h3 
    AND rc.destination_h3 = p_destination_h3
    AND rc.expires_at > NOW();
  
  IF FOUND THEN
    RETURN QUERY SELECT v_route.distance_meters, v_route.duration_seconds, v_route.polyline, TRUE;
  ELSE
    RETURN QUERY SELECT NULL::INTEGER, NULL::INTEGER, NULL::TEXT, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_route_cache() RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM route_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Demand aggregation for heatmap (precomputed)
CREATE TABLE IF NOT EXISTS public.demand_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  h3_cell TEXT NOT NULL,
  resolution INTEGER NOT NULL DEFAULT 7,
  request_count INTEGER NOT NULL DEFAULT 0,
  snapshot_time TIMESTAMPTZ DEFAULT NOW(),
  time_bucket TIMESTAMPTZ NOT NULL,
  UNIQUE(h3_cell, time_bucket)
);

CREATE INDEX IF NOT EXISTS idx_demand_snapshot_time ON demand_snapshot(time_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_demand_snapshot_cell ON demand_snapshot(h3_cell);

-- Function to record demand (called on ride request)
CREATE OR REPLACE FUNCTION public.record_demand(
  p_h3_cell TEXT,
  p_resolution INTEGER DEFAULT 7
) RETURNS VOID AS $$
DECLARE
  v_bucket TIMESTAMPTZ;
BEGIN
  v_bucket := date_trunc('hour', NOW());
  
  INSERT INTO demand_snapshot (h3_cell, resolution, request_count, time_bucket)
  VALUES (p_h3_cell, p_resolution, 1, v_bucket)
  ON CONFLICT (h3_cell, time_bucket)
  DO UPDATE SET request_count = demand_snapshot.request_count + 1, snapshot_time = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.search_pools_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_route TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_demand TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.route_cache TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.demand_snapshot TO service_role;
