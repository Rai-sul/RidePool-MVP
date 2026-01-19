import { useState, useCallback } from 'react';
import { poolService } from '../services/pool.service';
import { Pool } from '../types';

export const usePools = () => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [currentPool, setCurrentPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async (params?: {
    page?: number;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.getPools(params);
      if (response.success && response.data) {
        setPools(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pools');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPool = useCallback(async (data: {
    name: string;
    description?: string;
    max_members?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.createPool(data);
      if (response.success && response.data) {
        setCurrentPool(response.data);
        return { success: true, data: response.data };
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

  const joinPool = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.joinPool(id);
      if (response.success) {
        await fetchPools();
        return { success: true };
      }
      throw new Error(response.message || 'Failed to join pool');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to join pool';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchPools]);

  const leavePool = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.leavePool(id);
      if (response.success) {
        setCurrentPool(null);
        await fetchPools();
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
  }, [fetchPools]);

  const searchPools = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await poolService.searchPools(query);
      if (response.success && response.data) {
        return { success: true, data: response.data };
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

  return {
    pools,
    currentPool,
    loading,
    error,
    fetchPools,
    createPool,
    joinPool,
    leavePool,
    searchPools,
  };
};
