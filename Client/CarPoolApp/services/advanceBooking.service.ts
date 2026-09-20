import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, GenderPreference, PoolStatus, VehicleType } from '../types';

export interface CreateAdvanceBookingRequest {
  pickup_lat: number;
  pickup_lng: number;
  pickup_address?: string;
  pickup_name?: string;
  destination_lat: number;
  destination_lng: number;
  destination_address?: string;
  destination_name?: string;
  vehicle_type: VehicleType;
  gender_restriction?: GenderPreference;
  /** ISO 8601 with offset, e.g. 2026-09-21T08:10:00+06:00 */
  scheduled_pickup_at: string;
}

/**
 * The windows the server is running with. Production uses real minutes; a
 * development build can compress them to seconds, so the app renders these
 * rather than assuming 30 and 10.
 */
export interface AdvanceTiming {
  unit: 'minutes' | 'seconds';
  pool_window_units: number;
  confirm_lead_units: number;
  confirm_window_units: number;
  pool_window_seconds: number;
  confirm_lead_seconds: number;
  confirm_window_seconds: number;
  max_lead_days: number;
}

export interface AdvanceBookingResult {
  ride_id: string;
  pool_id: string;
  created_pool: boolean;
  scheduled_pickup_at: string;
  pool_scheduled_pickup_at: string;
  confirmation_opens_at: string;
  current_passengers: number;
  max_passengers: number;
}

export interface AdvanceBooking {
  id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  vehicle_type: VehicleType;
  gender_restriction: GenderPreference;
  status: string;
  scheduled_pickup_at: string;
  pool_id: string | null;
  fare: number | null;
  confirmed_at: string | null;
  pools: {
    id: string;
    status: PoolStatus;
    current_passengers: number;
    max_passengers: number;
    scheduled_pickup_at: string | null;
    confirmation_opens_at: string | null;
    confirmation_deadline_at: string | null;
    active_range_start_at: string | null;
    fare_per_person: number | null;
  } | null;
}

export interface ConfirmBookingResponse {
  confirmed: boolean;
  confirmed_count: number;
  /** True when this confirmation was the second one, which makes the pool live. */
  pool_confirmed: boolean;
}

export const advanceBookingService = {
  /** Schedule a ride. The server matches it to a pool automatically. */
  async createBooking(
    data: CreateAdvanceBookingRequest
  ): Promise<ApiResponse<{ booking: AdvanceBookingResult; timing: AdvanceTiming }>> {
    return apiClient.post(API_ENDPOINTS.ADVANCE_BOOKING.CREATE, data);
  },

  /** Upcoming scheduled bookings with their pool state. */
  async listBookings(): Promise<ApiResponse<{ bookings: AdvanceBooking[]; timing: AdvanceTiming }>> {
    return apiClient.get(API_ENDPOINTS.ADVANCE_BOOKING.LIST);
  },

  /** Change a booking. The old seat is released and matching re-runs. */
  async updateBooking(
    rideId: string,
    data: CreateAdvanceBookingRequest
  ): Promise<ApiResponse<{ booking: AdvanceBookingResult; timing: AdvanceTiming }>> {
    return apiClient.patch(API_ENDPOINTS.ADVANCE_BOOKING.UPDATE(rideId), data);
  },

  /** Cancel a booking and free the seat. No replacement pool is looked for. */
  async cancelBooking(rideId: string): Promise<ApiResponse<{ cancelled: boolean; pool_id: string | null }>> {
    return apiClient.delete(API_ENDPOINTS.ADVANCE_BOOKING.CANCEL(rideId));
  },

  /** Confirm the rider is still going, during the confirmation window. */
  async confirmBooking(poolId: string): Promise<ApiResponse<ConfirmBookingResponse>> {
    return apiClient.post(API_ENDPOINTS.ADVANCE_BOOKING.CONFIRM(poolId));
  },
};
