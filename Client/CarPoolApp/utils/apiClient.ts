import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
    this.retryDelay = API_CONFIG.RETRY_DELAY;
    console.log('[ApiClient] Initialized with baseURL:', this.baseURL);
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
  }

  private async removeAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  private async setRefreshToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('refreshToken', token);
    } catch (error) {
      console.error('Error setting refresh token:', error);
    }
  }

  private async removeRefreshToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('Error removing refresh token:', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = `${this.baseURL}${endpoint}`;
    console.log(`[ApiClient] ${options.method || 'GET'} ${fullUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[ApiClient] Response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 401) {
          if (endpoint === API_ENDPOINTS.AUTH.REFRESH) {
             await this.removeAuthToken();
             await this.removeRefreshToken();
             throw new ApiError(401, 'Session expired');
          }

          if (!this.isRefreshing) {
            this.isRefreshing = true;
            try {
              const refreshToken = await this.getRefreshToken();
              if (!refreshToken) {
                await this.removeAuthToken();
                throw new ApiError(401, 'No refresh token available');
              }

              const refreshResponse = await fetch(`${this.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
              });

              const refreshData = await refreshResponse.json();

              if (refreshResponse.ok && refreshData.data?.session?.access_token) {
                const newAccessToken = refreshData.data.session.access_token;
                const newRefreshToken = refreshData.data.session.refresh_token;

                await this.setAuthToken(newAccessToken);
                if (newRefreshToken) await this.setRefreshToken(newRefreshToken);

                this.isRefreshing = false;
                this.onRefreshed(newAccessToken);

                // Retry original request
                return this.request<T>(endpoint, options, retryCount);
              } else {
                 throw new Error('Refresh failed');
              }
            } catch (error) {
              this.isRefreshing = false;
              await this.removeAuthToken();
              await this.removeRefreshToken();
              throw new ApiError(401, 'Session expired');
            }
          }

          // If refreshing, wait for it
          return new Promise((resolve) => {
            this.addRefreshSubscriber(() => {
              resolve(this.request<T>(endpoint, options, retryCount));
            });
          });
        }

        const errorData = await response.json().catch(() => ({}));
        console.error(`[ApiClient] Error response:`, errorData);
        
        // Extract error message from various response formats
        let errorMessage = 'Request failed';
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        // Include validation details if present
        if (errorData.error?.details?.errors) {
          const validationErrors = errorData.error.details.errors
            .map((e: { field: string; message: string }) => `${e.field}: ${e.message}`)
            .join('; ');
          errorMessage = `${errorMessage}: ${validationErrors}`;
        }
        
        throw new ApiError(
          response.status,
          errorMessage,
          errorData
        );
      }

      const data = await response.json();
      console.log(`[ApiClient] Success:`, data.success ? 'true' : 'false');
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error(`[ApiClient] Request failed:`, error.message || error);

      if (error.name === 'AbortError') {
        console.error('[ApiClient] Request timed out');
        throw new ApiError(408, 'Request timeout');
      }

      if (error instanceof TypeError) {
        console.error(`[ApiClient] Network error - TypeError:`, error.message);
        console.error('[ApiClient] Full URL was:', fullUrl);
        console.error('[ApiClient] Make sure server is running at', this.baseURL);
        throw new ApiError(0, `Network request failed: ${error.message}`);
      }

      if (retryCount < this.retryAttempts && this.shouldRetry(error)) {
        console.log(`[ApiClient] Retrying... attempt ${retryCount + 1}`);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    if (error instanceof ApiError) {
      return error.status >= 500 || error.status === 408;
    }
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request<T>(`${endpoint}${queryString}`, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async setToken(token: string) {
    return this.setAuthToken(token);
  }

  async setTokens(accessToken: string, refreshToken: string) {
    await this.setAuthToken(accessToken);
    await this.setRefreshToken(refreshToken);
  }

  async clearToken() {
    await this.removeAuthToken();
    await this.removeRefreshToken();
  }
}

export const apiClient = new ApiClient();
