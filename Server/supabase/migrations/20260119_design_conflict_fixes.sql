-- Migration: Design Conflict Fixes
-- Fixes issues identified in Section 9 of the audit report

-- 9.5 FIX: Promise Money Feature
-- Add promise money columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS promise_money_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS promise_money_deposited BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS promise_money_deposited_at TIMESTAMPTZ;

-- Promise money transaction history
CREATE TABLE IF NOT EXISTS public.promise_money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'DEDUCTION', 'REFUND')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reason TEXT,
  ride_id UUID REFERENCES rides(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promise_money_user ON promise_money_transactions(user_id, created_at DESC);

-- Function to deposit promise money
CREATE OR REPLACE FUNCTION public.deposit_promise_money(
  p_user_id UUID,
  p_amount DECIMAL DEFAULT 50.00
) RETURNS JSON AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'USER_NOT_FOUND');
  END IF;
  
  IF v_user.promise_money_deposited THEN
    RETURN json_build_object('success', false, 'reason', 'ALREADY_DEPOSITED');
  END IF;
  
  INSERT INTO promise_money_transactions (user_id, type, amount, balance_before, balance_after, reason)
  VALUES (p_user_id, 'DEPOSIT', p_amount, 0, p_amount, 'Initial deposit');
  
  UPDATE users 
  SET 
    promise_money_balance = p_amount,
    promise_money_deposited = TRUE,
    promise_money_deposited_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'balance', p_amount,
    'deposited_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct from promise money (on cancellation)
CREATE OR REPLACE FUNCTION public.deduct_promise_money(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reason TEXT,
  p_ride_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_new_balance DECIMAL;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'USER_NOT_FOUND');
  END IF;
  
  IF v_user.promise_money_balance < p_amount THEN
    v_new_balance := 0;
  ELSE
    v_new_balance := v_user.promise_money_balance - p_amount;
  END IF;
  
  INSERT INTO promise_money_transactions (user_id, type, amount, balance_before, balance_after, reason, ride_id)
  VALUES (p_user_id, 'DEDUCTION', p_amount, v_user.promise_money_balance, v_new_balance, p_reason, p_ride_id);
  
  UPDATE users SET promise_money_balance = v_new_balance WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'deducted', LEAST(p_amount, v_user.promise_money_balance),
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for promise money transactions
ALTER TABLE promise_money_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promise money transactions" ON promise_money_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.deposit_promise_money TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_promise_money TO service_role;
GRANT SELECT ON public.promise_money_transactions TO authenticated;
