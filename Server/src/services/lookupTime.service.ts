import { supabaseAdmin } from '../config/supabase';
import { PoolStatus, RideStatus } from '../types';
import { notificationService } from './notification.service';
import { logger } from '../utils/logger';
import { h3Utils } from '../utils/h3.utils';
import { smartRouteService, PoolMemberRoute } from './smartRoute.service';
import { config } from '../config/env';

// Timer configuration - single source of truth
const INITIAL_SEARCH_MS = 120000; // 2 minutes initial search
const EXTENDED_SEARCH_MS = 60000; // 1 minute extended search
const TOTAL_SEARCH_MS = INITIAL_SEARCH_MS + EXTENDED_SEARCH_MS; // 3 minutes total
const MIN_PASSENGERS_TO_START = 2;

// Export constants for client to use via API
export const SEARCH_TIMING = {
  INITIAL_SECONDS: INITIAL_SEARCH_MS / 1000,
  EXTENDED_SECONDS: EXTENDED_SEARCH_MS / 1000,
  TOTAL_SECONDS: TOTAL_SEARCH_MS / 1000,
};

type SearchPhase = 'INITIAL' | 'EXTENDED' | 'EXPIRED';

interface LookupTimer {
  poolId: string;
  initialTimeoutId: NodeJS.Timeout;
  extendedTimeoutId?: NodeJS.Timeout;
  createdAt: Date;
  initialExpiresAt: Date;
  totalExpiresAt: Date;
  phase: SearchPhase;
}

export class LookupTimeService {
  private timers: Map<string, LookupTimer> = new Map();

  /**
   * Start the two-phase lookup timer for a pool
   * Phase 1: Initial search (30 seconds) - search in immediate area
   * Phase 2: Extended search (10 seconds) - search in wider area
   * After both phases, pool is either transitioned or cancelled
   */
  startLookupTimer(poolId: string): void {
    if (this.timers.has(poolId)) {
      logger.info(`[LookupTime] Timer already exists for pool ${poolId}, skipping`);
      return;
    }

    const now = new Date();
    const initialExpiresAt = new Date(now.getTime() + INITIAL_SEARCH_MS);
    const totalExpiresAt = new Date(now.getTime() + TOTAL_SEARCH_MS);

    // Phase 1: Initial search timer
    const initialTimeoutId = setTimeout(async () => {
      await this.handleInitialPhaseComplete(poolId);
    }, INITIAL_SEARCH_MS);

    this.timers.set(poolId, {
      poolId,
      initialTimeoutId,
      createdAt: now,
      initialExpiresAt,
      totalExpiresAt,
      phase: 'INITIAL',
    });

    logger.info(`[LookupTime] Started 2-phase timer for pool ${poolId}: initial=${initialExpiresAt.toISOString()}, total=${totalExpiresAt.toISOString()}`);
  }

