import { renderHook, act } from '@testing-library/react-native';
import { useAppStore } from '../store/useAppStore';

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
    const mockRide = { 
      id: '1', 
      origin: 'A', 
      destination: 'B', 
      departureTime: new Date().toISOString() 
    };
    
    act(() => {
      result.current.addRide(mockRide);
    });
    
    expect(result.current.rides).toHaveLength(1);
    expect(result.current.rides[0]).toEqual(mockRide);
  });

  it('should update ride', () => {
    const { result } = renderHook(() => useAppStore());
    const mockRide = { 
      id: '1', 
      origin: 'A', 
      destination: 'B', 
      status: 'pending' 
    };
    
    act(() => {
      result.current.addRide(mockRide);
      result.current.updateRide('1', { status: 'active' });
    });
    
    expect(result.current.rides[0].status).toBe('active');
  });

  it('should remove ride', () => {
    const { result } = renderHook(() => useAppStore());
    const mockRide = { id: '1', origin: 'A', destination: 'B' };
    
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
