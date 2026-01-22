import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS, API_CONFIG } from '../config/api.config';
import { ApiResponse, User, UserPreferences, Location, AuthSession } from '../types';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    phone?: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    gender_preference?: 'ANY' | 'FEMALE_ONLY';
  }): Promise<ApiResponse<{ user: User; token?: string; session?: AuthSession }>> {
    console.log('[Auth] Registering user:', data.email);
    console.log('[Auth] API URL:', API_CONFIG.BASE_URL + API_ENDPOINTS.AUTH.REGISTER);
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
      console.log('[Auth] Registration response:', response.success ? 'SUCCESS' : 'FAILED');
      
      const session = response.data?.session;
      const token = session?.access_token || response.data?.token;
      const refreshToken = session?.refresh_token;

      if (token) {
        if (refreshToken) {
          await apiClient.setTokens(token, refreshToken);
        } else {
          await apiClient.setToken(token);
        }
        console.log('[Auth] Token stored successfully');
      }
      return response;
    } catch (error: any) {
      console.error('[Auth] Registration error:', error.message);
      throw error;
    }
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token?: string; session?: AuthSession }>> {
    console.log('[Auth] Logging in user:', data.email);
    console.log('[Auth] API URL:', API_CONFIG.BASE_URL + API_ENDPOINTS.AUTH.LOGIN);
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, data);
      console.log('[Auth] Login response:', response.success ? 'SUCCESS' : 'FAILED');
      // Server returns session.access_token, store it as auth token
      const session = response.data?.session;
      const token = session?.access_token || response.data?.token;
      const refreshToken = session?.refresh_token;

      if (token) {
        if (refreshToken) {
          await apiClient.setTokens(token, refreshToken);
        } else {
          await apiClient.setToken(token);
        }
        console.log('[Auth] Token stored successfully');
      }
      return response;
    } catch (error: any) {
      console.error('[Auth] Login error:', error.message);
      throw error;
    }
  },

  async logout(): Promise<ApiResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    await apiClient.clearToken();
    return response;
  },

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH);
    if (response.data?.token) {
      await apiClient.setToken(response.data.token);
    }
    return response;
  },

  async verifyEmail(token: string): Promise<ApiResponse> {
    return apiClient.get(`${API_ENDPOINTS.AUTH.VERIFY_EMAIL}?token=${token}`);
  },

  async resetPassword(email: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { email });
  },

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get(API_ENDPOINTS.AUTH.ME);
  },
};

export const userService = {
  async getProfile(): Promise<ApiResponse<User>> {
    return apiClient.get(API_ENDPOINTS.USER.PROFILE);
  },

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put(API_ENDPOINTS.USER.UPDATE_PROFILE, data);
  },

  async setGenderPreference(preference: string): Promise<ApiResponse> {
    return apiClient.put(API_ENDPOINTS.USER.UPDATE_GENDER_PREFERENCE, { preference });
  },

  async registerDeviceToken(token: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.USER.DEVICE_TOKEN, { token });
  },

  async unregisterDeviceToken(): Promise<ApiResponse> {
    return apiClient.delete(API_ENDPOINTS.USER.DEVICE_TOKEN);
  },

  async getNotifications(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    return apiClient.get(API_ENDPOINTS.USER.NOTIFICATIONS, params);
  },

  async markNotificationRead(notificationId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.USER.NOTIFICATION_READ(notificationId));
  },

  async markAllNotificationsRead(): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.USER.NOTIFICATIONS_READ_ALL);
  },

  async getNotificationPreferences(): Promise<ApiResponse> {
    return apiClient.get(API_ENDPOINTS.USER.NOTIFICATION_PREFERENCES);
  },

  async updateNotificationPreferences(data: any): Promise<ApiResponse> {
    return apiClient.put(API_ENDPOINTS.USER.NOTIFICATION_PREFERENCES, data);
  },
};
