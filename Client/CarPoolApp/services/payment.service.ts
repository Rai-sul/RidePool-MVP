import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Transaction, PaginatedResponse } from '../types';

export const paymentService = {
  async processPayment(data: {
    amount: number;
    ride_id?: string;
    pool_id?: string;
    payment_method?: string;
  }): Promise<ApiResponse<Transaction>> {
    return apiClient.post(API_ENDPOINTS.PAYMENT.PROCESS, data);
  },

  async getPaymentHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    return apiClient.get(API_ENDPOINTS.PAYMENT.HISTORY, params);
  },
};

export const walletService = {
  async getBalance(): Promise<ApiResponse<{ balance: number }>> {
    return apiClient.get(API_ENDPOINTS.WALLET.BALANCE);
  },

  async addFunds(amount: number, payment_method?: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.WALLET.ADD_FUNDS, { amount, payment_method });
  },

  async withdraw(amount: number): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.WALLET.WITHDRAW, { amount });
  },

  async getTransactions(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    return apiClient.get(API_ENDPOINTS.WALLET.TRANSACTIONS, params);
  },
};
