import { useState, useCallback } from 'react';
import {
  advanceBookingService,
  AdvanceBooking,
  AdvanceBookingResult,
  AdvanceTiming,
  CreateAdvanceBookingRequest,
} from '../services/advanceBooking.service';

/**
 * Scheduled (advance) bookings.
 *
 * There is no search here on purpose: an advance rider never picks a pool.
 * The server matches the booking to a pool, or starts one, and reports back.
 */
export const useAdvanceBookings = () => {
  const [bookings, setBookings] = useState<AdvanceBooking[]>([]);
  const [timing, setTiming] = useState<AdvanceTiming | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = useCallback(async (data: CreateAdvanceBookingRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await advanceBookingService.createBooking(data);
      if (response.success && response.data) {
        setTiming(response.data.timing);
        return { success: true, booking: response.data.booking as AdvanceBookingResult };
      }
      throw new Error(response.message || 'Failed to schedule the ride');
    } catch (err: any) {
      const message = err.message || 'Failed to schedule the ride';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await advanceBookingService.listBookings();
      if (response.success && response.data) {
        setBookings(response.data.bookings);
        setTiming(response.data.timing);
        return { success: true, bookings: response.data.bookings };
      }
      throw new Error(response.message || 'Failed to load scheduled rides');
    } catch (err: any) {
      const message = err.message || 'Failed to load scheduled rides';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBooking = useCallback(async (rideId: string, data: CreateAdvanceBookingRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await advanceBookingService.updateBooking(rideId, data);
      if (response.success && response.data) {
        setTiming(response.data.timing);
        return { success: true, booking: response.data.booking as AdvanceBookingResult };
      }
      throw new Error(response.message || 'Failed to update the booking');
    } catch (err: any) {
      const message = err.message || 'Failed to update the booking';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelBooking = useCallback(async (rideId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await advanceBookingService.cancelBooking(rideId);
      if (response.success) {
        setBookings((current) => current.filter((b) => b.id !== rideId));
        return { success: true };
      }
      throw new Error(response.message || 'Failed to cancel the booking');
    } catch (err: any) {
      const message = err.message || 'Failed to cancel the booking';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmBooking = useCallback(async (poolId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await advanceBookingService.confirmBooking(poolId);
      if (response.success && response.data) {
        return {
          success: true,
          confirmedCount: response.data.confirmed_count,
          poolConfirmed: response.data.pool_confirmed,
        };
      }
      throw new Error(response.message || 'Failed to confirm');
    } catch (err: any) {
      const message = err.message || 'Failed to confirm';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    bookings,
    timing,
    loading,
    error,
    createBooking,
    fetchBookings,
    updateBooking,
    cancelBooking,
    confirmBooking,
  };
};
