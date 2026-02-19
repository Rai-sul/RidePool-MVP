import { Location, VehicleType, GenderPreference } from './user';

export type RideStatus =
  | 'CREATING_POOL'
  | 'WAITING_FOR_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PoolStatus =
  | 'WAITING_FOR_RIDERS'
  | 'WAITING_FOR_DRIVER'
  | 'READY_TO_START'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Ride {
  id: string;
  user_id: string;
  pool_id: string | null;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  pickup_h3_index: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  dropoff_h3_index: string;
  vehicle_type: VehicleType;
  gender_restriction: GenderPreference;
  status: RideStatus;
  fare: number | null;
  distance_km: number | null;
  is_on_front_route: boolean;
  route_deviation_km: number | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_reason: string | null;
}

export interface Pool {
  id: string;
  creator_user_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  status: PoolStatus;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  pickup_h3_index: string;
  destination_lat: number;
  destination_lng: number;
  destination_address: string | null;
  destination_h3_index: string;
  vehicle_type: VehicleType;
  gender_restriction: GenderPreference;
  current_passengers: number;
  max_passengers: number;
  viability_score: number | null;
  base_distance_km: number | null;
  base_duration_minutes: number | null;
  extended_search_h3: string[] | null;
  extended_pickup_h3: string[] | null;
  fare_per_person: number | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  ride_id: string;
  join_type: 'INITIAL' | 'MATCHED' | 'ADDED';
  join_score: number | null;
  is_front_route: boolean;
  joined_at: string;
  left_at: string | null;
}

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

export interface CreatePoolRequest {
  destination_lat: number;
  destination_lng: number;
  destination_address?: string;
  vehicle_type: VehicleType;
  max_passengers: number;
  gender_restriction?: GenderPreference;
}

export interface JoinPoolRequest {
  pool_id: string;
  ride_id: string;
}

export interface PoolSearchRequest {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  vehicle_type?: VehicleType;
  gender_restriction?: GenderPreference;
}

export interface PoolSearchResult {
  poolId: string;
  pool: Pool;
  viabilityScore: number;
  estimatedFare: number;
  estimatedSavings: number;
  estimatedDetour: number;
  currentPassengers: number;
  maxPassengers: number;
}

// ============================================
// RIDE ESTIMATION TYPES
// ============================================

export interface RideEstimate {
  distanceKm: number;
  durationMinutes: number;
  fareEstimates: {
    solo: number;
    with2Passengers: number;
    with3Passengers: number;
    with4Passengers: number;
  };
  estimatedFare: number;
  estimatedSavings: number;
  trafficLevel?: 'low' | 'moderate' | 'high';
}

export interface RideEstimateResponse {
  estimate: RideEstimate;
  route?: {
    encoded: string;
    coordinates: Array<{ lat: number; lng: number }>;
  };
  message: string;
}

// ============================================
// POOL ROUTE OPTIMIZATION TYPES
// ============================================

export interface PoolRouteStop {
  type: 'pickup' | 'dropoff';
  userId: string;
  address?: string;
  location: Location;
  order: number;
  estimatedArrival: number;
}

export interface PoolRouteLeg {
  from: Location;
  to: Location;
  distanceKm: number;
  durationMinutes: number;
  instruction: string;
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
  legs: PoolRouteLeg[];
}

export interface PoolFareBreakdown {
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
}

export interface MemberFare {
  userId: string;
  fare: number;
  distanceKm: number;
  savings: number;
}

export interface PoolFareResponse {
  poolId: string;
  farePerPerson: number;
  totalFare: number;
  memberCount: number;
  breakdown: PoolFareBreakdown;
  memberFares: MemberFare[];
  message: string;
}

// ============================================
// COMBINED SMART ROUTE TYPES
// ============================================

export interface CombinedRouteWaypoint {
  id: string;
  type: 'pickup' | 'dropoff' | 'driver';
  userId: string;
  location: Location;
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
