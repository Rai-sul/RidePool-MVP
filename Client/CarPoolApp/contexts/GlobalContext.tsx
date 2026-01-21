import { createContext, useState, useContext, useEffect } from 'react';
import { useAuthContext } from './AuthContext';

export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  gender: 'male' | 'female';
  full_name?: string;
  phone?: string;
  id?: string;
};

export type Pool = {
  id: string;
  driverName: string;
  seatsLeft: number;
  savings: number;
  eta: number;
  walkDistance: number;
  rating: number;
  carModel: string;
  licensePlate: string;
  photo: string;
  vehicleType: 'car' | 'cng';
};

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
});

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedRideType, setSelectedRideType] = useState<'female-only' | 'regular' | null>(null);

  // Sync with AuthContext
  const { user: authUser } = useAuthContext();
  
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
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext() {
  return useContext(GlobalContext);
}