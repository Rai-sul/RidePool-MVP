import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface DriverShift {
  id: string;
  driverId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface ShiftSchedule {
  monday: ShiftSlot[];
  tuesday: ShiftSlot[];
  wednesday: ShiftSlot[];
  thursday: ShiftSlot[];
  friday: ShiftSlot[];
  saturday: ShiftSlot[];
  sunday: ShiftSlot[];
}

export interface ShiftSlot {
  id?: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

export interface ShiftStats {
  totalScheduledHours: number;
  completedHours: number;
  upcomingShifts: number;
  adherenceRate: number;
}

export interface ShiftReminder {
  shiftId: string;
  driverId: string;
  startTime: string;
  reminderType: 'UPCOMING' | 'START' | 'END_SOON';
  message: string;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export class ShiftService {
  async getDriverSchedule(driverId: string): Promise<ShiftSchedule> {
    try {
      const { data: shifts, error } = await supabaseAdmin
        .from('driver_shifts')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['SCHEDULED', 'ACTIVE']);

      if (error) {
        throw error;
      }

      const schedule: ShiftSchedule = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      (shifts || []).forEach((shift) => {
        const dayName = DAY_NAMES[shift.day_of_week] as keyof ShiftSchedule;
        schedule[dayName].push({
          id: shift.id,
          startTime: shift.start_time,
          endTime: shift.end_time,
          isRecurring: shift.is_recurring,
        });
      });

      Object.keys(schedule).forEach((day) => {
        schedule[day as keyof ShiftSchedule].sort((a, b) => 
          a.startTime.localeCompare(b.startTime)
        );
      });

      return schedule;
    } catch (error) {
      logger.error('[ShiftService] getDriverSchedule error:', error);
      return {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };
    }
  }

  async setShift(
    driverId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isRecurring: boolean = true
  ): Promise<DriverShift | null> {
    try {
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error('Invalid day of week (0-6)');
      }

      if (!this.isValidTimeFormat(startTime) || !this.isValidTimeFormat(endTime)) {
        throw new Error('Invalid time format (use HH:MM)');
      }

      if (startTime >= endTime) {
        throw new Error('End time must be after start time');
      }

      const { data: existing } = await supabaseAdmin
        .from('driver_shifts')
        .select('id, start_time, end_time')
        .eq('driver_id', driverId)
        .eq('day_of_week', dayOfWeek)
        .in('status', ['SCHEDULED', 'ACTIVE']);

      const hasOverlap = (existing || []).some((shift) => 
        this.timesOverlap(shift.start_time, shift.end_time, startTime, endTime)
      );

      if (hasOverlap) {
        throw new Error('Shift overlaps with existing schedule');
      }

      const { data: shift, error } = await supabaseAdmin
        .from('driver_shifts')
        .insert({
          driver_id: driverId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_recurring: isRecurring,
          status: 'SCHEDULED',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`[ShiftService] Created shift for driver ${driverId}: ${DAY_NAMES[dayOfWeek]} ${startTime}-${endTime}`);

      return {
        id: shift.id,
        driverId: shift.driver_id,
        dayOfWeek: shift.day_of_week,
        startTime: shift.start_time,
        endTime: shift.end_time,
        isRecurring: shift.is_recurring,
        status: shift.status,
        createdAt: shift.created_at,
      };
    } catch (error) {
      logger.error('[ShiftService] setShift error:', error);
      throw error;
    }
  }

  async updateShift(
    shiftId: string,
    driverId: string,
    updates: Partial<{ startTime: string; endTime: string; isRecurring: boolean }>
  ): Promise<DriverShift | null> {
    try {
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('driver_shifts')
        .select('*')
        .eq('id', shiftId)
        .eq('driver_id', driverId)
        .single();

      if (fetchError || !existing) {
        throw new Error('Shift not found');
      }

      const updateData: Record<string, any> = {};
      if (updates.startTime) updateData.start_time = updates.startTime;
      if (updates.endTime) updateData.end_time = updates.endTime;
      if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring;

      const { data: shift, error } = await supabaseAdmin
        .from('driver_shifts')
        .update(updateData)
        .eq('id', shiftId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: shift.id,
        driverId: shift.driver_id,
        dayOfWeek: shift.day_of_week,
        startTime: shift.start_time,
        endTime: shift.end_time,
        isRecurring: shift.is_recurring,
        status: shift.status,
        createdAt: shift.created_at,
      };
    } catch (error) {
      logger.error('[ShiftService] updateShift error:', error);
      throw error;
    }
  }

  async deleteShift(shiftId: string, driverId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('driver_shifts')
        .update({ status: 'CANCELLED' })
        .eq('id', shiftId)
        .eq('driver_id', driverId);

      if (error) {
        throw error;
      }

      logger.info(`[ShiftService] Deleted shift ${shiftId} for driver ${driverId}`);
      return true;
    } catch (error) {
      logger.error('[ShiftService] deleteShift error:', error);
      return false;
    }
  }

  async clearDaySchedule(driverId: string, dayOfWeek: number): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('driver_shifts')
        .update({ status: 'CANCELLED' })
        .eq('driver_id', driverId)
        .eq('day_of_week', dayOfWeek)
        .in('status', ['SCHEDULED', 'ACTIVE']);

      if (error) {
        throw error;
      }

      logger.info(`[ShiftService] Cleared ${DAY_NAMES[dayOfWeek]} schedule for driver ${driverId}`);
      return true;
    } catch (error) {
      logger.error('[ShiftService] clearDaySchedule error:', error);
      return false;
    }
  }

  async getShiftStats(driverId: string): Promise<ShiftStats> {
    try {
      const { data: shifts, error } = await supabaseAdmin
        .from('driver_shifts')
        .select('*')
        .eq('driver_id', driverId);

      if (error) {
        throw error;
      }

      const now = new Date();
      const currentDayOfWeek = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      let totalScheduledHours = 0;
      let completedHours = 0;
      let upcomingShifts = 0;

      (shifts || []).forEach((shift) => {
        const shiftHours = this.calculateHours(shift.start_time, shift.end_time);
        
        if (shift.status === 'COMPLETED') {
          completedHours += shiftHours;
          totalScheduledHours += shiftHours;
        } else if (shift.status === 'SCHEDULED' || shift.status === 'ACTIVE') {
          totalScheduledHours += shiftHours;
          
          if (shift.day_of_week > currentDayOfWeek ||
              (shift.day_of_week === currentDayOfWeek && shift.start_time > currentTime)) {
            upcomingShifts++;
          }
        }
      });

      const adherenceRate = totalScheduledHours > 0 
        ? Math.round((completedHours / totalScheduledHours) * 100)
        : 0;

      return {
        totalScheduledHours: Math.round(totalScheduledHours * 10) / 10,
        completedHours: Math.round(completedHours * 10) / 10,
        upcomingShifts,
        adherenceRate,
      };
    } catch (error) {
      logger.error('[ShiftService] getShiftStats error:', error);
      return {
        totalScheduledHours: 0,
        completedHours: 0,
        upcomingShifts: 0,
        adherenceRate: 0,
      };
    }
  }

  async getUpcomingReminders(driverId: string): Promise<ShiftReminder[]> {
    try {
      const now = new Date();
      const currentDayOfWeek = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
      const laterTime = `${String(thirtyMinutesLater.getHours()).padStart(2, '0')}:${String(thirtyMinutesLater.getMinutes()).padStart(2, '0')}`;

      const { data: shifts, error } = await supabaseAdmin
        .from('driver_shifts')
        .select('*')
        .eq('driver_id', driverId)
        .eq('day_of_week', currentDayOfWeek)
        .eq('status', 'SCHEDULED');

      if (error) {
        throw error;
      }

      const reminders: ShiftReminder[] = [];

      (shifts || []).forEach((shift) => {
        if (shift.start_time > currentTime && shift.start_time <= laterTime) {
          reminders.push({
            shiftId: shift.id,
            driverId: shift.driver_id,
            startTime: shift.start_time,
            reminderType: 'UPCOMING',
            message: `Your shift starts at ${shift.start_time}. Get ready!`,
          });
        }

        if (shift.start_time <= currentTime && shift.end_time > currentTime) {
          const endDate = new Date();
          const [endHour, endMin] = shift.end_time.split(':').map(Number);
          endDate.setHours(endHour, endMin);
          const minutesLeft = Math.round((endDate.getTime() - now.getTime()) / 60000);

          if (minutesLeft <= 30 && minutesLeft > 0) {
            reminders.push({
              shiftId: shift.id,
              driverId: shift.driver_id,
              startTime: shift.start_time,
              reminderType: 'END_SOON',
              message: `Your shift ends in ${minutesLeft} minutes.`,
            });
          }
        }
      });

      return reminders;
    } catch (error) {
      logger.error('[ShiftService] getUpcomingReminders error:', error);
      return [];
    }
  }

  async isWithinScheduledShift(driverId: string): Promise<boolean> {
    try {
      const now = new Date();
      const currentDayOfWeek = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const { data: shifts, error } = await supabaseAdmin
        .from('driver_shifts')
        .select('id')
        .eq('driver_id', driverId)
        .eq('day_of_week', currentDayOfWeek)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime)
        .in('status', ['SCHEDULED', 'ACTIVE'])
        .limit(1);

      if (error) {
        throw error;
      }

      return (shifts?.length || 0) > 0;
    } catch (error) {
      logger.error('[ShiftService] isWithinScheduledShift error:', error);
      return false;
    }
  }

  async markShiftActive(driverId: string): Promise<void> {
    try {
      const now = new Date();
      const currentDayOfWeek = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      await supabaseAdmin
        .from('driver_shifts')
        .update({ status: 'ACTIVE' })
        .eq('driver_id', driverId)
        .eq('day_of_week', currentDayOfWeek)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime)
        .eq('status', 'SCHEDULED');
    } catch (error) {
      logger.error('[ShiftService] markShiftActive error:', error);
    }
  }

  async markShiftCompleted(driverId: string, shiftId?: string): Promise<void> {
    try {
      let query = supabaseAdmin
        .from('driver_shifts')
        .update({ status: 'COMPLETED' })
        .eq('driver_id', driverId)
        .eq('status', 'ACTIVE');

      if (shiftId) {
        query = query.eq('id', shiftId);
      }

      await query;
    } catch (error) {
      logger.error('[ShiftService] markShiftCompleted error:', error);
    }
  }

  async copyScheduleFromTemplate(driverId: string, templateDriverId: string): Promise<boolean> {
    try {
      const templateSchedule = await this.getDriverSchedule(templateDriverId);

      for (let day = 0; day < 7; day++) {
        const dayName = DAY_NAMES[day] as keyof ShiftSchedule;
        const slots = templateSchedule[dayName];

        for (const slot of slots) {
          await this.setShift(driverId, day, slot.startTime, slot.endTime, slot.isRecurring);
        }
      }

      logger.info(`[ShiftService] Copied schedule from ${templateDriverId} to ${driverId}`);
      return true;
    } catch (error) {
      logger.error('[ShiftService] copyScheduleFromTemplate error:', error);
      return false;
    }
  }

  private isValidTimeFormat(time: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  }

  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  private calculateHours(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return (endMinutes - startMinutes) / 60;
  }
}

export const shiftService = new ShiftService();
