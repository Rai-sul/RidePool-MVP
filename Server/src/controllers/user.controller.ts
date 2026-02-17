import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase, supabaseAdmin } from '../config/supabase';
import { notificationService } from '../services/notification.service';
import { z } from 'zod';

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
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
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

      res.json({
        success: true,
        data: {
          user,
          vehicle,
          requires_gender_preference: requiresGenderPreference,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = UpdateProfileSchema.safeParse(req.body);
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

      const updates = parseResult.data;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_UPDATES', message: 'No valid fields to update' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('gender, gender_preference')
        .eq('id', userId)
        .single();

      if (updates.gender === 'FEMALE' && !updates.gender_preference && !currentUser?.gender_preference) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'GENDER_PREFERENCE_REQUIRED',
            message: 'Female users must set a gender preference (FEMALE_ONLY or ANY)',
          },
          timestamp: new Date().toISOString(),
        });
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

      res.json({
        success: true,
        data: { user },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async setGenderPreference(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = SetGenderPreferenceSchema.safeParse(req.body);
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

      const { gender_preference } = parseResult.data;

      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('gender')
        .eq('id', userId)
        .single();

      if (gender_preference === 'FEMALE_ONLY' && currentUser?.gender !== 'FEMALE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PREFERENCE',
            message: 'Only female users can select FEMALE_ONLY preference',
          },
          timestamp: new Date().toISOString(),
        });
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

      res.json({
        success: true,
        data: {
          user,
          message: 'Gender preference updated successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async registerDeviceToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = RegisterDeviceTokenSchema.safeParse(req.body);
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

      const { token, platform, app_type } = parseResult.data;

      const success = await notificationService.registerDeviceToken(userId, token, platform, app_type);

      if (!success) {
        return res.status(500).json({
          success: false,
          error: { code: 'TOKEN_REGISTRATION_FAILED', message: 'Failed to register device token' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { message: 'Device token registered successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async unregisterDeviceToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_TOKEN', message: 'Token is required' },
          timestamp: new Date().toISOString(),
        });
      }

      await notificationService.unregisterDeviceToken(token);

      res.json({
        success: true,
        data: { message: 'Device token unregistered' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const result = await notificationService.getNotifications(userId, page, limit);

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          unread_count: result.unread,
          pagination: {
            page,
            limit,
            total: result.total,
            total_pages: Math.ceil(result.total / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { notificationId } = req.params;

      const success = await notificationService.markAsRead(notificationId, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Notification not found' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { message: 'Notification marked as read' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllNotificationsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const count = await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        data: { marked_count: count },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const preferences = await notificationService.getNotificationPreferences(userId);

      res.json({
        success: true,
        data: { preferences },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const success = await notificationService.updateNotificationPreferences(userId, req.body);

      if (!success) {
        return res.status(500).json({
          success: false,
          error: { code: 'UPDATE_FAILED', message: 'Failed to update preferences' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { message: 'Notification preferences updated' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
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

      res.json({
        success: true,
        data: { message: 'User account deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