  /**
   * Handle completion of initial 30-second search phase
   * Automatically transitions to extended search phase
   */
  private async handleInitialPhaseComplete(poolId: string): Promise<void> {
    const timer = this.timers.get(poolId);
    if (!timer) {
      logger.warn(`[LookupTime] No timer found for pool ${poolId} in initial phase handler`);
      return;
    }

    try {
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, status, current_passengers, max_passengers, creator_user_id, destination_h3_index, score_breakdown')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        logger.error(`[LookupTime] Pool ${poolId} not found for initial phase handling`);
        this.timers.delete(poolId);
        return;
      }

      // If pool is no longer waiting for riders, stop the timer
      if (pool.status !== 'WAITING_FOR_RIDERS') {
        logger.info(`[LookupTime] Pool ${poolId} status is ${pool.status}, stopping timer`);
        this.timers.delete(poolId);
        return;
      }

      // If pool already has enough passengers, transition immediately
      if (pool.current_passengers >= MIN_PASSENGERS_TO_START) {
        logger.info(`[LookupTime] Pool ${poolId} has ${pool.current_passengers} passengers, transitioning to WAITING_FOR_DRIVER`);
        await this.transitionToWaitingForDriver(poolId);
        this.timers.delete(poolId);
        return;
      }

      // Start Phase 2: Extended search
      logger.info(`[LookupTime] Pool ${poolId} entering extended search phase (10 seconds)`);
      timer.phase = 'EXTENDED';

      // Expand search area by updating pool's searchable H3 indexes for BOTH pickup and destination
      const extendedSearchData: { extended_search_h3?: string[]; extended_pickup_h3?: string[] } = {};

      // Expand destination search area (Resolution 7: +2 rings ≈ +4.8 km)
      if (pool.destination_h3_index) {
        const expandedDestinationH3 = h3Utils.getExtendedNeighbors(pool.destination_h3_index, 2);
        extendedSearchData.extended_search_h3 = expandedDestinationH3;
        logger.info(`[LookupTime] Extended destination search to ${expandedDestinationH3.length} H3 hexagons`);
      }

      // Expand pickup search area (Resolution 9: +2 rings ≈ +0.7 km)
      const creatorPickupH3 = pool.score_breakdown?.creator_pickup?.h3_index;
      if (creatorPickupH3) {
        const expandedPickupH3 = h3Utils.getExtendedNeighbors(creatorPickupH3, 2);
        extendedSearchData.extended_pickup_h3 = expandedPickupH3;
        logger.info(`[LookupTime] Extended pickup search to ${expandedPickupH3.length} H3 hexagons`);
      }

      // Update pool with expanded search areas
      if (Object.keys(extendedSearchData).length > 0) {
        const currentScoreBreakdown = pool.score_breakdown || {};
        await supabaseAdmin
          .from('pools')
          .update({
            score_breakdown: {
              ...currentScoreBreakdown,
              ...extendedSearchData,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', poolId);
      }

      // Set extended phase timer
      timer.extendedTimeoutId = setTimeout(async () => {
        await this.handleExtendedPhaseComplete(poolId);
      }, EXTENDED_SEARCH_MS);

      this.timers.set(poolId, timer);

    } catch (error) {
      logger.error(`[LookupTime] Error handling initial phase for pool ${poolId}:`, error);
      this.timers.delete(poolId);
    }
  }

  /**
   * Handle completion of extended 10-second search phase
   * Either transitions pool or cancels it
   */
  private async handleExtendedPhaseComplete(poolId: string): Promise<void> {
    this.timers.delete(poolId);

    try {
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, status, current_passengers, max_passengers, creator_user_id')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        logger.error(`[LookupTime] Pool ${poolId} not found for extended phase handling`);
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
        // Pool doesn't have enough passengers - cancel the pool
        logger.info(`[LookupTime] Pool ${poolId} has only ${pool.current_passengers} passenger(s) after extended search, cancelling`);
        await this.cancelPool(poolId, pool.creator_user_id);
      }
    } catch (error) {
      logger.error(`[LookupTime] Error handling extended phase for pool ${poolId}:`, error);
    }
  }

  cancelLookupTimer(poolId: string): boolean {
    const timer = this.timers.get(poolId);
    if (!timer) {
      return false;
    }

    clearTimeout(timer.initialTimeoutId);
    if (timer.extendedTimeoutId) {
      clearTimeout(timer.extendedTimeoutId);
    }
    this.timers.delete(poolId);
    logger.info(`[LookupTime] Cancelled timer for pool ${poolId}`);
    return true;
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

    // Update ride status to CONFIRMED
    await supabaseAdmin
      .from('rides')
      .update({
        status: 'CONFIRMED' as RideStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('pool_id', poolId);

    // PRE-CALCULATE the combined route so all users see the same route immediately
    // This is the "ONE-SHOT" - calculate once when pool is finalized
    if (members && members.length > 0) {
      try {
        const rideIds = members.map((m) => m.ride_id).filter(Boolean);
        const { data: rides } = await supabaseAdmin
          .from('rides')
          .select('user_id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address')
          .in('id', rideIds);

        if (rides && rides.length > 0) {
          const memberRoutes: PoolMemberRoute[] = rides.map((ride: any) => ({
            userId: ride.user_id,
            pickup: { latitude: ride.pickup_lat, longitude: ride.pickup_lng },
            dropoff: { latitude: ride.dropoff_lat, longitude: ride.dropoff_lng },
            pickupAddress: ride.pickup_address,
            dropoffAddress: ride.dropoff_address,
          }));

          // Calculate and cache the route (no driver location yet)
          const route = await smartRouteService.calculateCombinedRoute(
            memberRoutes,
            { optimizeFor: 'balanced' },
            poolId
          );

          if (route) {
            logger.info(`[LookupTime] Pre-calculated route for pool ${poolId}: ${route.waypoints.length} waypoints, ${route.totalDistanceKm}km`);
          }
        }
      } catch (routeError) {
        logger.warn(`[LookupTime] Failed to pre-calculate route for pool ${poolId}:`, routeError);
        // Non-fatal - clients will calculate on first request
      }
    }

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

  /**
   * Get timer info for a pool - used by API to send to client
   */
  getTimerInfo(poolId: string): {
    remainingSeconds: number;
    phase: SearchPhase;
    initialSeconds: number;
    extendedSeconds: number;
    totalSeconds: number;
  } | null {
    const timer = this.timers.get(poolId);
    if (!timer) {
      return null;
    }

    const now = Date.now();
    let remainingMs: number;

    if (timer.phase === 'INITIAL') {
      remainingMs = timer.initialExpiresAt.getTime() - now;
    } else {
      remainingMs = timer.totalExpiresAt.getTime() - now;
    }

    return {
      remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
      phase: timer.phase,
      initialSeconds: SEARCH_TIMING.INITIAL_SECONDS,
      extendedSeconds: SEARCH_TIMING.EXTENDED_SECONDS,
      totalSeconds: SEARCH_TIMING.TOTAL_SECONDS,
    };
  }

  /**
   * Calculate timer info from pool creation time (for pools where timer may not be in memory)
   * This is useful when server restarts or for displaying on client
   */
  calculateTimerFromCreatedAt(createdAt: Date | string): {
    elapsedSeconds: number;
    remainingSeconds: number;
    phase: SearchPhase;
    isExpired: boolean;
    initialSeconds: number;
    extendedSeconds: number;
    totalSeconds: number;
  } {
    const createdAtMs = new Date(createdAt).getTime();
    const elapsedMs = Date.now() - createdAtMs;
    const elapsedSeconds = elapsedMs / 1000;

    let phase: SearchPhase;
    let remainingSeconds: number;
    let isExpired = false;

    if (elapsedSeconds < SEARCH_TIMING.INITIAL_SECONDS) {
      phase = 'INITIAL';
      remainingSeconds = SEARCH_TIMING.INITIAL_SECONDS - elapsedSeconds;
    } else if (elapsedSeconds < SEARCH_TIMING.TOTAL_SECONDS) {
      phase = 'EXTENDED';
      remainingSeconds = SEARCH_TIMING.TOTAL_SECONDS - elapsedSeconds;
    } else {
      phase = 'EXPIRED';
      remainingSeconds = 0;
      isExpired = true;
    }

    return {
      elapsedSeconds: Math.floor(elapsedSeconds),
      remainingSeconds: Math.max(0, Math.ceil(remainingSeconds)),
      phase,
      isExpired,
      initialSeconds: SEARCH_TIMING.INITIAL_SECONDS,
      extendedSeconds: SEARCH_TIMING.EXTENDED_SECONDS,
      totalSeconds: SEARCH_TIMING.TOTAL_SECONDS,
    };
  }

  getActiveTimersCount(): number {
    return this.timers.size;
  }

  clearAllTimers(): void {
    for (const [poolId, timer] of this.timers) {
      clearTimeout(timer.initialTimeoutId);
      if (timer.extendedTimeoutId) {
        clearTimeout(timer.extendedTimeoutId);
      }
      logger.info(`[LookupTime] Cleared timer for pool ${poolId}`);
    }
    this.timers.clear();
  }
}

export const lookupTimeService = new LookupTimeService();
