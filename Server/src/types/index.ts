// ============================================
// CORE TYPES
// ============================================

export interface Location {
  latitude: number;
  longitude: number;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type GenderPreference = 'FEMALE_ONLY' | 'ANY';
export type VehicleType = 'CAR' | 'CNG';
export type UserPoolStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

// ============================================
// USER & AUTHENTICATION
// ============================================

export interface User {
  id: string;
  phone: string;
  phone_verified: boolean;
  gender: Gender;
  gender_preference: GenderPreference;
  is_driver: boolean;
  
  // Stats (read-only, updated by backend)
  average_rating: number | null;
  total_ratings: number;
  total_rides: number;
  
  // Driver priority destination
  driver_priority_lat: number | null;
  driver_priority_lng: number | null;
  driver_priority_address: string | null;
  driver_priority_h3_index: string | null;
  
  // Metadata
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  // Extended profile info (optional fields)
  email?: string;
  profile_image_url?: string;
}

// ============================================
// WALLET & PAYMENTS
// ============================================

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'BONUS';

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export type PaymentMethod = 'WALLET' | 'CARD' | 'MOBILE_BANKING' | 'CASH';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Payment {
  id: string;
  ride_id: string;
  user_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_id: string | null;
  idempotency_key: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

// ============================================
// SAVED PLACES
// ============================================

export interface SavedPlace {
  id: string;
  user_id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  h3_index: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// EMERGENCY CONTACTS
// ============================================

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string | null;
  is_primary: boolean;
  created_at: string;
}

// ============================================
// VEHICLES
// ============================================

export interface Vehicle {
  id: string;
  driver_id: string;
  vehicle_type: VehicleType;
  vehicle_number: string;
  model: string | null;
  color: string | null;
  max_passengers: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleLocation {
  id: string;
  vehicle_id: string;
  driver_id: string;
  pool_id: string | null;
  lat: number;
  lng: number;
  h3_index_res8: string | null;  // For driver search (~461m)
  h3_index_res9: string | null;  // For pickup matching (~174m)
  heading: number | null;
  speed_kmh: number | null;
  is_active: boolean;
  is_available: boolean;
  recorded_at: string;
}

// ============================================
// RIDES & POOLS
// ============================================

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
  
  // Pickup location
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  pickup_h3_index: string;  // Resolution 9 (~174m)
  
  // Dropoff location
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  dropoff_h3_index: string;  // Resolution 7 (~5.2km)
  
  // Ride details
  vehicle_type: VehicleType;
  gender_restriction: GenderPreference;
  status: RideStatus;
  
  // Pricing & distance
  fare: number | null;
  distance_km: number | null;
  
  // Route matching (calculated by backend)
  is_on_front_route: boolean;
  route_deviation_km: number | null;
  
  // Lifecycle
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
  
  // Destination location
  destination_lat: number;
  destination_lng: number;
  destination_address: string | null;
  destination_h3_index: string;  // Resolution 7 (~5.2km)
  
  // Pool details
  vehicle_type: VehicleType;
  gender_restriction: GenderPreference;
  
  // Passengers
  current_passengers: number;
  max_passengers: number;
  
  // Matching & viability (calculated by backend)
  viability_score: number | null;
  score_breakdown: Record<string, any> | null;
  fare_per_person: number | null;
  
  // Lifecycle
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  deleted_at: string | null;
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

// ============================================
// H3 MATCHING
// ============================================

export interface H3MatchingResult {
  poolId: string;
  h3Distance: number;  // Grid distance in hexagons
  destinationHexMatch: boolean;
  commonHexagons: string[];
  viabilityScore: number;
  estimatedDetour: number;  // km
}

export interface DriverSearchResult {
  driverId: string;
  vehicleId: string;
  lat: number;
  lng: number;
  h3_index_res9: string;
  distanceToPickup: number;  // km
  estimatedArrivalMinutes: number;
  isAvailable: boolean;
}

// ============================================
// RELATIONSHIPS & CONNECTIONS
// ============================================

export type PriyoSathiStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';

export interface PriyoSathi {
  id: string;
  user_id: string;
  companion_id: string;
  status: PriyoSathiStatus;
  created_at: string;
}

// ============================================
// RATINGS & REVIEWS
// ============================================

export interface Rating {
  id: string;
  ride_id: string;
  rater_id: string;
  rated_id: string;
  rating: number;  // 1-5
  comment: string | null;
  tags: string[] | null;
  created_at: string;
}

// ============================================
// SAFETY & SHARING
// ============================================

export type SafetyIncidentType =
  | 'HARASSMENT'
  | 'ACCIDENT'
  | 'VEHICLE_ISSUE'
  | 'DRIVER_BEHAVIOR'
  | 'PASSENGER_BEHAVIOR'
  | 'OTHER';

export interface RideSharing {
  id: string;
  ride_id: string;
  shared_with_name: string | null;
  shared_with_phone: string | null;
  tracking_url: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface SafetyIncident {
  id: string;
  ride_id: string | null;
  reported_by: string;
  incident_type: SafetyIncidentType;
  description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  status: 'REPORTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  created_at: string;
}

// ============================================
// MESSAGING
// ============================================

export type MessageType = 'TEXT' | 'SYSTEM' | 'LOCATION' | 'RATING_REQUEST';

export interface Conversation {
  id: string;
  type: 'POOL' | 'SUPPORT' | 'DRIVER_RIDER';
  pool_id: string | null;
  created_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string | null;
  message_type: MessageType;
  is_system: boolean;
  created_at: string;
}

// ============================================
// NOTIFICATIONS
// ============================================

export type NotificationType =
  | 'POOL_MATCH'
  | 'DRIVER_ASSIGNED'
  | 'RIDE_STARTED'
  | 'RIDE_COMPLETED'
  | 'PAYMENT_RECEIVED'
  | 'RATING_REQUEST'
  | 'MESSAGE'
  | 'SYSTEM';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
}

// ============================================
// PROMO CODES
// ============================================

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_ride_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserPromoUsage {
  id: string;
  user_id: string;
  promo_code_id: string;
  ride_id: string | null;
  discount_amount: number | null;
  used_at: string;
}

// ============================================
// AUDIT LOG
// ============================================

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_by: string | null;
  ip_address: string | null;
  created_at: string;
}

// ============================================
// APP METADATA
// ============================================

export interface AppMetadata {
  id: string;
  key: string;
  value: Record<string, any>;
  description: string | null;
  category: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface H3Config {
  pickup: number;        // Resolution 9
  destination: number;   // Resolution 7
  driver_search: number; // Resolution 8
}

export interface H3SearchRing {
  pickup: number;    // Ring radius for pickup
  destination: number; // Ring radius for destination
  driver: number;    // Ring radius for driver search
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

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
  pickup_lat: number;
  pickup_lng: number;
  pickup_address?: string;
  destination_lat: number;
  destination_lng: number;
  destination_address?: string;
  vehicle_type: VehicleType;
  max_passengers: number;
  gender_restriction?: GenderPreference;
}

export interface UpdatePoolStatusRequest {
  status: PoolStatus;
  driver_id?: string;
  vehicle_id?: string;
}

export interface UpdateVehicleLocationRequest {
  lat: number;
  lng: number;
  heading?: number;
  speed_kmh?: number;
}

export interface JoinPoolRequest {
  pool_id: string;
  ride_id: string;
}

export interface CreateRatingRequest {
  rated_id: string;
  rating: number;
  comment?: string;
  tags?: string[];
}

export interface SendMessageRequest {
  conversation_id: string;
  message_text?: string;
  message_type: MessageType;
}

// ============================================
// POOL SEARCH RESPONSE TYPES
// ============================================

export type AlternativeAction = 
  | 'CREATE_POOL' 
  | 'JOIN_WAITLIST' 
  | 'ADJUST_DESTINATION' 
  | 'TRY_DIFFERENT_TIME'
  | 'EXPAND_SEARCH';

export interface AlternativeSuggestion {
  action: AlternativeAction;
  title: string;
  description: string;
  icon?: string;
  priority: number;
  metadata?: Record<string, any>;
}

export interface PoolSearchAnalytics {
  totalPoolsChecked: number;
  destinationHexagonsSearched: number;
  pickupHexagonsSearched: number;
  incompatibleReasons: Record<string, number>;
  averagePoolDistance?: number;
  searchRadius: number;
  peakHoursNearby?: boolean;
}

export interface NearbyPoolInfo {
  poolId: string;
  distance: number;
  destination: string;
  currentPassengers: number;
  maxPassengers: number;
  incompatibilityReason: string;
}

export interface PoolSearchMetadata {
  hasNearbyPools: boolean;
  nearbyPools?: NearbyPoolInfo[];
  suggestedDestinationAdjustment?: {
    direction: string;
    distanceKm: number;
  };
  peakHours?: Array<{ start: string; end: string }>;
  estimatedWaitTime?: number;
}

// ============================================
// H3 RESOLUTION REFERENCE
// ============================================

/**
 * H3 Resolution Guide
 * 
 * Resolution | Avg Hexagon Edge | Use Case
 * -----------|------------------|---------------------------
 * 7          | ~5.2 km          | Destination area matching
 * 8          | ~461 m           | Driver search radius
 * 9          | ~174 m           | Pickup point matching
 * 10         | ~65 m            | Not used (too precise)
 */