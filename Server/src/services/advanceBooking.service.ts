import { supabaseAdmin } from '../config/supabase';
import { CONSTANTS } from '../config/constants';
import { config } from '../config/env';
import {
  AdvanceBookingResult,
  CreateAdvanceBookingRequest,
  GenderPreference,
  Pool,
  PoolStatus,
  Ride,
  RideStatus,
  VehicleType,
} from '../types';
import { h3Utils } from '../utils/h3.utils';
import { advanceWindow } from '../utils/advanceWindow';
import { resolveGenderRestriction } from '../utils/genderRestriction';
import { logger } from '../utils/logger';
import { poolMatchingService } from './poolMatching.service';
import { rideEstimationService } from './rideEstimation.service';
import { notificationService } from './notification.service';

/** Raised when a booking cannot be accepted. The code reaches the client verbatim. */
export class AdvanceBookingError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AdvanceBookingError';
  }
}

interface CandidatePool extends Pool {
  matchScore: number;
  timeGapMs: number;
}

export class AdvanceBookingService {
  /**
   * Create an advance booking and auto-assign it to a pool.
   *
   * Advance riders never browse pools. The booking is validated, stored as an
   * ADVANCE ride, then matched against existing scheduled pools; if none fit,
   * it starts its own.
   */
  async createBooking(
    userId: string,
    request: CreateAdvanceBookingRequest
  ): Promise<AdvanceBookingResult> {
    const scheduledPickupAt = new Date(request.scheduled_pickup_at);
    const invalid = advanceWindow.validatePickupTime(scheduledPickupAt);
    if (invalid) {
      throw new AdvanceBookingError('INVALID_PICKUP_TIME', invalid);
    }

    await this.assertNoOverlappingBooking(userId, scheduledPickupAt);

    // The client can ask for a female-only pool; the stored profile decides.
    const genderRestriction = await resolveGenderRestriction(userId, request.gender_restriction);

    const ride = await this.createAdvanceRide(userId, request, scheduledPickupAt, genderRestriction);

    try {
      return await this.assignToPool(userId, ride, scheduledPickupAt);
    } catch (error) {
      // Never leave an orphaned booking behind if matching fails.
      await supabaseAdmin
        .from('rides')
        .update({ status: 'CANCELLED' as RideStatus, cancelled_reason: 'Advance assignment failed' })
        .eq('id', ride.id);
      throw error;
    }
  }

