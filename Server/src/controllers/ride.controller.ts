import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { poolMatchingService } from '../services/poolMatching.service';
import { priyoSathiService } from '../services/priyoSathi.service';
import { geolocationService } from '../services/geolocation.service';
import { rideEstimationService } from '../services/rideEstimation.service';
import { CreateRideRequest, Ride, RideStatus, Location, VehicleType } from '../types';
import { h3Utils } from '../utils/h3.utils';

export class RideController {
  async requestRide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const rideData: CreateRideRequest = req.body;

      const pickup = { latitude: rideData.pickup_lat, longitude: rideData.pickup_lng };
      const dropoff = { latitude: rideData.dropoff_lat, longitude: rideData.dropoff_lng };

      const isPickupValid = await geolocationService.validateLocation(pickup);
      const isDropoffValid = await geolocationService.validateLocation(dropoff);

      if (!isPickupValid || !isDropoffValid) {
        return res.status(400).json({ error: 'Invalid location coordinates' });
      }

      // Record ride intent for Priyo Sathi visibility (even before pool is created)
      await priyoSathiService.setUserRideIntent(userId, pickup, dropoff);

      const pickupH3 = h3Utils.latLngToH3(pickup, 9);
      const dropoffH3 = h3Utils.latLngToH3(dropoff, 7);

      const { data: ride, error } = await supabaseAdmin
        .from('rides')
        .insert({
          user_id: userId,
          pickup_lat: rideData.pickup_lat,
          pickup_lng: rideData.pickup_lng,
          pickup_address: rideData.pickup_address,
          pickup_h3_index: pickupH3,
          dropoff_lat: rideData.dropoff_lat,
          dropoff_lng: rideData.dropoff_lng,
          dropoff_address: rideData.dropoff_address,
          dropoff_h3_index: dropoffH3,
          vehicle_type: rideData.vehicle_type,
          gender_restriction: rideData.gender_restriction || 'ANY',
          status: 'CREATING_POOL' as RideStatus,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const searchResult = await poolMatchingService.findMatchingPoolsEnhanced(ride as Ride, userId);

      res.json({
        success: true,
        data: ride,
        message: searchResult.hasMatches 
          ? 'Ride requested successfully - Pools found!' 
          : 'Ride requested - No pools found, see alternatives',
        poolSearch: {
          matches: searchResult.matches.slice(0, 5),
          alternatives: searchResult.alternatives,
          analytics: searchResult.analytics,
          metadata: searchResult.metadata,
          hasMatches: searchResult.hasMatches,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getRideHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data: rides, error } = await supabaseAdmin
        .from('rides')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({ rides });
    } catch (error) {
      next(error);
    }
  }

  async cancelRide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { rideId } = req.params;
      const { reason } = req.body;

      const { data: ride, error: fetchError } = await supabaseAdmin
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !ride) {
        return res.status(404).json({ error: 'Ride not found' });
      }

      if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Ride cannot be cancelled' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('rides')
        .update({
          status: 'CANCELLED' as RideStatus,
          cancelled_reason: reason || 'User cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rideId);

      if (updateError) {
        throw updateError;
      }

      res.json({ message: 'Ride cancelled successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ride estimate (ETA and fare) for pickup to destination
   * Call this before confirming a ride to show the user estimated cost and time
   */
  async getRideEstimate(req: AuthRequest, res: Response, next: NextFunction) {
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
          error: { code: 'MISSING_PARAMS', message: 'Missing required parameters: pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type' },
          timestamp: new Date().toISOString(),
        });
      }

      const pickup: Location = {
        latitude: parseFloat(pickup_lat as string),
        longitude: parseFloat(pickup_lng as string),
      };

      const dropoff: Location = {
        latitude: parseFloat(dropoff_lat as string),
        longitude: parseFloat(dropoff_lng as string),
      };

      // Validate coordinates
      const isPickupValid = await geolocationService.validateLocation(pickup);
      const isDropoffValid = await geolocationService.validateLocation(dropoff);

      if (!isPickupValid || !isDropoffValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_LOCATION', message: 'Invalid pickup or dropoff coordinates' },
          timestamp: new Date().toISOString(),
        });
      }

      // Record ride intent for Priyo Sathi visibility (estimate flow)
      await priyoSathiService.setUserRideIntent(userId, pickup, dropoff);

      // Get ride estimate with ETA and fare
      const estimate = await rideEstimationService.getRideEstimate(
        pickup,
        dropoff,
        vehicle_type as VehicleType,
        2 // Default to 2 passengers for estimate
      );

      res.json({
        success: true,
        data: {
          estimate: {
            distanceKm: estimate.distanceKm,
            durationMinutes: estimate.durationMinutes,
            durationInTraffic: estimate.durationInTraffic,
            eta: `${estimate.durationInTraffic} min`,
            etaWithoutTraffic: `${estimate.durationMinutes} min`,
            fareEstimates: estimate.fareEstimates,
            estimatedFare: estimate.estimatedFare,
            estimatedSavings: estimate.estimatedSavings,
            trafficLevel: estimate.trafficLevel,
          },
          route: estimate.route ? {
            encoded: estimate.route.encoded,
            coordinates: estimate.route.coordinates,
            summary: estimate.route.summary,
            selectedReason: estimate.selectedRouteReason,
          } : null,
          alternativeRoutes: estimate.alternativeRoutes.map(alt => ({
            description: alt.description,
            distanceKm: alt.distanceKm,
            durationInTraffic: alt.durationInTraffic,
            timeDifference: alt.timeDifference,
            trafficLevel: alt.trafficLevel,
          })),
          message: `${estimate.durationInTraffic} min via ${estimate.route?.summary || 'best route'} • ৳${estimate.estimatedFare}/person`,
          trafficInfo: estimate.trafficLevel === 'low' 
            ? '🟢 Light traffic' 
            : estimate.trafficLevel === 'moderate' 
              ? '🟡 Moderate traffic' 
              : '🔴 Heavy traffic',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const rideController = new RideController();
