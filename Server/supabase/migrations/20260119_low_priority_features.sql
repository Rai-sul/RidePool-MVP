-- Migration: Low Priority Enhancement Features
-- Date: 2026-01-19
-- Features: Heat Maps, Shift Scheduling, Multi-language, Offline Mode, Voice Navigation

-- ============================================
-- DRIVER SHIFTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.driver_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_shift_times CHECK (start_time < end_time)
);

CREATE INDEX idx_driver_shifts_driver_id ON public.driver_shifts(driver_id);
CREATE INDEX idx_driver_shifts_day_status ON public.driver_shifts(day_of_week, status);

-- ============================================
-- OFFLINE ACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.offline_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'UPDATE_LOCATION', 'CANCEL_RIDE', 'RATE_RIDE', 'SEND_MESSAGE',
        'UPDATE_PROFILE', 'TRIGGER_SOS', 'MARK_PICKUP', 'MARK_DROPOFF'
    )),
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCED', 'FAILED', 'CONFLICT')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

CREATE INDEX idx_offline_actions_user_status ON public.offline_actions(user_id, status);
CREATE INDEX idx_offline_actions_created ON public.offline_actions(created_at);

-- ============================================
-- SYNC LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    synced_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    conflict_count INTEGER DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_user_id ON public.sync_logs(user_id);
CREATE INDEX idx_sync_logs_synced_at ON public.sync_logs(synced_at);

-- ============================================
-- DEMAND HEATMAP CACHE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.demand_heatmap_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(20) NOT NULL,
    h3_resolution INTEGER NOT NULL,
    demand_count INTEGER DEFAULT 0,
    surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
    demand_level VARCHAR(20) DEFAULT 'LOW' CHECK (demand_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
    UNIQUE(h3_index, h3_resolution)
);

CREATE INDEX idx_heatmap_cache_h3 ON public.demand_heatmap_cache(h3_index);
CREATE INDEX idx_heatmap_cache_expires ON public.demand_heatmap_cache(expires_at);

-- ============================================
-- USER LANGUAGE PREFERENCE COLUMN
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'preferred_language'
    ) THEN
        ALTER TABLE public.users ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'en';
    END IF;
END $$;

-- ============================================
-- NAVIGATION ROUTES CACHE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.navigation_route_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_h3 VARCHAR(20) NOT NULL,
    destination_h3 VARCHAR(20) NOT NULL,
    route_data JSONB NOT NULL,
    total_distance_m INTEGER,
    total_duration_s INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
    UNIQUE(origin_h3, destination_h3)
);

CREATE INDEX idx_route_cache_origin_dest ON public.navigation_route_cache(origin_h3, destination_h3);
CREATE INDEX idx_route_cache_expires ON public.navigation_route_cache(expires_at);

-- ============================================
-- HISTORICAL DEMAND PATTERNS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.historical_demand_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(20) NOT NULL,
    hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    avg_demand DECIMAL(10,2) DEFAULT 0,
    peak_demand INTEGER DEFAULT 0,
    sample_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(h3_index, hour_of_day, day_of_week)
);

CREATE INDEX idx_demand_patterns_h3 ON public.historical_demand_patterns(h3_index);
CREATE INDEX idx_demand_patterns_time ON public.historical_demand_patterns(hour_of_day, day_of_week);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update demand patterns from completed rides
CREATE OR REPLACE FUNCTION update_demand_patterns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        INSERT INTO public.historical_demand_patterns (
            h3_index, hour_of_day, day_of_week, avg_demand, peak_demand, sample_count
        )
        VALUES (
            NEW.pickup_h3_index,
            EXTRACT(HOUR FROM NEW.created_at)::INTEGER,
            EXTRACT(DOW FROM NEW.created_at)::INTEGER,
            1,
            1,
            1
        )
        ON CONFLICT (h3_index, hour_of_day, day_of_week)
        DO UPDATE SET
            avg_demand = (historical_demand_patterns.avg_demand * historical_demand_patterns.sample_count + 1) / (historical_demand_patterns.sample_count + 1),
            peak_demand = GREATEST(historical_demand_patterns.peak_demand, 1),
            sample_count = historical_demand_patterns.sample_count + 1,
            last_updated = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_demand_patterns ON public.rides;
CREATE TRIGGER trigger_update_demand_patterns
    AFTER UPDATE ON public.rides
    FOR EACH ROW
    EXECUTE FUNCTION update_demand_patterns();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM public.demand_heatmap_cache WHERE expires_at < NOW();
    DELETE FROM public.navigation_route_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to auto-complete shifts
CREATE OR REPLACE FUNCTION auto_complete_expired_shifts()
RETURNS void AS $$
DECLARE
    current_dow INTEGER := EXTRACT(DOW FROM NOW())::INTEGER;
    current_time TIME := NOW()::TIME;
BEGIN
    UPDATE public.driver_shifts
    SET status = 'COMPLETED', updated_at = NOW()
    WHERE status = 'ACTIVE'
    AND (
        (day_of_week < current_dow)
        OR (day_of_week = current_dow AND end_time < current_time)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.driver_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Driver shifts: Drivers can manage their own shifts
CREATE POLICY driver_shifts_owner_policy ON public.driver_shifts
    FOR ALL
    USING (driver_id = auth.uid())
    WITH CHECK (driver_id = auth.uid());

-- Offline actions: Users can manage their own offline actions
CREATE POLICY offline_actions_owner_policy ON public.offline_actions
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Sync logs: Users can view their own sync logs
CREATE POLICY sync_logs_owner_policy ON public.sync_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.driver_shifts IS 'Driver shift scheduling for weekly recurring schedules';
COMMENT ON TABLE public.offline_actions IS 'Queued actions performed offline for later synchronization';
COMMENT ON TABLE public.sync_logs IS 'Log of sync attempts for offline actions';
COMMENT ON TABLE public.demand_heatmap_cache IS 'Cached demand heatmap data for driver recommendations';
COMMENT ON TABLE public.navigation_route_cache IS 'Cached navigation routes to reduce API calls';
COMMENT ON TABLE public.historical_demand_patterns IS 'Historical demand patterns by location and time';
COMMENT ON COLUMN public.users.preferred_language IS 'User preferred language code (en, bn)';
