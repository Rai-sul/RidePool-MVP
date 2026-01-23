import { supabaseAdmin } from '../config/supabase';
import { PoolStatus, RideStatus } from '../types';
import { notificationService } from './notification.service';
import { logger } from '../utils/logger';

const LOOKUP_TIME_MS = parseInt(process.env.LOOKUP_TIME_MS || '300000', 10); // 5 minutes default
const MIN_PASSENGERS_TO_START = 2;

interface LookupTimer {
  poolId: string;
  timeoutId: NodeJS.Timeout;
  createdAt: Date;
  expiresAt: Date;
}

export class LookupTimeService {
  private timers: Map<string, LookupTimer> = new Map();

  startLookupTimer(poolId: string, durationMs: number = LOOKUP_TIME_MS): void {
    if (this.timers.has(poolId)) {
      logger.info(`[LookupTime] Timer already exists for pool ${poolId}, skipping`);
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMs);

    const timeoutId = setTimeout(async () => {
      await this.handleLookupTimeout(poolId);
    }, durationMs);

    this.timers.set(poolId, {
      poolId,
      timeoutId,
      createdAt: now,
      expiresAt,
    });

    logger.info(`[LookupTime] Started timer for pool ${poolId}, expires at ${expiresAt.toISOString()}`);
  }

  cancelLookupTimer(poolId: string): boolean {
    const timer = this.timers.get(poolId);
    if (!timer) {
      return false;
    }

    clearTimeout(timer.timeoutId);
    this.timers.delete(poolId);
    logger.info(`[LookupTime] Cancelled timer for pool ${poolId}`);
    return true;
  }

  async handleLookupTimeout(poolId: string): Promise<void> {
    this.timers.delete(poolId);

    try {
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, status, current_passengers, max_passengers, creator_user_id')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        logger.error(`[LookupTime] Pool ${poolId} not found for timeout handling`);
        return;
      }

      if (pool.status !== 'WAITING_FOR_RIDERS') {
        logger.info(`[LookupTime] Pool ${poolId} status is ${pool.status}, not processing timeout`);
        return;
      }

      if (pool.current_passengers >= MIN_PASSENGERS_TO_START) {
        // Pool has enough passengers, transition to waiting for driver
        await this.transitionToWaitingForDriver(poolId);
      } else {
        // Pool doesn't have enough passengers yet
        // Instead of cancelling immediately, extend the timer once more
        // If already extended, then cancel
        logger.info(`[LookupTime] Pool ${poolId} has ${pool.current_passengers} passengers, extending lookup time`);
        
        // Start a new extended timer (another 5 minutes)
        this.startLookupTimer(poolId, LOOKUP_TIME_MS);
        
        // Notify the creator that pool is still searching
        await notificationService.sendPushNotification(pool.creator_user_id, {
          title: 'Still Searching...',
          message: 'Looking for more riders to join your pool. Extended search time.',
          type: 'SYSTEM',
          metadata: { poolId, currentPassengers: pool.current_passengers },
        });
      }
    } catch (error) {
      logger.error(`[LookupTime] Error handling timeout for pool ${poolId}:`, error);
    }
  }

  private async cancelPool(poolId: string, creatorUserId: string): Promise<void> {
    logger.info(`[LookupTime] Cancelling pool ${poolId} due to insufficient passengers`);

    const { data: members } = await supabaseAdmin
      .from('pool_members')
      .select('user_id, ride_id')
      .eq('pool_id', poolId);

    await supabaseAdmin
      .from('pools')
      .update({
        status: 'CANCELLED' as PoolStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', poolId);

    if (members && members.length > 0) {
      const rideIds = members.map((m) => m.ride_id);
      await supabaseAdmin
        .from('rides')
        .update({
          status: 'CANCELLED' as RideStatus,
          cancelled_reason: 'Pool lookup time expired with insufficient passengers',
          pool_id: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', rideIds);

      for (const member of members) {
        await notificationService.sendPoolCancelledNotification(
          member.user_id,
          poolId,
          'Not enough passengers joined within the lookup time'
        );
      }
    }

    await notificationService.sendPoolCancelledNotification(
      creatorUserId,
      poolId,
      'Pool cancelled: minimum 2 passengers required'
    );

    logger.info(`[LookupTime] Pool ${poolId} cancelled, ${members?.length || 0} riders notified`);
  }

  private async transitionToWaitingForDriver(poolId: string): Promise<void> {
    logger.info(`[LookupTime] Transitioning pool ${poolId} to WAITING_FOR_DRIVER`);

    await supabaseAdmin
      .from('pools')
      .update({
        status: 'WAITING_FOR_DRIVER' as PoolStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', poolId);

    const { data: members } = await supabaseAdmin
      .from('pool_members')
      .select('user_id, ride_id')
      .eq('pool_id', poolId);

    await supabaseAdmin
      .from('rides')
      .update({
        status: 'WAITING_FOR_DRIVER' as RideStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('pool_id', poolId);

    if (members) {
      for (const member of members) {
        await notificationService.sendPoolReadyNotification(
          member.user_id,
          poolId,
          'Pool is ready! Searching for a driver...'
        );
      }
    }

    logger.info(`[LookupTime] Pool ${poolId} transitioned, ${members?.length || 0} riders notified`);
  }

  getRemainingTime(poolId: string): number | null {
    const timer = this.timers.get(poolId);
    if (!timer) {
      return null;
    }

    const remaining = timer.expiresAt.getTime() - Date.now();
    return Math.max(0, remaining);
  }

  getTimerInfo(poolId: string): LookupTimer | null {
    return this.timers.get(poolId) || null;
  }

  getActiveTimersCount(): number {
    return this.timers.size;
  }

  async extendLookupTime(poolId: string, additionalMs: number): Promise<boolean> {
    const timer = this.timers.get(poolId);
    if (!timer) {
      return false;
    }

    clearTimeout(timer.timeoutId);

    const newExpiresAt = new Date(timer.expiresAt.getTime() + additionalMs);
    const remainingMs = newExpiresAt.getTime() - Date.now();

    if (remainingMs <= 0) {
      await this.handleLookupTimeout(poolId);
      return true;
    }

    const newTimeoutId = setTimeout(async () => {
      await this.handleLookupTimeout(poolId);
    }, remainingMs);

    this.timers.set(poolId, {
      ...timer,
      timeoutId: newTimeoutId,
      expiresAt: newExpiresAt,
    });

    logger.info(`[LookupTime] Extended timer for pool ${poolId}, new expiry: ${newExpiresAt.toISOString()}`);
    return true;
  }

  clearAllTimers(): void {
    for (const [poolId, timer] of this.timers) {
      clearTimeout(timer.timeoutId);
      logger.info(`[LookupTime] Cleared timer for pool ${poolId}`);
    }
    this.timers.clear();
  }
}

export const lookupTimeService = new LookupTimeService();
