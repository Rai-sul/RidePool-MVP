import { supabaseAdmin } from '../config/supabase';
import { notificationService } from './notification.service';
import { h3Utils } from '../utils/h3.utils';
import { calculateDistance } from '../utils/helper';
import { logger } from '../utils/logger';
import { memoryCacheService } from './memoryCache.service';
import { Location, Ride } from '../types';

// Priyo Sathi matching constraints from requirements
const PRIYO_SATHI_CONSTRAINTS = {
  MAX_DETOUR_MINUTES: 7,       // Maximum detour time in minutes
  MAX_DETOUR_DISTANCE_KM: 1,   // Maximum detour distance in km
  MAX_ROUTE_DEVIATION_M: 50,   // If friend is >50m from route, don't add
  MAX_COMPANIONS: 5,           // Maximum Priyo Sathi per user
  AVERAGE_CITY_SPEED_KMH: 25,  // Average city speed for time calculations
  MAX_DISPLAY_DISTANCE_KM: 5,  // Maximum distance to show companion as "available"
  MAX_H3_DISTANCE: 1,          // Max H3 cell distance (0=same, 1=adjacent)
};

const PRIYO_SATHI_INTENT_TTL_SECONDS = 300; // 5 minutes

export interface PriyoSathiCompanion {
  id: string;
  companion_id: string;
  companion_phone?: string;
  companion_name?: string;
  companion_rating?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
}

export interface PriyoSathiMatchCandidate {
  companionId: string;
  companionPhone?: string;
  companionName?: string;
  companionRating?: number;
  location?: Location;
  destination?: Location;
  distanceFromUser: number;
  detourMinutes: number;
  isOnRoute: boolean;
  canAutoMatch: boolean;
  matchReason: string;
}

export interface PriyoSathiMatchResult {
  candidates: PriyoSathiMatchCandidate[];
  autoMatchedIds: string[];
  notifiedIds: string[];
  skippedIds: string[];
}

export class PriyoSathiService {
  private getIntentCacheKey(userId: string): string {
    return `priyo_sathi:intent:${userId}`;
  }

  async setUserRideIntent(userId: string, pickup: Location, destination: Location): Promise<void> {
    await memoryCacheService.set(
      this.getIntentCacheKey(userId),
      { pickup, destination, updatedAt: new Date().toISOString() },
      PRIYO_SATHI_INTENT_TTL_SECONDS
    );
  }

  private async getUserRideIntent(userId: string): Promise<{ pickup: Location; destination: Location } | null> {
    const cached = await memoryCacheService.get<{ pickup: Location; destination: Location }>(
      this.getIntentCacheKey(userId)
    );
    return cached || null;
  }
  /**
   * Check if a companion is eligible for invite based on active ride + hex proximity rules
   */
  async isCompanionEligibleForInvite(
    userId: string,
    companionId: string,
    rideId: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    // Get inviter ride details (pickup + destination required)
    const { data: inviterRide } = await supabaseAdmin
      .from('rides')
      .select('pickup_lat, pickup_lng, dropoff_lat, dropoff_lng')
      .eq('id', rideId)
      .eq('user_id', userId)
      .single();

    if (
      !inviterRide?.pickup_lat ||
      !inviterRide?.pickup_lng ||
      !inviterRide?.dropoff_lat ||
      !inviterRide?.dropoff_lng
    ) {
      return { eligible: false, reason: 'Inviter ride missing pickup or destination' };
    }

    // Companion must have active ride with pickup + destination
    const companionRide = await this.getCompanionLocation(companionId);
    if (!companionRide) {
      return { eligible: false, reason: 'Companion is offline or missing pickup/destination' };
    }

    const inviterPickup: Location = {
      latitude: inviterRide.pickup_lat,
      longitude: inviterRide.pickup_lng,
    };
    const inviterDestination: Location = {
      latitude: inviterRide.dropoff_lat,
      longitude: inviterRide.dropoff_lng,
    };

    const inviterPickupH3 = h3Utils.latLngToH3(inviterPickup, 9);
    const inviterDestH3 = h3Utils.latLngToH3(inviterDestination, 7);
    const companionPickupH3 = h3Utils.latLngToH3(companionRide.pickup, 9);
    const companionDestH3 = h3Utils.latLngToH3(companionRide.destination, 7);

    const pickupH3Distance = h3Utils.getH3Distance(inviterPickupH3, companionPickupH3);
    const destH3Distance = h3Utils.getH3Distance(inviterDestH3, companionDestH3);

    if (pickupH3Distance > PRIYO_SATHI_CONSTRAINTS.MAX_H3_DISTANCE) {
      return { eligible: false, reason: 'Pickup locations are not in the same or adjacent hexagon' };
    }

    if (destH3Distance > PRIYO_SATHI_CONSTRAINTS.MAX_H3_DISTANCE) {
      return { eligible: false, reason: 'Destinations are not in the same or adjacent hexagon' };
    }

    return { eligible: true };
  }

