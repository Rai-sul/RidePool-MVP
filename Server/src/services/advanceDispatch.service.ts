import { supabaseAdmin } from '../config/supabase';
import { CONSTANTS } from '../config/constants';
import { config } from '../config/env';
import { AdvanceDispatchOutcome, Pool, PoolStatus, Ride, RideStatus } from '../types';
import { advanceWindow } from '../utils/advanceWindow';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import { smartRouteService, PoolMemberRoute } from './smartRoute.service';
import { toPoolMemberRoutes } from '../utils/poolRoutes';
import { advanceBookingService } from './advanceBooking.service';

interface PoolMemberRow {
  user_id: string;
  ride_id: string;
  confirmed_at: string | null;
  scheduled_pickup_at: string | null;
}

/**
 * The confirmation and dispatch lifecycle of an advance pool.
 *
 * Confirmation opens shortly before the earliest pickup. Two confirmations
 * make the pool live: the driver search starts and instant riders can backfill
 * it. When the confirmation timer expires, whoever has not confirmed is
 * removed and the pool is resolved.
 */
export class AdvanceDispatchService {
  /** Ask every rider in the pool to confirm they are still going. */
  async openConfirmation(pool: Pool): Promise<void> {
    const members = await this.getActiveMembers(pool.id);

    for (const member of members) {
      await notificationService.sendPushNotification(member.user_id, {
        title: 'Confirm your scheduled ride',
        message: 'Your ride is coming up. Tap to confirm you are still going.',
        type: 'POOL_MATCH',
        metadata: {
          poolId: pool.id,
          scheduledPickupAt: pool.scheduled_pickup_at,
          confirmationDeadlineAt: pool.confirmation_deadline_at,
          action: 'CONFIRM_ADVANCE_BOOKING',
        },
      });
    }

    await supabaseAdmin
      .from('pools')
      .update({ confirmation_notified_at: new Date().toISOString() })
      .eq('id', pool.id);

    logger.info(`[AdvanceDispatch] Confirmation opened for pool ${pool.id} (${members.length} riders)`);
  }

  /**
   * The pool just reached two confirmed riders. It is now live: start looking
   * for a driver and let instant riders fill the remaining seats.
   */
  async onActiveRangeOpened(poolId: string): Promise<void> {
    const { data: pool } = await supabaseAdmin.from('pools').select('*').eq('id', poolId).single();

    if (!pool || pool.status !== 'SCHEDULED') {
      return;
    }

    await supabaseAdmin
      .from('pools')
      .update({ status: 'WAITING_FOR_DRIVER' as PoolStatus, updated_at: new Date().toISOString() })
      .eq('id', poolId)
      .eq('status', 'SCHEDULED' as PoolStatus);

    await this.precalculateRoute(poolId);

    const members = await this.getActiveMembers(poolId);
    for (const member of members) {
      await notificationService.sendPoolReadyNotification(
        member.user_id,
        poolId,
        'Your scheduled pool is confirmed. Searching for a driver...'
      );
    }

    await notificationService.notifyNearbyDrivers(poolId, pool);

    logger.info(`[AdvanceDispatch] Pool ${poolId} confirmed and searching for a driver`);
  }

  /**
   * The confirmation timer expired. Remove anyone who did not confirm, then
   * settle the pool based on how many riders are left.
   */
  async resolveDeadline(pool: Pool): Promise<AdvanceDispatchOutcome> {
    const members = await this.getActiveMembers(pool.id);
    const unconfirmed = members.filter((m) => !m.confirmed_at);
    const confirmed = members.filter((m) => m.confirmed_at);

    for (const member of unconfirmed) {
      await this.removeMember(pool.id, member, 'Did not confirm before the deadline');
    }

    if (confirmed.length >= CONSTANTS.MIN_PASSENGERS) {
      return this.dispatch(pool, confirmed, 'DISPATCHED');
    }

    if (confirmed.length === 0) {
      await this.cancelPool(pool.id, 'Nobody confirmed the scheduled ride');
      logger.info(`[AdvanceDispatch] Pool ${pool.id} cancelled - no confirmations`);
      return 'CANCELLED';
    }

    return this.resolveSoloPool(pool, confirmed[0]);
  }

