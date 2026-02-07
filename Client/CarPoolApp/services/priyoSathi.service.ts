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
}

export const priyoSathiService = new PriyoSathiService();
