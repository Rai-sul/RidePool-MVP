import { createContext, useState, useContext, useEffect } from 'react';
import { useAuthContext } from './AuthContext';
import { Pool as ApiPool, PoolStatus, VehicleType, GenderPreference } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for persisting active trip
const ACTIVE_TRIP_STORAGE_KEY = '@carpool_active_trip';

export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  gender: 'male' | 'female';
  full_name?: string;
  phone?: string;
  id?: string;
};

// Extended Pool type for UI display (includes both API data and display helpers)
export type Pool = ApiPool & {
  // Display-friendly computed properties (optional, for UI convenience)
  driverName?: string;
  seatsLeft?: number;
  savings?: number;
  eta?: number;
  walkDistance?: number;
  rating?: number;
  carModel?: string;
  licensePlate?: string;
  photo?: string;
};

// Helper function to create display-friendly pool from API pool
export function toDisplayPool(apiPool: ApiPool): Pool {
  return {
    ...apiPool,
    driverName: 'Driver',
    seatsLeft: apiPool.max_passengers - apiPool.current_passengers,
    savings: apiPool.fare_per_person ? Math.round(apiPool.fare_per_person * 0.3) : 0,
    eta: 5, // Will be calculated from actual route
    walkDistance: 0,
    rating: apiPool.driver?.average_rating || 0,
    carModel: apiPool.vehicles?.model || apiPool.vehicle_type,
    licensePlate: apiPool.vehicles?.vehicle_number || '',
    photo: apiPool.driver?.id?.charAt(0).toUpperCase() || 'D',
  };
}

export type Destination = {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export type Location = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

// Active trip state that persists across navigation
export type ActiveTripState = {
  poolId: string;
  pool: Pool;
  pickupLocation: Location | null;
  destination: Destination | null;
  rideType: 'female-only' | 'regular' | null;
  createdAt: string;
  status: 'searching' | 'waiting' | 'in_progress' | 'completed';
};

type GlobalContextType = {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pickupLocation: Location | null;
  setPickupLocation: (location: Location | null) => void;
  selectedDestination: Destination | null;
  setSelectedDestination: (destination: Destination | null) => void;
  selectedPool: Pool | null;
  setSelectedPool: (pool: Pool | null) => void;
  selectedRideType: 'female-only' | 'regular' | null;
  setSelectedRideType: (rideType: 'female-only' | 'regular' | null) => void;
  // New: Active trip management
  activeTrip: ActiveTripState | null;
  hasActiveTrip: boolean;
  startTrip: (pool: Pool) => void;
  updateTripStatus: (status: ActiveTripState['status']) => void;
  endTrip: () => void;
};

const GlobalContext = createContext<GlobalContextType>({
  userProfile: null,
  setUserProfile: () => {},
  activeTab: 'home',
  setActiveTab: () => {},
  pickupLocation: null,
  setPickupLocation: () => {},
  selectedDestination: null,
  setSelectedDestination: () => {},
  selectedPool: null,
  setSelectedPool: () => {},
  selectedRideType: null,
  setSelectedRideType: () => {},
  // New: Active trip defaults
  activeTrip: null,
  hasActiveTrip: false,
  startTrip: () => {},
  updateTripStatus: () => {},
  endTrip: () => {},
});

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedRideType, setSelectedRideType] = useState<'female-only' | 'regular' | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTripState | null>(null);

  // Sync with AuthContext
  const { user: authUser } = useAuthContext();
  
  // Load persisted active trip on mount
  useEffect(() => {
    const loadActiveTrip = async () => {
      try {
        const stored = await AsyncStorage.getItem(ACTIVE_TRIP_STORAGE_KEY);
        if (stored) {
          const trip = JSON.parse(stored) as ActiveTripState;
          // Only restore if trip is not completed
          if (trip.status !== 'completed') {
            console.log('[GlobalContext] Restored active trip:', trip.poolId);
            setActiveTrip(trip);
            setSelectedPool(trip.pool);
            setPickupLocation(trip.pickupLocation);
            setSelectedDestination(trip.destination);
            setSelectedRideType(trip.rideType);
          } else {
            // Clear completed trips
            await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.warn('[GlobalContext] Failed to load active trip:', err);
      }
    };
    
    loadActiveTrip();
  }, []);
  
  useEffect(() => {
    if (authUser) {
      // Parse full_name into firstName and lastName
      let firstName = '';
      let lastName = '';
      
      if (authUser.full_name) {
        const nameParts = authUser.full_name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      setUserProfile({
        firstName,
        lastName,
        email: authUser.email,
        gender: authUser.gender?.toLowerCase() as 'male' | 'female' || 'male',
        full_name: authUser.full_name,
        phone: authUser.phone,
        id: authUser.id,
      });
    } else {
      setUserProfile(null);
    }
  }, [authUser]);

  // Start a new trip (when user creates or joins a pool)
  const startTrip = async (pool: Pool) => {
    const trip: ActiveTripState = {
      poolId: pool.id,
      pool,
      pickupLocation,
      destination: selectedDestination,
      rideType: selectedRideType,
      createdAt: new Date().toISOString(),
      status: 'waiting',
    };
    
    setActiveTrip(trip);
    setSelectedPool(pool);
    
    // Persist to storage
    try {
      await AsyncStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(trip));
      console.log('[GlobalContext] Active trip saved:', pool.id);
    } catch (err) {
      console.warn('[GlobalContext] Failed to save active trip:', err);
    }
  };

  // Update trip status
  const updateTripStatus = async (status: ActiveTripState['status']) => {
    if (!activeTrip) return;
    
    const updatedTrip = { ...activeTrip, status };
    setActiveTrip(updatedTrip);
    
    try {
      await AsyncStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(updatedTrip));
    } catch (err) {
      console.warn('[GlobalContext] Failed to update trip status:', err);
    }
  };

  // End/clear the current trip
  const endTrip = async () => {
    setActiveTrip(null);
    setSelectedPool(null);
    
    try {
      await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
      console.log('[GlobalContext] Active trip cleared');
    } catch (err) {
      console.warn('[GlobalContext] Failed to clear active trip:', err);
    }
  };

  // Computed: whether there's an active trip
  const hasActiveTrip = activeTrip !== null && activeTrip.status !== 'completed';

  return (
    <GlobalContext.Provider value={{
      userProfile,
      setUserProfile,
      activeTab,
      setActiveTab,
      pickupLocation,
      setPickupLocation,
      selectedDestination,
      setSelectedDestination,
      selectedPool,
      setSelectedPool,
      selectedRideType,
      setSelectedRideType,
      // New: Active trip
      activeTrip,
      hasActiveTrip,
      startTrip,
      updateTripStatus,
      endTrip,
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext() {
  return useContext(GlobalContext);
}