  /**
   * One rider confirmed. A solo ride is not dispatched unless the fallback is
   * explicitly enabled, so try to move the rider to another scheduled pool,
   * then to ask them for a later pickup time, and only then give up.
   */
  private async resolveSoloPool(pool: Pool, survivor: PoolMemberRow): Promise<AdvanceDispatchOutcome> {
    await this.syncSeatCount(pool.id, 1);

    if (config.advanceBooking.soloFallback) {
      logger.info(`[AdvanceDispatch] Pool ${pool.id} dispatching solo (SOLO_FALLBACK enabled)`);
      return this.dispatch(pool, [survivor], 'DISPATCHED');
    }

    const rematched = await this.tryRematch(pool, survivor);
    if (rematched) {
      await this.cancelPool(pool.id, 'Rider moved to a better matching pool');
      await notificationService.sendPushNotification(survivor.user_id, {
        title: 'We found you another pool',
        message: 'Your scheduled ride was moved to a pool with more riders.',
        type: 'POOL_MATCH',
        metadata: { poolId: rematched, previousPoolId: pool.id, outcome: 'WAIT_FOR_MATCH' },
      });
      logger.info(`[AdvanceDispatch] Pool ${pool.id} rider rematched into ${rematched}`);
      return 'WAIT_FOR_MATCH';
    }

    if (this.canExtend(pool)) {
      // Give the rider the rest of the window to push their pickup time back.
      // Updating the booking re-runs matching; if they do nothing, the sweep
      // comes back at the pickup time and cancels.
      const extendedDeadline = new Date(pool.scheduled_pickup_at as string);

      await supabaseAdmin
        .from('pools')
        .update({
          confirmation_deadline_at: extendedDeadline.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', pool.id);

      await notificationService.sendPushNotification(survivor.user_id, {
        title: 'Still looking for a co-rider',
        message: 'Nobody else confirmed yet. Extend your pickup time or cancel your booking.',
        type: 'POOL_MATCH',
        metadata: {
          poolId: pool.id,
          outcome: 'ASK_USER_TO_EXTEND',
          newDeadlineAt: extendedDeadline.toISOString(),
        },
      });

      logger.info(`[AdvanceDispatch] Pool ${pool.id} asking rider to extend`);
      return 'ASK_USER_TO_EXTEND';
    }

    await this.cancelPool(pool.id, 'Not enough riders confirmed the scheduled ride');
    logger.info(`[AdvanceDispatch] Pool ${pool.id} cancelled - only one rider confirmed`);
    return 'CANCEL_POOL';
  }

  /**
   * The rider can be asked to extend only once, and only while the pickup time
   * is still ahead. A deadline already pushed out to the pickup time means the
   * ask has been made and gone unanswered.
   */
  private canExtend(pool: Pool): boolean {
    if (!pool.confirmation_deadline_at || !pool.scheduled_pickup_at) {
      return false;
    }

    const pickupAt = new Date(pool.scheduled_pickup_at).getTime();
    const alreadyAsked = new Date(pool.confirmation_deadline_at).getTime() >= pickupAt;

    return !alreadyAsked && Date.now() < pickupAt;
  }

  /** Look for another scheduled pool that still fits this rider's booking. */
  private async tryRematch(pool: Pool, survivor: PoolMemberRow): Promise<string | null> {
    const { data: ride } = await supabaseAdmin
      .from('rides')
      .select('*')
      .eq('id', survivor.ride_id)
      .single();

    if (!ride || ride.booking_type !== 'ADVANCE' || !ride.scheduled_pickup_at) {
      return null;
    }

    try {
      const result = await advanceBookingService.updateBooking(survivor.user_id, ride.id, {
        pickup_lat: ride.pickup_lat,
        pickup_lng: ride.pickup_lng,
        pickup_address: ride.pickup_address ?? undefined,
        destination_lat: ride.dropoff_lat,
        destination_lng: ride.dropoff_lng,
        destination_address: ride.dropoff_address ?? undefined,
        vehicle_type: ride.vehicle_type,
        gender_restriction: ride.gender_restriction,
        scheduled_pickup_at: ride.scheduled_pickup_at,
      });

      // A brand-new pool is not a rematch - it is the same lonely rider again.
      return result.created_pool ? null : result.pool_id;
    } catch (error) {
      logger.info(`[AdvanceDispatch] Rematch failed for ride ${ride.id}: ${(error as Error).message}`);
      return null;
    }
  }

  /** Move the pool into the regular driver search used by instant pools. */
  private async dispatch(
    pool: Pool,
    members: PoolMemberRow[],
    outcome: AdvanceDispatchOutcome
  ): Promise<AdvanceDispatchOutcome> {
    await this.syncSeatCount(pool.id, members.length);

    const { data: updated } = await supabaseAdmin
      .from('pools')
      .update({
        status: 'WAITING_FOR_DRIVER' as PoolStatus,
        active_range_start_at: pool.active_range_start_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pool.id)
      .select()
      .single();

    await supabaseAdmin
      .from('rides')
      .update({ status: 'WAITING_FOR_DRIVER' as RideStatus, updated_at: new Date().toISOString() })
      .in(
        'id',
        members.map((m) => m.ride_id)
      );

    await this.precalculateRoute(pool.id);

    for (const member of members) {
      await notificationService.sendPoolReadyNotification(
        member.user_id,
        pool.id,
        'Your scheduled pool is confirmed. Searching for a driver...'
      );
    }

    if (updated) {
      await notificationService.notifyNearbyDrivers(pool.id, updated);
    }

    logger.info(`[AdvanceDispatch] Pool ${pool.id} dispatched with ${members.length} riders`);
    return outcome;
  }

  // ============================================
  // HELPERS
  // ============================================

  private async getActiveMembers(poolId: string): Promise<PoolMemberRow[]> {
    const { data } = await supabaseAdmin
      .from('pool_members')
      .select('user_id, ride_id, confirmed_at, scheduled_pickup_at')
      .eq('pool_id', poolId)
      .is('left_at', null);

    return (data || []) as PoolMemberRow[];
  }

  private async removeMember(poolId: string, member: PoolMemberRow, reason: string): Promise<void> {
    await supabaseAdmin
      .from('pool_members')
      .update({ left_at: new Date().toISOString() })
      .eq('pool_id', poolId)
      .eq('user_id', member.user_id)
      .is('left_at', null);

    await supabaseAdmin
      .from('rides')
      .update({
        status: 'CANCELLED' as RideStatus,
        cancelled_reason: reason,
        cancelled_at: new Date().toISOString(),
        pool_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.ride_id);

    await notificationService.sendPoolCancelledNotification(member.user_id, poolId, reason);
    logger.info(`[AdvanceDispatch] Removed unconfirmed rider ${member.user_id} from pool ${poolId}`);
  }

  private async syncSeatCount(poolId: string, count: number): Promise<void> {
    await supabaseAdmin
      .from('pools')
      .update({ current_passengers: count, updated_at: new Date().toISOString() })
      .eq('id', poolId);
  }

  private async cancelPool(poolId: string, reason: string): Promise<void> {
    const members = await this.getActiveMembers(poolId);

    await supabaseAdmin
      .from('pools')
      .update({ status: 'CANCELLED' as PoolStatus, updated_at: new Date().toISOString() })
      .eq('id', poolId);

    if (members.length > 0) {
      await supabaseAdmin
        .from('pool_members')
        .update({ left_at: new Date().toISOString() })
        .eq('pool_id', poolId)
        .is('left_at', null);

      await supabaseAdmin
        .from('rides')
        .update({
          status: 'CANCELLED' as RideStatus,
          cancelled_reason: reason,
          cancelled_at: new Date().toISOString(),
          pool_id: null,
          updated_at: new Date().toISOString(),
        })
        .in(
          'id',
          members.map((m) => m.ride_id)
        );

      for (const member of members) {
        await notificationService.sendPoolCancelledNotification(member.user_id, poolId, reason);
      }
    }
  }

  /** Cache the combined route once, the same way instant pools do on dispatch. */
  private async precalculateRoute(poolId: string): Promise<void> {
    try {
      const members = await this.getActiveMembers(poolId);
      const rideIds = members.map((m) => m.ride_id).filter(Boolean);
      if (rideIds.length === 0) {
        return;
      }

      const { data: rides } = await supabaseAdmin
        .from('rides')
        .select('user_id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address')
        .in('id', rideIds);

      if (!rides || rides.length === 0) {
        return;
      }

      await smartRouteService.clearPoolRoute(poolId);

      const memberRoutes: PoolMemberRoute[] = toPoolMemberRoutes(rides);

      await smartRouteService.calculateCombinedRoute(memberRoutes, { optimizeFor: 'balanced' }, poolId);
    } catch (error) {
      // Non-fatal: clients fall back to calculating the route on first request.
      logger.warn(`[AdvanceDispatch] Could not pre-calculate route for pool ${poolId}:`, error);
    }
  }
}

export const advanceDispatchService = new AdvanceDispatchService();
