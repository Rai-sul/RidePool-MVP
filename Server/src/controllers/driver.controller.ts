import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { h3Utils } from '../utils/h3.utils';
import { calculateDistance, estimateTravelTime } from '../utils/helper';
import { Pool, PoolStatus, Location } from '../types';
import { CONSTANTS } from '../config/constants';
import { config } from '../config/env';
import { smartRouteService } from '../services/smartRoute.service';
import { logger } from '../utils/logger';

interface DriverSession {
  id: string;
  driver_id: string;
  vehicle_id: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
  lat: number;
  lng: number;
  started_at: string;
  ended_at: string | null;
}


export class DriverController {
  async goOnline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { lat, lng, vehicle_id: providedVehicleId, heading } = req.body;

      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('is_driver')
        .eq('id', userId)
        .single();

      if (userError || !user?.is_driver) {
        return res.status(403).json({
          success: false,
          error: { code: 'NOT_DRIVER', message: 'User is not registered as driver' },
          timestamp: new Date().toISOString(),
        });
      }

      let vehicle;
      let vehicleError;

      if (providedVehicleId) {
        const result = await supabaseAdmin
          .from('vehicles')
          .select('*')
          .eq('id', providedVehicleId)
          .eq('driver_id', userId)
          .eq('is_active', true)
          .single();
        vehicle = result.data;
        vehicleError = result.error;
      } else {
        const result = await supabaseAdmin
          .from('vehicles')
          .select('*')
          .eq('driver_id', userId)
          .eq('is_active', true)
          .single();
        vehicle = result.data;
        vehicleError = result.error;
      }

      if (vehicleError || !vehicle) {
        return res.status(404).json({
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Active vehicle not found for driver' },
          timestamp: new Date().toISOString(),
        });
      }

      const vehicle_id = vehicle.id;

      const h3IndexRes8 = h3Utils.latLngToH3({ latitude: lat, longitude: lng }, 8);
      const h3IndexRes9 = h3Utils.latLngToH3({ latitude: lat, longitude: lng }, 9);

      const { data: existingSession } = await supabaseAdmin
        .from('driver_sessions')
        .select('*')
        .eq('driver_id', userId)
        .eq('status', 'ONLINE')
        .single();

