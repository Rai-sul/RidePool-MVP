import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { poolMatchingService } from '../services/poolMatching.service';
import { geolocationService } from '../services/geolocation.service';
import { CreateRideRequest, Ride, RideStatus } from '../types';
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

      const pickupH3 = h3Utils.latLngToH3(pickup, 9);
      const dropoffH3 = h3Utils.latLngToH3(dropoff, 7);

      const { data: ride, error } = await supabase
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
        message: searchResult.hasMatches 
          ? 'Ride requested successfully - Pools found!' 
          : 'Ride requested - No pools found, see alternatives',
        ride,
        poolSearch: {
          matches: searchResult.matches.slice(0, 5),
          alternatives: searchResult.alternatives,
          analytics: searchResult.analytics,
          metadata: searchResult.metadata,
          hasMatches: searchResult.hasMatches,
        },
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

      const { data: rides, error } = await supabase
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

      const { data: ride, error: fetchError } = await supabase
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

      const { error: updateError } = await supabase
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
}

export const rideController = new RideController();
