import { useState, useEffect, useCallback } from 'react';
import { rideService } from '../services/ride.service';
import { Ride, Location } from '../types';

export const useRides = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRides = useCallback(async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await rideService.getRides(params);
      if (response.success && response.data) {
        setRides(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rides');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRide = useCallback(async (data: {
    pickup_location: Location;
    dropoff_location: Location;
    pickup_time?: string;
    pool_id?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await rideService.createRide(data);
      if (response.success && response.data) {
        setCurrentRide(response.data);
        return { success: true, data: response.data };
      }
      throw new Error(response.message || 'Failed to create ride');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create ride';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const getRideById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await rideService.getRideById(id);
      if (response.success && response.data) {
        setCurrentRide(response.data);
        return { success: true, data: response.data };
      }
      throw new Error(response.message || 'Failed to fetch ride');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch ride';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelRide = useCallback(async (id: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await rideService.cancelRide(id, reason);
      if (response.success) {
        setCurrentRide(null);
        await fetchRides();
        return { success: true };
      }
      throw new Error(response.message || 'Failed to cancel ride');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to cancel ride';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchRides]);

  const searchRides = useCallback(async (params: {
    pickup_location: Location;
    dropoff_location: Location;
    pickup_time?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await rideService.searchRides(params);
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

  const startRide = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await rideService.startRide(id);
      if (response.success && response.data) {
        setCurrentRide(response.data);
        return { success: true };
      }
      throw new Error(response.message || 'Failed to start ride');
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const completeRide = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await rideService.completeRide(id);
      if (response.success && response.data) {
        setCurrentRide(response.data);
        return { success: true };
      }
      throw new Error(response.message || 'Failed to complete ride');
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    rides,
    currentRide,
    loading,
    error,
    fetchRides,
    createRide,
    getRideById,
    cancelRide,
    searchRides,
    startRide,
    completeRide,
  };
};
