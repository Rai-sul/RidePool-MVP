-- Purpose: explicit EXECUTE grants on the callable functions.
--
-- Supabase already grants EXECUTE on new public functions to anon,
-- authenticated and service_role by default, so these statements do not
-- change the effective permissions on a Supabase project. They are kept
-- because they document intent: which functions a signed-in user may call
-- directly, and which belong to the backend alone.
--
-- Table-level grants are omitted for the same reason: the Supabase defaults
-- already cover every table in public, and access is controlled by the
-- row-level security policies in 20260921001100_row_level_security.sql.

-- Called by a signed-in user.
GRANT EXECUTE ON FUNCTION public.atomic_join_pool(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_accept_pool(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_leave_pool(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_confirm_advance_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_wallet_debit(uuid, numeric, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_wallet_credit(uuid, numeric, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_process_payment(uuid, uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deposit_promise_money(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vehicle_location(uuid, double precision, double precision, double precision, double precision, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vehicle_capacity(text) TO authenticated;

-- Backend only: gateway callbacks, the advance-booking dispatcher, and
-- penalty deductions must never be callable from a client.
GRANT EXECUTE ON FUNCTION public.complete_payment(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_payment(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_assign_advance_booking(uuid, uuid, uuid, timestamptz, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_promise_money(uuid, numeric, text, uuid) TO service_role;

GRANT SELECT ON public.promise_money_transactions TO authenticated;
