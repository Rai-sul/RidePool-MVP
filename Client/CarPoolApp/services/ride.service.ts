import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Ride, Location, PaginatedResponse } from '../types';

export const rideService = {
  async requestRide(data: {
    pickup_location: Location;
    dropoff_location: Location;
    pickup_time?: string;
    pool_id?: string;
  }): Promise<ApiResponse<Ride>> {
    return apiClient.post(API_ENDPOINTS.RIDE.REQUEST, data);
  },

  async getRideHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Ride>>> {
    return apiClient.get(API_ENDPOINTS.RIDE.HISTORY, params);
  },

  async cancelRide(rideId: string, reason?: string): Promise<ApiResponse> {
    return apiClient.put(API_ENDPOINTS.RIDE.CANCEL(rideId), { reason });
  },
};
