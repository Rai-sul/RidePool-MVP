-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON public.audit_logs(created_at DESC);

-- Geo Zones Table (for geofencing)
CREATE TABLE IF NOT EXISTS public.geo_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('SERVICE_AREA', 'RESTRICTED', 'SURGE', 'HIGH_DEMAND', 'LOW_DEMAND')),
  polygon JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_zones_type ON public.geo_zones(type) WHERE is_active = TRUE;

-- Fraud Reports Table
CREATE TABLE IF NOT EXISTS public.fraud_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  suspect_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_reports_status ON public.fraud_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_reports_suspect ON public.fraud_reports(suspect_id);

-- Function to increment promo usage count atomically
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promo_codes
  SET usage_count = usage_count + 1
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql;

-- Add penalty_points to users if not exists
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS penalty_points INTEGER DEFAULT 0;

-- Add cancelled_at to rides if not exists
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Trigger to set cancelled_at when ride is cancelled
CREATE OR REPLACE FUNCTION set_ride_cancelled_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    NEW.cancelled_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ride_cancelled_at ON public.rides;
CREATE TRIGGER trigger_set_ride_cancelled_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION set_ride_cancelled_at();

-- RLS Policies for new tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_audit_logs_admin ON public.audit_logs 
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY p_audit_logs_own ON public.audit_logs 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY p_geo_zones_read ON public.geo_zones 
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY p_fraud_reports_reporter ON public.fraud_reports 
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY p_fraud_reports_insert ON public.fraud_reports 
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Add is_admin column to users if not exists
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for saved_places location lookups
CREATE INDEX IF NOT EXISTS idx_saved_places_location ON public.saved_places USING GIST (location);

-- Add unique constraint for wallet transactions reference
CREATE INDEX IF NOT EXISTS idx_wallet_txn_reference ON public.wallet_transactions(reference_type, reference_id);
