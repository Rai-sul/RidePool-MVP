import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { User } from '../types';
import { ApiError } from '../utils/apiClient';
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
    first_name: string;
    last_name: string;
    full_name?: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    gender_preference?: 'ANY' | 'FEMALE_ONLY';
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
  
  // Track if initial auth check has completed
  const initialCheckDone = useRef(false);
  // Track app state to avoid unnecessary auth checks on resume
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initial auth check on mount
    checkAuthStatus();
    
    // Listen for app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app state changes (coming back from Google Maps, etc.)
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Only run when coming from background to active
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('[AuthContext] App came to foreground');
      
      // If we already have a user, don't re-run full auth check
      // Just verify the token is still valid silently
      if (user) {
        console.log('[AuthContext] User already set, skipping auth check');
        // Optionally refresh user data in background without blocking
        refreshUser().catch(() => {});
      } else if (initialCheckDone.current) {
        // No user but initial check done - try to restore from cache
        const cachedUser = await AsyncStorage.getItem('cachedUser');
        const token = await AsyncStorage.getItem('authToken');
        if (cachedUser && token) {
          try {
            setUser(JSON.parse(cachedUser));
            console.log('[AuthContext] Restored user from cache on resume');
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
    appState.current = nextAppState;
  };

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        // First, try to restore from cache immediately for faster UX
        const cachedUser = await AsyncStorage.getItem('cachedUser');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
            console.log('[AuthContext] Restored user from cache');
          } catch {
            // Ignore parse errors
          }
        }
        
        // Then verify with server in background
        const response = await userService.getProfile();
        if (response.success && response.data) {
          setUser(response.data);
          // Update cache with fresh data
          await AsyncStorage.setItem('cachedUser', JSON.stringify(response.data));
        } else {
          // Only clear token if the response explicitly indicates unauthorized
          // Don't clear on network errors or other failures
          const errorCode = typeof response.error === 'object' ? response.error?.code : undefined;
          if (errorCode === 'UNAUTHORIZED' || errorCode === 'TOKEN_EXPIRED') {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('cachedUser');
            setUser(null);
          }
          // For other errors (network, timeout), keep the existing auth state
          // User may still be authenticated, just a temporary connection issue
        }
      }
    } catch (err: any) {
      // Only clear auth on explicit 401 Unauthorized errors
      // Don't log out the user for network errors, timeouts, or app resume issues
      if (err instanceof ApiError && err.status === 401) {
        console.log('Session expired (401), clearing auth state');
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('cachedUser');
        setUser(null);
      } else {
        // For other errors (network timeout, app resuming, etc.)
        // Keep the existing auth state - don't log out the user
        console.log('Auth check failed with non-auth error, keeping existing state:', err.message || err);
        
        // If we have a token but couldn't verify, try to restore user from cache
        const token = await AsyncStorage.getItem('authToken');
        if (token && !user) {
          // Try to get cached user data if available
          const cachedUser = await AsyncStorage.getItem('cachedUser');
          if (cachedUser) {
            try {
              setUser(JSON.parse(cachedUser));
              console.log('Restored user from cache');
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      setLoading(false);
      initialCheckDone.current = true;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await userService.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
        // Cache user data for offline/resume scenarios
        await AsyncStorage.setItem('cachedUser', JSON.stringify(response.data));
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
        // Cache user data for offline/resume scenarios
        await AsyncStorage.setItem('cachedUser', JSON.stringify(response.data.user));
        return { success: true };
      }
      throw new Error(response.message || 'Login failed');
    } catch (err: any) {
      // Ensure errorMessage is always a string for React rendering
      let errorMessage = 'Login failed';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err.message === 'string') {
        errorMessage = err.message;
      } else if (err.message?.message) {
        errorMessage = err.message.message;
      }
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
    first_name: string;
    last_name: string;
    full_name?: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    gender_preference?: 'ANY' | 'FEMALE_ONLY';
  }) => {
    try {
      setLoading(true);
      setError(null);
      console.log('[AuthContext] register() called with:', data.email);
      const response = await authService.register(data);
      console.log('[AuthContext] register response:', response.success ? 'SUCCESS' : 'FAILED');
      if (response.success && response.data) {
        setUser(response.data.user);
        // Cache user data for offline/resume scenarios
        await AsyncStorage.setItem('cachedUser', JSON.stringify(response.data.user));
        console.log('[AuthContext] User set:', response.data.user?.id);
        return { success: true };
      }
      throw new Error(response.message || 'Registration failed');
    } catch (err: any) {
      let errorMessage = 'Registration failed';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err.message === 'string') {
        errorMessage = err.message;
      } else if (err.message?.message) {
        errorMessage = err.message.message;
      }
      console.error('[AuthContext] register error:', errorMessage);
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
      // Clear cached user data
      await AsyncStorage.removeItem('cachedUser');
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
