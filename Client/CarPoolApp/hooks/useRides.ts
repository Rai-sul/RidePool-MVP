import { useState, useCallback } from 'react';
import { rideService, CreateRideRequest } from '../services/ride.service';
import { Ride, VehicleType, GenderPreference } from '../types';

export const useRides = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch ride history for current user
   */
  const fetchRides = useCallback(async (params?: {
    page?: number;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await rideService.getRideHistory(params);
      if (response.success && response.data) {
        setRides(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rides');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Request a new ride with pickup and dropoff coordinates
   */
  const requestRide = useCallback(async (data: CreateRideRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await rideService.requestRide(data);
      if (response.success && response.data) {
        setCurrentRide(response.data);
        return { success: true, data: response.data };
      }
      throw new Error(response.message || 'Failed to request ride');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to request ride';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cancel a ride with optional reason
   */
  const cancelRide = useCallback(async (rideId: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await rideService.cancelRide(rideId, reason);
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

  /**
   * Clear current ride state
   */
  const clearRide = useCallback(() => {
    setCurrentRide(null);
    setError(null);
  }, []);

  return {
    rides,
    currentRide,
    loading,
    error,
    fetchRides,
    requestRide,
    cancelRide,
    clearRide,
  };
};
