import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import type { ApiResponse, User, AuthSession, Vehicle } from '../types';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    phone?: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    vehicle_type?: 'CAR' | 'CNG';
    vehicle_model?: string;
    vehicle_plate?: string;
    driving_license?: string;
  }): Promise<ApiResponse<{ user: User; vehicle?: Vehicle; token?: string; session?: AuthSession }>> {
    const response = await apiClient.post<ApiResponse<{ user: User; vehicle?: Vehicle; token?: string; session?: AuthSession }>>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );

    const session = response.data?.session;
    const token = session?.access_token || response.data?.token;
    const refreshToken = session?.refresh_token;

    if (token) {
      if (refreshToken) {
        await apiClient.setTokens(token, refreshToken);
      } else {
        await apiClient.setToken(token);
      }
    }
    return response;
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; vehicle?: Vehicle; token?: string; session?: AuthSession }>> {
    const response = await apiClient.post<ApiResponse<{ user: User; vehicle?: Vehicle; token?: string; session?: AuthSession }>>(
      API_ENDPOINTS.AUTH.LOGIN,
      data
    );

    const session = response.data?.session;
    const token = session?.access_token || response.data?.token;
    const refreshToken = session?.refresh_token;

    if (token) {
      if (refreshToken) {
        await apiClient.setTokens(token, refreshToken);
      } else {
        await apiClient.setToken(token);
      }
    }
    return response;
  },

  async logout(): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(API_ENDPOINTS.AUTH.LOGOUT);
    await apiClient.clearToken();
    return response;
  },

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await apiClient.post<ApiResponse<{ token: string }>>(API_ENDPOINTS.AUTH.REFRESH);
    if (response.data?.token) {
      await apiClient.setToken(response.data.token);
    }
    return response;
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<ApiResponse<User>>(API_ENDPOINTS.AUTH.ME);
  },
};

export const userService = {
  async getProfile(): Promise<ApiResponse<User>> {
    return apiClient.get<ApiResponse<User>>(API_ENDPOINTS.USER.PROFILE);
  },

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put<ApiResponse<User>>(API_ENDPOINTS.USER.UPDATE_PROFILE, data);
  },

  async registerDeviceToken(token: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.USER.DEVICE_TOKEN, { token, app_type: 'driver' });
  },

  async unregisterDeviceToken(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(API_ENDPOINTS.USER.DEVICE_TOKEN);
  },

  async getNotifications(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    return apiClient.get<ApiResponse>(API_ENDPOINTS.USER.NOTIFICATIONS, params as Record<string, string>);
  },

  async markNotificationRead(notificationId: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.USER.NOTIFICATION_READ(notificationId));
  },

  async markAllNotificationsRead(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(API_ENDPOINTS.USER.NOTIFICATIONS_READ_ALL);
  },
};
