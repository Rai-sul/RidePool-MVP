import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Ride, PaginatedResponse, VehicleType, GenderPreference } from '../types';

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

export interface RideEstimate {
  distanceKm: number;
  durationMinutes: number;
  durationInTraffic: number;
  eta: string;
  etaWithoutTraffic: string;
  fareEstimates: {
    solo: number;
    with2Passengers: number;
    with3Passengers: number;
    with4Passengers: number;
  };
  estimatedFare: number;
  estimatedSavings: number;
  trafficLevel: 'low' | 'moderate' | 'high';
}

export interface AlternativeRouteInfo {
  description: string;
  distanceKm: number;
  durationInTraffic: number;
  timeDifference: number;
  trafficLevel: 'low' | 'moderate' | 'high';
}

export interface RideEstimateResponse {
  estimate: RideEstimate;
  route?: {
    encoded: string;
    coordinates: Array<{ lat: number; lng: number }>;
    summary?: string;
    selectedReason?: string;
  };
  alternativeRoutes: AlternativeRouteInfo[];
  message: string;
  trafficInfo: string;
}

export interface GetRideEstimateParams {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  vehicle_type: VehicleType;
}

export const rideService = {
  /**
   * Get ride estimate (ETA and fare) before confirming
   */
  async getRideEstimate(params: GetRideEstimateParams): Promise<ApiResponse<RideEstimateResponse>> {
    return apiClient.get(API_ENDPOINTS.RIDE.ESTIMATE, params);
  },

  /**
   * Request a new ride
   */
  async requestRide(data: CreateRideRequest): Promise<ApiResponse<Ride>> {
    return apiClient.post(API_ENDPOINTS.RIDE.REQUEST, data);
  },

  /**
   * Get ride history for current user
   */
  async getRideHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Ride>>> {
    return apiClient.get(API_ENDPOINTS.RIDE.HISTORY, params);
  },

  /**
   * Cancel a ride with optional reason
   */
  async cancelRide(rideId: string, reason?: string): Promise<ApiResponse> {
    return apiClient.put(API_ENDPOINTS.RIDE.CANCEL(rideId), { reason });
  },
};
