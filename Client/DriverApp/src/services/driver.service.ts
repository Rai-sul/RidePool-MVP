import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import type { ApiResponse, CombinedRouteResponse, Location, NavigationLinkResponse, Pool } from '../types';

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

export interface DriverAcceptPoolResponse {
  pool_id: string;
  status: string;
  passengers: unknown[];
  destination: unknown;
  nearest_pickup: unknown;
  navigation_url: string | null;
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

  async getAvailablePools(): Promise<ApiResponse<{ pools: Pool[]; total_available: number }>> {
    return apiClient.get<ApiResponse<{ pools: Pool[]; total_available: number }>>(API_ENDPOINTS.DRIVER.AVAILABLE_POOLS);
  },

  async acceptPool(poolId: string): Promise<ApiResponse<DriverAcceptPoolResponse>> {
    return apiClient.post<ApiResponse<DriverAcceptPoolResponse>>(API_ENDPOINTS.DRIVER.ACCEPT_POOL(poolId));
  },

  async rejectPool(poolId: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.REJECT_POOL(poolId));
  },

  async unassignFromPool(poolId: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.UNASSIGN_POOL(poolId));
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

  async registerVehicle(data: {
    vehicle_type: 'CAR' | 'CNG';
    vehicle_number: string;
    model?: string;
    color?: string;
  }): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.DRIVER.REGISTER_VEHICLE, data);
  },

  async getPoolRoute(poolId: string): Promise<ApiResponse<CombinedRouteResponse>> {
    return apiClient.get<ApiResponse<CombinedRouteResponse>>(API_ENDPOINTS.POOL.COMBINED_ROUTE(poolId));
  },

  async getNavigationLink(poolId: string): Promise<ApiResponse<NavigationLinkResponse>> {
    return apiClient.get<ApiResponse<NavigationLinkResponse>>(API_ENDPOINTS.POOL.NAVIGATION_LINK(poolId));
  },
};
