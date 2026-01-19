import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, PaymentMethod, Transaction, PaginatedResponse } from '../types';

export const paymentService = {
  async createPaymentMethod(data: {
    type: string;
    details: any;
  }): Promise<ApiResponse<PaymentMethod>> {
    return apiClient.post(API_ENDPOINTS.PAYMENT.CREATE_METHOD, data);
  },

  async getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
    return apiClient.get(API_ENDPOINTS.PAYMENT.GET_METHODS);
  },

  async deletePaymentMethod(id: string): Promise<ApiResponse> {
    return apiClient.delete(API_ENDPOINTS.PAYMENT.DELETE_METHOD(id));
  },

  async setDefaultPaymentMethod(id: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.PAYMENT.SET_DEFAULT(id));
  },

  async createTransaction(data: {
    amount: number;
    payment_method_id: string;
    ride_id?: string;
  }): Promise<ApiResponse<Transaction>> {
    return apiClient.post(API_ENDPOINTS.PAYMENT.CREATE_TRANSACTION, data);
  },

  async getTransactions(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    return apiClient.get(API_ENDPOINTS.PAYMENT.GET_TRANSACTIONS, params);
  },
};

export const walletService = {
  async getBalance(): Promise<ApiResponse<{ balance: number }>> {
    return apiClient.get(API_ENDPOINTS.WALLET.GET_BALANCE);
  },

  async addFunds(amount: number, payment_method_id: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.WALLET.ADD_FUNDS, { amount, payment_method_id });
  },

  async withdraw(amount: number): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.WALLET.WITHDRAW, { amount });
  },

  async getWalletTransactions(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    return apiClient.get(API_ENDPOINTS.WALLET.GET_TRANSACTIONS, params);
  },
};
