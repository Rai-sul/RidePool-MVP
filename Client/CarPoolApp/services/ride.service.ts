import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Ride, PaginatedResponse, VehicleType, GenderPreference } from '../types';

export interface CreateRideRequest {
  pickup_lat: number;
  pickup_lng: number;
  pickup_address?: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address?: string;
  vehicle_type: VehicleType;
  gender_restriction?: GenderPreference;
}

export const rideService = {
  /**
   * Request a new ride
   */
  async requestRide(data: CreateRideRequest): Promise<ApiResponse<Ride>> {
    return apiClient.post(API_ENDPOINTS.RIDE.REQUEST, data);
  },

  /**
   * Get ride history for current user
   */
  async getRideHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Ride>>> {
    return apiClient.get(API_ENDPOINTS.RIDE.HISTORY, params);
  },

  /**
   * Cancel a ride with optional reason
   */
  async cancelRide(rideId: string, reason?: string): Promise<ApiResponse> {
    return apiClient.put(API_ENDPOINTS.RIDE.CANCEL(rideId), { reason });
  },
};