  /**
   * Get user's accepted Priyo Sathi companions
   */
  async getAcceptedCompanions(userId: string): Promise<PriyoSathiCompanion[]> {
    const { data: companions, error } = await supabaseAdmin
      .from('priyo_sathi')
      .select(`
        id,
        companion_id,
        status,
        companion:users!companion_id(phone, full_name, average_rating)
      `)
      .eq('user_id', userId)
      .eq('status', 'ACCEPTED');

    if (error) {
      logger.error('[PriyoSathi] Error fetching companions:', error);
      return [];
    }

    return (companions || []).map((c: any) => ({
      id: c.id,
      companion_id: c.companion_id,
      companion_phone: c.companion?.phone,
      companion_name: c.companion?.full_name,
      companion_rating: c.companion?.average_rating,
      status: c.status,
    }));
  }

  /**
   * Check if two users are Priyo Sathi (mutual accepted relationship)
   */
  async arePriyoSathi(userId1: string, userId2: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('priyo_sathi')
      .select('id')
      .or(`and(user_id.eq.${userId1},companion_id.eq.${userId2}),and(user_id.eq.${userId2},companion_id.eq.${userId1})`)
      .eq('status', 'ACCEPTED')
      .limit(1);

    return (data?.length || 0) > 0;
  }

  /**
   * Find and notify Priyo Sathi companions when a user creates a pool or searches for ride
   * 
   * Algorithm (from requirements):
   * 1. Query Priyo Sathi table for accepted companions
   * 2. Check if companions are in same hexagon and detour is < 7 min / < 1 km
   * 3. If on route and within 50m, can be auto-added
   * 4. Otherwise, send notification for them to join (if sendNotifications is true)
   */
  async findAndNotifyCompanions(
    userId: string,
    userPickup: Location,
    userDestination: Location,
    rideId: string,
    poolId?: string,
    sendNotifications: boolean = true // Set to false for preview mode
  ): Promise<PriyoSathiMatchResult> {
    const result: PriyoSathiMatchResult = {
      candidates: [],
      autoMatchedIds: [],
      notifiedIds: [],
      skippedIds: [],
    };

    try {
      // Get user's accepted companions
      const companions = await this.getAcceptedCompanions(userId);
      
      if (companions.length === 0) {
        logger.info(`[PriyoSathi] User ${userId} has no Priyo Sathi companions`);
        return result;
      }

      // Get user info for notification
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('phone, full_name')
        .eq('id', userId)
        .single();

      const userPickupH3 = h3Utils.latLngToH3(userPickup, 9);
      const userDestH3 = h3Utils.latLngToH3(userDestination, 7);

      // Check each companion for matching potential
      for (const companion of companions) {
        try {
          // Check if companion has an active ride (meaning they are online and looking for a ride)
          const companionRideLocation = await this.getCompanionLocation(companion.companion_id);
          
          if (!companionRideLocation) {
            // Companion has no active ride - they are offline/not looking for a ride
            result.skippedIds.push(companion.companion_id);
            logger.debug(`[PriyoSathi] Skipping companion ${companion.companion_id} - no active ride (offline)`);
            continue;
          }

          const companionLocation = companionRideLocation.pickup;
          const companionDestination = companionRideLocation.destination;

          // Calculate distance from user's pickup to companion
          const distanceFromUser = calculateDistance(
            userPickup.latitude,
            userPickup.longitude,
            companionLocation.latitude,
            companionLocation.longitude
          );

          // Calculate detour time (minutes)
          const detourMinutes = Math.round(
            (distanceFromUser / PRIYO_SATHI_CONSTRAINTS.AVERAGE_CITY_SPEED_KMH) * 60
          );

          // Check if companion pickup/current location is in same or adjacent hexagon (H3 res 9)
          // Distance <= 1 means same cell or adjacent cells
          const companionH3 = h3Utils.latLngToH3(companionLocation, 9);
          const h3Distance = h3Utils.getH3Distance(userPickupH3, companionH3);
          const isNearbyHexagon = h3Distance <= PRIYO_SATHI_CONSTRAINTS.MAX_H3_DISTANCE;

          // Check if companion destination is in same or adjacent hexagon (H3 res 7)
          const companionDestH3 = h3Utils.latLngToH3(companionDestination, 7);
          const destH3Distance = h3Utils.getH3Distance(userDestH3, companionDestH3);
          const isDestinationNearby = destH3Distance <= PRIYO_SATHI_CONSTRAINTS.MAX_H3_DISTANCE;

          // Check if companion is on the route (within 50m of route line)
          const isOnRoute = this.isLocationOnRoute(
            companionLocation,
            userPickup,
            userDestination,
            PRIYO_SATHI_CONSTRAINTS.MAX_ROUTE_DEVIATION_M
          );

          // Visibility rule: show only if BOTH pickup/current and destination are same or adjacent hexagon
          const isWithinProximity = isNearbyHexagon && isDestinationNearby;

          if (!isWithinProximity) {
            // User is online but too far away - do NOT show them as available
            result.skippedIds.push(companion.companion_id);
            logger.debug(`[PriyoSathi] Skipping companion ${companion.companion_id} - not within pickup/destination hex proximity (pickup h3Distance: ${h3Distance}, dest h3Distance: ${destH3Distance})`);
            continue;
          }

          // Determine if auto-match is possible (stricter criteria)
          const canAutoMatch = 
            isNearbyHexagon &&
            detourMinutes <= PRIYO_SATHI_CONSTRAINTS.MAX_DETOUR_MINUTES &&
            distanceFromUser <= PRIYO_SATHI_CONSTRAINTS.MAX_DETOUR_DISTANCE_KM;

          let matchReason = '';
          if (canAutoMatch) {
            matchReason = `Can auto-match: ${distanceFromUser.toFixed(2)}km away, ${detourMinutes} min detour`;
          } else if (isOnRoute) {
            matchReason = `On route: ${distanceFromUser.toFixed(2)}km away`;
          } else if (isNearbyHexagon) {
            matchReason = `Nearby: ${distanceFromUser.toFixed(2)}km away`;
          } else {
            matchReason = `Within range: ${distanceFromUser.toFixed(2)}km from pickup`;
          }

          result.candidates.push({
            companionId: companion.companion_id,
            companionPhone: companion.companion_phone,
            companionName: companion.companion_name,
            companionRating: companion.companion_rating,
            location: companionLocation,
            destination: companionDestination,
            distanceFromUser,
            detourMinutes,
            isOnRoute,
            canAutoMatch,
            matchReason,
          });

          // Send notification to companion (only if sendNotifications is true)
          if (sendNotifications) {
            await notificationService.sendPriyoSathiInviteNotification(
              companion.companion_id,
              userData?.full_name || userData?.phone || 'Your Priyo Sathi',
              rideId,
              poolId
            );
            result.notifiedIds.push(companion.companion_id);
          }

        } catch (companionError) {
          logger.warn(`[PriyoSathi] Error checking companion ${companion.companion_id}:`, companionError);
          result.skippedIds.push(companion.companion_id);
        }
      }

      logger.info(`[PriyoSathi] Found ${result.candidates.length} candidates for user ${userId}`, {
        autoMatchable: result.candidates.filter(c => c.canAutoMatch).length,
        notified: result.notifiedIds.length,
        skipped: result.skippedIds.length,
      });

      return result;

    } catch (error) {
      logger.error('[PriyoSathi] Error in findAndNotifyCompanions:', error);
      return result;
    }
  }

