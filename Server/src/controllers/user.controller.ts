import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase, supabaseAdmin } from '../config/supabase';
import { notificationService } from '../services/notification.service';
import { z } from 'zod';

import { errorResponse, successResponse, unauthorizedResponse } from '../utils/response';

const UpdateProfileSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  gender_preference: z.enum(['FEMALE_ONLY', 'ANY']).optional(),
  driver_priority_lat: z.number().min(-90).max(90).optional(),
  driver_priority_lng: z.number().min(-180).max(180).optional(),
  driver_priority_address: z.string().max(500).optional(),
  phone: z.string().min(6).max(20).optional(),
});

const RegisterDeviceTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios', 'android', 'web']),
  app_type: z.enum(['rider', 'driver']).default('rider'),
});

const SetGenderPreferenceSchema = z.object({
  gender_preference: z.enum(['FEMALE_ONLY', 'ANY']),
});

export class UserController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      let { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!user) {
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert([{ id: userId }])
          .select()
          .single();
        
        if (createError) throw createError;
        user = newUser;
      }

      const requiresGenderPreference = user.gender === 'FEMALE' && !user.gender_preference;

      let vehicle = null;
      if (user.is_driver) {
        const { data: vehicleData } = await supabaseAdmin
          .from('vehicles')
          .select('id, vehicle_type, vehicle_number, model, max_passengers')
          .eq('driver_id', userId)
          .eq('is_active', true)
          .single();
        vehicle = vehicleData;
      }

      successResponse(res, {
        user,
        vehicle,
        requires_gender_preference: requiresGenderPreference,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = UpdateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const updates = parseResult.data;

      if (Object.keys(updates).length === 0) {
        return errorResponse(res, 'NO_UPDATES', 'No valid fields to update', 400);
      }

      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('gender, gender_preference')
        .eq('id', userId)
        .single();

      if (updates.gender === 'FEMALE' && !updates.gender_preference && !currentUser?.gender_preference) {
        return errorResponse(res, 'GENDER_PREFERENCE_REQUIRED', 'Female users must set a gender preference (FEMALE_ONLY or ANY)', 400);
      }

      const dbUpdates: Record<string, any> = { ...updates };
      dbUpdates.updated_at = new Date().toISOString();

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .update(dbUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      successResponse(res, { user });
    } catch (error) {
      next(error);
    }
  }

  async setGenderPreference(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = SetGenderPreferenceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const { gender_preference } = parseResult.data;

      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('gender')
        .eq('id', userId)
        .single();

      if (gender_preference === 'FEMALE_ONLY' && currentUser?.gender !== 'FEMALE') {
        return errorResponse(res, 'INVALID_PREFERENCE', 'Only female users can select FEMALE_ONLY preference', 400);
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .update({
          gender_preference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      successResponse(res, {
        user,
        message: 'Gender preference updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async registerDeviceToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = RegisterDeviceTokenSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const { token, platform, app_type } = parseResult.data;

      const success = await notificationService.registerDeviceToken(userId, token, platform, app_type);

      if (!success) {
        return errorResponse(res, 'TOKEN_REGISTRATION_FAILED', 'Failed to register device token', 500);
      }

      successResponse(res, { message: 'Device token registered successfully' });
    } catch (error) {
      next(error);
    }
  }

  async unregisterDeviceToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      if (!token) {
        return errorResponse(res, 'MISSING_TOKEN', 'Token is required', 400);
      }

      await notificationService.unregisterDeviceToken(token);

      successResponse(res, { message: 'Device token unregistered' });
    } catch (error) {
      next(error);
    }
  }

  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const result = await notificationService.getNotifications(userId, page, limit);

      successResponse(res, {
        notifications: result.notifications,
        unread_count: result.unread,
        pagination: {
          page,
          limit,
          total: result.total,
          total_pages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const { notificationId } = req.params;

      const success = await notificationService.markAsRead(notificationId, userId);

      if (!success) {
        return errorResponse(res, 'NOT_FOUND', 'Notification not found', 404);
      }

      successResponse(res, { message: 'Notification marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async markAllNotificationsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const count = await notificationService.markAllAsRead(userId);

      successResponse(res, { marked_count: count });
    } catch (error) {
      next(error);
    }
  }

  async getNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const preferences = await notificationService.getNotificationPreferences(userId);

      successResponse(res, { preferences });
    } catch (error) {
      next(error);
    }
  }

  async updateNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const success = await notificationService.updateNotificationPreferences(userId, req.body);

      if (!success) {
        return errorResponse(res, 'UPDATE_FAILED', 'Failed to update preferences', 500);
      }

      successResponse(res, { message: 'Notification preferences updated' });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      // Delete from public.users table first (handles related data via cascade/triggers)
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);

      if (dbError) {
        throw dbError;
      }

      // Delete from auth.users using Admin API cd server then npx ts-node scripts/delete-all-users.ts
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        throw authError;
      }

      successResponse(res, { message: 'User account deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
