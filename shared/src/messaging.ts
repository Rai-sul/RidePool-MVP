export type MessageType = 'TEXT' | 'SYSTEM' | 'LOCATION' | 'RATING_REQUEST';
export type ConversationType = 'POOL' | 'SUPPORT' | 'DRIVER_RIDER';

export interface Conversation {
  id: string;
  type: ConversationType;
  pool_id: string | null;
  participants: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
  created_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string | null;
  message_type: MessageType;
  is_system: boolean;
  is_read?: boolean;
  created_at: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  message_text?: string;
  message_type: MessageType;
}

export interface CreateConversationRequest {
  type: ConversationType;
  pool_id?: string;
  participant_ids: string[];
}
