import { useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react';
import { InteractionManager } from 'react-native';
import { supabase } from '../lib/supabase';
import { Pool, PoolMember } from '../types';
import { poolService, SearchTiming } from '../services/pool.service';

// Polling intervals
const POLLING_INTERVAL_FAST = 3000;   // When realtime is disconnected
const POLLING_INTERVAL_SLOW = 30000;  // Heartbeat when realtime is connected

interface PoolRealtimeState {
  pool: Pool | null;
  members: PoolMember[];
  searchTiming: SearchTiming | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  unreadMessageCounts: Record<string, number>; // userId -> unread count
  isConnected: boolean;
}

interface CoRiderInfo {
  userId: string;
  name: string;
  initial: string;
  joinedAt: string;
  pickupLocation?: { latitude: number; longitude: number; address?: string };
  dropoffLocation?: { latitude: number; longitude: number; address?: string };
  hasUnreadMessages: boolean;
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
 * Also tracks unread messages from co-riders
 * Falls back to polling if realtime fails
 */
export const usePoolRealtime = (poolId: string | null, currentUserId: string | null) => {
  const [state, setState] = useState<PoolRealtimeState>({
    pool: null,
    members: [],
    searchTiming: null,
    loading: false,
    error: null,
    lastUpdated: null,
    unreadMessageCounts: {},
    isConnected: false,
  });
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poolIdRef = useRef<string | null>(null);
  const isConnectedRef = useRef(false);
  
  // Keep poolId ref in sync
  useEffect(() => {
    poolIdRef.current = poolId;
  }, [poolId]);

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
        const searchTiming = response.data.search_timing || null;
        console.log(`[usePoolRealtime] Pool fetched successfully: ${pool.id}, status: ${pool.status}, members: ${pool.pool_members?.length || 0}`);
        startTransition(() => {
          setState(prev => ({
            ...prev,
            pool,
            members: pool.pool_members || [],
            searchTiming,
            loading: false,
            lastUpdated: new Date(),
            error: null,
          }));
        });
      } else {
        // API returned but without pool data
        const errorMessage = response.message || 'Pool not found';
        const isNotFound = errorMessage.toLowerCase().includes('not found');
        console.log(`[usePoolRealtime] Pool ${poolId} response issue: ${errorMessage}`);
        
        // Only set error if pool is genuinely not found
        if (isNotFound) {
          startTransition(() => {
            setState(prev => ({
              ...prev,
              pool: null,
              members: [],
              searchTiming: null,
              loading: false,
              error: 'This pool is no longer available',
            }));
          });
        } else {
          // For other issues, keep existing pool data if available
          startTransition(() => {
            setState(prev => ({
              ...prev,
              loading: false,
              searchTiming: prev.searchTiming || null,
              error: prev.pool ? null : errorMessage,
            }));
          });
        }
      }
    } catch (err: any) {
      // Handle specific error cases gracefully
      const errorMessage = err.message || 'Failed to load pool';
      const isNotFound = errorMessage.toLowerCase().includes('not found');
      const isCancelled = errorMessage.toLowerCase().includes('cancelled');
      
      console.warn('[usePoolRealtime] Failed to fetch pool data:', errorMessage);
      
      if (isNotFound) {
        startTransition(() => {
          setState(prev => ({
            ...prev,
            pool: null,
            members: [],
            searchTiming: null,
            loading: false,
            error: 'This pool is no longer available',
          }));
        });
      } else if (isCancelled) {
        startTransition(() => {
          setState(prev => ({
            ...prev,
            pool: null,
            members: [],
            searchTiming: null,
            loading: false,
            error: 'This pool was cancelled',
          }));
        });
      } else {
        // For other errors (network, temporary issues), keep existing pool data if available
        startTransition(() => {
          setState(prev => ({
            ...prev,
            loading: false,
            // Only set error if we don't have pool data - otherwise the user is in a valid pool
            searchTiming: prev.searchTiming || null,
            error: prev.pool ? null : errorMessage,
          }));
        });
      }
    }
  }, [poolId]);

  // Polling function for fallback - uses refs to check for changes
  const pollForUpdates = useCallback(async () => {
    const currentPoolId = poolIdRef.current;
    if (!currentPoolId) return;

    try {
      const response = await poolService.getPoolById(currentPoolId);
      if (response.success && response.data?.pool) {
        const pool = response.data.pool;
        const newMemberCount = pool.pool_members?.length || 0;
        const pollingSearchTiming = response.data.search_timing;
        
        // Defer polling state updates to avoid racing with React Navigation context
        InteractionManager.runAfterInteractions(() => {
          startTransition(() => {
            setState(prev => {
              const memberCountChanged = newMemberCount !== (prev.members?.length || 0);
              const statusChanged = prev.pool?.status !== pool.status;
              const driverChanged = prev.pool?.driver_id !== pool.driver_id;
              const searchTimingChanged = pollingSearchTiming &&
                JSON.stringify(pollingSearchTiming) !== JSON.stringify(prev.searchTiming);
              
              if (memberCountChanged || statusChanged || driverChanged) {
                console.log(`[usePoolRealtime] Polling detected changes: members=${memberCountChanged}, status=${statusChanged}, driver=${driverChanged}`);
                return {
                  ...prev,
                  pool,
                  members: pool.pool_members || [],
                  searchTiming: pollingSearchTiming || prev.searchTiming || null,
                  lastUpdated: new Date(),
                };
              }
              // Only update searchTiming if it actually changed
              if (searchTimingChanged) {
                return { ...prev, searchTiming: pollingSearchTiming };
              }
              return prev;
            });
          });
        });
      }
    } catch (err) {
      console.warn('[usePoolRealtime] Polling error:', err);
    }
  }, []);

  // Restart polling with the appropriate interval based on connection status
  const restartPolling = useCallback((connected: boolean) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    const interval = connected ? POLLING_INTERVAL_SLOW : POLLING_INTERVAL_FAST;
    console.log(`[usePoolRealtime] Polling interval: ${interval / 1000}s (realtime ${connected ? 'connected' : 'disconnected'})`);
    pollingRef.current = setInterval(pollForUpdates, interval);
  }, [pollForUpdates]);

  // Set up real-time subscriptions with smart polling fallback
  useEffect(() => {
    if (!poolId || !currentUserId) return;

    // Initial fetch
    fetchPoolData();

    // Subscribe to pool changes with improved error handling
    const poolChannel = supabase
      .channel(`pool-realtime:${poolId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'pools',
          filter: `id=eq.${poolId}`,
        },
        (payload) => {
          console.log('[usePoolRealtime] Pool update received:', payload.eventType);
          
          // Defer state updates from WebSocket callbacks to avoid racing with
          // React Navigation's context propagation during re-renders
          InteractionManager.runAfterInteractions(() => {
            startTransition(() => {
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
            });
          });
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
          console.log('[usePoolRealtime] Pool member update received:', payload.eventType);
          
          InteractionManager.runAfterInteractions(() => {
            if (payload.eventType === 'INSERT' && payload.new) {
              console.log('[usePoolRealtime] New member joined, refetching pool data...');
              fetchPoolData();
            } else if (payload.eventType === 'DELETE' && payload.old) {
              console.log('[usePoolRealtime] Member left, refetching pool data...');
              fetchPoolData();
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedMember = payload.new as any;
              if (updatedMember.left_at !== null) {
                console.log('[usePoolRealtime] Member left_at updated, refetching pool data...');
                fetchPoolData();
              } else {
                startTransition(() => {
                  setState(prev => ({
                    ...prev,
                    members: prev.members.map(m => 
                      m.id === (payload.new as PoolMember).id ? payload.new as PoolMember : m
                    ),
                    lastUpdated: new Date(),
                  }));
                });
              }
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          if (newMessage.sender_id && newMessage.sender_id !== currentUserId) {
            console.log('[usePoolRealtime] New message from:', newMessage.sender_id);
            
            InteractionManager.runAfterInteractions(() => {
              startTransition(() => {
                setState(prev => ({
                  ...prev,
                  unreadMessageCounts: {
                    ...prev.unreadMessageCounts,
                    [newMessage.sender_id]: (prev.unreadMessageCounts[newMessage.sender_id] || 0) + 1,
                  },
                  lastUpdated: new Date(),
                }));
              });
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[usePoolRealtime] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[usePoolRealtime] Successfully subscribed to pool updates');
          isConnectedRef.current = true;
          setState(prev => ({ ...prev, isConnected: true }));
          // Switch to slow heartbeat polling since realtime is delivering events
          restartPolling(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[usePoolRealtime] Realtime failed, switching to fast polling');
          isConnectedRef.current = false;
          setState(prev => ({ ...prev, isConnected: false }));
          // Switch to fast polling since realtime is not available
          restartPolling(false);
        }
      });

    channelRef.current = poolChannel;
    
    // Start with fast polling until realtime connects
    pollingRef.current = setInterval(pollForUpdates, POLLING_INTERVAL_FAST);

    // Cleanup subscription and polling on unmount
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
  }, [poolId, currentUserId, fetchPoolData, pollForUpdates, restartPolling]);

  // Clear unread messages for a specific user (call when opening chat with that user)
  const clearUnreadMessages = useCallback((userId: string) => {
    setState(prev => {
      const newCounts = { ...prev.unreadMessageCounts };
      delete newCounts[userId];
      return { ...prev, unreadMessageCounts: newCounts };
    });
  }, []);

  // Derived state: co-riders (excluding current user) with unread message status
  const coRiders: CoRiderInfo[] = useMemo(() => state.members
    .filter(member => member.user_id !== currentUserId)
    .map((member, index) => {
      const memberWithProfile = member as PoolMemberWithProfile;
      const userName = memberWithProfile.user?.full_name || `Rider ${index + 1}`;
      const initial = userName.charAt(0).toUpperCase();
      const unreadCount = state.unreadMessageCounts[member.user_id] || 0;
      
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
        hasUnreadMessages: unreadCount > 0,
      };
    }), [state.members, state.unreadMessageCounts, currentUserId]);

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
    searchTiming: state.searchTiming,
    coRiders,
    hasDriver,
    poolStatus,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    isConnected: state.isConnected,
    refresh,
    clearUnreadMessages,
  };
};
