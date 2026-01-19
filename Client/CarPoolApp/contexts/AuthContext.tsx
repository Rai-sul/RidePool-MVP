import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authService, userService } from '../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithOAuth, signOut as supabaseSignOut, OAuthProvider } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    phone?: string;
    full_name?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginWithOAuth: (provider: OAuthProvider) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
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
        } else {
          await AsyncStorage.removeItem('authToken');
        }
      }
    } catch (err: any) {
      console.error('Auth check failed:', err);
      await AsyncStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await userService.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (err: any) {
      console.error('Failed to refresh user:', err);
    }
  };

  const login = async (email: string, password: string) => {
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
  };

  const register = async (data: {
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
  };

  const loginWithOAuth = async (provider: OAuthProvider) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithOAuth(provider);
      // After OAuth redirect, session will be established
      await checkAuthStatus();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'OAuth login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      await supabaseSignOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        loginWithOAuth,
        logout,
        updateProfile,
        isAuthenticated: !!user,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
