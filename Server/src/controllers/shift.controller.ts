import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { shiftService } from '../services/shift.service';
import { supabaseAdmin } from '../config/supabase';
import { z } from 'zod';

const SetShiftSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  is_recurring: z.boolean().optional().default(true),
});

const UpdateShiftSchema = z.object({
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  is_recurring: z.boolean().optional(),
});

export class ShiftController {
  async getSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('is_driver')
        .eq('id', userId)
        .single();

      if (!user?.is_driver) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_DRIVER', message: 'Only drivers can access shifts' },
          timestamp: new Date().toISOString(),
        });
      }

      const schedule = await shiftService.getDriverSchedule(userId);

      res.json({
        success: true,
        data: { schedule },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async setShift(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = SetShiftSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid shift data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { day_of_week, start_time, end_time, is_recurring } = parseResult.data;

      const shift = await shiftService.setShift(
        userId,
        day_of_week,
        start_time,
        end_time,
        is_recurring
      );

      res.status(201).json({
        success: true,
        data: { shift },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('overlaps')) {
        return res.status(409).json({
          success: false,
          error: { code: 'SHIFT_OVERLAP', message: error.message },
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  }

  async updateShift(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { shiftId } = req.params;

      const parseResult = UpdateShiftSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid update data' },
          timestamp: new Date().toISOString(),
        });
      }

      const updates: Record<string, any> = {};
      if (parseResult.data.start_time) updates.startTime = parseResult.data.start_time;
      if (parseResult.data.end_time) updates.endTime = parseResult.data.end_time;
      if (parseResult.data.is_recurring !== undefined) updates.isRecurring = parseResult.data.is_recurring;

      const shift = await shiftService.updateShift(shiftId, userId, updates);

      res.json({
        success: true,
        data: { shift },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Shift not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'SHIFT_NOT_FOUND', message: 'Shift not found' },
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  }

  async deleteShift(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { shiftId } = req.params;

      const deleted = await shiftService.deleteShift(shiftId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: { code: 'SHIFT_NOT_FOUND', message: 'Shift not found' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { message: 'Shift deleted' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async clearDaySchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { dayOfWeek } = req.params;
      const day = parseInt(dayOfWeek);

      if (isNaN(day) || day < 0 || day > 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_DAY', message: 'Day must be 0-6' },
          timestamp: new Date().toISOString(),
        });
      }

      await shiftService.clearDaySchedule(userId, day);

      res.json({
        success: true,
        data: { message: 'Day schedule cleared' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const stats = await shiftService.getShiftStats(userId);

      res.json({
        success: true,
        data: { stats },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getReminders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const reminders = await shiftService.getUpcomingReminders(userId);

      res.json({
        success: true,
        data: { reminders },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async checkShiftStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const withinShift = await shiftService.isWithinScheduledShift(userId);

      res.json({
        success: true,
        data: { within_scheduled_shift: withinShift },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const shiftController = new ShiftController();
