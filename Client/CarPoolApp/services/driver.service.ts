import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Driver, Location, Pool } from '../types';

export const driverService = {
  async goOnline(data: {
    current_location: Location;
    vehicle_type?: string;
  }): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.GO_ONLINE, data);
  },

  async goOffline(): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.GO_OFFLINE);
  },

  async getStatus(): Promise<ApiResponse<{ status: string; active_pool?: Pool }>> {
    return apiClient.get(API_ENDPOINTS.DRIVER.STATUS);
  },

  async updateLocation(location: Location): Promise<ApiResponse> {
    return apiClient.put(API_ENDPOINTS.DRIVER.UPDATE_LOCATION, location);
  },

  async getAvailablePools(): Promise<ApiResponse<Pool[]>> {
    return apiClient.get(API_ENDPOINTS.DRIVER.AVAILABLE_POOLS);
  },

  async acceptPool(poolId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.ACCEPT_POOL(poolId));
  },

  async rejectPool(poolId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.REJECT_POOL(poolId));
  },

  async getActivePool(): Promise<ApiResponse<Pool>> {
    return apiClient.get(API_ENDPOINTS.DRIVER.ACTIVE_POOL);
  },

  async startRide(): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.START_RIDE);
  },

  async completeRide(): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.COMPLETE_RIDE);
  },

  async markPickup(passengerId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.PICKUP(passengerId));
  },

  async markDropoff(passengerId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.DROPOFF(passengerId));
  },

  async getEarningsToday(): Promise<ApiResponse<{ total: number; trips: number }>> {
    return apiClient.get(API_ENDPOINTS.DRIVER.EARNINGS_TODAY);
  },

  async getEarningsHistory(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse> {
    return apiClient.get(API_ENDPOINTS.DRIVER.EARNINGS_HISTORY, params);
  },

  async getStats(): Promise<ApiResponse> {
    return apiClient.get(API_ENDPOINTS.DRIVER.STATS);
  },

  async setPriorityLocation(location: Location): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.PRIORITY_LOCATION, location);
  },

  async getPriorityLocation(): Promise<ApiResponse<Location | null>> {
    return apiClient.get(API_ENDPOINTS.DRIVER.PRIORITY_LOCATION);
  },

  async clearPriorityLocation(): Promise<ApiResponse> {
    return apiClient.delete(API_ENDPOINTS.DRIVER.PRIORITY_LOCATION);
  },
};
