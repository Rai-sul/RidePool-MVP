import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Pool, VehicleType, GenderPreference } from '../types';

export interface CreatePoolRequest {
  pickup_lat: number;
  pickup_lng: number;
  pickup_address?: string;
  pickup_name?: string;
  destination_lat: number;
  destination_lng: number;
  destination_address?: string;
  destination_name?: string;
  vehicle_type: VehicleType;
  max_passengers?: number;
  gender_restriction?: GenderPreference;
}

// Search timing from server - single source of truth
export interface SearchTiming {
  elapsedSeconds?: number;
  remainingSeconds: number;
  phase: 'INITIAL' | 'EXTENDED' | 'EXPIRED';
  isExpired?: boolean;
  initialSeconds: number;
  extendedSeconds: number;
  totalSeconds: number;
}

export interface CreatePoolResponse {
  pool: Pool;
  ride?: {
    id: string;
    user_id: string;
    pickup_lat: number;
    pickup_lng: number;
    pickup_address?: string;
    dropoff_lat: number;
    dropoff_lng: number;
    dropoff_address?: string;
    status: string;
  };
  search_timing: {
    initial_seconds: number;
    extended_seconds: number;
    total_seconds: number;
    expires_at: string;
  };
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
    estimatedDetourMinutes?: number;
    // Estimated time (in minutes) for driver to detour from pool pickup to user's pickup
    pickupDetourMinutes?: number;
    exactDistance?: number;
    exactETA?: number;
    // Pool pickup location (where the pool's creator/driver is)
    poolPickupLocation?: {
      lat: number;
      lng: number;
      address?: string;
      name?: string;
    };
    // Pool dropoff location (pool destination / creator dropoff)
    poolDropoffLocation?: {
      lat: number;
      lng: number;
      address?: string;
      name?: string;
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
  search_timing: SearchTiming | null;
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

export interface PoolPreviewParams {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  pickup_address?: string;
  pickup_name?: string;
  dropoff_address?: string;
  dropoff_name?: string;
}

export interface PoolPreviewStop {
  type: 'pickup' | 'dropoff';
  userId: string;
  address?: string;
  location: { latitude: number; longitude: number };
  order: number;
  estimatedArrival: number;
  isCurrentUser: boolean;
}

export interface PoolPreviewResponse {
  poolId: string;
  memberCount: number;
  userEstimate: {
    fare: number;
    savings: number;
    durationMinutes: number;
    distanceKm: number;
  };
  route: {
    totalDistanceKm: number;
    totalDurationMinutes: number;
    farePerPerson: number;
    coordinates: Array<{ lat: number; lng: number }>;
    encoded: string;
  };
  stops: PoolPreviewStop[];
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
  name?: string;
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

// Navigation Link Response - FREE Google Maps navigation with optimized route
export interface NavigationLinkResponse {
  poolId: string;
  navigationUrl: string;
  // Platform-specific navigation URLs for better experience
  platformLinks?: {
    universal: string;  // Works on all platforms
    android: string;    // Uses google.navigation intent for direct navigation
    ios: string;        // Uses comgooglemaps:// scheme
  };
  instructions: string;
  origin: {
    location: { latitude: number; longitude: number };
    type: 'driver_location' | 'first_pickup';
    address?: string;
  };
  destination: {
    location: { latitude: number; longitude: number };
    address?: string;
  };
  // Ordered stops showing the optimal route sequence
  orderedStops: Array<{
    order: number;
    type: 'pickup' | 'dropoff' | 'driver';
    userId: string;
    isCurrentUser: boolean;
    name?: string;
    address?: string;
    location: { latitude: number; longitude: number };
    estimatedArrivalMinutes: number;
  }>;
  // Individual location links for each member
  waypoints: Array<{
    userId: string;
    isCurrentUser: boolean;
    pickup: {
      location: { latitude: number; longitude: number };
      name?: string;
      address?: string;
      mapLink: string;
    };
    dropoff: {
      location: { latitude: number; longitude: number };
      name?: string;
      address?: string;
      mapLink: string;
    };
  }>;
  routeInfo: {
    totalDistanceKm: number;
    totalDurationMinutes: number;
    trafficLevel: 'low' | 'moderate' | 'high';
    routeSummary: string;
  };
  meta: {
    waypointCount: number;
    totalStops: number;
    isDriver: boolean;
    isMember: boolean;
    freeNavigation: boolean;
    usesOptimizedRoute: boolean;
    costSavings: string;
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
   * Preview pool details and user-specific estimate before joining
   */
  async getPoolPreview(poolId: string, params: PoolPreviewParams): Promise<ApiResponse<PoolPreviewResponse>> {
    return apiClient.get(API_ENDPOINTS.POOL.PREVIEW(poolId), params);
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

  /**
   * Get FREE Google Maps navigation deep link
   * Opens Google Maps app with all waypoints - no API cost, uses native app
   * Both users and drivers can see all pickup/dropoff points
   */
  async getNavigationLink(poolId: string): Promise<ApiResponse<NavigationLinkResponse>> {
    return apiClient.get(API_ENDPOINTS.POOL.NAVIGATION_LINK(poolId));
  },
};