      if (existingSession) {
        // Check if vehicle_locations row exists for this driver+vehicle
        const { data: existingLocation } = await supabaseAdmin
          .from('vehicle_locations')
          .select('id')
          .eq('driver_id', userId)
          .eq('vehicle_id', vehicle_id)
          .single();

        const locationPayload = {
          lat,
          lng,
          h3_index_res8: h3IndexRes8,
          h3_index_res9: h3IndexRes9,
          heading: heading || null,
          is_active: true,
          is_available: true,
          recorded_at: new Date().toISOString(),
        };

        if (existingLocation) {
          await supabaseAdmin
            .from('vehicle_locations')
            .update(locationPayload)
            .eq('id', existingLocation.id);
        } else {
          await supabaseAdmin
            .from('vehicle_locations')
            .insert({
              vehicle_id: vehicle_id,
              driver_id: userId,
              ...locationPayload,
            });
        }

        return res.json({
          success: true,
          data: {
            session_id: existingSession.id,
            status: 'ONLINE',
            message: 'Already online, location updated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: session, error: sessionError } = await supabaseAdmin
        .from('driver_sessions')
        .insert({
          driver_id: userId,
          vehicle_id: vehicle_id,
          status: 'ONLINE',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // Check if a vehicle_locations row already exists for this vehicle
      const { data: existingLocation } = await supabaseAdmin
        .from('vehicle_locations')
        .select('id')
        .eq('vehicle_id', vehicle_id)
        .single();

      const locationPayload = {
        vehicle_id: vehicle_id,
        driver_id: userId,
        lat,
        lng,
        h3_index_res8: h3IndexRes8,
        h3_index_res9: h3IndexRes9,
        heading: heading || null,
        is_active: true,
        is_available: true,
        recorded_at: new Date().toISOString(),
      };

      if (existingLocation) {
        const { error: locationError } = await supabaseAdmin
          .from('vehicle_locations')
          .update(locationPayload)
          .eq('id', existingLocation.id);

        if (locationError) {
          throw locationError;
        }
      } else {
        const { error: locationError } = await supabaseAdmin
          .from('vehicle_locations')
          .insert(locationPayload);

        if (locationError) {
          throw locationError;
        }
      }

      res.json({
        success: true,
        data: {
          session_id: session.id,
          status: 'ONLINE',
          vehicle: {
            id: vehicle.id,
            type: vehicle.vehicle_type,
            number: vehicle.vehicle_number,
          },
          location: { lat, lng },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async goOffline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: activePool } = await supabaseAdmin
        .from('pools')
        .select('id, status')
        .eq('driver_id', userId)
        .in('status', ['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED'])
        .single();

      if (activePool) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ACTIVE_POOL_EXISTS',
            message: 'Cannot go offline with an active pool. Complete the current ride first.',
            pool_id: activePool.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      await supabaseAdmin
        .from('driver_sessions')
        .update({
          status: 'OFFLINE',
          ended_at: new Date().toISOString(),
        })
        .eq('driver_id', userId)
        .eq('status', 'ONLINE');

      await supabaseAdmin
        .from('vehicle_locations')
        .update({
          is_active: false,
          is_available: false,
          recorded_at: new Date().toISOString(),
        })
        .eq('driver_id', userId);

      res.json({
        success: true,
        data: { status: 'OFFLINE' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: session, error: sessionError } = await supabaseAdmin
        .from('driver_sessions')
        .select('*, vehicles(*)')
        .eq('driver_id', userId)
        .eq('status', 'ONLINE')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionError || !session) {
        return res.json({
          success: true,
          data: { status: 'OFFLINE', session: null },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: location } = await supabaseAdmin
        .from('vehicle_locations')
        .select('lat, lng, heading, speed_kmh, recorded_at')
        .eq('driver_id', userId)
        .eq('is_active', true)
        .single();

      res.json({
        success: true,
        data: {
          status: session.status,
          session_id: session.id,
          started_at: session.started_at,
          vehicle: session.vehicles,
          location: location || null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { lat, lng, heading, speed_kmh } = req.body;
      const recordedAt = new Date().toISOString();

      const { data: vehicleLocation } = await supabaseAdmin
        .from('vehicle_locations')
        .select('vehicle_id')
        .eq('driver_id', userId)
        .eq('is_active', true)
        .single();

      if (!vehicleLocation) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_ONLINE', message: 'Driver not currently online' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: result, error } = await supabaseAdmin.rpc('update_vehicle_location', {
        p_vehicle_id: vehicleLocation.vehicle_id,
        p_latitude: lat,
        p_longitude: lng,
        p_heading: heading || 0,
        p_speed: speed_kmh || 0,
        p_recorded_at: recordedAt,
      });

      if (error) {
        throw error;
      }

      if (!result.success && result.reason === 'STALE_UPDATE') {
        return res.status(409).json({
          success: false,
          error: { code: 'STALE_UPDATE', message: 'Location update is older than current' },
          timestamp: new Date().toISOString(),
        });
      }

      // Update H3 indices (RPC function doesn't compute these)
      const h3IndexRes8 = h3Utils.latLngToH3({ latitude: lat, longitude: lng }, 8);
      const h3IndexRes9 = h3Utils.latLngToH3({ latitude: lat, longitude: lng }, 9);

      await supabaseAdmin
        .from('vehicle_locations')
        .update({
          h3_index_res8: h3IndexRes8,
          h3_index_res9: h3IndexRes9,
        })
        .eq('vehicle_id', vehicleLocation.vehicle_id)
        .eq('is_active', true);

      // Check if driver is on an active pool and if they're off-route
      // This syncs the route when Google Maps App reroutes the driver
      let routeRecalculated = false;
      const { data: activePool } = await supabaseAdmin
        .from('pools')
        .select('id, status')
        .eq('driver_id', userId)
        .in('status', ['READY_TO_START', 'STARTED'])
        .single();

      if (activePool) {
        const driverLocation = { latitude: lat, longitude: lng };
        const recalcResult = await smartRouteService.checkAndRecalculateIfOffRoute(
          activePool.id,
          driverLocation,
          0.3 // 300 meters threshold - if driver is more than 300m off route, recalculate
        );
        routeRecalculated = recalcResult.recalculated;
      }

      res.json({
        success: true,
        data: { 
          lat, 
          lng, 
          h3_index: h3IndexRes9,
          route_recalculated: routeRecalculated,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getAvailablePools(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: driverLocation } = await supabaseAdmin
        .from('vehicle_locations')
        .select('lat, lng, h3_index_res8, vehicle_id')
        .eq('driver_id', userId)
        .eq('is_active', true)
        .single();

      if (!driverLocation) {
        return res.status(400).json({
          success: false,
          error: { code: 'NOT_ONLINE', message: 'Driver must be online to view pools' },
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`[AvailablePools] Driver ${userId} at lat=${driverLocation.lat}, lng=${driverLocation.lng}, vehicle_id=${driverLocation.vehicle_id}`);

      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('vehicle_type')
        .eq('id', driverLocation.vehicle_id)
        .eq('is_active', true)
        .single();

      const driverVehicleType = vehicle?.vehicle_type || null;
      logger.info(`[AvailablePools] Driver vehicle_type=${driverVehicleType}`);

      // Simple pickup-only proximity: H3 Res 9, Ring 6 ≈ 2.1km
      const driverLat = Number(driverLocation.lat);
      const driverLng = Number(driverLocation.lng);
      const driverLoc: Location = { latitude: driverLat, longitude: driverLng };
      const driverH3Res9 = h3Utils.latLngToH3(driverLoc, 9);
      const pickupSearchHexagons = h3Utils.getH3Ring(driverH3Res9, config.h3.searchRadiusPickup);
      const pickupSearchSet = new Set(pickupSearchHexagons);

      logger.info(`[AvailablePools] Driver H3 (res9)=${driverH3Res9}, search hexagons count=${pickupSearchHexagons.length}`);

      // Fetch WAITING_FOR_DRIVER pools with ride details
      let query = supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(
            user_id,
            ride_id,
            left_at,
            rides(id, user_id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address),
            users:user_id(id, full_name, average_rating)
          )
        `)
        .in('status', ['WAITING_FOR_DRIVER'] as PoolStatus[])
        .is('driver_id', null)
        .gte('current_passengers', 2)
        .order('created_at', { ascending: true });

      if (driverVehicleType) {
        query = query.eq('vehicle_type', driverVehicleType);
      }

      const { data: rawPools, error } = await query;

      if (error) {
        logger.error(`[AvailablePools] Query error: ${error.message}`);
        throw error;
      }

      logger.info(`[AvailablePools] Raw pools found: ${rawPools?.length || 0}`);

      if (rawPools && rawPools.length > 0) {
        for (const pool of rawPools) {
          const creatorH3 = pool.score_breakdown?.creator_pickup?.h3_index;
          const members = pool.pool_members || [];
          logger.info(`[AvailablePools] Pool ${pool.id}: status=${pool.status}, passengers=${pool.current_passengers}, vehicle_type=${pool.vehicle_type}, creator_h3=${creatorH3}, members=${members.length}`);
          for (const m of members) {
            const ride = m.rides;
            logger.info(`[AvailablePools]   Member ${m.user_id}: ride_id=${m.ride_id}, ride pickup=${ride?.pickup_lat},${ride?.pickup_lng}, ride exists=${!!ride}`);
          }
        }
      }

      // Filter: any ride pickup in pool within driver's search radius
      let filteredPools = (rawPools || []).filter((pool) => {
        const activeMembers = (pool.pool_members || []).filter((m: any) => !m.left_at);

        // Check pool creator's pickup (stored in score_breakdown)
        const poolPickupH3 = pool.score_breakdown?.creator_pickup?.h3_index;
        if (poolPickupH3 && pickupSearchSet.has(poolPickupH3)) {
          logger.info(`[AvailablePools] Pool ${pool.id} matched via creator_pickup H3`);
          return true;
        }

        // Check each active member's ride pickup location
        for (const member of activeMembers) {
          const ride = member.rides;
          if (ride && ride.pickup_lat != null && ride.pickup_lng != null) {
            const ridePickupH3 = h3Utils.latLngToH3(
              { latitude: Number(ride.pickup_lat), longitude: Number(ride.pickup_lng) }, 9
            );
            if (pickupSearchSet.has(ridePickupH3)) {
              logger.info(`[AvailablePools] Pool ${pool.id} matched via member ride H3`);
              return true;
            }
          }
        }

        return false;
      });

      logger.info(`[AvailablePools] After H3 filter: ${filteredPools.length} pools`);

      // Build response with per-ride pickup/destination details (active members only)
      const poolsWithDetails = filteredPools.map((pool) => {
        const activeMembers = (pool.pool_members || []).filter((pm: any) => !pm.left_at);
        const passengers = activeMembers.map((pm: any) => {
          const ride = pm.rides;
          const user = pm.users;
          const fullName = user?.full_name || 'Rider';

          const pickupDist = (ride && ride.pickup_lat != null && ride.pickup_lng != null)
            ? calculateDistance(driverLat, driverLng, Number(ride.pickup_lat), Number(ride.pickup_lng))
            : null;

          return {
            user_id: pm.user_id,
            name: fullName,
            rating: user?.average_rating || 0,
            pickup: ride ? {
              lat: Number(ride.pickup_lat),
              lng: Number(ride.pickup_lng),
              address: ride.pickup_address || 'Pickup',
            } : null,
            dropoff: ride ? {
              lat: Number(ride.dropoff_lat),
              lng: Number(ride.dropoff_lng),
              address: ride.dropoff_address || 'Dropoff',
            } : null,
            pickup_distance_km: pickupDist !== null ? Math.round(pickupDist * 10) / 10 : null,
          };
        });

        // Find nearest pickup among all passengers
        const nearestPickup = passengers.reduce((nearest: any, p: any) => {
          if (p.pickup_distance_km === null) return nearest;
          if (nearest === null || p.pickup_distance_km < nearest.pickup_distance_km) return p;
          return nearest;
        }, null);

        const nearestPickupDist = nearestPickup?.pickup_distance_km ?? null;
        const estimatedMinutes = nearestPickupDist !== null ? estimateTravelTime(nearestPickupDist) : 0;
        const totalEarnings = Math.round((pool.fare_per_person || 0) * (pool.current_passengers || 0) * 0.8);

        return {
          id: pool.id,
          passengers,
          total_earnings: totalEarnings,
          fare_per_person: pool.fare_per_person,
          vehicle_type: pool.vehicle_type,
          current_passengers: pool.current_passengers,
          max_passengers: pool.max_passengers,
          nearest_pickup_km: nearestPickupDist,
          estimated_arrival_minutes: estimatedMinutes,
          destination: {
            lat: Number(pool.destination_lat),
            lng: Number(pool.destination_lng),
            address: pool.destination_address,
          },
          created_at: pool.created_at,
        };
      });

      // Sort by nearest pickup distance
      poolsWithDetails.sort((a, b) => {
        const distA = a.nearest_pickup_km ?? 999;
        const distB = b.nearest_pickup_km ?? 999;
        return distA - distB;
      });

      const result = poolsWithDetails.slice(0, 10);
      logger.info(`[AvailablePools] Returning ${result.length} pools to driver ${userId}`);

      res.json({
        success: true,
        data: {
          pools: result,
          total_available: poolsWithDetails.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async acceptPool(req: AuthRequest, res: Response, next: NextFunction) {
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

      const { data: existingPool } = await supabaseAdmin
        .from('pools')
        .select('id')
        .eq('driver_id', userId)
        .in('status', ['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED'])
        .single();

      if (existingPool) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_HAS_POOL',
            message: 'Driver already has an active pool',
            active_pool_id: existingPool.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: vehicle } = await supabaseAdmin
        .from('vehicle_locations')
        .select('vehicle_id')
        .eq('driver_id', userId)
        .eq('is_active', true)
        .single();

      if (!vehicle) {
        return res.status(400).json({
          success: false,
          error: { code: 'NOT_ONLINE', message: 'Driver must be online to accept pools' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: poolToAccept } = await supabaseAdmin
        .from('pools')
        .select('vehicle_type')
        .eq('id', poolId)
        .single();

      if (poolToAccept) {
        const { data: driverVehicle } = await supabaseAdmin
          .from('vehicles')
          .select('vehicle_type')
          .eq('id', vehicle.vehicle_id)
          .single();

        if (driverVehicle && poolToAccept.vehicle_type !== driverVehicle.vehicle_type) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VEHICLE_TYPE_MISMATCH',
              message: `Pool requires ${poolToAccept.vehicle_type} but your vehicle is ${driverVehicle.vehicle_type}`,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const { data: result, error: rpcError } = await supabaseAdmin.rpc('atomic_accept_pool', {
        p_pool_id: poolId,
        p_driver_id: userId,
        p_vehicle_id: vehicle.vehicle_id,
      });

      if (rpcError) {
        if (rpcError.message?.includes('ALREADY_ASSIGNED')) {
          return res.status(409).json({
            success: false,
            error: { code: 'POOL_ALREADY_ASSIGNED', message: 'Pool was already accepted by another driver' },
            timestamp: new Date().toISOString(),
          });
        }
        if (rpcError.message?.includes('POOL_NOT_FOUND')) {
          return res.status(404).json({
            success: false,
            error: { code: 'POOL_NOT_FOUND', message: 'Pool not found or not available' },
            timestamp: new Date().toISOString(),
          });
        }
        throw rpcError;
      }

      await supabaseAdmin
        .from('driver_sessions')
        .update({ status: 'BUSY' })
        .eq('driver_id', userId)
        .eq('status', 'ONLINE');

      await supabaseAdmin
        .from('vehicle_locations')
        .update({
          pool_id: poolId,
          is_available: false,
        })
        .eq('driver_id', userId);

      // Clear cached route so it gets recalculated with driver's location
      // This ensures the navigation shows the route starting from driver's current position
      await smartRouteService.clearPoolRoute(poolId);

      const { data: pool } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(
            user_id,
            ride_id,
            rides(pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address),
            users:user_id(id, full_name, average_rating)
          )
        `)
        .eq('id', poolId)
        .single();

      // Get driver's current location to find nearest pickup
      const { data: driverLoc } = await supabaseAdmin
        .from('vehicle_locations')
        .select('lat, lng')
        .eq('driver_id', userId)
        .single();

      const passengers = pool?.pool_members?.map((pm: any) => {
        const user = pm.users;
        return {
          user_id: pm.user_id,
          name: user?.full_name || 'Rider',
          rating: user?.average_rating || 0,
          pickup: {
            lat: pm.rides?.pickup_lat != null ? Number(pm.rides.pickup_lat) : null,
            lng: pm.rides?.pickup_lng != null ? Number(pm.rides.pickup_lng) : null,
            address: pm.rides?.pickup_address,
          },
          dropoff: {
            lat: pm.rides?.dropoff_lat != null ? Number(pm.rides.dropoff_lat) : null,
            lng: pm.rides?.dropoff_lng != null ? Number(pm.rides.dropoff_lng) : null,
            address: pm.rides?.dropoff_address,
          },
        };
      }) || [];

      // Find nearest pickup for navigation
      let nearestPickup = null as any;
      if (driverLoc && passengers.length > 0) {
        const drvLat = Number(driverLoc.lat);
        const drvLng = Number(driverLoc.lng);
        let minDist = Infinity;
        for (const p of passengers) {
          if (p.pickup?.lat != null && p.pickup?.lng != null) {
            const dist = calculateDistance(drvLat, drvLng, p.pickup.lat, p.pickup.lng);
            if (dist < minDist) {
              minDist = dist;
              nearestPickup = p.pickup;
            }
          }
        }
      }

      // Build Google Maps navigation URL to nearest pickup
      let navigation_url = null as string | null;
      if (nearestPickup?.lat != null && nearestPickup?.lng != null) {
        const waypointCoords = passengers
          .filter((p: any) => p.pickup?.lat && p.pickup?.lng && (p.pickup.lat !== nearestPickup.lat || p.pickup.lng !== nearestPickup.lng))
          .map((p: any) => `${p.pickup.lat},${p.pickup.lng}`);

        const destCoord = `${nearestPickup.lat},${nearestPickup.lng}`;
        navigation_url = `https://www.google.com/maps/dir/?api=1&destination=${destCoord}&travelmode=driving`;
      }

      res.json({
        success: true,
        data: {
          pool_id: poolId,
          status: 'READY_TO_START',
          passengers,
          destination: {
            lat: pool?.destination_lat ? Number(pool.destination_lat) : null,
            lng: pool?.destination_lng ? Number(pool.destination_lng) : null,
            address: pool?.destination_address,
          },
          nearest_pickup: nearestPickup,
          navigation_url,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectPool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { message: 'Pool rejected' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getActivePool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: pool, error } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(
            user_id,
            ride_id,
            joined_at,
            rides(
              id,
              pickup_lat,
              pickup_lng,
              pickup_address,
              dropoff_lat,
              dropoff_lng,
              dropoff_address,
              status
            )
          ),
          vehicles(vehicle_number, model, color)
        `)
        .eq('driver_id', userId)
        .in('status', ['READY_TO_START', 'STARTED'])
        .single();

      if (error || !pool) {
        return res.json({
          success: true,
          data: { active_pool: null },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          active_pool: {
            id: pool.id,
            status: pool.status,
            destination: {
              lat: Number(pool.destination_lat),
              lng: Number(pool.destination_lng),
              address: pool.destination_address,
            },
            vehicle: pool.vehicles,
            passengers: pool.pool_members?.map((pm: any) => ({
              user_id: pm.user_id,
              ride_id: pm.ride_id,
              pickup: {
                lat: pm.rides?.pickup_lat != null ? Number(pm.rides.pickup_lat) : null,
                lng: pm.rides?.pickup_lng != null ? Number(pm.rides.pickup_lng) : null,
                address: pm.rides?.pickup_address,
              },
              dropoff: {
                lat: pm.rides?.dropoff_lat != null ? Number(pm.rides.dropoff_lat) : null,
                lng: pm.rides?.dropoff_lng != null ? Number(pm.rides.dropoff_lng) : null,
                address: pm.rides?.dropoff_address,
              },
              status: pm.rides?.status,
            })) || [],
            current_passengers: pool.current_passengers,
            max_passengers: pool.max_passengers,
            fare_per_person: pool.fare_per_person,
            created_at: pool.created_at,
            started_at: pool.started_at,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async startRide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, status, current_passengers')
        .eq('driver_id', userId)
        .eq('status', 'READY_TO_START')
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'NO_POOL', message: 'No pool ready to start' },
          timestamp: new Date().toISOString(),
        });
      }

      if (pool.current_passengers < 2) {
        return res.status(400).json({
          success: false,
          error: { code: 'INSUFFICIENT_PASSENGERS', message: 'Minimum 2 passengers required to start' },
          timestamp: new Date().toISOString(),
        });
      }

      const now = new Date().toISOString();

      await supabaseAdmin
        .from('pools')
        .update({
          status: 'STARTED' as PoolStatus,
          started_at: now,
        })
        .eq('id', pool.id);

      await supabaseAdmin
        .from('rides')
        .update({
          status: 'STARTED',
          started_at: now,
        })
        .eq('pool_id', pool.id);

      res.json({
        success: true,
        data: {
          pool_id: pool.id,
          status: 'STARTED',
          started_at: now,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async markPickup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { passengerId } = req.params;

      const { data: ride, error: rideError } = await supabaseAdmin
        .from('rides')
        .select('id, pool_id, status, pools!inner(driver_id)')
        .eq('user_id', passengerId)
        .eq('pools.driver_id', userId)
        .single();

      if (rideError || !ride) {
        return res.status(404).json({
          success: false,
          error: { code: 'RIDE_NOT_FOUND', message: 'Passenger ride not found in your active pool' },
          timestamp: new Date().toISOString(),
        });
      }

      await supabaseAdmin
        .from('rides')
        .update({
          status: 'STARTED',
          started_at: new Date().toISOString(),
        })
        .eq('id', ride.id);

      res.json({
        success: true,
        data: {
          passenger_id: passengerId,
          ride_id: ride.id,
          status: 'PICKED_UP',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async markDropoff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { passengerId } = req.params;

      const { data: ride, error: rideError } = await supabaseAdmin
        .from('rides')
        .select('id, pool_id, status, pools!inner(driver_id, id)')
        .eq('user_id', passengerId)
        .eq('pools.driver_id', userId)
        .single();

      if (rideError || !ride) {
        return res.status(404).json({
          success: false,
          error: { code: 'RIDE_NOT_FOUND', message: 'Passenger ride not found in your active pool' },
          timestamp: new Date().toISOString(),
        });
      }

      await supabaseAdmin
        .from('rides')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', ride.id);

      const { data: remainingRides } = await supabaseAdmin
        .from('rides')
        .select('id')
        .eq('pool_id', ride.pool_id)
        .neq('status', 'COMPLETED')
        .neq('status', 'CANCELLED');

      const allDroppedOff = !remainingRides || remainingRides.length === 0;

      res.json({
        success: true,
        data: {
          passenger_id: passengerId,
          ride_id: ride.id,
          status: 'DROPPED_OFF',
          all_passengers_dropped: allDroppedOff,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async completeRide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: pool, error: poolError } = await supabaseAdmin
        .from('pools')
        .select('id, status, fare_per_person, current_passengers')
        .eq('driver_id', userId)
        .eq('status', 'STARTED')
        .single();

      if (poolError || !pool) {
        return res.status(404).json({
          success: false,
          error: { code: 'NO_ACTIVE_POOL', message: 'No active pool to complete' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: incompleteRides } = await supabaseAdmin
        .from('rides')
        .select('id, user_id')
        .eq('pool_id', pool.id)
        .neq('status', 'COMPLETED')
        .neq('status', 'CANCELLED');

      if (incompleteRides && incompleteRides.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INCOMPLETE_RIDES',
            message: `${incompleteRides.length} passenger(s) not yet dropped off`,
            pending_passengers: incompleteRides.map((r) => r.user_id),
          },
          timestamp: new Date().toISOString(),
        });
      }

      const now = new Date().toISOString();

      await supabaseAdmin
        .from('pools')
        .update({
          status: 'COMPLETED' as PoolStatus,
          completed_at: now,
        })
        .eq('id', pool.id);

      await supabaseAdmin
        .from('driver_sessions')
        .update({ status: 'ONLINE' })
        .eq('driver_id', userId)
        .eq('status', 'BUSY');

      await supabaseAdmin
        .from('vehicle_locations')
        .update({
          pool_id: null,
          is_available: true,
        })
        .eq('driver_id', userId);

      const totalFare = (pool.fare_per_person || 0) * pool.current_passengers;
      const platformCommission = totalFare * 0.2;
      const driverEarnings = totalFare - platformCommission;

      await supabaseAdmin
        .from('driver_earnings')
        .insert({
          driver_id: userId,
          pool_id: pool.id,
          base_fare: totalFare,
          platform_commission: platformCommission,
          net_earnings: driverEarnings,
          payment_status: 'PENDING',
        });

      res.json({
        success: true,
        data: {
          pool_id: pool.id,
          status: 'COMPLETED',
          completed_at: now,
          earnings: {
            total_fare: totalFare,
            commission: platformCommission,
            net_earnings: driverEarnings,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getEarningsToday(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: earnings, error } = await supabaseAdmin
        .from('driver_earnings')
        .select('net_earnings, base_fare, platform_commission, created_at')
        .eq('driver_id', userId)
        .gte('created_at', today.toISOString());

      if (error) {
        throw error;
      }

      const summary = {
        trips_completed: earnings?.length || 0,
        total_fare: earnings?.reduce((sum, e) => sum + (e.base_fare || 0), 0) || 0,
        total_commission: earnings?.reduce((sum, e) => sum + (e.platform_commission || 0), 0) || 0,
        net_earnings: earnings?.reduce((sum, e) => sum + (e.net_earnings || 0), 0) || 0,
      };

      res.json({
        success: true,
        data: {
          date: today.toISOString().split('T')[0],
          summary,
          trips: earnings || [],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getEarningsHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: earnings, error } = await supabaseAdmin
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { earnings: earnings || [] },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('total_rides, average_rating, total_ratings')
        .eq('id', userId)
        .single();

      const { data: allEarnings } = await supabaseAdmin
        .from('driver_earnings')
        .select('net_earnings')
        .eq('driver_id', userId);

      const totalEarnings = allEarnings?.reduce((sum, e) => sum + (e.net_earnings || 0), 0) || 0;

      res.json({
        success: true,
        data: {
          total_trips: user?.total_rides || 0,
          average_rating: user?.average_rating || 0,
          total_ratings: user?.total_ratings || 0,
          total_earnings: totalEarnings,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async registerVehicle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { vehicle_type, vehicle_number, model, color } = req.body;

      const { data: existingVehicle } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('driver_id', userId)
        .eq('is_active', true)
        .single();

      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          error: { code: 'VEHICLE_EXISTS', message: 'Driver already has an active vehicle' },
          timestamp: new Date().toISOString(),
        });
      }

      const maxPassengers = vehicle_type === 'CNG' ? 3 : 4;

      const { data: vehicle, error } = await supabaseAdmin
        .from('vehicles')
        .insert({
          driver_id: userId,
          vehicle_type,
          vehicle_number,
          model: model || null,
          color: color || null,
          max_passengers: maxPassengers,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const { error: driverUpdateError } = await supabaseAdmin
        .from('users')
        .update({ is_driver: true })
        .eq('id', userId);

      if (driverUpdateError) {
        logger.error(`Failed to set is_driver for user ${userId}: ${driverUpdateError.message}`);
        return res.status(500).json({
          success: false,
          error: { code: 'UPDATE_FAILED', message: 'Vehicle created but driver status update failed' },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(201).json({
        success: true,
        data: {
          vehicle,
          is_driver: true,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const driverController = new DriverController();
