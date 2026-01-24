import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Pool, PoolMember } from '../types';
import { poolService } from '../services/pool.service';

interface PoolRealtimeState {
  pool: Pool | null;
  members: PoolMember[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface CoRiderInfo {
  userId: string;
  name: string;
  initial: string;
  joinedAt: string;
  pickupLocation?: { latitude: number; longitude: number; address?: string };
  dropoffLocation?: { latitude: number; longitude: number; address?: string };
}

// Extended pool member with user profile info from API
interface PoolMemberWithProfile extends PoolMember {
  user?: {
    id?: string;
    full_name?: string;
  };
  ride?: {
    pickup_lat: number;
    pickup_lng: number;
    pickup_address?: string;
    dropoff_lat: number;
    dropoff_lng: number;
    dropoff_address?: string;
  };
}

/**
 * Hook for real-time pool updates using Supabase Realtime
 * Subscribes to pool and pool_members changes for live updates
 */
export const usePoolRealtime = (poolId: string | null, currentUserId: string | null) => {
  const [state, setState] = useState<PoolRealtimeState>({
    pool: null,
    members: [],
    loading: false,
    error: null,
    lastUpdated: null,
  });

  // Fetch initial pool data
  const fetchPoolData = useCallback(async () => {
    if (!poolId) {
      console.log('[usePoolRealtime] No poolId provided, skipping fetch');
      return;
    }

    console.log(`[usePoolRealtime] Fetching pool data for: ${poolId}`);
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await poolService.getPoolById(poolId);
      
      if (response.success && response.data?.pool) {
        const pool = response.data.pool;
        console.log(`[usePoolRealtime] Pool fetched successfully: ${pool.id}, status: ${pool.status}, members: ${pool.pool_members?.length || 0}`);
        setState(prev => ({
          ...prev,
          pool,
          members: pool.pool_members || [],
          loading: false,
          lastUpdated: new Date(),
          error: null,
        }));
      } else {
        // API returned but without pool data
        const errorMessage = response.message || 'Pool not found';
        const isNotFound = errorMessage.toLowerCase().includes('not found');
        console.log(`[usePoolRealtime] Pool ${poolId} response issue: ${errorMessage}`);
        
        // Only set error if pool is genuinely not found
        if (isNotFound) {
          setState(prev => ({
            ...prev,
            pool: null,
            members: [],
            loading: false,
            error: 'This pool is no longer available',
          }));
        } else {
          // For other issues, keep existing pool data if available
          setState(prev => ({
            ...prev,
            loading: false,
            error: prev.pool ? null : errorMessage,
          }));
        }
      }
    } catch (err: any) {
      // Handle specific error cases gracefully
      const errorMessage = err.message || 'Failed to load pool';
      const isNotFound = errorMessage.toLowerCase().includes('not found');
      const isCancelled = errorMessage.toLowerCase().includes('cancelled');
      
      console.warn('[usePoolRealtime] Failed to fetch pool data:', errorMessage);
      
      if (isNotFound) {
        setState(prev => ({
          ...prev,
          pool: null,
          members: [],
          loading: false,
          error: 'This pool is no longer available',
        }));
      } else if (isCancelled) {
        setState(prev => ({
          ...prev,
          pool: null,
          members: [],
          loading: false,
          error: 'This pool was cancelled',
        }));
      } else {
        // For other errors (network, temporary issues), keep existing pool data if available
        setState(prev => ({
          ...prev,
          loading: false,
          // Only set error if we don't have pool data - otherwise the user is in a valid pool
          error: prev.pool ? null : errorMessage,
        }));
      }
    }
  }, [poolId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!poolId) return;

    // Initial fetch
    fetchPoolData();

    // Subscribe to pool changes
    const poolChannel = supabase
      .channel(`pool:${poolId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'pools',
          filter: `id=eq.${poolId}`,
        },
        (payload) => {
          console.log('Pool update received:', payload.eventType);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            setState(prev => ({
              ...prev,
              pool: { ...prev.pool, ...payload.new } as Pool,
              lastUpdated: new Date(),
            }));
          } else if (payload.eventType === 'DELETE') {
            setState(prev => ({
              ...prev,
              pool: null,
              error: 'Pool was cancelled',
            }));
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
          console.log('Pool member update received:', payload.eventType);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            // Refetch full pool data to get complete member info with user profiles and ride details
            // This ensures we have the joined user/ride data, not just the raw pool_members record
            console.log('[usePoolRealtime] New member joined, refetching pool data...');
            fetchPoolData();
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Refetch pool data when a member leaves to get updated fare and member list
            console.log('[usePoolRealtime] Member left, refetching pool data...');
            fetchPoolData();
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setState(prev => ({
              ...prev,
              members: prev.members.map(m => 
                m.id === (payload.new as PoolMember).id ? payload.new as PoolMember : m
              ),
              lastUpdated: new Date(),
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to pool updates');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Unsubscribing from pool updates');
      supabase.removeChannel(poolChannel);
    };
  }, [poolId, fetchPoolData]);

  // Derived state: co-riders (excluding current user)
  const coRiders: CoRiderInfo[] = state.members
    .filter(member => member.user_id !== currentUserId)
    .map((member, index) => {
      const memberWithProfile = member as PoolMemberWithProfile;
      const userName = memberWithProfile.user?.full_name || `Rider ${index + 1}`;
      const initial = userName.charAt(0).toUpperCase();
      
      return {
        userId: member.user_id,
        name: userName,
        initial,
        joinedAt: member.joined_at,
        pickupLocation: memberWithProfile.ride ? {
          latitude: memberWithProfile.ride.pickup_lat,
          longitude: memberWithProfile.ride.pickup_lng,
          address: memberWithProfile.ride.pickup_address,
        } : undefined,
        dropoffLocation: memberWithProfile.ride ? {
          latitude: memberWithProfile.ride.dropoff_lat,
          longitude: memberWithProfile.ride.dropoff_lng,
          address: memberWithProfile.ride.dropoff_address,
        } : undefined,
      };
    });

  // Derived state: has driver
  const hasDriver = !!state.pool?.driver_id;

  // Derived state: pool status
  const poolStatus = state.pool?.status || 'WAITING_FOR_RIDERS';

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  return {
    pool: state.pool,
    members: state.members,
    coRiders,
    hasDriver,
    poolStatus,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refresh,
  };
};
