-- Add app_type column to device_tokens to distinguish between rider and driver app tokens
ALTER TABLE public.device_tokens
ADD COLUMN IF NOT EXISTS app_type VARCHAR(10) NOT NULL DEFAULT 'rider';

-- Add index for efficient driver token lookup
CREATE INDEX IF NOT EXISTS idx_device_tokens_app_type ON public.device_tokens(app_type);

COMMENT ON COLUMN public.device_tokens.app_type IS 'Identifies which app registered this token: rider or driver';
