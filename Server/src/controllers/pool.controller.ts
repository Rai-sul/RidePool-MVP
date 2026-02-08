import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { poolMatchingService } from '../services/poolMatching.service';
import { fareService } from '../services/fare.service';
import { rideEstimationService, PoolMemberLocation } from '../services/rideEstimation.service';
import { lookupTimeService, SEARCH_TIMING } from '../services/lookupTime.service';
import { penaltyService } from '../services/penalty.service';
import { notificationService } from '../services/notification.service';
import { smartRouteService, PoolMemberRoute } from '../services/smartRoute.service';
import { googleMapsService } from '../services/googleMaps.service';
import { priyoSathiService } from '../services/priyoSathi.service';
import { CreatePoolRequest, Pool, PoolStatus, Ride, RideStatus, Location, VehicleType } from '../types';
import { h3Utils } from '../utils/h3.utils';
import { logger } from '../utils/logger';

/**
 * Extracts a user-friendly location name from an address string.
 * If the stored address is already a place name (short, no street number pattern),
 * returns it as-is. Otherwise, extracts the first meaningful part.
 * 
 * Examples:
 * - "East West University" → "East West University" (already a name)
 * - "North South University, Bashundhara, Dhaka" → "North South University"
 * - "123 Main Street, Gulshan 2, Dhaka" → "Gulshan 2" (extracts area name)
 * - "House 45, Road 12, Banani, Dhaka 1213" → "Banani"
 */
function extractLocationName(address: string | undefined): string {
  if (!address) return 'Location';
  
  const trimmed = address.trim();
  
  // If it's short (under 40 chars) and doesn't look like an address, it's likely a name
  // Address patterns: starts with number, contains "Road", "Street", "House", etc.
  const addressPatterns = /^(\d+|House|Plot|Flat|Road|Street|Block|Sector)\s/i;
  if (trimmed.length <= 40 && !addressPatterns.test(trimmed) && !trimmed.includes(',')) {
    return trimmed;
  }
  
  // Split by comma and find the first meaningful part
  const parts = trimmed.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  if (parts.length === 0) return 'Location';
  
  // Check each part for meaningful location name (not a street number or generic address component)
  for (const part of parts) {
    // Skip parts that look like street addresses (start with numbers or have house/road/street)
    if (/^(\d+|House|Plot|Flat)\s/i.test(part)) continue;
    // Skip parts that are just postal codes (4-6 digits)
    if (/^\d{4,6}$/.test(part)) continue;
    // Skip parts that look like "Road 12" or "Street 45"
    if (/^(Road|Street|Block|Sector)\s+\d+/i.test(part)) continue;
    // Skip "Bangladesh" or "Dhaka" alone as they're too generic
    if (/^(Bangladesh|Dhaka)$/i.test(part)) continue;
    
    // This part looks like a meaningful location name
    return part;
  }
  
  // Fallback: return first part, limited length
  return parts[0].substring(0, 40);
}

export class PoolController {
  async searchPools(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type, gender_restriction } = req.query;

