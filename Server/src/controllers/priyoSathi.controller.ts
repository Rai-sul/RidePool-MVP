import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

const MAX_PRIYO_SATHI = 5;

export class PriyoSathiController {
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

      // Fetch inviter's ride with pickup and destination
      const { data: ride, error: rideError } = await supabaseAdmin
        .from('rides')
        .select('id, pool_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, dropoff_address')
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

      // FIX: Check if companion has an active ride with BOTH pickup AND destination set
      const { data: companionRide } = await supabaseAdmin
        .from('rides')
        .select('pickup_lat, pickup_lng, dropoff_lat, dropoff_lng')
        .eq('user_id', companionId)
        .in('status', ['CREATING_POOL', 'PENDING', 'MATCHED', 'SEARCHING', 'WAITING_FOR_DRIVER'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!companionRide?.pickup_lat || !companionRide?.pickup_lng || 
          !companionRide?.dropoff_lat || !companionRide?.dropoff_lng) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'COMPANION_NOT_AVAILABLE', 
            message: 'Your friend is not currently looking for a ride or has not set their locations' 
          },
          timestamp: new Date().toISOString(),
        });
      }

      // FIX: Check hexagon proximity - both pickup AND destination must be in range
      // Resolution 8 (~461m per hex) for pickup, allow distance 2 = ~1.3km radius
      // Resolution 7 (~5.2km per hex) for destination, allow distance 2 = ~15km radius
      const { h3Utils } = await import('../utils/h3.utils');
      const { calculateDistance } = await import('../utils/helper');
      
      const inviterPickupH3 = h3Utils.latLngToH3({ latitude: ride.pickup_lat, longitude: ride.pickup_lng }, 8);
      const inviterDestH3 = h3Utils.latLngToH3({ latitude: ride.dropoff_lat, longitude: ride.dropoff_lng }, 7);
      const companionPickupH3 = h3Utils.latLngToH3({ latitude: companionRide.pickup_lat, longitude: companionRide.pickup_lng }, 8);
      const companionDestH3 = h3Utils.latLngToH3({ latitude: companionRide.dropoff_lat, longitude: companionRide.dropoff_lng }, 7);

      const pickupHexDistance = h3Utils.getH3Distance(inviterPickupH3, companionPickupH3);
      const destHexDistance = h3Utils.getH3Distance(inviterDestH3, companionDestH3);

      // Calculate actual distances as fallback
      const pickupDistance = calculateDistance(
        ride.pickup_lat, ride.pickup_lng,
        companionRide.pickup_lat, companionRide.pickup_lng
      );
      const destDistance = calculateDistance(
        ride.dropoff_lat, ride.dropoff_lng,
        companionRide.dropoff_lat, companionRide.dropoff_lng
      );

      // Check proximity with fallback to distance-based check
      const isPickupNearby = pickupHexDistance >= 0 ? pickupHexDistance <= 2 : pickupDistance <= 2;
      const isDestNearby = destHexDistance >= 0 ? destHexDistance <= 2 : destDistance <= 15;

      logger.debug(`[PriyoSathi] Invite check: pickupHexDist=${pickupHexDistance}, destHexDist=${destHexDistance}, pickupDist=${pickupDistance.toFixed(2)}km, destDist=${destDistance.toFixed(2)}km`);

      if (!isPickupNearby || !isDestNearby) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'NOT_IN_RANGE', 
            message: 'Your friend is not on a matching route. Pickup or destination locations are too far apart.' 
          },
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
        ride_id
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
      if (ride.pool_id) {
        const { data: pool, error: poolError } = await supabaseAdmin
          .from('pools')
          .select('id, status, current_passengers, max_passengers, fare_per_person, destination_address')
          .eq('id', ride.pool_id)
          .single();
        
        if (pool) {
          // Log pool status for debugging
          logger.debug(`[PriyoSathi] Pool ${pool.id} status: ${pool.status}, passengers: ${pool.current_passengers}/${pool.max_passengers}`);
          
          // FIX: Determine if pool is joinable
          // Pool must be in WAITING_FOR_RIDERS or WAITING_FOR_DRIVER status AND have space
          const isJoinableStatus = ['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'].includes(pool.status);
          const hasSpace = pool.current_passengers < pool.max_passengers;
          
          poolInfo = {
            pool_id: pool.id,
            status: pool.status,
            current_passengers: pool.current_passengers,
            max_passengers: pool.max_passengers,
            fare_per_person: pool.fare_per_person,
            destination_address: pool.destination_address,
            can_join: isJoinableStatus && hasSpace,
          };
        } else if (poolError) {
          logger.warn(`[PriyoSathi] Error fetching pool ${ride.pool_id}:`, poolError);
        }
      } else {
        logger.debug(`[PriyoSathi] Ride ${ride.id} has no pool_id yet`);
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
      const { pickup_lat, pickup_lng, pickup_address } = req.body;

      if (!pickup_lat || !pickup_lng) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'pickup_lat and pickup_lng are required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Fetch the friend's ride
      const { data: friendRide, error: rideError } = await supabaseAdmin
        .from('rides')
        .select(`
          id,
          user_id,
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

      if (!friendRide.pool_id) {
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
        .select('id, status, current_passengers, max_passengers, vehicle_type, gender_restriction')
        .eq('id', friendRide.pool_id)
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // FIX Issue 2: Allow joining if pool is WAITING_FOR_RIDERS OR WAITING_FOR_DRIVER
      // Previously only checked WAITING_FOR_RIDERS, which incorrectly rejected join requests
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

      // Create a new ride for the accepting user
      const { data: newRide, error: createRideError } = await supabaseAdmin
        .from('rides')
        .insert({
          user_id: userId,
          pickup_lat: parseFloat(pickup_lat),
          pickup_lng: parseFloat(pickup_lng),
          pickup_address: pickup_address || 'Current Location',
          dropoff_lat: friendRide.dropoff_lat,
          dropoff_lng: friendRide.dropoff_lng,
          dropoff_address: friendRide.dropoff_address,
          vehicle_type: pool.vehicle_type,
          gender_restriction: pool.gender_restriction,
          status: 'MATCHED',
          pool_id: friendRide.pool_id,
        })
        .select()
        .single();

      if (createRideError) {
        logger.error('[PriyoSathi] Failed to create ride for invite accept:', createRideError);
        throw createRideError;
      }

      // Join the pool using atomic operation
      const { data: joinResult, error: joinError } = await supabaseAdmin.rpc('atomic_join_pool', {
        p_pool_id: friendRide.pool_id,
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
        metadata: { pool_id: friendRide.pool_id, joiner_id: userId },
      });

      logger.info(`[PriyoSathi] User ${userId} accepted ride invite and joined pool ${friendRide.pool_id}`);

      res.json({
        success: true,
        data: {
          ride_id: newRide.id,
          pool_id: friendRide.pool_id,
          message: 'Successfully joined your friend\'s pool!',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Notify companions when user searches for a ride
   * NOTE: This method is deprecated - use findAndNotifyCompanions from priyoSathiService instead
   * which properly checks if companions are online and in hexagon range
   */
  async notifyCompanionsOnRideSearch(userId: string, rideId: string): Promise<number> {
    // Deprecated - use priyoSathiService.findAndNotifyCompanions instead
    // which properly validates companion locations and hexagon proximity
    logger.warn('[PriyoSathi] notifyCompanionsOnRideSearch is deprecated, use findAndNotifyCompanions instead');
    return 0;
  }
}

export const priyoSathiController = new PriyoSathiController();
