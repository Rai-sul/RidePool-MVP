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
          companion:users!companion_id(id, phone, average_rating)
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
          requester:users!user_id(id, phone, average_rating)
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

      const { data: ride, error: rideError } = await supabaseAdmin
        .from('rides')
        .select('id, pool_id, dropoff_address')
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

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('phone')
        .eq('id', userId)
        .single();

      await notificationService.sendPriyoSathiInviteNotification(
        companionId,
        user?.phone || 'A friend',
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

  async notifyCompanionsOnRideSearch(userId: string, rideId: string): Promise<number> {
    try {
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
        .select('phone')
        .eq('id', userId)
        .single();

      for (const c of companions) {
        await notificationService.sendPriyoSathiInviteNotification(
          c.companion_id,
          user?.phone || 'Your Priyo Sathi',
          rideId
        );
      }

      return companions.length;
    } catch (error) {
      logger.error('[PriyoSathi] Failed to notify companions:', error);
      return 0;
    }
  }
}

export const priyoSathiController = new PriyoSathiController();
