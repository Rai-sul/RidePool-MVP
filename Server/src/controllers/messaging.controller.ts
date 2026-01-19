import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';

const SendMessageSchema = z.object({
  receiver_id: z.string().uuid(),
  message: z.string().min(1).max(1000),
  ride_id: z.string().uuid().optional(),
  pool_id: z.string().uuid().optional(),
});

const GetMessagesQuerySchema = z.object({
  page: z.string().transform((v) => parseInt(v) || 1).optional(),
  limit: z.string().transform((v) => Math.min(parseInt(v) || 20, 50)).optional(),
  before: z.string().optional(),
});

export class MessagingController {
  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = SendMessageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { receiver_id, message, ride_id, pool_id } = parseResult.data;

      if (receiver_id === userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'SELF_MESSAGE', message: 'Cannot send message to yourself' },
          timestamp: new Date().toISOString(),
        });
      }

      let conversationId = await this.findOrCreateConversation(userId, receiver_id, ride_id, pool_id);

      const { data: newMessage, error: insertError } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          receiver_id,
          content: message,
          ride_id: ride_id || null,
          pool_id: pool_id || null,
          is_read: false,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      await supabaseAdmin
        .from('conversations')
        .update({
          last_message_id: newMessage.id,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      await notificationService.sendPushNotification(receiver_id, {
        title: 'New Message',
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        type: 'MESSAGE',
        metadata: { conversation_id: conversationId, message_id: newMessage.id },
      });

      res.status(201).json({
        success: true,
        data: {
          message_id: newMessage.id,
          conversation_id: conversationId,
          sent_at: newMessage.created_at,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const queryResult = GetMessagesQuerySchema.safeParse(req.query);
      const page = queryResult.success ? queryResult.data.page || 1 : 1;
      const limit = queryResult.success ? queryResult.data.limit || 20 : 20;
      const offset = (page - 1) * limit;

      const { data: participations, error: partError } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (partError) {
        throw partError;
      }

      const conversationIds = (participations || []).map((p) => p.conversation_id);

      if (conversationIds.length === 0) {
        return res.json({
          success: true,
          data: {
            conversations: [],
            pagination: { page, limit, total: 0, total_pages: 0 },
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: conversations, error, count } = await supabaseAdmin
        .from('conversations')
        .select(`
          id,
          ride_id,
          pool_id,
          last_message_at,
          created_at,
          conversation_participants(user_id, users(id, phone, average_rating)),
          messages(id, content, sender_id, is_read, created_at)
        `, { count: 'exact' })
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const formattedConversations = (conversations || []).map((conv) => {
        const otherParticipants = conv.conversation_participants?.filter(
          (p: any) => p.user_id !== userId
        ) || [];

        const lastMessage = conv.messages?.[0];
        const unreadCount = conv.messages?.filter(
          (m: any) => !m.is_read && m.sender_id !== userId
        ).length || 0;

        return {
          id: conv.id,
          ride_id: conv.ride_id,
          pool_id: conv.pool_id,
          participants: otherParticipants.map((p: any) => ({
            user_id: p.user_id,
            phone: p.users?.phone,
            rating: p.users?.average_rating,
          })),
          last_message: lastMessage ? {
            content: lastMessage.content,
            sender_id: lastMessage.sender_id,
            sent_at: lastMessage.created_at,
            is_read: lastMessage.is_read,
          } : null,
          unread_count: unreadCount,
          last_message_at: conv.last_message_at,
        };
      });

      res.json({
        success: true,
        data: {
          conversations: formattedConversations,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { conversationId } = req.params;
      const queryResult = GetMessagesQuerySchema.safeParse(req.query);
      const page = queryResult.success ? queryResult.data.page || 1 : 1;
      const limit = queryResult.success ? queryResult.data.limit || 20 : 20;
      const offset = (page - 1) * limit;

      const { data: participant } = await supabaseAdmin
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (!participant) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_PARTICIPANT', message: 'You are not part of this conversation' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: messages, error, count } = await supabaseAdmin
        .from('messages')
        .select('id, content, sender_id, is_read, created_at', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      await supabaseAdmin
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      res.json({
        success: true,
        data: {
          messages: (messages || []).reverse(),
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { messageId } = req.params;

      const { error } = await supabaseAdmin
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('receiver_id', userId);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { message: 'Message marked as read' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async markConversationAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { conversationId } = req.params;

      const { count, error } = await supabaseAdmin
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { messages_marked: count || 0 },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { count, error } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { unread_count: count || 0 },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  private async findOrCreateConversation(
    userId: string,
    otherUserId: string,
    rideId?: string,
    poolId?: string
  ): Promise<string> {
    const { data: userConvs } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    const { data: otherConvs } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId);

    const userConvIds = new Set((userConvs || []).map((c) => c.conversation_id));
    const sharedConvId = (otherConvs || []).find((c) => userConvIds.has(c.conversation_id))?.conversation_id;

    if (sharedConvId) {
      return sharedConvId;
    }

    const { data: newConv, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        ride_id: rideId || null,
        pool_id: poolId || null,
      })
      .select()
      .single();

    if (convError) {
      throw convError;
    }

    await supabaseAdmin.from('conversation_participants').insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: otherUserId },
    ]);

    return newConv.id;
  }
}

export const messagingController = new MessagingController();
