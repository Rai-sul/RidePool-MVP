import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { poolMatchingService } from '../services/poolMatching.service';
import { fareService } from '../services/fare.service';
import { rideEstimationService, PoolMemberLocation } from '../services/rideEstimation.service';
import { lookupTimeService } from '../services/lookupTime.service';
import { penaltyService } from '../services/penalty.service';
import { notificationService } from '../services/notification.service';
import { CreatePoolRequest, Pool, PoolStatus, Ride, RideStatus, Location, VehicleType } from '../types';
import { h3Utils } from '../utils/h3.utils';
import { logger } from '../utils/logger';

const LOOKUP_TIME_MS = parseInt(process.env.LOOKUP_TIME_MS || '30000', 10);

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

      const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type } = req.query;

      if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng || !vehicle_type) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Missing required parameters' },
          timestamp: new Date().toISOString(),
        });
      }

      const mockRide: Partial<Ride> = {
        user_id: userId,
        pickup_lat: parseFloat(pickup_lat as string),
        pickup_lng: parseFloat(pickup_lng as string),
        dropoff_lat: parseFloat(dropoff_lat as string),
        dropoff_lng: parseFloat(dropoff_lng as string),
        vehicle_type: vehicle_type as any,
        gender_restriction: 'ANY',
        status: 'CREATING_POOL',
      } as Ride;

      const searchResult = await poolMatchingService.findMatchingPoolsEnhanced(mockRide as Ride, userId);

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

      const destination = {
        latitude: poolData.destination_lat,
        longitude: poolData.destination_lng,
      };

      const destinationH3 = h3Utils.latLngToH3(destination, 7);

      const { data: pool, error } = await supabaseAdmin
        .from('pools')
        .insert({
          creator_user_id: userId,
          destination_lat: poolData.destination_lat,
          destination_lng: poolData.destination_lng,
          destination_address: poolData.destination_address,
          destination_h3_index: destinationH3,
          vehicle_type: poolData.vehicle_type,
          max_passengers: poolData.max_passengers,
          gender_restriction: poolData.gender_restriction || 'ANY',
          current_passengers: 1,
          status: 'WAITING_FOR_RIDERS' as PoolStatus,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add the creator as the first pool member
      const { error: memberError } = await supabaseAdmin
        .from('pool_members')
        .insert({
          pool_id: pool.id,
          user_id: userId,
          ride_id: null, // Creator may not have a ride yet
          join_type: 'INITIAL',
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        logger.warn(`Failed to add creator as pool member: ${memberError.message}`);
      }

      lookupTimeService.startLookupTimer(pool.id, LOOKUP_TIME_MS);

      res.status(201).json({
        success: true,
        data: {
          pool,
          lookup_expires_at: new Date(Date.now() + LOOKUP_TIME_MS).toISOString(),
          lookup_time_seconds: LOOKUP_TIME_MS / 1000,
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

          // Notify existing members about fare change
          for (const member of poolWithMembers.pool_members) {
            if (member.user_id !== userId) {
              await notificationService.sendPushNotification(member.user_id, {
                title: 'Fare Updated - New Rider Joined!',
                message: `A new rider joined your pool. Your fare is now ৳${farePerPerson} per person.`,
                type: 'POOL_MATCH',
                metadata: { poolId, farePerPerson, newPassengers: joinResult.current_passengers },
              });
            }
          }
        }
      }

      await notificationService.sendPoolFoundNotification(pool.creator_user_id, poolId);

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
          pool_members(user_id, ride_id, join_score, joined_at),
          vehicles(vehicle_number, model, color),
          driver:users!driver_id(id, average_rating)
        `)
        .eq('id', poolId)
        .single();

      if (error || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const remainingTime = lookupTimeService.getRemainingTime(poolId);

      res.json({
        success: true,
        data: {
          pool,
          lookup_remaining_seconds: remainingTime ? Math.ceil(remainingTime / 1000) : null,
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

      // Recalculate fare for remaining members after someone leaves
      const { data: poolWithMembers } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(user_id, ride_id)
        `)
        .eq('id', poolId)
        .single();

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
          for (const member of poolWithMembers.pool_members) {
            await notificationService.sendPushNotification(member.user_id, {
              title: 'Fare Updated - Rider Left',
              message: `A rider left the pool. Your fare is now ৳${fareResult.farePerPerson} per person.`,
              type: 'SYSTEM',
              metadata: { poolId, farePerPerson: fareResult.farePerPerson, remainingPassengers: members.length },
            });
          }
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
   * Extend pool search to wider geographic area
   * Called after initial 30-second lookup expires
   * Expands search to additional H3 hexagons (neighbors of neighbors)
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

      // Get the pool
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, creator_user_id, status, destination_h3_index, vehicle_type, gender_restriction')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Only pool creator can extend search
      if (pool.creator_user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_CREATOR', message: 'Only pool creator can extend search' },
          timestamp: new Date().toISOString(),
        });
      }

      // Can only extend if still waiting for riders - return graceful response if not
      if (pool.status !== 'WAITING_FOR_RIDERS') {
        return res.json({
          success: true,
          data: {
            extended: false,
            reason: 'Pool status changed',
            current_status: pool.status,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Extend the lookup timer by 10 more seconds
      const EXTENDED_TIME_MS = 10000;
      lookupTimeService.extendLookupTime(poolId, EXTENDED_TIME_MS);

      // Get expanded H3 indexes (neighbors of neighbors for wider search)
      const baseH3 = pool.destination_h3_index;
      const expandedH3Indexes = baseH3 ? h3Utils.getExtendedNeighbors(baseH3, 2) : [];

      logger.info(`[Pool] Extended search for pool ${poolId} to ${expandedH3Indexes.length} hexagons`);

      res.json({
        success: true,
        data: {
          extended: true,
          new_search_radius: 2, // H3 ring distance
          extended_h3_count: expandedH3Indexes.length,
          extended_time_seconds: EXTENDED_TIME_MS / 1000,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const poolController = new PoolController();
