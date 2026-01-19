import { create } from 'zustand';
import { User } from '../types/user';
import { Ride } from '../types/ride';

interface AppState {
  user: User | null;
  rides: Ride[];
  selectedRide: Ride | null;
  isLoading: boolean;
  error: string | null;
  
  setUser: (user: User | null) => void;
  setRides: (rides: Ride[]) => void;
  setSelectedRide: (ride: Ride | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addRide: (ride: Ride) => void;
  updateRide: (id: string, updates: Partial<Ride>) => void;
  removeRide: (id: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  rides: [],
  selectedRide: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setRides: (rides) => set({ rides }),
  setSelectedRide: (ride) => set({ selectedRide: ride }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  addRide: (ride) => set((state) => ({ rides: [...state.rides, ride] })),
  
  updateRide: (id, updates) => set((state) => ({
    rides: state.rides.map((ride) => 
      ride.id === id ? { ...ride, ...updates } : ride
    ),
  })),
  
  removeRide: (id) => set((state) => ({
    rides: state.rides.filter((ride) => ride.id !== id),
  })),
  
  clearError: () => set({ error: null }),
  
  reset: () => set({
    user: null,
    rides: [],
    selectedRide: null,
    isLoading: false,
    error: null,
  }),
}));