  /**
   * Re-run matching for an existing booking.
   *
   * The old seat is released first so the rider is never counted twice, then
   * matching starts from scratch with the new details.
   */
  async updateBooking(
    userId: string,
    rideId: string,
    request: CreateAdvanceBookingRequest
  ): Promise<AdvanceBookingResult> {
    const existing = await this.getOwnedBooking(userId, rideId);

    const scheduledPickupAt = new Date(request.scheduled_pickup_at);
    const invalid = advanceWindow.validatePickupTime(scheduledPickupAt);
    if (invalid) {
      throw new AdvanceBookingError('INVALID_PICKUP_TIME', invalid);
    }

    await this.assertNoOverlappingBooking(userId, scheduledPickupAt, rideId);

    if (existing.pool_id) {
      await this.assertPoolStillEditable(existing.pool_id);
      await this.releaseSeat(existing.pool_id, userId, 'Booking updated');
    }

    const genderRestriction = await resolveGenderRestriction(userId, request.gender_restriction);
    const pickupH3 = h3Utils.latLngToH3(
      { latitude: request.pickup_lat, longitude: request.pickup_lng },
      config.h3.resolutionPickup
    );
    const dropoffH3 = h3Utils.latLngToH3(
      { latitude: request.destination_lat, longitude: request.destination_lng },
      config.h3.resolutionDestination
    );

    const { data: updated, error } = await supabaseAdmin
      .from('rides')
      .update({
        pickup_lat: request.pickup_lat,
        pickup_lng: request.pickup_lng,
        pickup_address: request.pickup_name || request.pickup_address,
        pickup_h3_index: pickupH3,
        dropoff_lat: request.destination_lat,
        dropoff_lng: request.destination_lng,
        dropoff_address: request.destination_name || request.destination_address,
        dropoff_h3_index: dropoffH3,
        vehicle_type: request.vehicle_type,
        gender_restriction: genderRestriction,
        scheduled_pickup_at: scheduledPickupAt.toISOString(),
        pool_id: null,
        status: 'CREATING_POOL' as RideStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !updated) {
      throw new AdvanceBookingError('UPDATE_FAILED', 'Could not update the booking');
    }

    return this.assignToPool(userId, updated as Ride, scheduledPickupAt);
  }

  /**
   * Cancel a booking: release the seat, recalculate the pool, and stop there.
   * Cancellation does not look for another pool for the rider.
   */
  async cancelBooking(userId: string, rideId: string): Promise<{ pool_id: string | null }> {
    const existing = await this.getOwnedBooking(userId, rideId);

    if (existing.pool_id) {
      await this.assertPoolStillEditable(existing.pool_id);
      await this.releaseSeat(existing.pool_id, userId, 'Booking cancelled');
    }

    await supabaseAdmin
      .from('rides')
      .update({
        status: 'CANCELLED' as RideStatus,
        cancelled_reason: 'Advance booking cancelled by rider',
        cancelled_at: new Date().toISOString(),
        pool_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId)
      .eq('user_id', userId);

    return { pool_id: existing.pool_id };
  }

  /** Confirm the rider is still going. Opens the Active Pickup Range at 2 confirmations. */
  async confirmBooking(
    userId: string,
    poolId: string
  ): Promise<{ confirmed_count: number; active_range_opened: boolean }> {
    const { data, error } = await supabaseAdmin.rpc('atomic_confirm_advance_member', {
      p_pool_id: poolId,
      p_user_id: userId,
    });

    if (error) {
      throw new AdvanceBookingError(this.extractCode(error.message), this.extractMessage(error.message));
    }

    logger.info(
      `[Advance] User ${userId} confirmed pool ${poolId} (${data.confirmed_count} confirmed, range opened: ${data.active_range_opened})`
    );

    return data;
  }

  /** List a rider's upcoming advance bookings with their pool state. */
  async listBookings(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('rides')
      .select(
        `id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address,
         vehicle_type, gender_restriction, status, scheduled_pickup_at, pool_id, fare,
         pools:pool_id (id, status, current_passengers, max_passengers, scheduled_pickup_at,
                        confirmation_opens_at, confirmation_deadline_at, active_range_start_at,
                        fare_per_person)`
      )
      .eq('user_id', userId)
      .eq('booking_type', 'ADVANCE')
      .not('status', 'in', '("COMPLETED","CANCELLED")')
      .order('scheduled_pickup_at', { ascending: true });

    if (error) {
      throw error;
    }

    const memberships = await this.getConfirmationState(userId, (data || []).map((r: any) => r.pool_id));

    return (data || []).map((ride: any) => ({
      ...ride,
      confirmed_at: memberships[ride.pool_id] ?? null,
    }));
  }

  // ============================================
  // MATCHING
  // ============================================

  /**
   * Find the best compatible scheduled pool for a booking, or create one.
   *
   * Candidates are ranked deterministically and tried in order: the database
   * has the final say on seats and the pickup window, so a pool that fills up
   * mid-loop simply falls through to the next candidate.
   */
  private async assignToPool(
    userId: string,
    ride: Ride,
    scheduledPickupAt: Date
  ): Promise<AdvanceBookingResult> {
    const candidates = await this.findCandidatePools(userId, ride, scheduledPickupAt);

    for (const pool of candidates) {
      const { data, error } = await supabaseAdmin.rpc('atomic_assign_advance_booking', {
        p_pool_id: pool.id,
        p_user_id: userId,
        p_ride_id: ride.id,
        p_scheduled_pickup_at: scheduledPickupAt.toISOString(),
        p_window_seconds: advanceWindow.poolWindowSeconds,
        p_confirm_lead_seconds: advanceWindow.confirmLeadSeconds,
        p_confirm_window_seconds: advanceWindow.confirmWindowSeconds,
      });

      if (error) {
        logger.info(`[Advance] Pool ${pool.id} rejected booking ${ride.id}: ${error.message}`);
        continue;
      }

      await this.refreshPoolFare(pool.id, ride.vehicle_type);
      await this.notifyExistingMembers(pool.id, userId, data.current_passengers);

      const schedule = advanceWindow.scheduleFor(new Date(data.scheduled_pickup_at));
      logger.info(`[Advance] Booking ${ride.id} joined pool ${pool.id} (${data.current_passengers} riders)`);

      return {
        ride_id: ride.id,
        pool_id: pool.id,
        created_pool: false,
        scheduled_pickup_at: scheduledPickupAt.toISOString(),
        pool_scheduled_pickup_at: data.scheduled_pickup_at,
        confirmation_opens_at: schedule.confirmationOpensAt.toISOString(),
        current_passengers: data.current_passengers,
        max_passengers: pool.max_passengers,
      };
    }

    return this.createPoolForBooking(userId, ride, scheduledPickupAt);
  }

  /**
   * Scheduled pools this booking could share, ranked best first.
   *
   * The time filter is the pool-wide window from the spec: adding this pickup
   * time must keep the span between the pool's earliest and latest pickup
   * within the configured window. Route, gender, capacity and vehicle checks
   * are the same ones instant matching uses.
   */
  private async findCandidatePools(
    userId: string,
    ride: Ride,
    scheduledPickupAt: Date
  ): Promise<CandidatePool[]> {
    const pickup = { latitude: ride.pickup_lat, longitude: ride.pickup_lng };
    const destination = { latitude: ride.dropoff_lat, longitude: ride.dropoff_lng };

    const pickupH3 = h3Utils.latLngToH3(pickup, config.h3.resolutionPickup);
    const destinationH3 = h3Utils.latLngToH3(destination, config.h3.resolutionDestination);
    const pickupHexagons = h3Utils.getH3Ring(pickupH3, config.h3.searchRadiusPickup);
    const destinationHexagons = h3Utils.getH3Ring(destinationH3, config.h3.searchRadiusDestination);

    // max(latest, T) - min(earliest, T) <= W  reduces to these two bounds.
    const windowMs = advanceWindow.poolWindowMs;
    const earliestBound = new Date(scheduledPickupAt.getTime() - windowMs).toISOString();
    const latestBound = new Date(scheduledPickupAt.getTime() + windowMs).toISOString();

    const { data: rawPools, error } = await supabaseAdmin
      .from('pools')
      .select('*')
      .eq('is_advance', true)
      .eq('status', 'SCHEDULED' as PoolStatus)
      .eq('vehicle_type', ride.vehicle_type)
      .eq('gender_restriction', ride.gender_restriction)
      .is('deleted_at', null)
      .neq('creator_user_id', userId)
      .gte('scheduled_pickup_at', earliestBound)
      .lte('scheduled_window_end_at', latestBound)
      .gt('confirmation_opens_at', new Date().toISOString())
      .in('destination_h3_index', destinationHexagons);

    if (error) {
      logger.error('[Advance] Candidate pool query failed:', error);
      return [];
    }

    const candidates: CandidatePool[] = [];

    for (const pool of (rawPools || []) as Pool[]) {
      if (pool.current_passengers >= pool.max_passengers) {
        continue;
      }
      if (!pool.pickup_h3_index || !pickupHexagons.includes(pool.pickup_h3_index)) {
        continue;
      }

      const compatibility = poolMatchingService.isRideCompatibleWithPool(ride, pool);
      if (!compatibility.compatible) {
        continue;
      }

      candidates.push({
        ...pool,
        matchScore: compatibility.score ?? 0,
        timeGapMs: Math.abs(
          new Date(pool.scheduled_pickup_at as string).getTime() - scheduledPickupAt.getTime()
        ),
      });
    }

    // Deterministic ranking: best match, then closest in time, then fullest
    // pool, then pool id so repeated runs always agree.
    return candidates.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (a.timeGapMs !== b.timeGapMs) return a.timeGapMs - b.timeGapMs;
      if (b.current_passengers !== a.current_passengers) return b.current_passengers - a.current_passengers;
      return a.id.localeCompare(b.id);
    });
  }

