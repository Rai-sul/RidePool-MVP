import { useState, useEffect, useCallback } from 'react';
import { authService, userService } from '../services/auth.service';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const response = await userService.getProfile();
        if (response.success && response.data) {
          setUser(response.data);
        }
      }
    } catch (err: any) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.login({ email, password });
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true };
      }
      throw new Error(response.message || 'Login failed');
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    phone?: string;
    full_name?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.register(data);
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true };
      }
      throw new Error(response.message || 'Registration failed');
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const response = await userService.updateProfile(data);
      if (response.success && response.data) {
        setUser(response.data);
        return { success: true };
      }
      throw new Error(response.message || 'Update failed');
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };
};
