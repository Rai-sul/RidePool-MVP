-- Allow active pool members to read their assigned pool driver's live vehicle location.
-- This supports passenger-side Supabase Realtime without granting write access.

DROP POLICY IF EXISTS p_vehicle_loc_pool ON public.vehicle_locations;

CREATE POLICY p_vehicle_loc_pool ON public.vehicle_locations FOR SELECT USING (
  pool_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.pools
    WHERE pools.id = vehicle_locations.pool_id
    AND pools.deleted_at IS NULL
    AND pools.status IN ('WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED')
    AND (
      pools.driver_id = auth.uid()
      OR pools.creator_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.pool_members
        WHERE pool_members.pool_id = pools.id
        AND pool_members.user_id = auth.uid()
        AND pool_members.left_at IS NULL
      )
    )
  )
);
