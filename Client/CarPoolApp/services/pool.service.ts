import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Pool, PaginatedResponse } from '../types';

export const poolService = {
  async createPool(data: {
    name: string;
    description?: string;
    max_members?: number;
  }): Promise<ApiResponse<Pool>> {
    return apiClient.post(API_ENDPOINTS.POOL.CREATE, data);
  },

  async getPools(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Pool>>> {
    return apiClient.get(API_ENDPOINTS.POOL.GET_ALL, params);
  },

  async getPoolById(id: string): Promise<ApiResponse<Pool>> {
    return apiClient.get(API_ENDPOINTS.POOL.GET_BY_ID(id));
  },

  async joinPool(id: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.POOL.JOIN(id));
  },

  async leavePool(id: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.POOL.LEAVE(id));
  },

  async searchPools(query: string): Promise<ApiResponse<Pool[]>> {
    return apiClient.get(API_ENDPOINTS.POOL.SEARCH, { query });
  },

  async getPoolMembers(id: string): Promise<ApiResponse> {
    return apiClient.get(API_ENDPOINTS.POOL.GET_MEMBERS(id));
  },
};
