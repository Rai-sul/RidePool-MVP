import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { poolMatchingService } from '../services/poolMatching.service';
import { fareService } from '../services/fare.service';
import { lookupTimeService } from '../services/lookupTime.service';
import { penaltyService } from '../services/penalty.service';
import { notificationService } from '../services/notification.service';
import { CreatePoolRequest, Pool, PoolStatus, Ride, RideStatus } from '../types';
import { h3Utils } from '../utils/h3.utils';

const LOOKUP_TIME_MS = parseInt(process.env.LOOKUP_TIME_MS || '180000', 10);

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

      const farePerPerson = fareService.applyPoolDiscount(
        fareService.calculateBaseFare(ride.distance_km || 10, pool.vehicle_type),
        joinResult.current_passengers
      );

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
}

export const poolController = new PoolController();
