import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Pool, Location } from '../types';

export const poolService = {
  async createPool(data: {
    pickup_location: Location;
    dropoff_location: Location;
    scheduled_time: string;
    seats_available?: number;
  }): Promise<ApiResponse<Pool>> {
    return apiClient.post(API_ENDPOINTS.POOL.CREATE, data);
  },

  async getPoolById(poolId: string): Promise<ApiResponse<Pool>> {
    return apiClient.get(API_ENDPOINTS.POOL.GET_BY_ID(poolId));
  },

  async joinPool(poolId: string, data?: {
    pickup_location?: Location;
    dropoff_location?: Location;
  }): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.POOL.JOIN(poolId), data);
  },

  async leavePool(poolId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.POOL.LEAVE(poolId));
  },

  async cancelPool(poolId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.POOL.CANCEL(poolId));
  },

  async searchPools(params: {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    scheduled_time?: string;
    radius_km?: number;
  }): Promise<ApiResponse<Pool[]>> {
    return apiClient.get(API_ENDPOINTS.POOL.SEARCH, params);
  },
};
