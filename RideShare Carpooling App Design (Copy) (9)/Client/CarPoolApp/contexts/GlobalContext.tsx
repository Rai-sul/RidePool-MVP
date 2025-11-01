import { createContext, useState, useContext } from 'react';

export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  gender: 'male' | 'female';
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
};

type GlobalContextType = {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedRideType, setSelectedRideType] = useState<'female-only' | 'regular' | null>(null);

  return (
    <GlobalContext.Provider value={{
      userProfile,
      setUserProfile,
      activeTab,
      setActiveTab,
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