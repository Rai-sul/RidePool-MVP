import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    public override message: string,
    public data?: unknown
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
    } catch {
      return null;
    }
  }

  private async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch {
      // Silent fail
    }
  }

  private async removeAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch {
      // Silent fail
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('refreshToken');
    } catch {
      return null;
    }
  }

  private async setRefreshToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('refreshToken', token);
    } catch {
      // Silent fail
    }
  }

  private async removeRefreshToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('refreshToken');
    } catch {
      // Silent fail
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
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

                return this.request<T>(endpoint, options, retryCount);
              } else {
                throw new Error('Refresh failed');
              }
            } catch {
              this.isRefreshing = false;
              await this.removeAuthToken();
              await this.removeRefreshToken();
              throw new ApiError(401, 'Session expired');
            }
          }

          return new Promise((resolve) => {
            this.addRefreshSubscriber(() => {
              resolve(this.request<T>(endpoint, options, retryCount));
            });
          });
        }

        const errorData = await response.json().catch(() => ({}));
        let errorMessage = 'Request failed';
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        throw new ApiError(response.status, errorMessage, errorData);
      }

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout');
      }

      if (error instanceof TypeError) {
        throw new ApiError(0, `Network request failed: ${error.message}`);
      }

      if (retryCount < this.retryAttempts && this.shouldRetry(error)) {
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof ApiError) {
      return error.status >= 500 || error.status === 408;
    }
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request<T>(`${endpoint}${queryString}`, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
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
