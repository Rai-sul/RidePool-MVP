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
    if (!poolId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await poolService.getPoolById(poolId);
      
      if (response.success && response.data?.pool) {
        const pool = response.data.pool;
        setState(prev => ({
          ...prev,
          pool,
          members: pool.pool_members || [],
          loading: false,
          lastUpdated: new Date(),
        }));
      } else {
        throw new Error(response.message || 'Failed to fetch pool');
      }
    } catch (err: any) {
      console.error('Failed to fetch pool data:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load pool',
      }));
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
            setState(prev => ({
              ...prev,
              members: [...prev.members, payload.new as PoolMember],
              pool: prev.pool ? {
                ...prev.pool,
                current_passengers: (prev.pool.current_passengers || 0) + 1,
              } : null,
              lastUpdated: new Date(),
            }));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setState(prev => ({
              ...prev,
              members: prev.members.filter(m => m.id !== (payload.old as PoolMember).id),
              pool: prev.pool ? {
                ...prev.pool,
                current_passengers: Math.max(0, (prev.pool.current_passengers || 1) - 1),
              } : null,
              lastUpdated: new Date(),
            }));
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
    .map((member, index) => ({
      userId: member.user_id,
      name: `Rider ${index + 1}`,
      initial: `R${index + 1}`.charAt(0),
      joinedAt: member.joined_at,
    }));

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
