import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Ride, Location, PaginatedResponse } from '../types';

export const rideService = {
  async createRide(data: {
    pickup_location: Location;
    dropoff_location: Location;
    pickup_time?: string;
    pool_id?: string;
  }): Promise<ApiResponse<Ride>> {
    return apiClient.post(API_ENDPOINTS.RIDE.CREATE, data);
  },

  async getRides(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Ride>>> {
    return apiClient.get(API_ENDPOINTS.RIDE.GET_ALL, params);
  },

  async getRideById(id: string): Promise<ApiResponse<Ride>> {
    return apiClient.get(API_ENDPOINTS.RIDE.GET_BY_ID(id));
  },

  async updateRide(id: string, data: Partial<Ride>): Promise<ApiResponse<Ride>> {
    return apiClient.put(API_ENDPOINTS.RIDE.UPDATE(id), data);
  },

  async cancelRide(id: string, reason?: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.RIDE.CANCEL(id), { reason });
  },

  async searchRides(params: {
    pickup_location: Location;
    dropoff_location: Location;
    pickup_time?: string;
  }): Promise<ApiResponse<Ride[]>> {
    return apiClient.post(API_ENDPOINTS.RIDE.SEARCH, params);
  },

  async getNearbyRides(location: Location, radius?: number): Promise<ApiResponse<Ride[]>> {
    return apiClient.post(API_ENDPOINTS.RIDE.NEARBY, { location, radius });
  },

  async startRide(id: string): Promise<ApiResponse<Ride>> {
    return apiClient.post(API_ENDPOINTS.RIDE.START(id));
  },

  async completeRide(id: string): Promise<ApiResponse<Ride>> {
    return apiClient.post(API_ENDPOINTS.RIDE.COMPLETE(id));
  },
};
