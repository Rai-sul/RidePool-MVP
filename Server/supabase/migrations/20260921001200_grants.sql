-- Purpose: explicit EXECUTE grants on the callable functions.
--
-- Supabase already grants EXECUTE on new public functions to anon,
-- authenticated and service_role by default, so these statements do not
-- change the effective permissions on a Supabase project. They are kept
-- because they document intent: which functions a signed-in user may call
-- directly, and which belong to the backend alone.
--
-- Table-level grants are omitted for the same reason — Supabase's defaults
-- already cover every table in public, and access is controlled by the
-- row-level security policies in 20260921001100_row_level_security.sql.

-- Called by a signed-in user.
GRANT EXECUTE ON FUNCTION public.atomic_join_pool TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_accept_pool TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_leave_pool TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_confirm_advance_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_wallet_debit TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_wallet_credit TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_process_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.deposit_promise_money TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vehicle_location TO authenticated;
GRANT EXECUTE ON FUNCTION public.vehicle_capacity TO authenticated;

-- Backend only: gateway callbacks, the advance-booking dispatcher, and
-- penalty deductions must never be callable from a client.
GRANT EXECUTE ON FUNCTION public.complete_payment TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_payment TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_assign_advance_booking TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_promise_money TO service_role;

GRANT SELECT ON public.promise_money_transactions TO authenticated;
