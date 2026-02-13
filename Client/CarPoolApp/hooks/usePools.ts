import { useState, useCallback } from 'react';
import { 
  poolService, 
  CreatePoolRequest, 
  SearchPoolsParams, 
  PoolSearchResult,
  CreatePoolResponse,
  JoinPoolResponse,
  GetPoolResponse 
} from '../services/pool.service';
import { Pool } from '../types';

export const usePools = () => {
  const [currentPool, setCurrentPool] = useState<Pool | null>(null);
  const [searchResults, setSearchResults] = useState<PoolSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new pool with destination and preferences
   */
  const createPool = useCallback(async (data: CreatePoolRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.createPool(data);
      if (response.success && response.data) {
        setCurrentPool(response.data.pool);
        return { 
          success: true, 
          data: response.data,
          lookupExpiresAt: response.data.lookup_expires_at,
          lookupTimeSeconds: response.data.lookup_time_seconds,
        };
      }
      throw new Error(response.message || 'Failed to create pool');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create pool';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get pool details by ID
   */
  const getPool = useCallback(async (poolId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.getPoolById(poolId);
      if (response.success && response.data) {
        setCurrentPool(response.data.pool);
        return { 
          success: true, 
          data: response.data,
          lookupRemainingSeconds: response.data.lookup_remaining_seconds,
        };
      }
      throw new Error(response.message || 'Failed to get pool');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get pool';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Join an existing pool with a ride
   */
  const joinPool = useCallback(async (poolId: string, rideId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.joinPool(poolId, { ride_id: rideId });
      if (response.success && response.data) {
        return { 
          success: true, 
          data: response.data,
          farePerPerson: response.data.fare_per_person,
          currentPassengers: response.data.current_passengers,
        };
      }
      throw new Error(response.message || 'Failed to join pool');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to join pool';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Leave a pool (before ride starts)
   */
  const leavePool = useCallback(async (poolId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.leavePool(poolId);
      if (response.success) {
        setCurrentPool(null);
        return { success: true };
      }
      throw new Error(response.message || 'Failed to leave pool');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to leave pool';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cancel a pool (only pool creator can do this)
   */
  const cancelPool = useCallback(async (poolId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.cancelPool(poolId);
      if (response.success) {
        setCurrentPool(null);
        return { success: true };
      }
      throw new Error(response.message || 'Failed to cancel pool');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to cancel pool';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Search for matching pools based on locations and vehicle type
   */
  const searchPools = useCallback(async (params: SearchPoolsParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.searchPools(params);
      if (response.success && response.data) {
        setSearchResults(response.data);
        return { 
          success: true, 
          data: response.data,
          hasMatches: response.data.has_matches,
          totalFound: response.data.total_found,
          alternatives: response.data.alternatives,
        };
      }
      throw new Error(response.message || 'Search failed');
    } catch (err: any) {
      const errorMessage = err.message || 'Search failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear current search results
   */
  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setError(null);
  }, []);

  /**
   * Clear current pool state
   */
  const clearPool = useCallback(() => {
    setCurrentPool(null);
    setError(null);
  }, []);

  return {
    currentPool,
    searchResults,
    loading,
    error,
    createPool,
    getPool,
    joinPool,
    leavePool,
    cancelPool,
    searchPools,
    clearSearch,
    clearPool,
  };
};