  // ============================================
  // POOL / RIDE PERSISTENCE
  // ============================================

  private async createAdvanceRide(
    userId: string,
    request: CreateAdvanceBookingRequest,
    scheduledPickupAt: Date,
    genderRestriction: GenderPreference
  ): Promise<Ride> {
    const pickup = { latitude: request.pickup_lat, longitude: request.pickup_lng };
    const destination = { latitude: request.destination_lat, longitude: request.destination_lng };

    const estimate = await rideEstimationService.getRideEstimate(
      pickup,
      destination,
      request.vehicle_type as VehicleType,
      CONSTANTS.MIN_PASSENGERS
    );

    const { data: ride, error } = await supabaseAdmin
      .from('rides')
      .insert({
        user_id: userId,
        pickup_lat: request.pickup_lat,
        pickup_lng: request.pickup_lng,
        pickup_address: request.pickup_name || request.pickup_address,
        pickup_h3_index: h3Utils.latLngToH3(pickup, config.h3.resolutionPickup),
        dropoff_lat: request.destination_lat,
        dropoff_lng: request.destination_lng,
        dropoff_address: request.destination_name || request.destination_address,
        dropoff_h3_index: h3Utils.latLngToH3(destination, config.h3.resolutionDestination),
        vehicle_type: request.vehicle_type,
        gender_restriction: genderRestriction,
        status: 'CREATING_POOL' as RideStatus,
        booking_type: 'ADVANCE',
        scheduled_pickup_at: scheduledPickupAt.toISOString(),
        distance_km: estimate.distanceKm,
      })
      .select()
      .single();

    if (error || !ride) {
      logger.error('[Advance] Failed to create advance ride:', error);
      throw new AdvanceBookingError('BOOKING_FAILED', 'Could not create the booking');
    }

    return ride as Ride;
  }

