import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Pool, Location, DriverStatus, EarningEntry } from '../types';

interface DriverState {
  user: User | null;
  isAuthenticated: boolean;
  driverStatus: DriverStatus;
  currentLocation: Location | null;
  priorityLocation: Location | null;
  availablePools: Pool[];
  activePool: Pool | null;
  todayEarnings: number;
  todayRides: number;
  earningsHistory: EarningEntry[];
  isLoading: boolean;
  error: string | null;
}

interface DriverActions {
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setDriverStatus: (status: DriverStatus) => void;
  setCurrentLocation: (location: Location | null) => void;
  setPriorityLocation: (location: Location | null) => void;
  setAvailablePools: (pools: Pool[]) => void;
  setActivePool: (pool: Pool | null) => void;
  setTodayEarnings: (earnings: number) => void;
  setTodayRides: (rides: number) => void;
  setEarningsHistory: (earnings: EarningEntry[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  reset: () => void;
}

type DriverStore = DriverState & DriverActions;

const initialState: DriverState = {
  user: null,
  isAuthenticated: false,
  driverStatus: 'OFFLINE',
  currentLocation: null,
  priorityLocation: null,
  availablePools: [],
  activePool: null,
  todayEarnings: 0,
  todayRides: 0,
  earningsHistory: [],
  isLoading: false,
  error: null,
};

export const useDriverStore = create<DriverStore>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setDriverStatus: (driverStatus) => set({ driverStatus }),
      setCurrentLocation: (currentLocation) => set({ currentLocation }),
      setPriorityLocation: (priorityLocation) => set({ priorityLocation }),
      setAvailablePools: (availablePools) => set({ availablePools }),
      setActivePool: (activePool) => set({ activePool }),
      setTodayEarnings: (todayEarnings) => set({ todayEarnings }),
      setTodayRides: (todayRides) => set({ todayRides }),
      setEarningsHistory: (earningsHistory) => set({ earningsHistory }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      logout: () => set({
        user: null,
        isAuthenticated: false,
        driverStatus: 'OFFLINE',
        activePool: null,
        availablePools: [],
      }),

      reset: () => set(initialState),
    }),
    {
      name: 'driver-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        priorityLocation: state.priorityLocation,
      }),
    }
  )
);
