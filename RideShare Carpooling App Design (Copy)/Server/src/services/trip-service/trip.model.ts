export interface Trip {
  id: string;
  userId: string;
  driverId?: string; // Driver is optional for pooled trips initially
  origin: string;
  destination: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' | 'pooled';
  fare: number;
  poolId?: string; // Identifier for the ride pool
  passengers?: string[]; // Array of user IDs in the pool
  vehicleType?: 'car' | 'cng';
  maxPassengers?: number;
  createdAt: number; // Timestamp for pool creation/trip request
  originLat?: number;
  originLng?: number;
}

export interface RidePool {
  id: string;
  trips: Trip[]; // Trips belonging to this pool
  currentPassengers: number;
  maxPassengers: number;
  vehicleType: 'car' | 'cng';
  origin: string; // Common origin for the pool
  destination: string; // Common destination for the pool
  status: 'open' | 'matched' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: number; // Timestamp for pool creation
  driverId?: string;
}
