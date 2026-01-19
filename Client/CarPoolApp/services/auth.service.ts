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
    return apiClient.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
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
};

export const userService = {
  async getProfile(): Promise<ApiResponse<User>> {
    return apiClient.get(API_ENDPOINTS.USER.PROFILE);
  },

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put(API_ENDPOINTS.USER.UPDATE_PROFILE, data);
  },

  async updatePreferences(data: UserPreferences): Promise<ApiResponse> {
    return apiClient.put(API_ENDPOINTS.USER.UPDATE_PREFERENCES, data);
  },

  async updateLocation(location: Location): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.USER.UPDATE_LOCATION, location);
  },

  async getRideHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    return apiClient.get(API_ENDPOINTS.USER.GET_RIDE_HISTORY, params);
  },

  async getStats(): Promise<ApiResponse> {
    return apiClient.get(API_ENDPOINTS.USER.GET_STATS);
  },
};
