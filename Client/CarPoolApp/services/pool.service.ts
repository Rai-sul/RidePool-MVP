import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Pool, VehicleType, GenderPreference } from '../types';

export interface CreatePoolRequest {
  pickup_lat: number;
  pickup_lng: number;
  pickup_address?: string;
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
  gender_restriction?: GenderPreference;
}

export interface PoolSearchResult {
  pools: Array<{
    poolId: string;
    score: number;
    routeOverlapPercentage: number;
    estimatedDetour: number;
    exactDistance?: number;
    exactETA?: number;
    // Pool pickup location (where the pool's creator/driver is)
    poolPickupLocation?: {
      lat: number;
      lng: number;
      address?: string;
    };
    // Distance from user's pickup to pool's current location
    distanceToPoolKm?: number;
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

export interface PoolRouteStop {
  type: 'pickup' | 'dropoff';
  userId: string;
  address?: string;
  location: { latitude: number; longitude: number };
  order: number;
  estimatedArrival: number;
}

export interface PoolRouteResponse {
  poolId: string;
  route: {
    totalDistanceKm: number;
    totalDurationMinutes: number;
    farePerPerson: number;
    coordinates: Array<{ lat: number; lng: number }>;
    encoded: string;
  };
  stops: PoolRouteStop[];
  legs: Array<{
    from: { latitude: number; longitude: number };
    to: { latitude: number; longitude: number };
    distanceKm: number;
    durationMinutes: number;
    instruction: string;
  }>;
}

export interface PoolFareResponse {
  poolId: string;
  farePerPerson: number;
  totalFare: number;
  memberCount: number;
  breakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    poolDiscount: number;
    fullPoolBonus: number;
    displayedFare: number;
    actualCharge: number;
    platformSurcharge: number;
    savings: number;
    farePerPerson: number;
  };
  memberFares: Array<{
    userId: string;
    fare: number;
    distanceKm: number;
    savings: number;
  }>;
  message: string;
}

// Combined Smart Route Types
export interface CombinedRouteWaypoint {
  id: string;
  type: 'pickup' | 'dropoff' | 'driver';
  userId: string;
  location: { latitude: number; longitude: number };
  address?: string;
  order: number;
  estimatedArrivalMinutes: number;
}

export interface CombinedRouteLeg {
  fromId: string;
  toId: string;
  distanceKm: number;
  durationMinutes: number;
  instruction: string;
}

export interface CombinedRouteResponse {
  poolId: string;
  poolStatus: string;
  route: {
    polyline: string;
    coordinates: Array<{ lat: number; lng: number }>;
    totalDistanceKm: number;
    totalDurationMinutes: number;
    durationInTraffic: number;
    trafficLevel: 'low' | 'moderate' | 'high';
    routeSummary: string;
  };
  waypoints: CombinedRouteWaypoint[];
  legs: CombinedRouteLeg[];
  optimization: {
    score: number;
    savingsPercent: number;
  };
  meta: {
    fromCache: boolean;
    calculatedAt: string;
    memberCount: number;
    hasDriverLocation: boolean;
  };
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

  /**
   * Get optimized route for a pool with all member stops
   */
  async getOptimizedRoute(poolId: string): Promise<ApiResponse<PoolRouteResponse>> {
    return apiClient.get(API_ENDPOINTS.POOL.ROUTE(poolId));
  },

  /**
   * Get combined smart route for a pool (available when status is WAITING_FOR_DRIVER or beyond)
   * Returns optimized route with all pickup/dropoff points and driver location
   */
  async getCombinedRoute(
    poolId: string,
    driverLocation?: { latitude: number; longitude: number }
  ): Promise<ApiResponse<CombinedRouteResponse>> {
    const params: Record<string, string> = {};
    if (driverLocation) {
      params.driver_lat = driverLocation.latitude.toString();
      params.driver_lng = driverLocation.longitude.toString();
    }
    return apiClient.get(API_ENDPOINTS.POOL.COMBINED_ROUTE(poolId), params);
  },

  /**
   * Update combined route with driver's real-time location (driver only)
   */
  async updateCombinedRoute(
    poolId: string,
    driverLocation: { latitude: number; longitude: number },
    currentRouteCacheKey?: string
  ): Promise<ApiResponse<{ needsRecalculation: boolean; updatedRoute?: CombinedRouteResponse }>> {
    return apiClient.post(API_ENDPOINTS.POOL.UPDATE_COMBINED_ROUTE(poolId), {
      driver_lat: driverLocation.latitude,
      driver_lng: driverLocation.longitude,
      current_route_cache_key: currentRouteCacheKey,
    });
  },

  /**
   * Get recalculated fare for a pool
   */
  async getPoolFare(poolId: string): Promise<ApiResponse<PoolFareResponse>> {
    return apiClient.get(API_ENDPOINTS.POOL.FARE(poolId));
  },

  /**
   * Extend pool search to wider geographic area (additional H3 hexagons)
   * Called after initial 30-second search expires
   */
  async extendPoolSearch(poolId: string): Promise<ApiResponse<{ extended: boolean; new_search_radius: number }>> {
    return apiClient.post(API_ENDPOINTS.POOL.EXTEND_SEARCH(poolId));
  },

  /**
   * Complete pool search and transition to waiting for driver
   * Called when search timer expires and pool has 2+ passengers
   */
  async completePoolSearch(poolId: string): Promise<ApiResponse<{ completed: boolean; new_status?: string; passengers?: number }>> {
    return apiClient.post(API_ENDPOINTS.POOL.COMPLETE_SEARCH(poolId));
  },
};
