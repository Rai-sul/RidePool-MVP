import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { messagingService, ConversationWithDetails, MessageWithDetails } from '../services/messaging.service';

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  conversationId: string | null;
  loading: boolean;
  error: string | null;
  sending: boolean;
}

/**
 * Hook for real-time chat using Supabase Realtime
 * Handles sending/receiving messages with live updates
 */
export const useChatRealtime = (
  currentUserId: string | null,
  otherUserId: string | null,
  poolId?: string | null
) => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    conversationId: null,
    loading: false,
    error: null,
    sending: false,
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Find or create conversation and load messages
  const initializeChat = useCallback(async () => {
    if (!currentUserId || !otherUserId) {
      console.log('[useChatRealtime] Missing user IDs, skipping init');
      return;
    }

    console.log(`[useChatRealtime] Initializing chat between ${currentUserId} and ${otherUserId}`);
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get conversations for current user
      const convsResponse = await messagingService.getConversations();
      
      if (convsResponse.success && convsResponse.data) {
        // Find existing conversation with the other user
        const conversations = convsResponse.data.conversations || [];
        const existingConv = conversations.find((conv: ConversationWithDetails) => 
          conv.participants?.some((p) => p.user_id === otherUserId)
        );

        if (existingConv) {
          console.log(`[useChatRealtime] Found existing conversation: ${existingConv.id}`);
          setState(prev => ({ ...prev, conversationId: existingConv.id }));
          
          // Load messages
          const messagesResponse = await messagingService.getMessages(existingConv.id);
          if (messagesResponse.success && messagesResponse.data) {
            const formattedMessages: ChatMessage[] = (messagesResponse.data.messages || []).map((msg: MessageWithDetails) => ({
              id: msg.id,
              content: msg.content,
              sender_id: msg.sender_id,
              is_read: msg.is_read,
              created_at: msg.created_at,
              is_mine: msg.sender_id === currentUserId,
            }));
            setState(prev => ({ 
              ...prev, 
              messages: formattedMessages, 
              loading: false,
              conversationId: existingConv.id,
            }));
          }
        } else {
          // No existing conversation - will be created on first message
          console.log('[useChatRealtime] No existing conversation, will create on first message');
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    } catch (err: any) {
      console.error('[useChatRealtime] Error initializing chat:', err);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: err.message || 'Failed to load chat' 
      }));
    }
  }, [currentUserId, otherUserId]);

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!state.conversationId) return;

    console.log(`[useChatRealtime] Setting up realtime for conversation: ${state.conversationId}`);

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`messages:${state.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${state.conversationId}`,
        },
        (payload) => {
          console.log('[useChatRealtime] New message received:', payload.new);
          const newMsg = payload.new as any;
          
          // Add new message to state if not already there
          setState(prev => {
            // Check if message already exists (from our own send)
            if (prev.messages.some(m => m.id === newMsg.id)) {
              return prev;
            }
            
            const chatMessage: ChatMessage = {
              id: newMsg.id,
              content: newMsg.message_text,
              sender_id: newMsg.sender_id,
              is_read: !!newMsg.read_at,
              created_at: newMsg.created_at,
              is_mine: newMsg.sender_id === currentUserId,
            };
            
            return {
              ...prev,
              messages: [...prev.messages, chatMessage],
            };
          });
        }
      )
      .subscribe((status) => {
        console.log('[useChatRealtime] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[useChatRealtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [state.conversationId, currentUserId]);

  // Initialize chat on mount
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Send a message
  const sendMessage = useCallback(async (text: string) => {
    if (!currentUserId || !otherUserId || !text.trim()) {
      return { success: false, error: 'Invalid message data' };
    }

    setState(prev => ({ ...prev, sending: true }));

    try {
      const response = await messagingService.sendMessage({
        receiver_id: otherUserId,
        message: text.trim(),
        pool_id: poolId || undefined,
      });

      if (response.success && response.data) {
        // Add message to local state immediately for responsiveness
        const newMessage: ChatMessage = {
          id: response.data.message_id || Date.now().toString(),
          content: text.trim(),
          sender_id: currentUserId,
          is_read: false,
          created_at: new Date().toISOString(),
          is_mine: true,
        };

        setState(prev => {
          // Update conversation ID if this is the first message
          const newConversationId = response.data?.conversation_id || prev.conversationId;
          
          return {
            ...prev,
            messages: [...prev.messages, newMessage],
            conversationId: newConversationId,
            sending: false,
          };
        });

        // If this created a new conversation, set up subscription
        if (response.data.conversation_id && !state.conversationId) {
          // Trigger re-init to set up subscription
          initializeChat();
        }

        return { success: true, data: newMessage };
      }

      throw new Error(response.message || 'Failed to send message');
    } catch (err: any) {
      console.error('[useChatRealtime] Error sending message:', err);
      setState(prev => ({ ...prev, sending: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [currentUserId, otherUserId, poolId, state.conversationId, initializeChat]);

  // Refresh messages
  const refresh = useCallback(async () => {
    if (!state.conversationId) {
      await initializeChat();
      return;
    }

    try {
      const response = await messagingService.getMessages(state.conversationId);
      if (response.success && response.data) {
        const formattedMessages: ChatMessage[] = (response.data.messages || []).map((msg: MessageWithDetails) => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          is_read: msg.is_read,
          created_at: msg.created_at,
          is_mine: msg.sender_id === currentUserId,
        }));
        setState(prev => ({ ...prev, messages: formattedMessages }));
      }
    } catch (err: any) {
      console.error('[useChatRealtime] Error refreshing:', err);
    }
  }, [state.conversationId, currentUserId, initializeChat]);

  return {
    messages: state.messages,
    conversationId: state.conversationId,
    loading: state.loading,
    sending: state.sending,
    error: state.error,
    sendMessage,
    refresh,
  };
};
