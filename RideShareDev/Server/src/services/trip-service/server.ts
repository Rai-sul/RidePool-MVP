import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as tripService from './trip.service';
import { Trip, RidePool, VehicleType, TripStatus, PoolStatus } from './trip.service'; // Import local types

const PROTO_PATH = __dirname + '../../../proto/trip.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const tripProto: any = grpc.loadPackageDefinition(packageDefinition).trip;

function getServer(): grpc.Server {
  const server = new grpc.Server();
  server.addService(tripProto.TripService.service, {
    CreateTrip: async (call: any, callback: any) => {
      try {
        const reqTrip = call.request.trip;
        const newTrip: Trip = {
          id: reqTrip.id,
          userId: reqTrip.user_id,
          driverId: reqTrip.driver_id || undefined,
          origin: reqTrip.origin.address,
          destination: reqTrip.destination.address,
          status: TripStatus[reqTrip.status as keyof typeof TripStatus],
          fare: reqTrip.fare,
          poolId: reqTrip.pool_id || undefined,
          passengers: reqTrip.passengers,
          vehicleType: VehicleType[reqTrip.vehicle_type as keyof typeof VehicleType] || undefined,
          maxPassengers: reqTrip.max_passengers || undefined,
          createdAt: reqTrip.created_at,
        };
        const createdTrip = await tripService.createTrip(newTrip);
        callback(null, { trip: createdTrip });
      } catch (error) {
        console.error('Error in CreateTrip:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    GetTrip: async (call: any, callback: any) => {
      try {
        const trip = await tripService.getTrip(call.request.id);
        if (trip) {
          callback(null, { trip });
        } else {
          callback({ code: grpc.status.NOT_FOUND, message: 'Trip not found' });
        }
      } catch (error) {
        console.error('Error in GetTrip:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    GetPool: async (call: any, callback: any) => {
      try {
        const pool = await tripService.getPool(call.request.id);
        if (pool) {
          callback(null, { pool });
        } else {
          callback({ code: grpc.status.NOT_FOUND, message: 'Pool not found' });
        }
      } catch (error) {
        console.error('Error in GetPool:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    JoinPool: async (call: any, callback: any) => {
      try {
        const updatedPool = await tripService.joinPool(call.request.pool_id, call.request.user_id);
        if (updatedPool) {
          callback(null, { pool: updatedPool });
        } else {
          callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Could not join pool' });
        }
      } catch (error) {
        console.error('Error in JoinPool:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    LeavePool: async (call: any, callback: any) => {
      try {
        const updatedPool = await tripService.leavePool(call.request.pool_id, call.request.user_id);
        if (updatedPool) {
          callback(null, { pool: updatedPool });
        } else {
          callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Could not leave pool' });
        }
      } catch (error) {
        console.error('Error in LeavePool:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    GetOpenPools: async (call: any, callback: any) => {
      try {
        const vehicleType = call.request.vehicle_type ? VehicleType[call.request.vehicle_type as keyof typeof VehicleType] : undefined;
        const openPools = await tripService.getOpenPools(vehicleType);
        callback(null, { pools: openPools });
      } catch (error) {
        console.error('Error in GetOpenPools:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    AddFriendToPool: async (call: any, callback: any) => {
      try {
        const updatedPool = await tripService.addFriendToPool(call.request.pool_id, call.request.friend_unique_id, call.request.requesting_user_id);
        if (updatedPool) {
          callback(null, { pool: updatedPool });
        } else {
          callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Could not add friend to pool' });
        }
      } catch (error) {
        console.error('Error in AddFriendToPool:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
  });
  return server;
}

function serve() {
  const server = getServer();
  server.bindAsync(
    '0.0.0.0:50053',
    grpc.ServerCredentials.createInsecure(),
    (err: Error | null, port: number) => {
      if (err) {
        console.error(`Error starting gRPC server: ${err.message}`);
        return;
      }
      console.log(`gRPC Trip service listening on port ${port}`);
      server.start();
    }
  );
}

serve();