  private async createPoolForBooking(
    userId: string,
    ride: Ride,
    scheduledPickupAt: Date
  ): Promise<AdvanceBookingResult> {
    const pickup = { latitude: ride.pickup_lat, longitude: ride.pickup_lng };
    const destination = { latitude: ride.dropoff_lat, longitude: ride.dropoff_lng };
    const maxPassengers = CONSTANTS.VEHICLE_CAPACITY[ride.vehicle_type];
    const schedule = advanceWindow.scheduleFor(scheduledPickupAt);

    const estimate = await rideEstimationService.getRideEstimate(
      pickup,
      destination,
      ride.vehicle_type,
      CONSTANTS.MIN_PASSENGERS
    );

    const { data: pool, error } = await supabaseAdmin
      .from('pools')
      .insert({
        creator_user_id: userId,
        pickup_lat: ride.pickup_lat,
        pickup_lng: ride.pickup_lng,
        pickup_address: ride.pickup_address,
        pickup_h3_index: ride.pickup_h3_index,
        destination_lat: ride.dropoff_lat,
        destination_lng: ride.dropoff_lng,
        destination_address: ride.dropoff_address,
        destination_h3_index: ride.dropoff_h3_index,
        vehicle_type: ride.vehicle_type,
        gender_restriction: ride.gender_restriction,
        max_passengers: maxPassengers,
        current_passengers: 1,
        status: 'SCHEDULED' as PoolStatus,
        is_advance: true,
        scheduled_pickup_at: scheduledPickupAt.toISOString(),
        scheduled_window_end_at: scheduledPickupAt.toISOString(),
        confirmation_opens_at: schedule.confirmationOpensAt.toISOString(),
        confirmation_deadline_at: schedule.confirmationDeadlineAt.toISOString(),
        fare_per_person: estimate.fareEstimates.with2Passengers,
        base_distance_km: estimate.distanceKm,
        base_duration_minutes: estimate.durationMinutes,
      })
      .select()
      .single();

    if (error || !pool) {
      logger.error('[Advance] Failed to create advance pool:', error);
      throw new AdvanceBookingError('BOOKING_FAILED', 'Could not create a pool for the booking');
    }

    const { error: memberError } = await supabaseAdmin.from('pool_members').insert({
      pool_id: pool.id,
      user_id: userId,
      ride_id: ride.id,
      join_type: 'ADVANCE',
      joined_at: new Date().toISOString(),
      scheduled_pickup_at: scheduledPickupAt.toISOString(),
    });

    if (memberError) {
      logger.error('[Advance] Failed to add creator to advance pool:', memberError);
      throw new AdvanceBookingError('BOOKING_FAILED', 'Could not create a pool for the booking');
    }

    await supabaseAdmin
      .from('rides')
      .update({ pool_id: pool.id, status: 'SEARCHING' as RideStatus })
      .eq('id', ride.id);

    logger.info(
      `[Advance] Booking ${ride.id} started pool ${pool.id} for ${scheduledPickupAt.toISOString()}`
    );

    return {
      ride_id: ride.id,
      pool_id: pool.id,
      created_pool: true,
      scheduled_pickup_at: scheduledPickupAt.toISOString(),
      pool_scheduled_pickup_at: scheduledPickupAt.toISOString(),
      confirmation_opens_at: schedule.confirmationOpensAt.toISOString(),
      current_passengers: 1,
      max_passengers: maxPassengers,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private async getOwnedBooking(userId: string, rideId: string): Promise<Ride> {
    const { data: ride, error } = await supabaseAdmin
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .eq('user_id', userId)
      .eq('booking_type', 'ADVANCE')
      .single();

    if (error || !ride) {
      throw new AdvanceBookingError('BOOKING_NOT_FOUND', 'Advance booking not found');
    }

    if (ride.status === 'CANCELLED' || ride.status === 'COMPLETED') {
      throw new AdvanceBookingError('BOOKING_CLOSED', 'This booking is already closed');
    }

    return ride as Ride;
  }

  /** A pool that has entered confirmation or dispatch is past the point of edits. */
  private async assertPoolStillEditable(poolId: string): Promise<void> {
    const { data: pool } = await supabaseAdmin
      .from('pools')
      .select('status, confirmation_opens_at')
      .eq('id', poolId)
      .single();

    if (!pool) {
      return;
    }

    if (pool.status !== 'SCHEDULED') {
      throw new AdvanceBookingError('POOL_NO_LONGER_JOINABLE', 'This pool is already being dispatched');
    }

    if (pool.confirmation_opens_at && new Date(pool.confirmation_opens_at) <= new Date()) {
      throw new AdvanceBookingError(
        'CONFIRMATION_IN_PROGRESS',
        'This pool has entered its confirmation window and can no longer be changed'
      );
    }
  }

  /**
   * Remove a rider from a scheduled pool and recompute what depends on them:
   * seat count, the pickup window, and the confirmation schedule.
   */
  private async releaseSeat(poolId: string, userId: string, reason: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('pool_members')
      .update({ left_at: new Date().toISOString() })
      .eq('pool_id', poolId)
      .eq('user_id', userId)
      .is('left_at', null);

    if (error) {
      throw new AdvanceBookingError('RELEASE_FAILED', 'Could not release the existing seat');
    }

    const { data: remaining } = await supabaseAdmin
      .from('pool_members')
      .select('scheduled_pickup_at')
      .eq('pool_id', poolId)
      .is('left_at', null);

    const members = remaining || [];

    if (members.length === 0) {
      await supabaseAdmin
        .from('pools')
        .update({
          current_passengers: 0,
          status: 'CANCELLED' as PoolStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poolId);
      logger.info(`[Advance] Pool ${poolId} cancelled - last rider left (${reason})`);
      return;
    }

    const times = members
      .map((m: any) => new Date(m.scheduled_pickup_at).getTime())
      .filter((t: number) => !Number.isNaN(t));
    const earliest = new Date(Math.min(...times));
    const latest = new Date(Math.max(...times));
    const schedule = advanceWindow.scheduleFor(earliest);

    // If the window moved later, riders already prompted could no longer
    // confirm, so clear the marker and let the sweep prompt again on time.
    const reopened = schedule.confirmationOpensAt.getTime() > Date.now();

    await supabaseAdmin
      .from('pools')
      .update({
        current_passengers: members.length,
        scheduled_pickup_at: earliest.toISOString(),
        scheduled_window_end_at: latest.toISOString(),
        confirmation_opens_at: schedule.confirmationOpensAt.toISOString(),
        confirmation_deadline_at: schedule.confirmationDeadlineAt.toISOString(),
        ...(reopened ? { confirmation_notified_at: null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', poolId);

    logger.info(`[Advance] Pool ${poolId} now has ${members.length} riders (${reason})`);
  }

  /** One rider cannot hold two bookings whose pickup windows overlap. */
  private async assertNoOverlappingBooking(
    userId: string,
    scheduledPickupAt: Date,
    excludeRideId?: string
  ): Promise<void> {
    const windowMs = advanceWindow.poolWindowMs;
    let query = supabaseAdmin
      .from('rides')
      .select('id, scheduled_pickup_at')
      .eq('user_id', userId)
      .eq('booking_type', 'ADVANCE')
      .not('status', 'in', '("COMPLETED","CANCELLED")')
      .gte('scheduled_pickup_at', new Date(scheduledPickupAt.getTime() - windowMs).toISOString())
      .lte('scheduled_pickup_at', new Date(scheduledPickupAt.getTime() + windowMs).toISOString());

    // The booking being moved is not a clash with itself.
    if (excludeRideId) {
      query = query.neq('id', excludeRideId);
    }

    const { data: clashes } = await query;

    if (clashes && clashes.length > 0) {
      throw new AdvanceBookingError(
        'OVERLAPPING_BOOKING',
        'You already have a booking scheduled around that time'
      );
    }
  }

  /** Recalculate the per-person fare now that the pool has one more rider. */
  private async refreshPoolFare(poolId: string, vehicleType: VehicleType): Promise<void> {
    try {
      const { data: members } = await supabaseAdmin
        .from('pool_members')
        .select('ride_id')
        .eq('pool_id', poolId)
        .is('left_at', null);

      const rideIds = (members || []).map((m: any) => m.ride_id).filter(Boolean);
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

      const fareResult = await rideEstimationService.recalculatePoolFare(
        rides.map((r: any) => ({
          userId: r.user_id,
          pickup: { latitude: r.pickup_lat, longitude: r.pickup_lng },
          dropoff: { latitude: r.dropoff_lat, longitude: r.dropoff_lng },
          pickupAddress: r.pickup_address,
          dropoffAddress: r.dropoff_address,
        })),
        vehicleType
      );

      await supabaseAdmin
        .from('pools')
        .update({ fare_per_person: fareResult.farePerPerson, updated_at: new Date().toISOString() })
        .eq('id', poolId);
    } catch (error) {
      // Fare refresh is advisory; the pool keeps its previous estimate.
      logger.warn(`[Advance] Could not refresh fare for pool ${poolId}:`, error);
    }
  }

  private async notifyExistingMembers(
    poolId: string,
    joiningUserId: string,
    currentPassengers: number
  ): Promise<void> {
    const { data: members } = await supabaseAdmin
      .from('pool_members')
      .select('user_id')
      .eq('pool_id', poolId)
      .is('left_at', null);

    for (const member of members || []) {
      if (member.user_id === joiningUserId) continue;
      await notificationService.sendPushNotification(member.user_id, {
        title: 'Someone joined your scheduled ride',
        message: `Your pool now has ${currentPassengers} riders.`,
        type: 'POOL_MATCH',
        metadata: { poolId, currentPassengers },
      });
    }
  }

  private async getConfirmationState(
    userId: string,
    poolIds: (string | null)[]
  ): Promise<Record<string, string | null>> {
    const ids = poolIds.filter((id): id is string => !!id);
    if (ids.length === 0) {
      return {};
    }

    const { data } = await supabaseAdmin
      .from('pool_members')
      .select('pool_id, confirmed_at')
      .eq('user_id', userId)
      .is('left_at', null)
      .in('pool_id', ids);

    return Object.fromEntries((data || []).map((m: any) => [m.pool_id, m.confirmed_at]));
  }

  /** Postgres raises "CODE: message"; split it back into the two halves. */
  private extractCode(message = ''): string {
    const match = message.match(/([A-Z_]{4,}):/);
    return match ? match[1] : 'ADVANCE_BOOKING_ERROR';
  }

  private extractMessage(message = ''): string {
    const match = message.match(/[A-Z_]{4,}:\s*(.+)$/);
    return match ? match[1] : message;
  }
}

export const advanceBookingService = new AdvanceBookingService();
