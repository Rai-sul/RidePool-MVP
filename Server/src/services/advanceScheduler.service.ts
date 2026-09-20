import { supabaseAdmin } from '../config/supabase';
import { config } from '../config/env';
import { Pool, PoolStatus, RideStatus } from '../types';
import { logger } from '../utils/logger';
import { advanceDispatchService } from './advanceDispatch.service';
import { notificationService } from './notification.service';

/**
 * Drives the advance booking timeline.
 *
 * Advance pools outlive any single process, so the schedule lives in the
 * database and this service simply sweeps for work that has come due. That
 * keeps it restart-safe without adding a job queue.
 */
export class AdvanceSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  /** Sweep often enough to be responsive at whichever time scale is configured. */
  private get tickMs(): number {
    return config.advanceBooking.unitSeconds === 1 ? 1000 : 15000;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, this.tickMs);

    // Never hold the process open just for the sweep.
    this.timer.unref?.();

    logger.info(`[AdvanceScheduler] Started, sweeping every ${this.tickMs}ms`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('[AdvanceScheduler] Stopped');
    }
  }

  /**
   * One sweep: open confirmations that are due, resolve expired confirmation
   * timers, and expire pools whose pickup time went by without a driver.
   *
   * Exported so tests and the health check can drive it directly.
   */
  async tick(): Promise<void> {
    if (this.running) {
      return; // A slow sweep must not overlap the next one.
    }
    this.running = true;

    try {
      const now = new Date().toISOString();
      await this.openDueConfirmations(now);
      await this.resolveExpiredConfirmations(now);
      await this.expirePassedPools(now);
    } catch (error) {
      logger.error('[AdvanceScheduler] Sweep failed:', error);
    } finally {
      this.running = false;
    }
  }

  /** Pools that have reached their confirmation window but not been prompted. */
  private async openDueConfirmations(now: string): Promise<void> {
    const { data: pools, error } = await supabaseAdmin
      .from('pools')
      .select('*')
      .eq('is_advance', true)
      .eq('status', 'SCHEDULED' as PoolStatus)
      .is('deleted_at', null)
      .is('confirmation_notified_at', null)
      .lte('confirmation_opens_at', now);

    if (error) {
      logger.error('[AdvanceScheduler] Could not load pools due for confirmation:', error);
      return;
    }

    for (const pool of (pools || []) as Pool[]) {
      await advanceDispatchService.openConfirmation(pool);
    }
  }

  /**
   * Pools whose confirmation timer has run out. A pool already dispatched with
   * everyone confirmed has nothing left to settle, so the sweep skips it.
   */
  private async resolveExpiredConfirmations(now: string): Promise<void> {
    const { data: pools, error } = await supabaseAdmin
      .from('pools')
      .select('*, pool_members!inner(user_id, confirmed_at, left_at)')
      .eq('is_advance', true)
      .in('status', ['SCHEDULED', 'WAITING_FOR_DRIVER'] as PoolStatus[])
      .is('deleted_at', null)
      .is('pool_members.left_at', null)
      .lte('confirmation_deadline_at', now);

    if (error) {
      logger.error('[AdvanceScheduler] Could not load pools past their deadline:', error);
      return;
    }

    for (const row of pools || []) {
      const members = (row.pool_members || []) as Array<{ confirmed_at: string | null }>;
      const confirmed = members.filter((m) => m.confirmed_at).length;
      const unconfirmed = members.length - confirmed;

      // Nothing to settle once everyone confirmed and the pool is dispatched.
      if (unconfirmed === 0 && confirmed >= 2 && row.status === 'WAITING_FOR_DRIVER') {
        continue;
      }

      const { pool_members: _members, ...pool } = row;
      const outcome = await advanceDispatchService.resolveDeadline(pool as Pool);
      logger.info(`[AdvanceScheduler] Pool ${row.id} resolved as ${outcome}`);
    }
  }

  /**
   * A pool whose pickup time passed without a driver can no longer run. Close
   * it so riders are not left waiting on a ride that will not come.
   */
  private async expirePassedPools(now: string): Promise<void> {
    const { data: pools, error } = await supabaseAdmin
      .from('pools')
      .select('id')
      .eq('is_advance', true)
      .in('status', ['SCHEDULED', 'WAITING_FOR_DRIVER'] as PoolStatus[])
      .is('deleted_at', null)
      .is('driver_id', null)
      .lte('scheduled_pickup_at', now);

    if (error || !pools || pools.length === 0) {
      return;
    }

    const poolIds = pools.map((p: any) => p.id);
    const reason = 'Scheduled pickup time passed without a driver';

    const { data: members } = await supabaseAdmin
      .from('pool_members')
      .select('pool_id, user_id, ride_id')
      .in('pool_id', poolIds)
      .is('left_at', null);

    await supabaseAdmin
      .from('pools')
      .update({ status: 'CANCELLED' as PoolStatus, updated_at: now })
      .in('id', poolIds);

    if (members && members.length > 0) {
      await supabaseAdmin
        .from('pool_members')
        .update({ left_at: now })
        .in('pool_id', poolIds)
        .is('left_at', null);

      await supabaseAdmin
        .from('rides')
        .update({
          status: 'CANCELLED' as RideStatus,
          cancelled_reason: reason,
          cancelled_at: now,
          pool_id: null,
          updated_at: now,
        })
        .in(
          'id',
          members.map((m: any) => m.ride_id)
        );

      for (const member of members) {
        await notificationService.sendPoolCancelledNotification(member.user_id, member.pool_id, reason);
      }
    }

    logger.info(`[AdvanceScheduler] Expired ${poolIds.length} advance pool(s) past their pickup time`);
  }
}

export const advanceSchedulerService = new AdvanceSchedulerService();
