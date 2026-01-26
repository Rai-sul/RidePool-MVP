import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, Message, Conversation, PaginatedResponse } from '../types';

export interface SendMessageResponse {
  message_id: string;
  conversation_id: string;
  sent_at: string;
}

export interface ConversationWithDetails {
  id: string;
  pool_id: string | null;
  participants: Array<{
    user_id: string;
    phone?: string;
    full_name?: string;
    rating?: number;
  }>;
  last_message: {
    content: string;
    sender_id: string;
    sent_at: string;
    is_read: boolean;
  } | null;
  unread_count: number;
  last_message_at: string | null;
}

export interface MessageWithDetails {
  id: string;
  content: string;
  sender_id: string;
  is_read: boolean;
  created_at: string;
}

export interface MessagesResponse {
  messages: MessageWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ConversationsResponse {
  conversations: ConversationWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export const messagingService = {
  async sendMessage(data: {
    receiver_id: string;
    message: string;
    ride_id?: string;
    pool_id?: string;
  }): Promise<ApiResponse<SendMessageResponse>> {
    return apiClient.post(API_ENDPOINTS.MESSAGING.SEND, data);
  },

  async getConversations(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ConversationsResponse>> {
    return apiClient.get(API_ENDPOINTS.MESSAGING.CONVERSATIONS, params);
  },

  async getMessages(
    conversationId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse<MessagesResponse>> {
    return apiClient.get(API_ENDPOINTS.MESSAGING.GET_MESSAGES(conversationId), params);
  },

  async markAsRead(messageId: string): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.MESSAGING.MARK_READ(messageId));
  },
};
