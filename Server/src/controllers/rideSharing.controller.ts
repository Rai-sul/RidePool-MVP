import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { z } from 'zod';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const ShareRideSchema = z.object({
  ride_id: z.string().uuid(),
  contact_ids: z.array(z.string().uuid()).max(5).optional(),
  expires_in_hours: z.number().int().min(1).max(24).optional().default(6),
});

export class RideSharingController {
  async shareRide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = ShareRideSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { ride_id, contact_ids, expires_in_hours } = parseResult.data;

      const { data: ride, error: rideError } = await supabaseAdmin
        .from('rides')
        .select('id, user_id, pool_id, status')
        .eq('id', ride_id)
        .eq('user_id', userId)
        .single();

      if (rideError || !ride) {
        return res.status(404).json({
          success: false,
          error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found or not owned by you' },
          timestamp: new Date().toISOString(),
        });
      }

      if (['COMPLETED', 'CANCELLED'].includes(ride.status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'RIDE_ENDED', message: 'Cannot share a completed or cancelled ride' },
          timestamp: new Date().toISOString(),
        });
      }

      const shareToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);

      const { data: shareRecord, error: insertError } = await supabaseAdmin
        .from('ride_sharing')
        .insert({
          ride_id,
          user_id: userId,
          share_token: shareToken,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const baseUrl = process.env.PUBLIC_URL || 'https://ridepool.app';
      const trackingUrl = `${baseUrl}/track/${shareToken}`;

      if (contact_ids && contact_ids.length > 0) {
        const { data: contacts } = await supabaseAdmin
          .from('emergency_contacts')
          .select('id, name, phone')
          .in('id', contact_ids)
          .eq('user_id', userId);

        if (contacts && contacts.length > 0) {
          for (const contact of contacts) {
            logger.info(`[RideSharing] Would send SMS to ${contact.phone}: Track ride at ${trackingUrl}`);
          }
        }
      }

      logger.info(`[RideSharing] User ${userId} shared ride ${ride_id}, token: ${shareToken.substring(0, 8)}...`);

      res.status(201).json({
        success: true,
        data: {
          share_id: shareRecord.id,
          tracking_url: trackingUrl,
          expires_at: expiresAt.toISOString(),
          contacts_notified: contact_ids?.length || 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getSharedRideStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      const { data: shareRecord, error: shareError } = await supabaseAdmin
        .from('ride_sharing')
        .select(`
          id,
          ride_id,
          expires_at,
          is_active,
          rides(
            id,
            status,
            pickup_lat,
            pickup_lng,
            pickup_address,
            dropoff_lat,
            dropoff_lng,
            dropoff_address,
            pool_id,
            pools(
              id,
              status,
              driver_id,
              vehicle_id,
              vehicles(vehicle_number, model, color),
              driver:users!driver_id(id, average_rating)
            )
          )
        `)
        .eq('share_token', token)
        .eq('is_active', true)
        .single();

      if (shareError || !shareRecord) {
        return res.status(404).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired tracking link' },
          timestamp: new Date().toISOString(),
        });
      }

      if (new Date(shareRecord.expires_at) < new Date()) {
        await supabaseAdmin
          .from('ride_sharing')
          .update({ is_active: false })
          .eq('id', shareRecord.id);

        return res.status(410).json({
          success: false,
          error: { code: 'EXPIRED', message: 'This tracking link has expired' },
          timestamp: new Date().toISOString(),
        });
      }

      const ride = shareRecord.rides as any;
      if (!ride) {
        return res.status(404).json({
          success: false,
          error: { code: 'RIDE_NOT_FOUND', message: 'Ride data not available' },
          timestamp: new Date().toISOString(),
        });
      }

      const poolData = ride.pools as any;
      let driverLocation = null;
      if (poolData?.driver_id) {
        const { data: location } = await supabaseAdmin
          .from('vehicle_locations')
          .select('lat, lng, heading, speed_kmh, recorded_at')
          .eq('driver_id', poolData.driver_id)
          .eq('is_active', true)
          .single();

        if (location) {
          driverLocation = {
            lat: location.lat,
            lng: location.lng,
            heading: location.heading,
            updated_at: location.recorded_at,
          };
        }
      }

      res.json({
        success: true,
        data: {
          ride_status: ride.status,
          pickup: {
            lat: ride.pickup_lat,
            lng: ride.pickup_lng,
            address: ride.pickup_address,
          },
          dropoff: {
            lat: ride.dropoff_lat,
            lng: ride.dropoff_lng,
            address: ride.dropoff_address,
          },
          driver: poolData?.driver_id ? {
            rating: poolData.driver?.average_rating,
            vehicle: poolData.vehicles ? {
              number: poolData.vehicles.vehicle_number,
              model: poolData.vehicles.model,
              color: poolData.vehicles.color,
            } : null,
          } : null,
          driver_location: driverLocation,
          pool_status: poolData?.status || null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async stopSharing(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { shareId } = req.params;

      const { error } = await supabaseAdmin
        .from('ride_sharing')
        .update({ is_active: false })
        .eq('id', shareId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { message: 'Ride sharing stopped' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveShares(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: shares, error } = await supabaseAdmin
        .from('ride_sharing')
        .select('id, ride_id, share_token, expires_at, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const baseUrl = process.env.PUBLIC_URL || 'https://ridepool.app';
      const sharesWithUrls = (shares || []).map((share) => ({
        ...share,
        tracking_url: `${baseUrl}/track/${share.share_token}`,
      }));

      res.json({
        success: true,
        data: { shares: sharesWithUrls },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const rideSharingController = new RideSharingController();
