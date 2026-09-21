-- Purpose: operational tables — ratings, the cancellation-penalty system,
-- the audit trail, offline action replay, and app configuration.
--
-- user_cancellations and cooldown_periods together implement the penalty
-- rules: repeated deliberate cancellations put a rider into a cooldown.
--
-- Foreign keys live in 20260921000700_foreign_keys.sql.

CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL,
  rater_id UUID NOT NULL,
  rated_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ride_id, rater_id, rated_id)
);

CREATE TABLE public.user_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ride_id UUID,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancellation_time_seconds INTEGER NOT NULL,
  is_deliberate BOOLEAN NOT NULL DEFAULT FALSE,
  penalty_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.cooldown_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  reason VARCHAR(50) NOT NULL,
  penalty_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name VARCHAR(50),
  record_id UUID,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  old_data JSONB,
  new_data JSONB,
  details JSONB,
  changed_by UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.offline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'UPDATE_LOCATION',
    'CANCEL_RIDE',
    'RATE_RIDE',
    'SEND_MESSAGE',
    'UPDATE_PROFILE',
    'MARK_PICKUP',
    'MARK_DROPOFF'
  )),
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCED', 'FAILED', 'CONFLICT')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  synced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  conflict_count INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key/value application settings. Seeded in
-- 20260921001400_seed_app_metadata.sql. Row-level security is deliberately
-- NOT enabled here: the rows are non-sensitive configuration.
CREATE TABLE public.app_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.offline_actions IS 'Queued actions performed offline for later synchronization';
COMMENT ON TABLE public.sync_logs IS 'Log of sync attempts for offline actions';
