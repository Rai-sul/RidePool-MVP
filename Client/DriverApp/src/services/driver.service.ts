import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import type { ApiResponse, Location, Pool } from '../types';

export interface DriverEarnings {
  total: number;
  trips: number;
}

export interface DriverStats {
  totalRides: number;
  todayRides: number;
  rating: number;
  acceptanceRate: number;
  onlineHours: number;
}

export const driverService = {
  async goOnline(data: {
    current_location: Location;
    vehicle_id?: string;
    vehicle_type?: string;
  }): Promise<ApiResponse> {
    const payload: Record<string, unknown> = {
      lat: data.current_location.latitude,
      lng: data.current_location.longitude,
    };
    if (data.vehicle_id) {
      payload.vehicle_id = data.vehicle_id;
    }
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.GO_ONLINE, payload);
  },

  async goOffline(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.GO_OFFLINE);
  },

  async getStatus(): Promise<ApiResponse<{ status: string; active_pool?: Pool }>> {
    return apiClient.get<ApiResponse<{ status: string; active_pool?: Pool }>>(API_ENDPOINTS.DRIVER.STATUS);
  },

  async updateLocation(location: Location): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>(API_ENDPOINTS.DRIVER.UPDATE_LOCATION, {
      lat: location.latitude,
      lng: location.longitude,
    });
  },

  async getAvailablePools(): Promise<ApiResponse<Pool[]>> {
    return apiClient.get<ApiResponse<Pool[]>>(API_ENDPOINTS.DRIVER.AVAILABLE_POOLS);
  },

  async acceptPool(poolId: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.ACCEPT_POOL(poolId));
  },

  async rejectPool(poolId: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.REJECT_POOL(poolId));
  },

  async getActivePool(): Promise<ApiResponse<Pool>> {
    return apiClient.get<ApiResponse<Pool>>(API_ENDPOINTS.DRIVER.ACTIVE_POOL);
  },

  async startRide(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.START_RIDE);
  },

  async completeRide(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.COMPLETE_RIDE);
  },

  async markPickup(passengerId: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.PICKUP(passengerId));
  },

  async markDropoff(passengerId: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.DROPOFF(passengerId));
  },

  async getEarningsToday(): Promise<ApiResponse<DriverEarnings>> {
    return apiClient.get<ApiResponse<DriverEarnings>>(API_ENDPOINTS.DRIVER.EARNINGS_TODAY);
  },

  async getEarningsHistory(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse> {
    return apiClient.get<ApiResponse>(API_ENDPOINTS.DRIVER.EARNINGS_HISTORY, params as Record<string, string>);
  },

  async getStats(): Promise<ApiResponse<DriverStats>> {
    return apiClient.get<ApiResponse<DriverStats>>(API_ENDPOINTS.DRIVER.STATS);
  },

  async setPriorityLocation(location: Location): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.PRIORITY_LOCATION, location);
  },

  async getPriorityLocation(): Promise<ApiResponse<Location | null>> {
    return apiClient.get<ApiResponse<Location | null>>(API_ENDPOINTS.DRIVER.PRIORITY_LOCATION);
  },

  async clearPriorityLocation(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(API_ENDPOINTS.DRIVER.PRIORITY_LOCATION);
  },

  async setSearchZone(data: {
    destination_lat: number;
    destination_lng: number;
    destination_address?: string;
  }): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.SEARCH_ZONE, data);
  },

  async getSearchZone(): Promise<ApiResponse<{ search_zone: { lat: number; lng: number; address?: string; set_at: string } | null }>> {
    return apiClient.get<ApiResponse<{ search_zone: { lat: number; lng: number; address?: string; set_at: string } | null }>>(API_ENDPOINTS.DRIVER.SEARCH_ZONE);
  },

  async clearSearchZone(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(API_ENDPOINTS.DRIVER.SEARCH_ZONE);
  },

  async registerVehicle(data: {
    vehicle_type: 'CAR' | 'CNG';
    vehicle_number: string;
    model?: string;
    color?: string;
  }): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.REGISTER_VEHICLE, data);
  },
};
