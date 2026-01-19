export type SafetyIncidentType =
  | 'HARASSMENT'
  | 'ACCIDENT'
  | 'VEHICLE_ISSUE'
  | 'DRIVER_BEHAVIOR'
  | 'PASSENGER_BEHAVIOR'
  | 'OTHER';

export type SafetyIncidentStatus =
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'DISMISSED';

export interface SafetyIncident {
  id: string;
  ride_id: string | null;
  reported_by: string;
  incident_type: SafetyIncidentType;
  description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  status: SafetyIncidentStatus;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface RideSharing {
  id: string;
  ride_id: string;
  shared_with_name: string | null;
  shared_with_phone: string | null;
  tracking_url: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ReportIncidentRequest {
  ride_id?: string;
  incident_type: SafetyIncidentType;
  description?: string;
  location_lat?: number;
  location_lng?: number;
}

export interface AddEmergencyContactRequest {
  name: string;
  phone: string;
  relationship?: string;
  is_primary?: boolean;
}

export interface ShareTripRequest {
  ride_id: string;
  shared_with_name?: string;
  shared_with_phone?: string;
  expires_in_hours?: number;
}

export interface SOSRequest {
  ride_id?: string;
  location_lat: number;
  location_lng: number;
  message?: string;
}
