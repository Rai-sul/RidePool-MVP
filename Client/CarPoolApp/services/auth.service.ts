import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, User, UserPreferences, Location } from '../types';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    phone?: string;
    full_name?: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
    if (response.data?.token) {
      await apiClient.setToken(response.data.token);
    }
    return response;
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, data);
    if (response.data?.token) {
      await apiClient.setToken(response.data.token);
    }
    return response;
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
