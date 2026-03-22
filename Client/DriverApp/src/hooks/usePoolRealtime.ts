import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { InteractionManager } from 'react-native';
import { supabase } from '../lib/supabase';
import { driverService } from '../services/driver.service';
import type { Pool } from '../types';

const POLLING_INTERVAL_FAST = 3000;   // When realtime is disconnected
const POLLING_INTERVAL_SLOW = 30000;  // Heartbeat when realtime is connected

// Debounce delay to prevent rapid state updates from multiple realtime events
// Using 50ms for snappy UI updates while still preventing rapid-fire events
const DEBOUNCE_DELAY_MS = 50;

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
  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdateRef = useRef<React.SetStateAction<PoolRealtimeState> | null>(null);
  // Refs to always call the latest functions (avoids stale closures in realtime callbacks)
  const fetchPoolDataRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const pollForUpdatesRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const restartPollingRef = useRef<(connected: boolean) => void>(() => {});

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    poolIdRef.current = poolId;
  }, [poolId]);

  // Helper to safely update state without blocking UI
  // Uses InteractionManager, startTransition, and debouncing to avoid navigation context errors
  const safeSetState = useCallback((updater: React.SetStateAction<PoolRealtimeState>) => {
    // Don't update if unmounted
    if (!isMountedRef.current) return;
    
    // Store the pending update for debouncing
    pendingUpdateRef.current = updater;
    
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce to prevent rapid state updates
    debounceTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      const updateToApply = pendingUpdateRef.current;
      if (!updateToApply) return;
      pendingUpdateRef.current = null;
      
      // Wait for any pending interactions to complete
      InteractionManager.runAfterInteractions(() => {
        if (!isMountedRef.current) return;
        
        // Use startTransition to mark this as a non-urgent update
        startTransition(() => {
          if (!isMountedRef.current) return;
          
          try {
            setState(updateToApply);
          } catch (err) {
            // Silently ignore context errors during concurrent renders
            console.warn('[usePoolRealtime] State update failed (likely context loss):', err);
          }
        });
      });
    }, DEBOUNCE_DELAY_MS);
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

  // Keep the ref in sync so realtime callbacks always use the latest version
  useEffect(() => {
    fetchPoolDataRef.current = fetchPoolData;
  }, [fetchPoolData]);

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
          
          // Check if passenger user_ids have changed (handles cancellations where count might be same)
          const prevUserIds = new Set((prev.pool?.passengers || []).map((p: any) => p.user_id));
          const newUserIds = new Set((pool.passengers || []).map((p: any) => p.user_id));
          const membershipChanged = 
            prevUserIds.size !== newUserIds.size ||
            [...prevUserIds].some(id => !newUserIds.has(id)) ||
            [...newUserIds].some(id => !prevUserIds.has(id));

          if (statusChanged || passengersChanged || currentPassengersChanged || membershipChanged) {
            console.log(`[usePoolRealtime] Poll: changes detected — status=${pool.status}, passengers=${pool.passengers?.length || 0}, current=${pool.current_passengers}, membershipChanged=${membershipChanged}`);
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
    } catch {
      // Silently fail on polling errors
    }
  }, [safeSetState]);

  // Keep pollForUpdates ref in sync
  useEffect(() => {
    pollForUpdatesRef.current = pollForUpdates;
  }, [pollForUpdates]);

  // Restart polling with the appropriate interval based on connection status
  const restartPolling = useCallback((connected: boolean) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    const interval = connected ? POLLING_INTERVAL_SLOW : POLLING_INTERVAL_FAST;
    console.log(`[usePoolRealtime] Polling interval: ${interval / 1000}s (realtime ${connected ? 'connected' : 'disconnected'})`);
    // Use ref to always get latest pollForUpdates
    pollingRef.current = setInterval(() => pollForUpdatesRef.current(), interval);
  }, []);

  // Keep restartPolling ref in sync
  useEffect(() => {
    restartPollingRef.current = restartPolling;
  }, [restartPolling]);

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
            // Use ref to always call the latest version (avoids stale closure)
            fetchPoolDataRef.current();
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
          // This fires when a passenger joins/leaves/updates (INSERT/UPDATE/DELETE on pool_members)
          // UPDATE is triggered when left_at is set (passenger cancels)
          console.log('[usePoolRealtime] Pool member change:', payload.eventType, payload.new || payload.old);
          // Use ref to always call the latest version (avoids stale closure)
          fetchPoolDataRef.current();
        }
      )
      .subscribe((status) => {
        console.log('[usePoolRealtime] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          safeSetState(prev => ({ ...prev, isConnected: true }));
          // Use ref to always call latest restartPolling
          restartPollingRef.current(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[usePoolRealtime] Realtime failed, switching to fast polling');
          isConnectedRef.current = false;
          safeSetState(prev => ({ ...prev, isConnected: false }));
          // Use ref to always call latest restartPolling
          restartPollingRef.current(false);
        }
      });

    channelRef.current = poolChannel;

    // Start with fast polling until realtime connects
    pollingRef.current = setInterval(() => pollForUpdatesRef.current(), POLLING_INTERVAL_FAST);

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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // Only re-subscribe when poolId changes - callbacks use refs to avoid stale closures
  }, [poolId, fetchPoolData, safeSetState]);

  const poolStatus = state.pool?.status || 'READY_TO_START';
  const passengers = state.pool?.passengers || [];

  const refresh = useCallback(() => {
    fetchPoolDataRef.current();
  }, []);

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
