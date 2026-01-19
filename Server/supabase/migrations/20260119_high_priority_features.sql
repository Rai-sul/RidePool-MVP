-- Driver Daily Stats Table (for incentive/bonus system)
CREATE TABLE IF NOT EXISTS public.driver_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  trips_completed INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  bonus_earned DECIMAL(10,2) DEFAULT 0,
  peak_hours_trips INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, date)
);

CREATE INDEX IF NOT EXISTS idx_driver_daily_stats_driver_date ON public.driver_daily_stats(driver_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_daily_stats_date ON public.driver_daily_stats(date DESC);

-- Device Tokens Table (for FCM push notifications)
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON public.device_tokens(user_id) WHERE is_active = TRUE;

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  type_preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.notification_preferences(user_id);

-- Add read_at to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Add last_message fields to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS last_message_id UUID REFERENCES public.messages(id),
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Add tags to ratings table
ALTER TABLE public.ratings
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add referral_code to users if not exists
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE;

-- Generate referral codes for existing users
UPDATE public.users 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
WHERE referral_code IS NULL;

-- Function to generate referral code on new user
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_referral_code ON public.users;
CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Function to update user average rating
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg DECIMAL(3,2);
  v_count INTEGER;
BEGIN
  SELECT AVG(rating), COUNT(*) INTO v_avg, v_count
  FROM public.ratings
  WHERE rated_id = NEW.rated_id;
  
  UPDATE public.users
  SET average_rating = v_avg,
      total_ratings = v_count
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_rating ON public.ratings;
CREATE TRIGGER trigger_update_user_rating
  AFTER INSERT OR UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- RLS Policies
ALTER TABLE public.driver_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_driver_daily_stats ON public.driver_daily_stats 
  FOR ALL USING (auth.uid() = driver_id);

CREATE POLICY p_device_tokens ON public.device_tokens 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY p_notification_preferences ON public.notification_preferences 
  FOR ALL USING (auth.uid() = user_id);

-- Add fare breakdown fields to rides
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS base_fare DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS distance_fare DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS time_fare DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pool_discount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS full_pool_bonus DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS platform_surcharge DECIMAL(10,2) DEFAULT 10,
ADD COLUMN IF NOT EXISTS displayed_fare DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS actual_charge DECIMAL(10,2);

-- Add surcharge tracking to pools
ALTER TABLE public.pools
ADD COLUMN IF NOT EXISTS total_surcharge_collected DECIMAL(10,2) DEFAULT 0;
