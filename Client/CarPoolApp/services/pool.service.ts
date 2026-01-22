import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Pool, VehicleType, GenderPreference } from '../types';

export interface CreatePoolRequest {
  destination_lat: number;
  destination_lng: number;
  destination_address?: string;
  vehicle_type: VehicleType;
  max_passengers?: number;
  gender_restriction?: GenderPreference;
}

export interface CreatePoolResponse {
  pool: Pool;
  lookup_expires_at: string;
  lookup_time_seconds: number;
}

export interface JoinPoolRequest {
  ride_id: string;
}

export interface JoinPoolResponse {
  pool_id: string;
  member_id: string;
  compatibility_score: number;
  fare_per_person: number;
  current_passengers: number;
}

export interface SearchPoolsParams {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  vehicle_type: VehicleType;
}

export interface PoolSearchResult {
  pools: Array<{
    poolId: string;
    score: number;
    routeOverlapPercentage: number;
    estimatedDetour: number;
    exactDistance?: number;
    exactETA?: number;
  }>;
  alternatives: Array<{
    action: string;
    title: string;
    description: string;
    icon?: string;
    priority: number;
    metadata?: Record<string, any>;
  }>;
  analytics: {
    totalPoolsChecked: number;
    searchRadius: number;
    incompatibleReasons: Record<string, number>;
  };
  metadata: {
    hasNearbyPools: boolean;
    estimatedWaitTime?: number;
    peakHours?: Array<{ start: string; end: string }>;
  };
  has_matches: boolean;
  total_found: number;
}

export interface GetPoolResponse {
  pool: Pool;
  lookup_remaining_seconds: number | null;
}

export const poolService = {
  /**
   * Create a new pool as the first rider
   */
  async createPool(data: CreatePoolRequest): Promise<ApiResponse<CreatePoolResponse>> {
    return apiClient.post(API_ENDPOINTS.POOL.CREATE, data);
  },

  /**
   * Get pool details by ID
   */
  async getPoolById(poolId: string): Promise<ApiResponse<GetPoolResponse>> {
    return apiClient.get(API_ENDPOINTS.POOL.GET_BY_ID(poolId));
  },

  /**
   * Join an existing pool with your ride
   */
  async joinPool(poolId: string, data: JoinPoolRequest): Promise<ApiResponse<JoinPoolResponse>> {
    return apiClient.post(API_ENDPOINTS.POOL.JOIN(poolId), data);
  },

  /**
   * Leave a pool (before ride starts)
   */
  async leavePool(poolId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(API_ENDPOINTS.POOL.LEAVE(poolId));
  },

  /**
   * Cancel a pool (only pool creator can do this)
   */
  async cancelPool(poolId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(API_ENDPOINTS.POOL.CANCEL(poolId));
  },

  /**
   * Search for matching pools based on pickup and dropoff locations
   */
  async searchPools(params: SearchPoolsParams): Promise<ApiResponse<PoolSearchResult>> {
    return apiClient.get(API_ENDPOINTS.POOL.SEARCH, params);
  },
};
