import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { notificationService } from '../services/notification.service';
import { lookupTimeService } from '../services/lookupTime.service';
import { logger } from '../utils/logger';
import { poolMatchingService } from '../services/poolMatching.service';
import { h3Utils } from '../utils/h3.utils';
import { fareService } from '../services/fare.service';
import { rideEstimationService, PoolMemberLocation } from '../services/rideEstimation.service';
import { VehicleType } from '../types';

const MAX_PRIYO_SATHI = 5;

export class PriyoSathiController {
  private async resolveInvitePoolId(
    inviteeId: string,
    rideId: string,
    ride: { id: string; user_id: string; pool_id: string | null; created_at?: string }
  ): Promise<string | null> {
    let poolId = ride.pool_id as string | null;

    if (!poolId) {
      const { data: notifications } = await supabaseAdmin
        .from('notifications')
        .select('metadata, created_at')
        .eq('user_id', inviteeId)
        .eq('type', 'MESSAGE')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

      if (notifications && notifications.length > 0) {
        const latestInvite = notifications
          .filter((n: any) => n.metadata?.ride_id === rideId && n.metadata?.pool_id)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        if (latestInvite?.metadata?.pool_id) {
          poolId = latestInvite.metadata.pool_id;
        }
      }
    }

    if (!poolId) {
      const { data: member } = await supabaseAdmin
        .from('pool_members')
        .select('pool_id')
        .eq('ride_id', ride.id)
        .is('left_at', null)
        .single();

      if (member?.pool_id) {
        poolId = member.pool_id;
      }
    }

    if (!poolId && ride.created_at) {
      const rideCreatedAt = new Date(ride.created_at).getTime();
      const windowStart = new Date(rideCreatedAt - 5 * 60 * 1000).toISOString();

      const { data: recentPool } = await supabaseAdmin
        .from('pools')
        .select('id')
        .eq('creator_user_id', ride.user_id)
        .in('status', ['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'])
        .gte('created_at', windowStart)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentPool?.id) {
        poolId = recentPool.id;
      }
    }

    if (poolId && ride.pool_id !== poolId) {
      await supabaseAdmin.from('rides').update({ pool_id: poolId }).eq('id', ride.id);
    }

