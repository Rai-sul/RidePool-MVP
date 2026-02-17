import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Pool, Location, DriverStatus, EarningEntry, Vehicle } from '../types';

interface DriverState {
  user: User | null;
  vehicle: Vehicle | null;
  isAuthenticated: boolean;
  driverStatus: DriverStatus;
  currentLocation: Location | null;
  availablePools: Pool[];
  activePool: Pool | null;
  todayEarnings: number;
  todayRides: number;
  earningsHistory: EarningEntry[];
  isLoading: boolean;
  error: string | null;
  incomingPoolRequest: Pool | null;
}

interface DriverActions {
  setUser: (user: User | null) => void;
  setVehicle: (vehicle: Vehicle | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setDriverStatus: (status: DriverStatus) => void;
  setCurrentLocation: (location: Location | null) => void;
  setAvailablePools: (pools: Pool[]) => void;
  setActivePool: (pool: Pool | null) => void;
  setTodayEarnings: (earnings: number) => void;
  setTodayRides: (rides: number) => void;
  setEarningsHistory: (earnings: EarningEntry[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setIncomingPoolRequest: (pool: Pool | null) => void;
  logout: () => void;
  reset: () => void;
}

type DriverStore = DriverState & DriverActions;

const initialState: DriverState = {
  user: null,
  vehicle: null,
  isAuthenticated: false,
  driverStatus: 'OFFLINE',
  currentLocation: null,
  availablePools: [],
  activePool: null,
  todayEarnings: 0,
  todayRides: 0,
  earningsHistory: [],
  isLoading: false,
  error: null,
  incomingPoolRequest: null,
};

export const useDriverStore = create<DriverStore>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setVehicle: (vehicle) => set({ vehicle }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setDriverStatus: (driverStatus) => set({ driverStatus }),
      setCurrentLocation: (currentLocation) => set({ currentLocation }),
      setAvailablePools: (availablePools) => set({ availablePools }),
      setActivePool: (activePool) => set({ activePool }),
      setTodayEarnings: (todayEarnings) => set({ todayEarnings }),
      setTodayRides: (todayRides) => set({ todayRides }),
      setEarningsHistory: (earningsHistory) => set({ earningsHistory }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setIncomingPoolRequest: (incomingPoolRequest) => set({ incomingPoolRequest }),

      logout: () => set({
        user: null,
        vehicle: null,
        isAuthenticated: false,
        driverStatus: 'OFFLINE',
        activePool: null,
        availablePools: [],
        incomingPoolRequest: null,
      }),

      reset: () => set(initialState),
    }),
    {
      name: 'driver-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        vehicle: state.vehicle,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