  /**
   * Get companion's location ONLY if they have an active ride request.
   * This ensures we only show companions who are actually looking for a ride.
   * 
   * FIX: Previously this returned saved "Home" location even if user was offline,
   * which incorrectly showed offline users as "available and near route".
   */
  private async getCompanionLocation(companionId: string): Promise<{ pickup: Location; destination: Location } | null> {
    // ONLY check if companion has an active ride with BOTH pickup and destination
    const { data: activeRide } = await supabaseAdmin
      .from('rides')
      .select('pickup_lat, pickup_lng, dropoff_lat, dropoff_lng')
      .eq('user_id', companionId)
      .in('status', ['CREATING_POOL', 'SEARCHING', 'MATCHED', 'CONFIRMED', 'WAITING_FOR_DRIVER'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (
      activeRide?.pickup_lat &&
      activeRide?.pickup_lng &&
      activeRide?.dropoff_lat &&
      activeRide?.dropoff_lng
    ) {
      return {
        pickup: {
          latitude: activeRide.pickup_lat,
          longitude: activeRide.pickup_lng,
        },
        destination: {
          latitude: activeRide.dropoff_lat,
          longitude: activeRide.dropoff_lng,
        },
      };
    }

    // Fallback to recent ride intent (set when user opens Priyo Sathi modal)
    const intent = await this.getUserRideIntent(companionId);
    if (intent?.pickup && intent?.destination) {
      return intent;
    }

    // Do NOT fallback to saved Home location - this would show offline users as "available"
    return null;
  }

  /**
   * Check if a location is approximately on the route (simple line-distance check)
   */
  private isLocationOnRoute(
    location: Location,
    routeStart: Location,
    routeEnd: Location,
    maxDeviationMeters: number
  ): boolean {
    // Calculate perpendicular distance from point to line
    const distance = this.pointToLineDistance(
      location,
      routeStart,
      routeEnd
    );

    return distance <= maxDeviationMeters / 1000; // Convert to km
  }

  /**
   * Calculate perpendicular distance from a point to a line segment (in km)
   */
  private pointToLineDistance(
    point: Location,
    lineStart: Location,
    lineEnd: Location
  ): number {
    const x = point.latitude;
    const y = point.longitude;
    const x1 = lineStart.latitude;
    const y1 = lineStart.longitude;
    const x2 = lineEnd.latitude;
    const y2 = lineEnd.longitude;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx: number, yy: number;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    return calculateDistance(x, y, xx, yy);
  }

  /**
   * Apply Priyo Sathi cancellation penalty
   * Per requirements: "If one Priyo Sathi cancels, the other friend gets charged"
   */
  async applyPriyoSathiCancellationPenalty(
    cancellingUserId: string,
    rideId: string,
    poolId: string
  ): Promise<{ penaltyApplied: boolean; affectedUsers: string[]; reason: string }> {
    try {
      // Find the pool members
      const { data: poolMembers } = await supabaseAdmin
        .from('pool_members')
        .select('user_id, ride_id')
        .eq('pool_id', poolId)
        .is('left_at', null);

      if (!poolMembers || poolMembers.length < 2) {
        return {
          penaltyApplied: false,
          affectedUsers: [],
          reason: 'Not enough pool members for Priyo Sathi penalty',
        };
      }

      const affectedUsers: string[] = [];

      // Check each other pool member to see if they're Priyo Sathi with cancelling user
      for (const member of poolMembers) {
        if (member.user_id === cancellingUserId) continue;

        const areFriends = await this.arePriyoSathi(cancellingUserId, member.user_id);
        
        if (areFriends) {
          // Apply penalty to the friend (not the one who cancelled)
          const penaltyAmount = 20; // BDT - configurable

          // Deduct from promise money
          const { data: deductResult } = await supabaseAdmin.rpc('deduct_promise_money', {
            p_user_id: member.user_id,
            p_amount: penaltyAmount,
            p_reason: 'Priyo Sathi cancellation penalty - your friend cancelled the ride',
            p_ride_id: rideId,
          });

          if (deductResult?.success) {
            affectedUsers.push(member.user_id);

            // Notify the affected user
            await notificationService.sendPushNotification(member.user_id, {
              title: 'Priyo Sathi Penalty Applied',
              message: `৳${penaltyAmount} deducted because your Priyo Sathi cancelled the ride.`,
              type: 'SYSTEM',
              metadata: {
                penalty_type: 'PRIYO_SATHI_CANCELLATION',
                amount: penaltyAmount,
                ride_id: rideId,
                pool_id: poolId,
              },
            });

            logger.info(`[PriyoSathi] Penalty applied to user ${member.user_id} for friend's cancellation`, {
              cancellingUser: cancellingUserId,
              penaltyAmount,
              rideId,
            });
          }
        }
      }

      return {
        penaltyApplied: affectedUsers.length > 0,
        affectedUsers,
        reason: affectedUsers.length > 0
          ? `Penalty applied to ${affectedUsers.length} Priyo Sathi friend(s)`
          : 'No Priyo Sathi relationships found in pool',
      };

    } catch (error) {
      logger.error('[PriyoSathi] Error applying cancellation penalty:', error);
      return {
        penaltyApplied: false,
        affectedUsers: [],
        reason: 'Error processing penalty',
      };
    }
  }

  /**
   * Link a Priyo Sathi invite to a ride (for tracking invites)
   */
  async recordPriyoSathiInvite(
    inviterId: string,
    inviteeId: string,
    rideId: string,
    poolId?: string
  ): Promise<void> {
    try {
      // Update the ride with Priyo Sathi invite info (stored in metadata via notifications)
      // This is tracked via the notifications table for simplicity
      logger.info(`[PriyoSathi] Recorded invite: ${inviterId} -> ${inviteeId} for ride ${rideId}`);
    } catch (error) {
      logger.error('[PriyoSathi] Error recording invite:', error);
    }
  }

  /**
   * Check if a user was invited by their Priyo Sathi for a specific pool
   */
  async wasInvitedByPriyoSathi(userId: string, poolId: string): Promise<boolean> {
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('metadata')
      .eq('user_id', userId)
      .eq('type', 'MESSAGE')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 mins
      .not('metadata->ride_id', 'is', null);

    if (!notifications || notifications.length === 0) {
      return false;
    }

    // Check if any notification was a Priyo Sathi invite for a ride in this pool
    for (const notification of notifications) {
      if (notification.metadata?.inviter) {
        // This was a Priyo Sathi invite
        const { data: ride } = await supabaseAdmin
          .from('rides')
          .select('pool_id')
          .eq('id', notification.metadata.ride_id)
          .single();

        if (ride?.pool_id === poolId) {
          return true;
        }
      }
    }

    return false;
  }
}

export const priyoSathiService = new PriyoSathiService();