    return poolId;
  }

  async addCompanion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { companion_id } = req.body;

      if (companion_id === userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_COMPANION', message: 'Cannot add yourself as a companion' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: companion, error: companionError } = await supabaseAdmin
        .from('users')
        .select('id, phone')
        .eq('id', companion_id)
        .single();

      if (companionError || !companion) {
        return res.status(404).json({
          success: false,
          error: { code: 'COMPANION_NOT_FOUND', message: 'User not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const { count } = await supabaseAdmin
        .from('priyo_sathi')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['PENDING', 'ACCEPTED']);

      if ((count || 0) >= MAX_PRIYO_SATHI) {
        return res.status(400).json({
          success: false,
          error: { code: 'MAX_COMPANIONS_REACHED', message: `Maximum ${MAX_PRIYO_SATHI} companions allowed` },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: existing } = await supabaseAdmin
        .from('priyo_sathi')
        .select('id, status')
        .eq('user_id', userId)
        .eq('companion_id', companion_id)
        .single();

      if (existing) {
        if (existing.status === 'ACCEPTED') {
          return res.status(400).json({
            success: false,
            error: { code: 'ALREADY_COMPANION', message: 'Already in your Priyo Sathi list' },
            timestamp: new Date().toISOString(),
          });
        }
        if (existing.status === 'PENDING') {
          return res.status(400).json({
            success: false,
            error: { code: 'REQUEST_PENDING', message: 'Request already pending' },
            timestamp: new Date().toISOString(),
          });
        }
        if (existing.status === 'BLOCKED') {
          return res.status(400).json({
            success: false,
            error: { code: 'BLOCKED', message: 'Cannot add this user' },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const { data: priyoSathi, error: insertError } = await supabaseAdmin
        .from('priyo_sathi')
        .insert({
          user_id: userId,
          companion_id,
          status: 'PENDING',
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      await notificationService.sendPushNotification(companion_id, {
        title: 'New Priyo Sathi Request',
        message: 'Someone wants to add you as a Priyo Sathi!',
        type: 'MESSAGE',
        metadata: { priyo_sathi_id: priyoSathi.id, requester_id: userId },
      });

      res.status(201).json({
        success: true,
        data: {
          id: priyoSathi.id,
          status: 'PENDING',
          message: 'Priyo Sathi request sent',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async removeCompanion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { companionId } = req.params;

      const { error } = await supabaseAdmin
        .from('priyo_sathi')
        .delete()
        .eq('user_id', userId)
        .eq('companion_id', companionId);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { message: 'Companion removed from Priyo Sathi list' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getCompanions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: companions, error } = await supabaseAdmin
        .from('priyo_sathi')
        .select(`
          id,
          companion_id,
          status,
          created_at,
          companion:users!companion_id(id, phone, full_name, average_rating)
        `)
        .eq('user_id', userId)
        .in('status', ['PENDING', 'ACCEPTED'])
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: {
          companions: companions || [],
          count: companions?.length || 0,
          max_allowed: MAX_PRIYO_SATHI,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPendingRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: requests, error } = await supabaseAdmin
        .from('priyo_sathi')
        .select(`
          id,
          created_at,
          requester:users!user_id(id, phone, full_name, average_rating)
        `)
        .eq('companion_id', userId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { pending_requests: requests || [] },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async respondToRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { requestId } = req.params;
      const { action } = req.body;

      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ACTION', message: 'Action must be accept or reject' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: request, error: fetchError } = await supabaseAdmin
        .from('priyo_sathi')
        .select('id, user_id, status')
        .eq('id', requestId)
        .eq('companion_id', userId)
        .eq('status', 'PENDING')
        .single();

      if (fetchError || !request) {
        return res.status(404).json({
          success: false,
          error: { code: 'REQUEST_NOT_FOUND', message: 'Pending request not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';

      const { error: updateError } = await supabaseAdmin
        .from('priyo_sathi')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      if (action === 'accept') {
        const { count } = await supabaseAdmin
          .from('priyo_sathi')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('companion_id', request.user_id)
          .eq('status', 'ACCEPTED');

        if (count === 0) {
          await supabaseAdmin.from('priyo_sathi').insert({
            user_id: userId,
            companion_id: request.user_id,
            status: 'ACCEPTED',
          });
        }
      }

      await notificationService.sendPushNotification(request.user_id, {
        title: action === 'accept' ? 'Request Accepted!' : 'Request Declined',
        message: action === 'accept' ? 'Your Priyo Sathi request was accepted!' : 'Your Priyo Sathi request was declined.',
        type: 'MESSAGE',
        metadata: { status: newStatus },
      });

      res.json({
        success: true,
        data: {
          status: newStatus,
          message: action === 'accept' ? 'Request accepted' : 'Request rejected',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async inviteToRide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { companionId } = req.params;
      const { ride_id } = req.body;

      const { data: companion, error: companionError } = await supabaseAdmin
        .from('priyo_sathi')
        .select('companion_id')
        .eq('user_id', userId)
        .eq('companion_id', companionId)
        .eq('status', 'ACCEPTED')
        .single();

      if (companionError || !companion) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_COMPANION', message: 'User is not in your Priyo Sathi list' },
          timestamp: new Date().toISOString(),
        });
      }

      // Prevent reverse invites: if companion already invited this user recently, block
      const reverseInviteWindow = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: reverseInvites } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'MESSAGE')
        .gte('created_at', reverseInviteWindow)
        .eq('metadata->>inviter_id', companionId)
        .not('metadata->ride_id', 'is', null)
        .limit(1);

      if (reverseInvites && reverseInvites.length > 0) {
        const { data: companionUser } = await supabaseAdmin
          .from('users')
          .select('full_name, phone')
          .eq('id', companionId)
          .single();
        const companionName = companionUser?.full_name || companionUser?.phone || 'Your friend';

        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_INVITED_BY_COMPANION', message: `${companionName} already invited you` },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: ride, error: rideError } = await supabaseAdmin
        .from('rides')
        .select('id, pool_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng')
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

      let poolId = ride.pool_id as string | null;

      if (!poolId) {
        const { data: member } = await supabaseAdmin
          .from('pool_members')
          .select('pool_id')
          .eq('ride_id', ride.id)
          .is('left_at', null)
          .single();

        if (member?.pool_id) {
          poolId = member.pool_id;
          await supabaseAdmin.from('rides').update({ pool_id: poolId }).eq('id', ride.id);
        }
      }

      if (!poolId) {
        const { data: latestPool } = await supabaseAdmin
          .from('pools')
          .select('id, status, current_passengers, max_passengers')
          .eq('creator_user_id', userId)
          .in('status', ['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestPool?.id) {
          poolId = latestPool.id;
          await supabaseAdmin.from('rides').update({ pool_id: poolId }).eq('id', ride.id);
        }
      }

      if (!poolId) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_POOL', message: 'No active pool to invite into' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, status, current_passengers, max_passengers')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      if (!['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'].includes(pool.status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'POOL_NOT_AVAILABLE', message: 'Pool is no longer accepting riders' },
          timestamp: new Date().toISOString(),
        });
      }

      if (pool.current_passengers >= pool.max_passengers) {
        return res.status(400).json({
          success: false,
          error: { code: 'POOL_FULL', message: 'Pool is full' },
          timestamp: new Date().toISOString(),
        });
      }

      // Enforce Priyo Sathi visibility rule before sending invite
      const { priyoSathiService } = await import('../services/priyoSathi.service');
      const eligibility = await priyoSathiService.isCompanionEligibleForInvite(
        userId,
        companionId,
        ride.id
      );

      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          error: { code: 'NOT_ELIGIBLE', message: eligibility.reason || 'Companion not eligible for invite' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('phone, full_name')
        .eq('id', userId)
        .single();

      await notificationService.sendPriyoSathiInviteNotification(
        companionId,
        user?.full_name || user?.phone || 'A friend',
        ride_id,
        poolId || undefined,
        userId
      );

      logger.info(`[PriyoSathi] User ${userId} invited ${companionId} to ride ${ride_id}`);

      res.json({
        success: true,
        data: { message: 'Invitation sent to your Priyo Sathi' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get nearby Priyo Sathi companions for pool matching
   * Returns companions that could potentially join a ride based on proximity
   */
  async getNearbyCompanions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { pickup_lat, pickup_lng, destination_lat, destination_lng } = req.query;

      if (!pickup_lat || !pickup_lng || !destination_lat || !destination_lng) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'pickup_lat, pickup_lng, destination_lat, destination_lng are required' },
          timestamp: new Date().toISOString(),
        });
      }

      const userPickup = {
        latitude: parseFloat(pickup_lat as string),
        longitude: parseFloat(pickup_lng as string),
      };
      const userDestination = {
        latitude: parseFloat(destination_lat as string),
        longitude: parseFloat(destination_lng as string),
      };

      // Import priyoSathiService here to avoid circular dependency
      const { priyoSathiService } = await import('../services/priyoSathi.service');

      // Store current user's ride intent so they can be discovered by companions
      await priyoSathiService.setUserRideIntent(userId, userPickup, userDestination);

      // Find candidates without creating a ride - preview mode, don't send notifications
      const result = await priyoSathiService.findAndNotifyCompanions(
        userId,
        userPickup,
        userDestination,
        'preview', // placeholder ride_id for preview mode
        undefined,
        false // Don't send notifications in preview mode
      );

      res.json({
        success: true,
        data: {
          candidates: result.candidates.map(c => ({
            companion_id: c.companionId,
            name: c.companionName,
            phone: c.companionPhone,
            rating: c.companionRating,
            distance_km: c.distanceFromUser > 0 ? c.distanceFromUser.toFixed(2) : null,
            detour_minutes: c.detourMinutes > 0 ? c.detourMinutes : null,
            is_on_route: c.isOnRoute,
            can_auto_match: c.canAutoMatch,
            match_reason: c.matchReason,
          })),
          auto_matchable_count: result.candidates.filter(c => c.canAutoMatch).length,
          total_companions: result.candidates.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Block a user from being a Priyo Sathi
   */
  async blockCompanion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { companionId } = req.params;

      // Update existing relationship to BLOCKED or create new blocked entry
      const { data: existing } = await supabaseAdmin
        .from('priyo_sathi')
        .select('id')
        .eq('user_id', userId)
        .eq('companion_id', companionId)
        .single();

      if (existing) {
        await supabaseAdmin
          .from('priyo_sathi')
          .update({ status: 'BLOCKED' })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin
          .from('priyo_sathi')
          .insert({
            user_id: userId,
            companion_id: companionId,
            status: 'BLOCKED',
          });
      }

      // Also remove any reverse relationship
      await supabaseAdmin
        .from('priyo_sathi')
        .delete()
        .eq('user_id', companionId)
        .eq('companion_id', userId);

      res.json({
        success: true,
        data: { message: 'User blocked from Priyo Sathi' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ride invite details - fetch the friend's ride and pool info
   * Used when a user taps on a Priyo Sathi invite notification
   */
  async getRideInviteDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { rideId } = req.params;

      // Fetch the ride details
      const { data: ride, error: rideError } = await supabaseAdmin
        .from('rides')
        .select(`
          id,
          user_id,
          created_at,
          pickup_lat,
          pickup_lng,
          pickup_address,
          dropoff_lat,
          dropoff_lng,
          dropoff_address,
          vehicle_type,
          gender_restriction,
          pool_id,
          status
        `)
        .eq('id', rideId)
        .single();

      if (rideError || !ride) {
        return res.status(404).json({
          success: false,
          error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found or expired' },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if the inviter is a Priyo Sathi of the current user
      const { data: isFriend } = await supabaseAdmin
        .from('priyo_sathi')
        .select('id')
        .or(`and(user_id.eq.${userId},companion_id.eq.${ride.user_id}),and(user_id.eq.${ride.user_id},companion_id.eq.${userId})`)
        .eq('status', 'ACCEPTED')
        .limit(1);

      if (!isFriend || isFriend.length === 0) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_FRIENDS', message: 'You are not Priyo Sathi with the inviter' },
          timestamp: new Date().toISOString(),
        });
      }

      // Get the inviter's name
      const { data: inviter } = await supabaseAdmin
        .from('users')
        .select('full_name, phone')
        .eq('id', ride.user_id)
        .single();

      // Get pool details if exists
      let poolInfo = null;
      let poolId = await this.resolveInvitePoolId(userId, rideId, ride);

      if (poolId && !poolInfo) {
        const { data: pool } = await supabaseAdmin
          .from('pools')
          .select('id, status, current_passengers, max_passengers, fare_per_person, destination_address, estimated_duration_minutes, estimated_distance_km, creator_user_id')
          .eq('id', poolId)
          .single();
        
        if (pool && pool.creator_user_id === ride.user_id) {
          poolInfo = {
            pool_id: pool.id,
            status: pool.status,
            current_passengers: pool.current_passengers,
            max_passengers: pool.max_passengers,
            fare_per_person: pool.fare_per_person,
            destination_address: pool.destination_address,
            estimated_duration_minutes: pool.estimated_duration_minutes,
            estimated_distance_km: pool.estimated_distance_km,
            can_join: ['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'].includes(pool.status) && pool.current_passengers < pool.max_passengers,
          };
        } else if (pool && pool.creator_user_id !== ride.user_id) {
          poolId = null;
        }
      }

      if (!poolInfo && ride.created_at) {
        const rideCreatedAt = new Date(ride.created_at).getTime();
        const windowStart = new Date(rideCreatedAt - 5 * 60 * 1000).toISOString();

        const { data: recentPool } = await supabaseAdmin
          .from('pools')
          .select('id, status, current_passengers, max_passengers, fare_per_person, destination_address, estimated_duration_minutes, estimated_distance_km')
          .eq('creator_user_id', ride.user_id)
          .in('status', ['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'])
          .gte('created_at', windowStart)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recentPool?.id) {
          await supabaseAdmin.from('rides').update({ pool_id: recentPool.id }).eq('id', ride.id);
          poolInfo = {
            pool_id: recentPool.id,
            status: recentPool.status,
            current_passengers: recentPool.current_passengers,
            max_passengers: recentPool.max_passengers,
            fare_per_person: recentPool.fare_per_person,
            destination_address: recentPool.destination_address,
            estimated_duration_minutes: recentPool.estimated_duration_minutes,
            estimated_distance_km: recentPool.estimated_distance_km,
            can_join: ['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'].includes(recentPool.status) && recentPool.current_passengers < recentPool.max_passengers,
          };
        }
      }

      res.json({
        success: true,
        data: {
          ride_id: ride.id,
          inviter_name: inviter?.full_name || inviter?.phone || 'Your friend',
          destination: {
            latitude: ride.dropoff_lat,
            longitude: ride.dropoff_lng,
            address: ride.dropoff_address,
          },
          pickup: {
            latitude: ride.pickup_lat,
            longitude: ride.pickup_lng,
            address: ride.pickup_address,
          },
          vehicle_type: ride.vehicle_type,
          gender_restriction: ride.gender_restriction,
          ride_status: ride.status,
          pool: poolInfo,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept a ride invite and join the friend's pool
   * Creates a new ride for the accepting user and adds them to the pool
   */
  async acceptRideInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { rideId } = req.params;
      const { pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address, gender_restriction } = req.body;

      if (!pickup_lat || !pickup_lng) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'pickup_lat and pickup_lng are required' },
          timestamp: new Date().toISOString(),
        });
      }

      if (!dropoff_lat || !dropoff_lng) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'dropoff_lat and dropoff_lng are required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Fetch the friend's ride
      const { data: friendRide, error: rideError } = await supabaseAdmin
        .from('rides')
        .select(`
          id,
          user_id,
          created_at,
          dropoff_lat,
          dropoff_lng,
          dropoff_address,
          vehicle_type,
          gender_restriction,
          pool_id
        `)
        .eq('id', rideId)
        .single();

      if (rideError || !friendRide) {
        return res.status(404).json({
          success: false,
          error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found or expired' },
          timestamp: new Date().toISOString(),
        });
      }

      let poolId = await this.resolveInvitePoolId(userId, rideId, friendRide);

      if (!poolId) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_POOL', message: 'This ride does not have a pool to join' },
          timestamp: new Date().toISOString(),
        });
      }

      // Verify friendship
      const { data: isFriend } = await supabaseAdmin
        .from('priyo_sathi')
        .select('id')
        .or(`and(user_id.eq.${userId},companion_id.eq.${friendRide.user_id}),and(user_id.eq.${friendRide.user_id},companion_id.eq.${userId})`)
        .eq('status', 'ACCEPTED')
        .limit(1);

      if (!isFriend || isFriend.length === 0) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_FRIENDS', message: 'You are not Priyo Sathi with the inviter' },
          timestamp: new Date().toISOString(),
        });
      }

      // Check pool status
      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, status, current_passengers, max_passengers, vehicle_type, gender_restriction, creator_user_id, destination_lat, destination_lng, destination_address')
        .eq('id', poolId)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      if (pool.creator_user_id !== friendRide.user_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'POOL_MISMATCH', message: 'Invite pool does not match inviter' },
          timestamp: new Date().toISOString(),
        });
      }

      if (!['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'].includes(pool.status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'POOL_NOT_AVAILABLE', message: 'Pool is no longer accepting riders' },
          timestamp: new Date().toISOString(),
        });
      }

      if (pool.current_passengers >= pool.max_passengers) {
        return res.status(400).json({
          success: false,
          error: { code: 'POOL_FULL', message: 'Pool is full' },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate compatibility using the same logic as normal pool joins
      const compatibilityCheck = poolMatchingService.isRideCompatibleWithPool(
        {
          id: 'temp',
          user_id: userId,
          pool_id: null,
          pickup_lat: parseFloat(pickup_lat),
          pickup_lng: parseFloat(pickup_lng),
          pickup_address: pickup_address || null,
          pickup_h3_index: h3Utils.latLngToH3({ latitude: parseFloat(pickup_lat), longitude: parseFloat(pickup_lng) }, 9),
          dropoff_lat: parseFloat(dropoff_lat),
          dropoff_lng: parseFloat(dropoff_lng),
          dropoff_address: dropoff_address || null,
          dropoff_h3_index: h3Utils.latLngToH3({ latitude: parseFloat(dropoff_lat), longitude: parseFloat(dropoff_lng) }, 7),
          vehicle_type: pool.vehicle_type,
          gender_restriction: (gender_restriction as any) || 'ANY',
          status: 'CREATING_POOL' as any,
          fare: null,
          distance_km: null,
          is_on_front_route: true,
          route_deviation_km: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          cancelled_reason: null,
        } as any,
        pool as any
      );

      if (!compatibilityCheck.compatible) {
        return res.status(400).json({
          success: false,
          error: { code: 'INCOMPATIBLE', message: 'Ride not compatible with pool', reason: compatibilityCheck.reason },
          timestamp: new Date().toISOString(),
        });
      }

      // Create a new ride for the accepting user
      const { data: newRide, error: createRideError } = await supabaseAdmin
        .from('rides')
        .insert({
          user_id: userId,
          pickup_lat: parseFloat(pickup_lat),
          pickup_lng: parseFloat(pickup_lng),
          pickup_address: pickup_address || 'Pickup Location',
          pickup_h3_index: h3Utils.latLngToH3({ latitude: parseFloat(pickup_lat), longitude: parseFloat(pickup_lng) }, 9),
          dropoff_lat: parseFloat(dropoff_lat),
          dropoff_lng: parseFloat(dropoff_lng),
          dropoff_address: dropoff_address || 'Destination',
          dropoff_h3_index: h3Utils.latLngToH3({ latitude: parseFloat(dropoff_lat), longitude: parseFloat(dropoff_lng) }, 7),
          vehicle_type: pool.vehicle_type,
          gender_restriction: (gender_restriction as any) || 'ANY',
          status: 'CREATING_POOL',
        })
        .select()
        .single();

      if (createRideError) {
        logger.error('[PriyoSathi] Failed to create ride for invite accept:', createRideError);
        throw createRideError;
      }

      // Join the pool using atomic operation
      const { data: joinResult, error: joinError } = await supabaseAdmin.rpc('atomic_join_pool', {
        p_pool_id: poolId,
        p_user_id: userId,
        p_ride_id: newRide.id,
      });

      if (joinError) {
        // Rollback the ride creation
        await supabaseAdmin.from('rides').delete().eq('id', newRide.id);
        
        if (joinError.message?.includes('POOL_FULL')) {
          return res.status(400).json({
            success: false,
            error: { code: 'POOL_FULL', message: 'Pool is full' },
            timestamp: new Date().toISOString(),
          });
        }
        throw joinError;
      }

      // Recalculate fare and update ride statuses similar to normal join flow
      const { data: poolWithMembers } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(user_id, ride_id)
        `)
        .eq('id', poolId)
        .single();

      let farePerPerson = fareService.applyPoolDiscount(
        fareService.calculateBaseFare(newRide.distance_km || 10, pool.vehicle_type as VehicleType),
        joinResult.current_passengers
      );

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

          await supabaseAdmin
            .from('pools')
            .update({
              fare_per_person: farePerPerson,
              updated_at: new Date().toISOString(),
            })
            .eq('id', poolId);

          await supabaseAdmin
            .from('rides')
            .update({
              status: 'MATCHED',
              updated_at: new Date().toISOString(),
            })
            .in('id', rideIds);

          for (const member of poolWithMembers.pool_members) {
            if (member.user_id !== userId && member.user_id !== friendRide.user_id) {
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

      // Handle status transitions and refresh smart route after member joins
      await lookupTimeService.handleMemberJoined(poolId);

      // Notify the friend that their Priyo Sathi joined
      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('full_name, phone')
        .eq('id', userId)
        .single();

      await notificationService.sendPushNotification(friendRide.user_id, {
        title: 'Priyo Sathi Joined!',
        message: `${currentUser?.full_name || currentUser?.phone || 'Your friend'} joined your pool!`,
        type: 'POOL_MATCH',
        metadata: { pool_id: poolId, joiner_id: userId },
      });

      logger.info(`[PriyoSathi] User ${userId} accepted ride invite and joined pool ${friendRide.pool_id}`);

      res.json({
        success: true,
        data: {
          ride_id: newRide.id,
          pool_id: poolId,
          message: 'Successfully joined your friend\'s pool!',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Notify only ONLINE companions who are within reasonable distance when a user creates a ride.
   * This fixes the issue where offline users were receiving notifications.
   */
  async notifyCompanionsOnRideSearch(userId: string, rideId: string): Promise<number> {
    try {
      // Get user's ride details to check proximity
      const { data: userRide } = await supabaseAdmin
        .from('rides')
        .select('pickup_lat, pickup_lng, dropoff_lat, dropoff_lng')
        .eq('id', rideId)
        .single();

      if (!userRide) {
        logger.warn(`[PriyoSathi] Cannot notify companions - ride ${rideId} not found`);
        return 0;
      }

      const { data: companions } = await supabaseAdmin
        .from('priyo_sathi')
        .select('companion_id')
        .eq('user_id', userId)
        .eq('status', 'ACCEPTED');

      if (!companions || companions.length === 0) {
        return 0;
      }

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('phone, full_name')
        .eq('id', userId)
        .single();

      let notifiedCount = 0;

      for (const c of companions) {
        // Check if companion has an active ride (meaning they are ONLINE and looking for a ride)
        const { data: companionRide } = await supabaseAdmin
          .from('rides')
          .select('pickup_lat, pickup_lng')
          .eq('user_id', c.companion_id)
          .in('status', ['CREATING_POOL', 'PENDING', 'MATCHED', 'WAITING_FOR_DRIVER'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Skip if companion is OFFLINE (no active ride)
        if (!companionRide?.pickup_lat || !companionRide?.pickup_lng) {
          logger.debug(`[PriyoSathi] Skipping notification to ${c.companion_id} - user is offline`);
          continue;
        }

        // Calculate distance between users (only notify if within 10km)
        const { calculateDistance } = await import('../utils/helper');
        const distance = calculateDistance(
          userRide.pickup_lat,
          userRide.pickup_lng,
          companionRide.pickup_lat,
          companionRide.pickup_lng
        );

        if (distance > 10) {
          logger.debug(`[PriyoSathi] Skipping notification to ${c.companion_id} - too far (${distance.toFixed(2)}km)`);
          continue;
        }

        // User is online and within 10km - send notification
        await notificationService.sendPriyoSathiInviteNotification(
          c.companion_id,
          user?.full_name || user?.phone || 'Your Priyo Sathi',
          rideId,
          undefined,
          userId
        );
        notifiedCount++;
        logger.info(`[PriyoSathi] Notified companion ${c.companion_id} (${distance.toFixed(2)}km away)`);
      }

      logger.info(`[PriyoSathi] Notified ${notifiedCount} of ${companions.length} companions for ride ${rideId}`);
      return notifiedCount;
    } catch (error) {
      logger.error('[PriyoSathi] Failed to notify companions:', error);
      return 0;
    }
  }
}

export const priyoSathiController = new PriyoSathiController();
