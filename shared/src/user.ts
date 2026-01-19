export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type GenderPreference = 'FEMALE_ONLY' | 'ANY';
export type VehicleType = 'CAR' | 'CNG';

export interface User {
  id: string;
  email?: string;
  phone: string;
  phone_verified: boolean;
  full_name?: string;
  profile_image_url?: string;
  gender: Gender;
  gender_preference: GenderPreference;
  is_driver: boolean;
  average_rating: number | null;
  total_ratings: number;
  total_rides: number;
  driver_priority_lat: number | null;
  driver_priority_lng: number | null;
  driver_priority_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  music?: boolean;
  talking?: boolean;
  pets?: boolean;
  smoking?: boolean;
  ac?: boolean;
  max_wait_time?: number;
  preferred_gender?: GenderPreference;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in?: number;
}

export interface AuthResponse {
  user: User;
  session: AuthSession | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  phone: string;
  full_name: string;
  gender: Gender;
  gender_preference?: GenderPreference;
}

export interface RefreshRequest {
  refresh_token: string;
}
