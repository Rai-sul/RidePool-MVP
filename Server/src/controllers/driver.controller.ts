import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { h3Utils } from '../utils/h3.utils';
import { calculateDistance } from '../utils/helper';
import { Pool, PoolStatus, Location } from '../types';
import { CONSTANTS } from '../config/constants';
import { config } from '../config/env';
import { smartRouteService } from '../services/smartRoute.service';

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

      const { lat, lng, vehicle_id, heading } = req.body;

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

      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', vehicle_id)
        .eq('driver_id', userId)
        .eq('is_active', true)
        .single();

      if (vehicleError || !vehicle) {
        return res.status(404).json({
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Active vehicle not found for driver' },
          timestamp: new Date().toISOString(),
        });
      }

      const h3IndexRes8 = h3Utils.latLngToH3({ latitude: lat, longitude: lng }, 8);
      const h3IndexRes9 = h3Utils.latLngToH3({ latitude: lat, longitude: lng }, 9);

      const { data: existingSession } = await supabaseAdmin
        .from('driver_sessions')
        .select('*')
        .eq('driver_id', userId)
        .eq('status', 'ONLINE')
        .single();

      if (existingSession) {
        await supabaseAdmin
          .from('vehicle_locations')
          .update({
            lat,
            lng,
            h3_index_res8: h3IndexRes8,
            h3_index_res9: h3IndexRes9,
            heading: heading || null,
            is_active: true,
            is_available: true,
            recorded_at: new Date().toISOString(),
          })
          .eq('driver_id', userId)
          .eq('vehicle_id', vehicle_id);

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

      const { error: locationError } = await supabaseAdmin
        .from('vehicle_locations')
        .upsert({
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
        }, {
          onConflict: 'vehicle_id',
        });

      if (locationError) {
        throw locationError;
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

      const h3IndexRes9 = h3Utils.latLngToH3({ latitude: lat, longitude: lng }, 9);

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
        .select('lat, lng, h3_index_res8')
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

      const driverH3 = h3Utils.latLngToH3(
        { latitude: driverLocation.lat, longitude: driverLocation.lng },
        7
      );
      const searchHexagons = h3Utils.getH3Ring(driverH3, config.h3.searchRadius + 1);

      const { data: pools, error } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(user_id, ride_id),
          creator:users!creator_user_id(id, average_rating)
        `)
        .in('status', ['WAITING_FOR_DRIVER'] as PoolStatus[])
        .is('driver_id', null)
        .in('destination_h3_index', searchHexagons)
        .gte('current_passengers', 2)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const poolsWithDistance = (pools || []).map((pool) => {
        const distance = calculateDistance(
          driverLocation.lat,
          driverLocation.lng,
          pool.destination_lat,
          pool.destination_lng
        );
        const estimatedMinutes = Math.ceil((distance / 30) * 60);

        return {
          id: pool.id,
          destination: {
            lat: pool.destination_lat,
            lng: pool.destination_lng,
            address: pool.destination_address,
          },
          vehicle_type: pool.vehicle_type,
          gender_restriction: pool.gender_restriction,
          current_passengers: pool.current_passengers,
          max_passengers: pool.max_passengers,
          fare_per_person: pool.fare_per_person,
          distance_km: Math.round(distance * 10) / 10,
          estimated_arrival_minutes: estimatedMinutes,
          created_at: pool.created_at,
        };
      });

      poolsWithDistance.sort((a, b) => a.distance_km - b.distance_km);

      res.json({
        success: true,
        data: {
          pools: poolsWithDistance.slice(0, 10),
          total_available: poolsWithDistance.length,
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

      const { data: pool } = await supabaseAdmin
        .from('pools')
        .select(`
          *,
          pool_members(
            user_id,
            ride_id,
            rides(pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address)
          )
        `)
        .eq('id', poolId)
        .single();

      res.json({
        success: true,
        data: {
          pool_id: poolId,
          status: 'READY_TO_START',
          passengers: pool?.pool_members?.map((pm: any) => ({
            user_id: pm.user_id,
            pickup: {
              lat: pm.rides?.pickup_lat,
              lng: pm.rides?.pickup_lng,
              address: pm.rides?.pickup_address,
            },
            dropoff: {
              lat: pm.rides?.dropoff_lat,
              lng: pm.rides?.dropoff_lng,
              address: pm.rides?.dropoff_address,
            },
          })) || [],
          destination: {
            lat: pool?.destination_lat,
            lng: pool?.destination_lng,
            address: pool?.destination_address,
          },
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
              lat: pool.destination_lat,
              lng: pool.destination_lng,
              address: pool.destination_address,
            },
            vehicle: pool.vehicles,
            passengers: pool.pool_members?.map((pm: any) => ({
              user_id: pm.user_id,
              ride_id: pm.ride_id,
              pickup: {
                lat: pm.rides?.pickup_lat,
                lng: pm.rides?.pickup_lng,
                address: pm.rides?.pickup_address,
              },
              dropoff: {
                lat: pm.rides?.dropoff_lat,
                lng: pm.rides?.dropoff_lng,
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

  async setPriorityLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { priority_lat, priority_lng, priority_address } = req.body;

      const h3Index = h3Utils.latLngToH3({ latitude: priority_lat, longitude: priority_lng }, 7);

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          driver_priority_lat: priority_lat,
          driver_priority_lng: priority_lng,
          driver_priority_address: priority_address || null,
          driver_priority_h3_index: h3Index,
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: {
          priority_location: {
            lat: priority_lat,
            lng: priority_lng,
            address: priority_address,
            h3_index: h3Index,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPriorityLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('driver_priority_lat, driver_priority_lng, driver_priority_address, driver_priority_h3_index')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (!data?.driver_priority_lat) {
        return res.json({
          success: true,
          data: { priority_location: null },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          priority_location: {
            lat: data.driver_priority_lat,
            lng: data.driver_priority_lng,
            address: data.driver_priority_address,
            h3_index: data.driver_priority_h3_index,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async clearPriorityLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      await supabaseAdmin
        .from('users')
        .update({
          driver_priority_lat: null,
          driver_priority_lng: null,
          driver_priority_address: null,
          driver_priority_h3_index: null,
        })
        .eq('id', userId);

      res.json({
        success: true,
        data: { message: 'Priority location cleared' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const driverController = new DriverController();
