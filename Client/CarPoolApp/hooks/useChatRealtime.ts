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
  isConnected: boolean;
}

// Polling interval when realtime fails (in ms) - 2 seconds for responsive updates
const POLLING_INTERVAL = 2000;

/**
 * Hook for real-time chat using Supabase Realtime
 * Handles sending/receiving messages with live updates
 * Falls back to polling if realtime connection fails
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
    isConnected: false,
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    conversationIdRef.current = state.conversationId;
  }, [state.conversationId]);
  
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

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

  // Fetch new messages (for polling fallback) - uses refs to avoid dependency issues
  const fetchNewMessages = useCallback(async () => {
    const convId = conversationIdRef.current;
    const userId = currentUserIdRef.current;
    
    if (!convId || !userId) return;

    try {
      const response = await messagingService.getMessages(convId);
      if (response.success && response.data) {
        const serverMessages = response.data.messages || [];
        
        // Always update state with latest messages - compare by last message ID
        const lastServerMsg = serverMessages[serverMessages.length - 1];
        const lastMessageId = lastServerMsg?.id || null;
        
        // Update if we have new messages or message count changed
        setState(prev => {
          const hasNewMessages = lastMessageId && lastMessageId !== lastMessageIdRef.current;
          const countChanged = serverMessages.length !== prev.messages.length;
          
          if (hasNewMessages || countChanged) {
            console.log(`[useChatRealtime] Polling detected message changes: new=${hasNewMessages}, countChanged=${countChanged}`);
            
            const formattedMessages: ChatMessage[] = serverMessages.map((msg: MessageWithDetails) => ({
              id: msg.id,
              content: msg.content,
              sender_id: msg.sender_id,
              is_read: msg.is_read,
              created_at: msg.created_at,
              is_mine: msg.sender_id === userId,
            }));
            
            lastMessageIdRef.current = lastMessageId;
            return { ...prev, messages: formattedMessages };
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('[useChatRealtime] Polling error:', err);
    }
  }, []); // No dependencies - uses refs

  // Set up real-time subscription for messages with fallback polling
  useEffect(() => {
    if (!state.conversationId || !currentUserId) return;

    console.log(`[useChatRealtime] Setting up realtime for conversation: ${state.conversationId}`);

    // Track the last message ID for polling comparison
    if (state.messages.length > 0) {
      lastMessageIdRef.current = state.messages[state.messages.length - 1].id;
    }

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`chat-messages:${state.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${state.conversationId}`,
        },
        (payload) => {
          console.log('[useChatRealtime] New message received via realtime:', payload.new);
          const newMsg = payload.new as any;
          
          // Add new message to state if not already there
          setState(prev => {
            // Check if message already exists (from our own send or polling)
            if (prev.messages.some(m => m.id === newMsg.id)) {
              return prev;
            }
            
            const chatMessage: ChatMessage = {
              id: newMsg.id,
              content: newMsg.message_text,
              sender_id: newMsg.sender_id,
              is_read: !!newMsg.read_at,
              created_at: newMsg.created_at,
              is_mine: newMsg.sender_id === currentUserIdRef.current,
            };
            
            lastMessageIdRef.current = newMsg.id;
            
            return {
              ...prev,
              messages: [...prev.messages, chatMessage],
            };
          });
        }
      )
      .subscribe((status, err) => {
        console.log('[useChatRealtime] Subscription status:', status, err ? `Error: ${err}` : '');
        
        if (status === 'SUBSCRIBED') {
          console.log('[useChatRealtime] Realtime connected successfully');
          setState(prev => ({ ...prev, isConnected: true }));
          // NOTE: We keep polling running as a safety net even when realtime "works"
          // because realtime might report SUBSCRIBED but not deliver events
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[useChatRealtime] Realtime connection failed');
          setState(prev => ({ ...prev, isConnected: false }));
        }
      });

    channelRef.current = channel;

    // Start polling and KEEP IT RUNNING as the primary update mechanism
    // This ensures messages always update even if realtime is unreliable
    const pollInterval = setInterval(fetchNewMessages, POLLING_INTERVAL);
    pollingRef.current = pollInterval;
    
    // Also do an immediate poll
    fetchNewMessages();

    return () => {
      console.log('[useChatRealtime] Cleaning up subscription and polling');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
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
        
        // Update last message ref
        if (formattedMessages.length > 0) {
          lastMessageIdRef.current = formattedMessages[formattedMessages.length - 1].id;
        }
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
    isConnected: state.isConnected,
    sendMessage,
    refresh,
  };
};
