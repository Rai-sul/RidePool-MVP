import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Message, Conversation, PaginatedResponse } from '../types';

export const messagingService = {
  async sendMessage(data: {
    receiver_id: string;
    message: string;
    ride_id?: string;
    pool_id?: string;
  }): Promise<ApiResponse<Message>> {
    return apiClient.post(API_ENDPOINTS.MESSAGING.SEND, data);
  },

  async getConversations(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Conversation>>> {
    return apiClient.get(API_ENDPOINTS.MESSAGING.CONVERSATIONS, params);
  },

  async getMessages(
    conversationId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse<PaginatedResponse<Message>>> {
    return apiClient.get(API_ENDPOINTS.MESSAGING.GET_MESSAGES(conversationId), params);
  },

  async markAsRead(messageId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.MESSAGING.MARK_READ(messageId));
  },
};
