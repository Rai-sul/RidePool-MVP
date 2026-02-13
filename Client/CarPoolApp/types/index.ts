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

export type RideStatus = 
  | 'CREATING_POOL'
  | 'SEARCHING'      // Pool creator is searching for other riders
  | 'MATCHED'        // Another rider has joined the pool
  | 'CONFIRMED'      // Search time finished with riders joined
  | 'WAITING_FOR_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Ride {
  id: string;
  user_id: string;
  pool_id: string | null;
  
  // Pickup location
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  pickup_h3_index: string;
  
  // Dropoff location
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  dropoff_h3_index: string;
  
  // Ride details
  vehicle_type: VehicleType;
  gender_restriction: GenderPreference;
  status: RideStatus;
  
  // Pricing & distance
  fare: number | null;
  distance_km: number | null;
  
  // Route matching
  is_on_front_route: boolean;
  route_deviation_km: number | null;
  
  // Lifecycle
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_reason: string | null;
}

export type PoolStatus =
  | 'WAITING_FOR_RIDERS'
  | 'WAITING_FOR_DRIVER'
  | 'READY_TO_START'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Pool {
  id: string;
  creator_user_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  
  status: PoolStatus;
  
  // Destination location
  destination_lat: number;
  destination_lng: number;
  destination_address: string | null;
  destination_h3_index: string;
  
  // Pool details
  vehicle_type: VehicleType;
  gender_restriction: GenderPreference;
  
  // Passengers
  current_passengers: number;
  max_passengers: number;
  
  // Matching & viability
  viability_score: number | null;
  score_breakdown: Record<string, any> | null;
  fare_per_person: number | null;
  
  // Lifecycle
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  deleted_at: string | null;
  
  // Relations (optional, from joins)
  pool_members?: PoolMember[];
  vehicles?: Vehicle;
  driver?: { id: string; average_rating: number | null };
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

export interface Vehicle {
  id: string;
  driver_id: string;
  vehicle_type: VehicleType;
  vehicle_number: string;
  model: string | null;
  color: string | null;
  max_passengers: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
