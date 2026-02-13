import { VehicleType } from './user';

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

export interface VehicleLocation {
  id: string;
  vehicle_id: string;
  driver_id: string;
  pool_id: string | null;
  lat: number;
  lng: number;
  heading: number | null;
  speed_kmh: number | null;
  is_active: boolean;
  is_available: boolean;
  recorded_at: string;
}

export type DriverStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ON_TRIP';

export interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  license_expiry: string;
  status: DriverStatus;
  average_rating: number | null;
  total_trips: number;
  vehicle?: Vehicle;
  current_location?: VehicleLocation;
  created_at: string;
  updated_at: string;
}

export interface DriverEarnings {
  today: number;
  week: number;
  month: number;
  total: number;
  trips_today: number;
  bonus_earned: number;
}

export interface DriverStats {
  total_trips: number;
  total_distance_km: number;
  average_rating: number;
  acceptance_rate: number;
  cancellation_rate: number;
  online_hours_today: number;
}

export interface UpdateLocationRequest {
  lat: number;
  lng: number;
  heading?: number;
  speed_kmh?: number;
}

export interface GoOnlineRequest {
  vehicle_id: string;
  lat: number;
  lng: number;
}
