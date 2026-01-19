export interface User {
  id: string;
  email: string;
  phone?: string;
  full_name?: string;
  date_of_birth?: string;
  profile_picture_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  average_rating?: number;
  total_rides?: number;
  account_status?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  gender_preference?: 'FEMALE_ONLY' | 'ANY';
  is_driver?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type GenderPreference = 'FEMALE_ONLY' | 'ANY';
export type VehicleType = 'CAR' | 'CNG';

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

export interface UserPreferences {
  music?: boolean;
  talking?: boolean;
  pets?: boolean;
  smoking?: boolean;
  ac?: boolean;
  max_wait_time?: number;
  preferred_gender?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Ride {
  id: string;
  driver_id?: string;
  passenger_id?: string;
  pool_id?: string;
  pickup_location: Location;
  dropoff_location: Location;
  pickup_time?: string;
  dropoff_time?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  fare?: number;
  distance?: number;
  duration?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Pool {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  max_members?: number;
  is_active: boolean;
  created_at?: string;
  members?: User[];
}

export interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  license_expiry: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_plate?: string;
  status: 'available' | 'busy' | 'offline';
  average_rating?: number;
  total_trips?: number;
  created_at?: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet';
  last4?: string;
  brand?: string;
  is_default: boolean;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  ride_id?: string;
  amount: number;
  type: 'debit' | 'credit';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  ride_id?: string;
  pool_id?: string;
  message: string;
  is_read: boolean;
  created_at?: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  last_message?: Message;
  unread_count: number;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship?: string;
}

export interface SafetyIncident {
  id: string;
  user_id: string;
  ride_id?: string;
  incident_type: string;
  description: string;
  status: string;
  created_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  message?: string;
  timestamp?: string;
}
