import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { InteractionManager } from 'react-native';
import { supabase } from '../lib/supabase';
import { driverService } from '../services/driver.service';
import type { Pool } from '../types';

const POLLING_INTERVAL_FAST = 3000;   // When realtime is disconnected
const POLLING_INTERVAL_SLOW = 30000;  // Heartbeat when realtime is connected

interface PoolRealtimeState {
  pool: Pool | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isConnected: boolean;
  driverLocation: { lat: number; lng: number } | null;
}

/**
 * Hook for real-time pool updates in the DriverApp.
 * Subscribes to Supabase Realtime for pool & pool_members changes,
 * and tracks the driver's live location from the driver_locations table.
 */
export const usePoolRealtime = (poolId: string | null) => {
  const [state, setState] = useState<PoolRealtimeState>({
    pool: null,
    loading: false,
    error: null,
    lastUpdated: null,
    isConnected: false,
    driverLocation: null,
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poolIdRef = useRef<string | null>(null);
  const isConnectedRef = useRef(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    poolIdRef.current = poolId;
  }, [poolId]);

  // Helper to safely update state without blocking UI
  // Uses InteractionManager and startTransition to avoid navigation context errors
  const safeSetState = useCallback((updater: React.SetStateAction<PoolRealtimeState>) => {
    InteractionManager.runAfterInteractions(() => {
      startTransition(() => {
        setState(updater);
      });
    });
  }, []);

  const fetchPoolData = useCallback(async () => {
    if (!poolId) return;

    // Only show loading spinner on first fetch
    if (!hasFetchedRef.current) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      const response = await driverService.getActivePool();

      if (response.success && response.data) {
        const pool = (response.data as any).active_pool || response.data;
        if (pool && pool.id) {
          hasFetchedRef.current = true;
          console.log(`[usePoolRealtime] Pool fetched: status=${pool.status}, passengers=${pool.passengers?.length || 0}, current_passengers=${pool.current_passengers}`);
          safeSetState(prev => ({
            ...prev,
            pool,
            loading: false,
            lastUpdated: new Date(),
            error: null,
          }));
        } else {
          safeSetState(prev => ({
            ...prev,
            loading: false,
            error: prev.pool ? null : 'Pool not found',
          }));
        }
      } else {
        safeSetState(prev => ({
          ...prev,
          loading: false,
          error: prev.pool ? null : 'Pool not found',
        }));
      }
    } catch (err: any) {
      safeSetState(prev => ({
        ...prev,
        loading: false,
        error: prev.pool ? null : (err.message || 'Failed to load pool'),
      }));
    }
  }, [poolId, safeSetState]);

  const pollForUpdates = useCallback(async () => {
    const currentPoolId = poolIdRef.current;
    if (!currentPoolId) return;

    try {
      const response = await driverService.getActivePool();
      if (response.success && response.data) {
        // Server returns { data: { active_pool: { ... } } }
        const pool = (response.data as any).active_pool || response.data;
        if (!pool || !pool.id) return;

        safeSetState(prev => {
          const statusChanged = prev.pool?.status !== pool.status;
          const passengersChanged = (prev.pool?.passengers?.length || 0) !== (pool.passengers?.length || 0);
          // Also check current_passengers count for more reliable detection
          const currentPassengersChanged = prev.pool?.current_passengers !== pool.current_passengers;

          if (statusChanged || passengersChanged || currentPassengersChanged) {
            console.log(`[usePoolRealtime] Poll: changes detected — status=${pool.status}, passengers=${pool.passengers?.length || 0}, current=${pool.current_passengers}`);
            return {
              ...prev,
              pool,
              loading: false,
              lastUpdated: new Date(),
            };
          }
          if (prev.loading) {
            return { ...prev, loading: false };
          }
          return prev;
        });
      }
    } catch (err) {
      // Silently fail on polling errors
    }
  }, [safeSetState]);

  // Restart polling with the appropriate interval based on connection status
  const restartPolling = useCallback((connected: boolean) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    const interval = connected ? POLLING_INTERVAL_SLOW : POLLING_INTERVAL_FAST;
    console.log(`[usePoolRealtime] Polling interval: ${interval / 1000}s (realtime ${connected ? 'connected' : 'disconnected'})`);
    pollingRef.current = setInterval(pollForUpdates, interval);
  }, [pollForUpdates]);

  useEffect(() => {
    if (!poolId) return;

    fetchPoolData();

    const poolChannel = supabase
      .channel(`driver-pool-realtime:${poolId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pools',
          filter: `id=eq.${poolId}`,
        },
        (payload) => {
          console.log('[usePoolRealtime] Pool update received:', payload.eventType);
          if (payload.eventType === 'UPDATE' && payload.new) {
            fetchPoolData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pool_members',
          filter: `pool_id=eq.${poolId}`,
        },
        (payload) => {
          // This fires when a passenger joins or leaves (INSERT/DELETE on pool_members)
          console.log('[usePoolRealtime] Pool member change:', payload.eventType, payload.new || payload.old);
          fetchPoolData();
        }
      )
      .subscribe((status) => {
        console.log('[usePoolRealtime] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          safeSetState(prev => ({ ...prev, isConnected: true }));
          restartPolling(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[usePoolRealtime] Realtime failed, switching to fast polling');
          isConnectedRef.current = false;
          safeSetState(prev => ({ ...prev, isConnected: false }));
          restartPolling(false);
        }
      });

    channelRef.current = poolChannel;

    // Start with fast polling until realtime connects
    pollingRef.current = setInterval(pollForUpdates, POLLING_INTERVAL_FAST);

    return () => {
      console.log('[usePoolRealtime] Unsubscribing from pool updates');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [poolId, fetchPoolData, pollForUpdates, restartPolling, safeSetState]);

  const poolStatus = state.pool?.status || 'READY_TO_START';
  const passengers = state.pool?.passengers || [];

  const refresh = useCallback(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  return {
    pool: state.pool,
    passengers,
    poolStatus,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    isConnected: state.isConnected,
    refresh,
  };
};
