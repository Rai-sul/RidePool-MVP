import { useState, useCallback } from 'react';
import { messagingService } from '../services/messaging.service';
import { Message, Conversation } from '../types';

export const useMessaging = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (params?: {
    page?: number;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await messagingService.getConversations(params);
      if (response.success && response.data) {
        setConversations(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string, params?: {
    page?: number;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await messagingService.getMessages(conversationId, params);
      if (response.success && response.data) {
        setMessages(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (data: {
    receiver_id: string;
    message: string;
    ride_id?: string;
    pool_id?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await messagingService.sendMessage(data);
      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data!]);
        return { success: true, data: response.data };
      }
      throw new Error(response.message || 'Failed to send message');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const response = await messagingService.markAsRead(messageId);
      if (response.success) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, is_read: true } : msg
          )
        );
      }
    } catch (err: any) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  return {
    conversations,
    messages,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
  };
};
