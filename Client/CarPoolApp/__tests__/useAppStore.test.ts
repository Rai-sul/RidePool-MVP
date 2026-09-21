import { renderHook, act } from '@testing-library/react-native';
import { useAppStore } from '../store/useAppStore';
import type { Ride } from '../types';

// addRide takes a full Ride, so the fixtures have to be complete.
const makeRide = (overrides: Partial<Ride> = {}): Ride => ({
  id: '1',
  user_id: 'user-1',
  pool_id: null,
  pickup_lat: 23.8103,
  pickup_lng: 90.4125,
  pickup_address: 'A',
  pickup_h3_index: '891fb466257ffff',
  dropoff_lat: 23.7509,
  dropoff_lng: 90.3935,
  dropoff_address: 'B',
  dropoff_h3_index: '871fb4662ffffff',
  vehicle_type: 'CAR',
  gender_restriction: 'ANY',
  status: 'CREATING_POOL',
  booking_type: 'INSTANT',
  scheduled_pickup_at: null,
  fare: null,
  distance_km: null,
  is_on_front_route: true,
  route_deviation_km: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  started_at: null,
  completed_at: null,
  cancelled_reason: null,
  ...overrides,
});

describe('useAppStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.rides).toEqual([]);
    expect(result.current.selectedRide).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set user', () => {
    const { result } = renderHook(() => useAppStore());
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    
    act(() => {
      result.current.setUser(mockUser);
    });
    
    expect(result.current.user).toEqual(mockUser);
  });

  it('should add ride', () => {
    const { result } = renderHook(() => useAppStore());
    const mockRide = makeRide();
    
    act(() => {
      result.current.addRide(mockRide);
    });
    
    expect(result.current.rides).toHaveLength(1);
    expect(result.current.rides[0]).toEqual(mockRide);
  });

  it('should update ride', () => {
    const { result } = renderHook(() => useAppStore());
    const mockRide = makeRide({ status: 'CREATING_POOL' });

    act(() => {
      result.current.addRide(mockRide);
      result.current.updateRide('1', { status: 'MATCHED' });
    });

    expect(result.current.rides[0].status).toBe('MATCHED');
  });

  it('should remove ride', () => {
    const { result } = renderHook(() => useAppStore());
    const mockRide = makeRide();
    
    act(() => {
      result.current.addRide(mockRide);
      result.current.removeRide('1');
    });
    
    expect(result.current.rides).toHaveLength(0);
  });

  it('should set and clear error', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setError('Test error');
    });
    
    expect(result.current.error).toBe('Test error');
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });
});