      if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng || !vehicle_type) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Missing required parameters' },
          timestamp: new Date().toISOString(),
        });
      }

      const pickupLat = parseFloat(pickup_lat as string);
      const pickupLng = parseFloat(pickup_lng as string);
      const dropoffLat = parseFloat(dropoff_lat as string);
      const dropoffLng = parseFloat(dropoff_lng as string);

      const mockRide: Partial<Ride> = {
        user_id: userId,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        vehicle_type: vehicle_type as any,
        gender_restriction: (gender_restriction as string) || 'ANY',
        status: 'CREATING_POOL',
      } as Ride;

      // Record ride intent for Priyo Sathi visibility (search flow)
      await priyoSathiService.setUserRideIntent(userId, {
        latitude: pickupLat,
        longitude: pickupLng,
      }, {
        latitude: dropoffLat,
        longitude: dropoffLng,
      });

      logger.info(`[Pool Search] User ${userId} searching with: pickup=${pickup_lat},${pickup_lng} dest=${dropoff_lat},${dropoff_lng} vehicle=${vehicle_type} gender=${gender_restriction || 'ANY'}`);

      const searchResult = await poolMatchingService.findMatchingPoolsEnhanced(mockRide as Ride, userId);

      logger.info(`[Pool Search] Found ${searchResult.matches.length} matches, hasMatches=${searchResult.hasMatches}`);

      res.json({
        success: true,
        data: {
          pools: searchResult.matches.slice(0, 10),
          alternatives: searchResult.alternatives,
          analytics: searchResult.analytics,
          metadata: searchResult.metadata,
          has_matches: searchResult.hasMatches,
          total_found: searchResult.totalPoolsFound,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async createPool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const cooldownStatus = await penaltyService.isUserInCooldown(userId);
      if (cooldownStatus.inCooldown) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'COOLDOWN_ACTIVE',
            message: `You are in a cooldown period. Please wait ${Math.ceil(cooldownStatus.remainingSeconds / 60)} minutes.`,
            ends_at: cooldownStatus.endsAt,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const poolData: CreatePoolRequest = req.body;

      const pickup = {
        latitude: poolData.pickup_lat,
        longitude: poolData.pickup_lng,
      };

      const destination = {
        latitude: poolData.destination_lat,
        longitude: poolData.destination_lng,
      };

      const destinationH3 = h3Utils.latLngToH3(destination, 7);
      const pickupH3 = h3Utils.latLngToH3(pickup, 9);
      const dropoffH3 = h3Utils.latLngToH3(destination, 7);

      logger.info(`[Pool] Creating pool with destination H3: ${destinationH3}, vehicle: ${poolData.vehicle_type}, gender: ${poolData.gender_restriction || 'ANY'}`);

      // Calculate initial fare based on pickup to destination
      // This ensures consistent pricing for all pool members with same route
      const rideEstimate = await rideEstimationService.getRideEstimate(
        pickup,
        destination,
        poolData.vehicle_type as VehicleType,
        2 // Initial estimate for 2 passengers
      );

      // Store pickup info in score_breakdown for reference
      const scoreBreakdown = {
        creator_pickup: {
          lat: poolData.pickup_lat,
          lng: poolData.pickup_lng,
          address: poolData.pickup_address,
          name: poolData.pickup_name,
          h3_index: pickupH3,
        },
        base_distance_km: rideEstimate.distanceKm,
        base_duration_minutes: rideEstimate.durationMinutes,
        calculated_at: new Date().toISOString(),
      };

      // First, create a ride for the pool creator
      // Use location name instead of address for better user-friendliness in co-rider views
      const { data: creatorRide, error: rideError } = await supabaseAdmin
        .from('rides')
        .insert({
          user_id: userId,
          pickup_lat: poolData.pickup_lat,
          pickup_lng: poolData.pickup_lng,
          pickup_address: poolData.pickup_name || poolData.pickup_address,
          pickup_h3_index: pickupH3,
          dropoff_lat: poolData.destination_lat,
          dropoff_lng: poolData.destination_lng,
          dropoff_address: poolData.destination_name || poolData.destination_address,
          dropoff_h3_index: dropoffH3,
          vehicle_type: poolData.vehicle_type,
          gender_restriction: poolData.gender_restriction || 'ANY',
          status: 'CREATING_POOL',
          distance_km: rideEstimate.distanceKm,
        })
        .select()
        .single();

      if (rideError) {
        logger.error(`[Pool] Failed to create ride for pool creator: ${rideError.message}`);
        throw rideError;
      }

      const { data: pool, error } = await supabaseAdmin
        .from('pools')
        .insert({
          creator_user_id: userId,
          destination_lat: poolData.destination_lat,
          destination_lng: poolData.destination_lng,
          destination_address: poolData.destination_name || poolData.destination_address,
          destination_h3_index: destinationH3,
          vehicle_type: poolData.vehicle_type,
          max_passengers: poolData.max_passengers,
          gender_restriction: poolData.gender_restriction || 'ANY',
          current_passengers: 1,
          status: 'WAITING_FOR_RIDERS' as PoolStatus,
          fare_per_person: rideEstimate.fareEstimates.with2Passengers,
          score_breakdown: scoreBreakdown,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update the ride with pool_id - status stays as SEARCHING until riders join
      // The ride status should only become MATCHED when another rider joins the pool
      await supabaseAdmin
        .from('rides')
        .update({ pool_id: pool.id, status: 'SEARCHING' })
        .eq('id', creatorRide.id);

      // Add the creator as the first pool member with ride_id
      const { error: memberError } = await supabaseAdmin
        .from('pool_members')
        .insert({
          pool_id: pool.id,
          user_id: userId,
          ride_id: creatorRide.id,
          join_type: 'INITIAL',
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        logger.warn(`Failed to add creator as pool member: ${memberError.message}`);
      }

      // Start the 2-phase server-side timer (30s initial + 10s extended = 40s total)
      lookupTimeService.startLookupTimer(pool.id);

      // Do NOT auto-notify Priyo Sathi companions here.
      // Priyo Sathi invites should only be sent explicitly by the user.

      res.status(201).json({
        success: true,
        data: {
          pool,
          ride: creatorRide,
          search_timing: {
            initial_seconds: SEARCH_TIMING.INITIAL_SECONDS,
            extended_seconds: SEARCH_TIMING.EXTENDED_SECONDS,
            total_seconds: SEARCH_TIMING.TOTAL_SECONDS,
            expires_at: new Date(Date.now() + SEARCH_TIMING.TOTAL_SECONDS * 1000).toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async joinPool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;
      const { ride_id } = req.body;

      const cooldownStatus = await penaltyService.isUserInCooldown(userId);
      if (cooldownStatus.inCooldown) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'COOLDOWN_ACTIVE',
            message: `You are in a cooldown period. Please wait ${Math.ceil(cooldownStatus.remainingSeconds / 60)} minutes.`,
            ends_at: cooldownStatus.endsAt,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: ride, error: rideError } = await supabaseAdmin
        .from('rides')
        .select('*')
        .eq('id', ride_id)
        .eq('user_id', userId)
        .single();

      if (rideError || !ride) {
        return res.status(404).json({
          success: false,
          error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('*')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const compatibility = poolMatchingService.isRideCompatibleWithPool(ride as Ride, pool as Pool);

      if (!compatibility.compatible) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INCOMPATIBLE',
            message: 'Ride not compatible with pool',
            reason: compatibility.reason,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: joinResult, error: joinError } = await supabaseAdmin.rpc('atomic_join_pool', {
        p_pool_id: poolId,
        p_user_id: userId,
        p_ride_id: ride_id,
      });

      if (joinError) {
        if (joinError.message?.includes('POOL_FULL')) {
          return res.status(400).json({
            success: false,
            error: { code: 'POOL_FULL', message: 'Pool is full' },
            timestamp: new Date().toISOString(),
          });
        }
        if (joinError.message?.includes('POOL_NOT_AVAILABLE')) {
          return res.status(400).json({
            success: false,
            error: { code: 'POOL_NOT_AVAILABLE', message: 'Pool is no longer available' },
            timestamp: new Date().toISOString(),
          });
        }
        throw joinError;
      }

      // Recalculate fare with new member
      // Get all pool members to calculate accurate fare
      const { data: poolWithMembers } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(user_id, ride_id)
        `)
        .eq('id', poolId)
        .single();

      let creatorNotified = false;

      let farePerPerson = fareService.applyPoolDiscount(
        fareService.calculateBaseFare(ride.distance_km || 10, pool.vehicle_type),
        joinResult.current_passengers
      );

      // If we have member rides, calculate more accurate fare
      if (poolWithMembers?.pool_members?.length > 0) {
        const rideIds = poolWithMembers.pool_members.map((m: any) => m.ride_id).filter(Boolean);
        const { data: memberRides } = await supabaseAdmin
          .from('rides')
          .select('*')
          .in('id', rideIds);

        if (memberRides && memberRides.length > 0) {
          const members: PoolMemberLocation[] = memberRides.map((r: any) => ({
            userId: r.user_id,
            pickup: { latitude: r.pickup_lat, longitude: r.pickup_lng },
            dropoff: { latitude: r.dropoff_lat, longitude: r.dropoff_lng },
            pickupAddress: r.pickup_address,
            dropoffAddress: r.dropoff_address,
          }));

          const fareResult = await rideEstimationService.recalculatePoolFare(
            members,
            pool.vehicle_type as VehicleType
          );
          farePerPerson = fareResult.farePerPerson;

          // Update pool with new fare
          await supabaseAdmin
            .from('pools')
            .update({
              fare_per_person: farePerPerson,
              updated_at: new Date().toISOString(),
            })
            .eq('id', poolId);

          // Update all pool members' ride status to MATCHED since someone joined
          await supabaseAdmin
            .from('rides')
            .update({
              status: 'MATCHED' as RideStatus,
              updated_at: new Date().toISOString(),
            })
            .in('id', rideIds);

          // Notify existing members about fare change
          for (const member of poolWithMembers.pool_members) {
            if (member.user_id !== userId) {
              await notificationService.sendPushNotification(member.user_id, {
                title: 'Fare Updated - New Rider Joined!',
                message: `A new rider joined your pool. Your fare is now ৳${farePerPerson} per person.`,
                type: 'POOL_MATCH',
                metadata: { poolId, farePerPerson, newPassengers: joinResult.current_passengers },
              });
              if (member.user_id === pool.creator_user_id) {
                creatorNotified = true;
              }
            }
          }
        }
      }

      // Ensure pool transitions and smart route are refreshed when a member joins
      await lookupTimeService.handleMemberJoined(poolId);

      if (!creatorNotified) {
        await notificationService.sendPoolFoundNotification(pool.creator_user_id, poolId);
      }

      res.json({
        success: true,
        data: {
          pool_id: poolId,
          member_id: joinResult.member_id,
          compatibility_score: compatibility.score,
          fare_per_person: farePerPerson,
          current_passengers: joinResult.current_passengers,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;

      const { data: pool, error } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(
            id,
            user_id,
            ride_id,
            join_type,
            join_score,
            is_front_route,
            joined_at,
            left_at
          ),
          vehicles(vehicle_number, model, color),
          driver:users!driver_id(id, full_name, average_rating)
        `)
        .eq('id', poolId)
        .single();

      if (error) {
        logger.warn(`[Pool] Error fetching pool ${poolId}: ${error.message}`);
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      if (!pool) {
        logger.warn(`[Pool] Pool ${poolId} not found in database`);
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Filter out members who have left (left_at IS NOT NULL)
      if (pool.pool_members) {
        pool.pool_members = pool.pool_members.filter((m: any) => m.left_at === null);
      }

      // Fetch user details for pool members separately to avoid join issues
      if (pool.pool_members && pool.pool_members.length > 0) {
        const userIds = pool.pool_members.map((m: any) => m.user_id);
        const rideIds = pool.pool_members.map((m: any) => m.ride_id).filter(Boolean);
        
        // Fetch user profiles
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, full_name')
          .in('id', userIds);
        
        // Fetch ride details
        const { data: rides } = rideIds.length > 0 
          ? await supabaseAdmin
              .from('rides')
              .select('id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address')
              .in('id', rideIds)
          : { data: [] };
        
        // Attach user and ride info to pool members
        pool.pool_members = pool.pool_members.map((member: any) => ({
          ...member,
          user: users?.find((u: any) => u.id === member.user_id) || null,
          ride: rides?.find((r: any) => r.id === member.ride_id) || null,
        }));
      }

      // Calculate search timing based on pool creation time (single source of truth)
      // This works even if server restarted and timer is not in memory
      const searchTiming = pool.status === 'WAITING_FOR_RIDERS' && pool.created_at
        ? lookupTimeService.calculateTimerFromCreatedAt(pool.created_at)
        : null;

      res.json({
        success: true,
        data: {
          pool,
          search_timing: searchTiming,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async leavePool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;

      const { data: result, error } = await supabaseAdmin.rpc('atomic_leave_pool', {
        p_pool_id: poolId,
        p_user_id: userId,
      });

      if (error) {
        throw error;
      }

      if (!result.success) {
        if (result.reason === 'NOT_MEMBER') {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_IN_POOL', message: result.message },
            timestamp: new Date().toISOString(),
          });
        }
        if (result.reason === 'RIDE_IN_PROGRESS') {
          return res.status(400).json({
            success: false,
            error: { code: 'RIDE_IN_PROGRESS', message: result.message },
            timestamp: new Date().toISOString(),
          });
        }
        return res.status(400).json({
          success: false,
          error: { code: result.reason, message: result.message },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: ride } = await supabaseAdmin
        .from('rides')
        .select('created_at')
        .eq('id', result.ride_id)
        .single();

      if (ride) {
        const penaltyResult = await penaltyService.recordCancellation(
          userId,
          result.ride_id,
          ride.created_at
        );

        if (penaltyResult.penaltyApplied) {
          await notificationService.sendPushNotification(userId, {
            title: 'Cooldown Applied',
            message: 'Due to multiple cancellations, you have a 7-minute cooldown.',
            type: 'SYSTEM',
            metadata: { cooldown_ends_at: penaltyResult.cooldownEndsAt },
          });
        }
      }

      // Apply Priyo Sathi cancellation penalty (if applicable)
      // Per requirements: "If one Priyo Sathi cancels, the other friend gets charged"
      const priyoSathiPenalty = await priyoSathiService.applyPriyoSathiCancellationPenalty(
        userId,
        result.ride_id,
        poolId
      );
      if (priyoSathiPenalty.penaltyApplied) {
        logger.info(`[Pool] Priyo Sathi penalty applied: ${priyoSathiPenalty.reason}`);
      }

      // Check remaining active members (those who haven't left)
      const { data: poolWithMembers } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(user_id, ride_id, left_at)
        `)
        .eq('id', poolId)
        .single();

      // Filter to only active members (left_at IS NULL)
      const activeMembers = poolWithMembers?.pool_members?.filter((m: any) => m.left_at === null) || [];
      
      // If no members remain (user was alone) or only 1 member remains, auto-cancel the pool
      if (activeMembers.length <= 1) {
        logger.info(`[Pool] ${activeMembers.length} member(s) left in pool ${poolId}, auto-cancelling pool`);
        
        // Cancel the lookup timer
        lookupTimeService.cancelLookupTimer(poolId);
        
        // Update pool status to CANCELLED
        await supabaseAdmin
          .from('pools')
          .update({
            status: 'CANCELLED' as PoolStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', poolId);
        
        // If there's 1 remaining member (not the user who left), cancel their ride and notify them
        if (activeMembers.length === 1) {
          const lastMember = activeMembers[0];
          
          // Cancel the last member's ride
          if (lastMember.ride_id) {
            await supabaseAdmin
              .from('rides')
              .update({
                pool_id: null,
                status: 'CANCELLED' as RideStatus,
                cancelled_reason: 'Pool cancelled - not enough riders',
                updated_at: new Date().toISOString(),
              })
              .eq('id', lastMember.ride_id);
          }
          
          // Notify the remaining member that pool was cancelled
          await notificationService.sendPushNotification(lastMember.user_id, {
            title: 'Pool Cancelled',
            message: 'Your pool was automatically cancelled because all other riders left.',
            type: 'POOL_CANCELLED',
            metadata: { poolId, reason: 'not_enough_riders' },
          });
        }
        
        res.json({
          success: true,
          data: { 
            message: 'Left pool successfully',
            pool_cancelled: true,
            reason: activeMembers.length === 0 ? 'You were the only member - pool cancelled' : 'Only 1 member remaining - pool auto-cancelled',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // If more than 1 member remains, recalculate fare
      if (activeMembers.length > 1) {
        const rideIds = activeMembers.map((m: any) => m.ride_id).filter(Boolean);
        const { data: memberRides } = await supabaseAdmin
          .from('rides')
          .select('*')
          .in('id', rideIds);

        if (memberRides && memberRides.length > 0) {
          const members: PoolMemberLocation[] = memberRides.map((r: any) => ({
            userId: r.user_id,
            pickup: { latitude: r.pickup_lat, longitude: r.pickup_lng },
            dropoff: { latitude: r.dropoff_lat, longitude: r.dropoff_lng },
            pickupAddress: r.pickup_address,
            dropoffAddress: r.dropoff_address,
          }));

          const fareResult = await rideEstimationService.recalculatePoolFare(
            members,
            poolWithMembers.vehicle_type as VehicleType
          );

          // Update pool with new fare
          await supabaseAdmin
            .from('pools')
            .update({
              fare_per_person: fareResult.farePerPerson,
              updated_at: new Date().toISOString(),
            })
            .eq('id', poolId);

          // Notify remaining members about fare change
          for (const member of activeMembers) {
            await notificationService.sendPushNotification(member.user_id, {
              title: 'Fare Updated - Rider Left',
              message: `A rider left the pool. Your fare is now ৳${fareResult.farePerPerson} per person.`,
              type: 'SYSTEM',
              metadata: { poolId, farePerPerson: fareResult.farePerPerson, remainingPassengers: members.length },
            });
          }
        }
      }

      // Clear cached route when membership changes
      await smartRouteService.clearPoolRoute(poolId);

      // Pre-calculate the new route with remaining members
      // This is needed when a member leaves during WAITING_FOR_DRIVER or READY_TO_START
      if (['WAITING_FOR_DRIVER', 'READY_TO_START'].includes(poolWithMembers.status) && activeMembers.length >= 2) {
        try {
          const rideIds = activeMembers.map((m: any) => m.ride_id).filter(Boolean);
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

            // Calculate and cache the updated route
            await smartRouteService.calculateCombinedRoute(
              memberRoutes,
              { optimizeFor: 'balanced' },
              poolId
            );
            logger.info(`[Pool] Pre-calculated route after member left pool ${poolId} (${memberRoutes.length} remaining)`);
          }
        } catch (routeError) {
          logger.warn(`[Pool] Failed to pre-calculate route after member left:`, routeError);
          // Non-fatal - clients will calculate on first request
        }
      }

      res.json({
        success: true,
        data: { message: 'Left pool successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelPool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;

      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, creator_user_id, status')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      if (pool.creator_user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_CREATOR', message: 'Only pool creator can cancel' },
          timestamp: new Date().toISOString(),
        });
      }

      if (!['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'].includes(pool.status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'CANNOT_CANCEL', message: 'Pool cannot be cancelled in current status' },
          timestamp: new Date().toISOString(),
        });
      }

      lookupTimeService.cancelLookupTimer(poolId);

      await supabaseAdmin
        .from('pools')
        .update({
          status: 'CANCELLED' as PoolStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poolId);

      const { data: members } = await supabaseAdmin
        .from('pool_members')
        .select('user_id, ride_id')
        .eq('pool_id', poolId);

      if (members) {
        for (const member of members) {
          await supabaseAdmin
            .from('rides')
            .update({
              pool_id: null,
              status: 'CANCELLED' as RideStatus,
              cancelled_reason: 'Pool cancelled by creator',
              updated_at: new Date().toISOString(),
            })
            .eq('id', member.ride_id);

          if (member.user_id !== userId) {
            await notificationService.sendPoolCancelledNotification(
              member.user_id,
              poolId,
              'Pool was cancelled by the creator'
            );
          }
        }
      }

      // Clear cached route for cancelled pool
      await smartRouteService.clearPoolRoute(poolId);

      res.json({
        success: true,
        data: { message: 'Pool cancelled successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get optimized route for a pool
   * Returns the best route considering all pool members' pickups and destinations
   */
  async getOptimizedRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;

      // Get pool with members and their rides
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(user_id, ride_id)
        `)
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Get all rides for pool members
      const rideIds = pool.pool_members?.map((m: any) => m.ride_id).filter(Boolean) || [];
      
      if (rideIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_MEMBERS', message: 'Pool has no members with rides' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: rides, error: ridesError } = await supabaseAdmin
        .from('rides')
        .select('*')
        .in('id', rideIds);

      if (ridesError || !rides) {
        return res.status(500).json({
          success: false,
          error: { code: 'RIDES_FETCH_ERROR', message: 'Failed to fetch member rides' },
          timestamp: new Date().toISOString(),
        });
      }

      // Build member locations
      const members: PoolMemberLocation[] = rides.map((ride: any) => ({
        userId: ride.user_id,
        pickup: { latitude: ride.pickup_lat, longitude: ride.pickup_lng },
        dropoff: { latitude: ride.dropoff_lat, longitude: ride.dropoff_lng },
        pickupAddress: ride.pickup_address,
        dropoffAddress: ride.dropoff_address,
      }));

      // Calculate optimized route
      const optimization = await rideEstimationService.calculateOptimizedPoolRoute(
        members,
        pool.vehicle_type as VehicleType
      );

      res.json({
        success: true,
        data: {
          poolId,
          route: {
            totalDistanceKm: optimization.totalDistanceKm,
            totalDurationMinutes: optimization.totalDurationMinutes,
            farePerPerson: optimization.farePerPerson,
            coordinates: optimization.optimizedRoute.coordinates,
            encoded: optimization.optimizedRoute.encoded,
          },
          stops: optimization.stops.map(stop => ({
            type: stop.type,
            userId: stop.userId,
            address: stop.address,
            location: stop.location,
            order: stop.order,
            estimatedArrival: stop.estimatedArrival,
          })),
          legs: optimization.optimizedRoute.legs,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Recalculate fare for a pool after membership changes
   * Called automatically when someone joins or leaves
   */
  async recalculateFare(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;

      // Get pool with members and their rides
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(user_id, ride_id)
        `)
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Get all rides for pool members
      const rideIds = pool.pool_members?.map((m: any) => m.ride_id).filter(Boolean) || [];
      
      if (rideIds.length === 0) {
        return res.json({
          success: true,
          data: {
            poolId,
            farePerPerson: 0,
            totalFare: 0,
            memberCount: 0,
            message: 'No members in pool',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: rides, error: ridesError } = await supabaseAdmin
        .from('rides')
        .select('*')
        .in('id', rideIds);

      if (ridesError || !rides) {
        return res.status(500).json({
          success: false,
          error: { code: 'RIDES_FETCH_ERROR', message: 'Failed to fetch member rides' },
          timestamp: new Date().toISOString(),
        });
      }

      // Build member locations
      const members: PoolMemberLocation[] = rides.map((ride: any) => ({
        userId: ride.user_id,
        pickup: { latitude: ride.pickup_lat, longitude: ride.pickup_lng },
        dropoff: { latitude: ride.dropoff_lat, longitude: ride.dropoff_lng },
        pickupAddress: ride.pickup_address,
        dropoffAddress: ride.dropoff_address,
      }));

      // Recalculate fare
      const fareResult = await rideEstimationService.recalculatePoolFare(
        members,
        pool.vehicle_type as VehicleType
      );

      // Update pool with new fare
      await supabaseAdmin
        .from('pools')
        .update({
          fare_per_person: fareResult.farePerPerson,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poolId);

      // Notify all pool members about fare change
      for (const member of pool.pool_members || []) {
        if (member.user_id !== userId) {
          await notificationService.sendPushNotification(member.user_id, {
            title: 'Fare Updated',
            message: `Pool fare updated to ৳${fareResult.farePerPerson} per person`,
            type: 'SYSTEM',
            metadata: { poolId, farePerPerson: fareResult.farePerPerson },
          });
        }
      }

      res.json({
        success: true,
        data: {
          poolId,
          farePerPerson: fareResult.farePerPerson,
          totalFare: fareResult.totalFare,
          memberCount: members.length,
          breakdown: fareResult.breakdown,
          memberFares: fareResult.memberFares,
          message: `Fare recalculated for ${members.length} members`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @deprecated Server now automatically handles extended search phase
   * This endpoint is kept for backward compatibility but does nothing
   * The 2-phase timer (30s initial + 10s extended) runs automatically on the server
   */
  async extendSearch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;

      // Get the pool to return current status
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, status, created_at')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Return current search timing - server handles extension automatically
      const searchTiming = pool.status === 'WAITING_FOR_RIDERS' && pool.created_at
        ? lookupTimeService.calculateTimerFromCreatedAt(pool.created_at)
        : null;

      res.json({
        success: true,
        data: {
          message: 'Server handles extended search automatically',
          current_status: pool.status,
          search_timing: searchTiming,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @deprecated Server now automatically handles search completion
   * This endpoint is kept for backward compatibility but does nothing
   * The server automatically transitions or cancels the pool after the 40-second timer
   */
  async completeSearch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;

      // Get the pool
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, status, created_at, current_passengers')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Return current status - server handles completion automatically
      const searchTiming = pool.status === 'WAITING_FOR_RIDERS' && pool.created_at
        ? lookupTimeService.calculateTimerFromCreatedAt(pool.created_at)
        : null;

      res.json({
        success: true,
        data: {
          message: 'Server handles search completion automatically',
          current_status: pool.status,
          current_passengers: pool.current_passengers,
          search_timing: searchTiming,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get combined smart route for a pool
   * Returns optimized route with all pickup/dropoff points when pool is WAITING_FOR_DRIVER
   * Includes driver's real-time location if available
   * Uses caching to minimize Google Maps API costs
   */
  async getCombinedRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;
      const { driver_lat, driver_lng } = req.query;

      // Get pool with members and their rides
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(user_id, ride_id, left_at)
        `)
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user is a member of the pool
      const activeMembers = pool.pool_members?.filter((m: any) => m.left_at === null) || [];
      const isMember = activeMembers.some((m: any) => m.user_id === userId);
      const isDriver = pool.driver_id === userId;

      if (!isMember && !isDriver) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_MEMBER', message: 'You are not a member of this pool' },
          timestamp: new Date().toISOString(),
        });
      }

      // Combined route is only available when pool is waiting for driver or beyond
      const validStatuses: PoolStatus[] = ['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED'];
      if (!validStatuses.includes(pool.status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Combined route is only available when pool is waiting for driver or in progress',
            current_status: pool.status,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get all rides for active pool members
      const rideIds = activeMembers.map((m: any) => m.ride_id).filter(Boolean);

      if (rideIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_MEMBERS', message: 'Pool has no active members with rides' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: rides, error: ridesError } = await supabaseAdmin
        .from('rides')
        .select('*')
        .in('id', rideIds);

      if (ridesError || !rides || rides.length === 0) {
        return res.status(500).json({
          success: false,
          error: { code: 'RIDES_FETCH_ERROR', message: 'Failed to fetch member rides' },
          timestamp: new Date().toISOString(),
        });
      }

      // Build member routes for smart route calculation
      const memberRoutes: PoolMemberRoute[] = rides.map((ride: any) => ({
        userId: ride.user_id,
        pickup: { latitude: ride.pickup_lat, longitude: ride.pickup_lng },
        dropoff: { latitude: ride.dropoff_lat, longitude: ride.dropoff_lng },
        pickupAddress: ride.pickup_address,
        dropoffAddress: ride.dropoff_address,
      }));

      // Parse driver location if provided
      let driverLocation: Location | undefined;

      // COST OPTIMIZATION: Only include driver location for route calculation if:
      // 1. We are waiting for driver (need to show path to pickup)
      // 2. The trip hasn't started yet
      // Once STARTED, we use a static route (Pickup 1 -> Destination) to save costs/cache efficiently
      // The client will still show the driver's real-time position on the map, but the blue line won't redraw
      const shouldIncludeDriverInRoute = ['WAITING_FOR_DRIVER', 'READY_TO_START'].includes(pool.status);

      if (shouldIncludeDriverInRoute) {
        if (driver_lat && driver_lng) {
          driverLocation = {
            latitude: parseFloat(driver_lat as string),
            longitude: parseFloat(driver_lng as string),
          };
        } else if (pool.driver_id) {
          // Try to get driver's last known location from vehicle_locations
          const { data: vehicleLocation } = await supabaseAdmin
            .from('vehicle_locations')
            .select('lat, lng')
            .eq('driver_id', pool.driver_id)
            .eq('is_active', true)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single();

          if (vehicleLocation) {
            driverLocation = {
              latitude: vehicleLocation.lat,
              longitude: vehicleLocation.lng,
            };
          }
        }
      }

      // Calculate combined smart route using "ONE-SHOT OPTIMIZATION" strategy
      // - First request: Calls Google Maps API ONCE (~$0.01)
      // - All subsequent requests: Returns cached route (FREE)
      // - Cache duration: 2 hours (covers entire trip)
      const combinedRoute = await smartRouteService.calculateCombinedRoute(
        memberRoutes,
        {
          driverLocation,
          optimizeFor: 'balanced',
          trafficModel: 'best_guess',
          useCoarseDriverLocation: true, // Maximizes cache hits by rounding driver location
        },
        poolId // Pass poolId for stable cache key across the entire trip
      );

      if (!combinedRoute) {
        return res.status(500).json({
          success: false,
          error: { code: 'ROUTE_CALCULATION_FAILED', message: 'Failed to calculate combined route' },
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`[Pool] Combined route for pool ${poolId}: ${combinedRoute.waypoints.length} waypoints, ${combinedRoute.totalDistanceKm}km, fromCache=${combinedRoute.fromCache}`);

      res.json({
        success: true,
        data: {
          poolId,
          poolStatus: pool.status,
          route: {
            polyline: combinedRoute.polyline,
            coordinates: combinedRoute.coordinates,
            totalDistanceKm: combinedRoute.totalDistanceKm,
            totalDurationMinutes: combinedRoute.totalDurationMinutes,
            durationInTraffic: combinedRoute.durationInTraffic,
            trafficLevel: combinedRoute.trafficLevel,
            routeSummary: combinedRoute.routeSummary,
          },
          waypoints: combinedRoute.waypoints.map(wp => ({
            id: wp.id,
            type: wp.type,
            userId: wp.userId,
            location: wp.location,
            name: extractLocationName(wp.address),
            address: wp.address,
            order: wp.order,
            estimatedArrivalMinutes: wp.estimatedArrivalMinutes,
          })),
          legs: combinedRoute.legs.map(leg => ({
            fromId: leg.from.id,
            toId: leg.to.id,
            distanceKm: leg.distanceKm,
            durationMinutes: leg.durationMinutes,
            instruction: leg.instruction,
          })),
          optimization: {
            score: combinedRoute.optimizationScore,
            savingsPercent: combinedRoute.savingsVsIndividual,
          },
          meta: {
            fromCache: combinedRoute.fromCache,
            calculatedAt: combinedRoute.calculatedAt,
            memberCount: memberRoutes.length,
            hasDriverLocation: !!driverLocation,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update combined route with driver's real-time location
   * Called periodically by driver app to check if route needs recalculation
   */
  async updateCombinedRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;
      const { driver_lat, driver_lng, current_route_cache_key } = req.body;

      if (!driver_lat || !driver_lng) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_LOCATION', message: 'Driver location is required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Verify driver is assigned to this pool
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, driver_id, status')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      if (pool.driver_id !== userId) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_DRIVER', message: 'Only the assigned driver can update the route' },
          timestamp: new Date().toISOString(),
        });
      }

      // For now, just return that no recalculation is needed
      // Full implementation would compare driver location to cached route
      res.json({
        success: true,
        data: {
          needsRecalculation: false,
          message: 'Driver is on route',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Google Maps app navigation deep link for a pool
   * Opens Google Maps app with all waypoints - FREE navigation with real-time traffic
   * Both users and drivers can use this to see all pickup/dropoff points
   * 
   * IMPORTANT: Uses the SAME optimized route from smartRouteService to ensure
   * the Google Maps deep link shows the exact same optimal route that's displayed in our app
   */
  async getNavigationDeepLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { poolId } = req.params;

      // Get pool with members and their rides
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(user_id, ride_id, left_at)
        `)
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user is a member of the pool or driver
      const activeMembers = pool.pool_members?.filter((m: any) => m.left_at === null) || [];
      const isMember = activeMembers.some((m: any) => m.user_id === userId);
      const isDriver = pool.driver_id === userId;

      if (!isMember && !isDriver) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_MEMBER', message: 'You are not a member of this pool' },
          timestamp: new Date().toISOString(),
        });
      }

      // Get all rides for active pool members
      const rideIds = activeMembers.map((m: any) => m.ride_id).filter(Boolean);

      if (rideIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_MEMBERS', message: 'Pool has no active members with rides' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: rides, error: ridesError } = await supabaseAdmin
        .from('rides')
        .select('*')
        .in('id', rideIds);

      if (ridesError || !rides || rides.length === 0) {
        return res.status(500).json({
          success: false,
          error: { code: 'RIDES_FETCH_ERROR', message: 'Failed to fetch member rides' },
          timestamp: new Date().toISOString(),
        });
      }

      // Build member routes for smart route calculation
      const memberRoutes: PoolMemberRoute[] = rides.map((ride: any) => ({
        userId: ride.user_id,
        pickup: { latitude: ride.pickup_lat, longitude: ride.pickup_lng },
        dropoff: { latitude: ride.dropoff_lat, longitude: ride.dropoff_lng },
        pickupAddress: ride.pickup_address,
        dropoffAddress: ride.dropoff_address,
      }));

      // Get driver location if available
      let driverLocation: Location | undefined;
      if (pool.driver_id) {
        const { data: vehicleLocation } = await supabaseAdmin
          .from('vehicle_locations')
          .select('lat, lng')
          .eq('driver_id', pool.driver_id)
          .eq('is_active', true)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        if (vehicleLocation) {
          driverLocation = {
            latitude: vehicleLocation.lat,
            longitude: vehicleLocation.lng,
          };
        }
      }

      // ========================================================
      // KEY FIX: Get the SAME optimized route from smartRouteService
      // This ensures Google Maps shows the exact same optimal route
      // ========================================================
      const combinedRoute = await smartRouteService.calculateCombinedRoute(
        memberRoutes,
        {
          driverLocation,
          optimizeFor: 'balanced',
          trafficModel: 'best_guess',
          useCoarseDriverLocation: true,
        },
        poolId
      );

      if (!combinedRoute || combinedRoute.waypoints.length === 0) {
        return res.status(500).json({
          success: false,
          error: { code: 'ROUTE_CALCULATION_FAILED', message: 'Failed to calculate optimized route' },
          timestamp: new Date().toISOString(),
        });
      }

      // Extract ordered waypoints from the optimized route (excluding driver start and final destination)
      // The waypoints are already in optimal order from smartRouteService
      // Order example: Driver → Pickup A → Pickup B → Dropoff A → Dropoff B (NOT A-A, B-B)
      const orderedWaypoints = combinedRoute.waypoints;
      
      // First waypoint is origin (driver location or first pickup)
      const originWaypoint = orderedWaypoints[0];
      const origin: Location = originWaypoint.location;

      // Last waypoint is the final destination
      const destinationWaypoint = orderedWaypoints[orderedWaypoints.length - 1];
      const destination: Location = destinationWaypoint.location;

      // Intermediate waypoints (everything between origin and destination, in optimal order)
      // These are the stops the driver needs to make along the way
      const intermediateWaypoints = orderedWaypoints
        .slice(1, -1) // Exclude first (origin) and last (destination)
        .map(wp => wp.location);

      // Log the route order for debugging
      logger.info(`[Pool] Navigation route order for pool ${poolId}:`);
      logger.info(`[Pool] Total waypoints: ${orderedWaypoints.length}`);
      orderedWaypoints.forEach((wp, idx) => {
        logger.info(`  ${idx + 1}. ${wp.type.toUpperCase()} - User: ${wp.userId.substring(0, 8)}... - Lat: ${wp.location.latitude.toFixed(6)}, Lng: ${wp.location.longitude.toFixed(6)} - ${wp.address || 'No address'}`);
      });
      logger.info(`[Pool] Origin (first): ${origin.latitude.toFixed(6)}, ${origin.longitude.toFixed(6)} - Type: ${originWaypoint.type}`);
      logger.info(`[Pool] Destination (last): ${destination.latitude.toFixed(6)}, ${destination.longitude.toFixed(6)} - Type: ${destinationWaypoint.type}`);
      logger.info(`[Pool] Intermediate waypoints: ${intermediateWaypoints.length}`);

      // Generate the FREE Google Maps deep link with ALL stops visible
      // This shows the complete route with all pickup and dropoff points as markers
      const allStopLocations = orderedWaypoints.map(wp => wp.location);
      const navigationUrl = googleMapsService.generateViewRouteDeepLink(allStopLocations);

      logger.info(`[Pool] Generated navigation URL: ${navigationUrl.substring(0, 200)}...`);

      // Generate platform-specific navigation URLs (Android, iOS, Universal)
      const platformLinks = googleMapsService.generatePlatformNavigationLinks(
        origin,
        destination,
        intermediateWaypoints.length > 0 ? intermediateWaypoints : undefined
      );

      logger.info(`[Pool] Platform links generated - Android: ${platformLinks.android.substring(0, 100)}...`);

      // Generate individual deep links for each member's pickup and dropoff
      const waypointLinks = memberRoutes.map((member) => ({
        userId: member.userId,
        isCurrentUser: member.userId === userId,
        pickup: {
          location: member.pickup,
          name: extractLocationName(member.pickupAddress),
          address: member.pickupAddress,
          mapLink: `https://www.google.com/maps/search/?api=1&query=${member.pickup.latitude},${member.pickup.longitude}`,
        },
        dropoff: {
          location: member.dropoff,
          name: extractLocationName(member.dropoffAddress),
          address: member.dropoffAddress,
          mapLink: `https://www.google.com/maps/search/?api=1&query=${member.dropoff.latitude},${member.dropoff.longitude}`,
        },
      }));

      // Build ordered stop list for display (showing the optimal sequence)
      const orderedStops = orderedWaypoints.map((wp, idx) => ({
        order: idx + 1,
        type: wp.type,
        userId: wp.userId,
        isCurrentUser: wp.userId === userId,
        name: extractLocationName(wp.address),
        address: wp.address,
        location: wp.location,
        estimatedArrivalMinutes: wp.estimatedArrivalMinutes,
      }));

      logger.info(`[Pool] Generated navigation deep link for pool ${poolId} with ${intermediateWaypoints.length} intermediate waypoints (optimized order)`);

      res.json({
        success: true,
        data: {
          poolId,
          navigationUrl,
          platformLinks, // Platform-specific URLs for better navigation experience
          instructions: 'Tap to open Google Maps with the optimized route for all pickup and dropoff points',
          origin: {
            location: origin,
            type: originWaypoint.type === 'driver' ? 'driver_location' : 'first_pickup',
            address: originWaypoint.address,
          },
          destination: {
            location: destination,
            address: destinationWaypoint.address || pool.destination_address,
          },
          orderedStops, // Shows the full route sequence in optimal order
          waypoints: waypointLinks, // Individual location links for each member
          routeInfo: {
            totalDistanceKm: combinedRoute.totalDistanceKm || 0,
            totalDurationMinutes: combinedRoute.durationInTraffic || combinedRoute.totalDurationMinutes || 0,
            trafficLevel: combinedRoute.trafficLevel || 'moderate',
            routeSummary: combinedRoute.routeSummary || 'Optimized carpool route',
          },
          meta: {
            waypointCount: intermediateWaypoints.length,
            totalStops: orderedWaypoints.length,
            isDriver,
            isMember,
            freeNavigation: true,
            usesOptimizedRoute: true,
            costSavings: '100% - No API cost, uses Google Maps app',
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const poolController = new PoolController();
