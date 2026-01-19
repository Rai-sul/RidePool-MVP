import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Driver } from '../types';

export const driverService = {
  async registerAsDriver(data: {
    license_number: string;
    license_expiry: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    vehicle_color: string;
    vehicle_plate: string;
  }): Promise<ApiResponse<Driver>> {
    return apiClient.post(API_ENDPOINTS.DRIVER.REGISTER, data);
  },

  async getDriverProfile(): Promise<ApiResponse<Driver>> {
    return apiClient.get(API_ENDPOINTS.DRIVER.GET_PROFILE);
  },

  async updateDriverProfile(data: Partial<Driver>): Promise<ApiResponse<Driver>> {
    return apiClient.put(API_ENDPOINTS.DRIVER.UPDATE_PROFILE, data);
  },

  async updateVehicle(data: {
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_year?: number;
    vehicle_color?: string;
    vehicle_plate?: string;
  }): Promise<ApiResponse> {
    return apiClient.put(API_ENDPOINTS.DRIVER.UPDATE_VEHICLE, data);
  },

  async updateStatus(status: 'available' | 'busy' | 'offline'): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.DRIVER.UPDATE_STATUS, { status });
  },

  async getEarnings(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse> {
    return apiClient.get(API_ENDPOINTS.DRIVER.GET_EARNINGS, params);
  },

  async getTrips(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    return apiClient.get(API_ENDPOINTS.DRIVER.GET_TRIPS, params);
  },
};
