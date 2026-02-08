import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';

export interface Companion {
  id: string;
  companion_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  created_at: string;
  companion?: {
    id: string;
    phone?: string;
    full_name?: string;
    average_rating?: number;
  };
}

export interface NearbyCompanion {
  companion_id: string;
  name?: string;
  phone?: string;
  rating?: number;
  distance_km?: string;
  detour_minutes?: number;
  is_on_route: boolean;
  can_auto_match: boolean;
  match_reason: string;
}

export interface NearbyCompanionsResponse {
  success: boolean;
  data: {
    candidates: NearbyCompanion[];
    auto_matchable_count: number;
    total_companions: number;
  };
}

export interface CompanionsResponse {
  success: boolean;
  data: {
    companions: Companion[];
    count: number;
    max_allowed: number;
  };
}

export interface InviteResponse {
  success: boolean;
  data: {
    message: string;
  };
}

export interface RideInviteDetails {
  ride_id: string;
  inviter_name: string;
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  vehicle_type: string;
  gender_restriction: string;
  ride_status: string;
  pool: {
    pool_id: string;
    status: string;
    current_passengers: number;
    max_passengers: number;
    fare_per_person: number;
    destination_address: string;
    estimated_duration_minutes?: number;
    estimated_distance_km?: number;
    can_join: boolean;
  } | null;
}

export interface RideInviteDetailsResponse {
  success: boolean;
  data: RideInviteDetails;
}

export interface AcceptRideInviteResponse {
  success: boolean;
  data: {
    ride_id: string;
    pool_id: string;
    message: string;
  };
}

class PriyoSathiService {
  /**
   * Get list of accepted Priyo Sathi companions
   */
  async getCompanions(): Promise<CompanionsResponse> {
    return apiClient.get<CompanionsResponse>(API_ENDPOINTS.PRIYO_SATHI.LIST);
  }

  /**
   * Get nearby companions based on pickup and destination
   */
  async getNearbyCompanions(
    pickupLat: number,
    pickupLng: number,
    destinationLat: number,
    destinationLng: number
  ): Promise<NearbyCompanionsResponse> {
    return apiClient.get<NearbyCompanionsResponse>(API_ENDPOINTS.PRIYO_SATHI.NEARBY, {
      pickup_lat: pickupLat.toString(),
      pickup_lng: pickupLng.toString(),
      destination_lat: destinationLat.toString(),
      destination_lng: destinationLng.toString(),
    });
  }

  /**
   * Invite a companion to join your ride
   */
  async inviteToRide(companionId: string, rideId: string): Promise<InviteResponse> {
    return apiClient.post<InviteResponse>(
      API_ENDPOINTS.PRIYO_SATHI.INVITE_TO_RIDE(companionId),
      { ride_id: rideId }
    );
  }

  /**
   * Add a new companion (send friend request)
   */
  async addCompanion(companionId: string): Promise<{ success: boolean; data: any }> {
    return apiClient.post(API_ENDPOINTS.PRIYO_SATHI.ADD, { companion_id: companionId });
  }

  /**
   * Remove a companion
   */
  async removeCompanion(companionId: string): Promise<{ success: boolean }> {
    return apiClient.delete(API_ENDPOINTS.PRIYO_SATHI.REMOVE(companionId));
  }

  /**
   * Get ride invite details - fetch the friend's ride and pool info
   */
  async getRideInviteDetails(rideId: string): Promise<RideInviteDetailsResponse> {
    return apiClient.get<RideInviteDetailsResponse>(API_ENDPOINTS.PRIYO_SATHI.GET_RIDE_INVITE(rideId));
  }

  /**
   * Accept a ride invite and join the friend's pool
   */
  async acceptRideInvite(
    rideId: string,
    pickupLat: number,
    pickupLng: number,
    pickupAddress?: string,
    dropoffLat?: number,
    dropoffLng?: number,
    dropoffAddress?: string,
    genderRestriction?: string
  ): Promise<AcceptRideInviteResponse> {
    return apiClient.post<AcceptRideInviteResponse>(
      API_ENDPOINTS.PRIYO_SATHI.ACCEPT_RIDE_INVITE(rideId),
      {
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        pickup_address: pickupAddress,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        dropoff_address: dropoffAddress,
        gender_restriction: genderRestriction,
      }
    );
  }
}

export const priyoSathiService = new PriyoSathiService();
