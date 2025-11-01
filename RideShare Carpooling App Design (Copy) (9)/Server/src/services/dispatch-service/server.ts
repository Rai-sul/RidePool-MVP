import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as dispatchService from './dispatch.service';
import { Dispatch, DispatchStatus } from './dispatch.service'; // Import local types
import { Trip, Location, TripStatus, VehicleType } from '../trip-service/trip.service'; // Import Trip types

const PROTO_PATH = __dirname + '../../../proto/dispatch.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const dispatchProto: any = grpc.loadPackageDefinition(packageDefinition).dispatch;

function getServer(): grpc.Server {
  const server = new grpc.Server();
  server.addService(dispatchProto.DispatchService.service, {
    FindDriver: async (call: any, callback: any) => {
      try {
        const reqTrip = call.request.trip;
        const trip: Trip = {
          id: reqTrip.id,
          userId: reqTrip.user_id,
          driverId: reqTrip.driver_id || undefined,
          origin: {
            lat: reqTrip.origin.lat,
            lng: reqTrip.origin.lng,
            address: reqTrip.origin.address,
          },
          destination: {
            lat: reqTrip.destination.lat,
            lng: reqTrip.destination.lng,
            address: reqTrip.destination.address,
          },
          status: TripStatus[reqTrip.status as keyof typeof TripStatus],
          fare: reqTrip.fare,
          poolId: reqTrip.pool_id || undefined,
          passengers: reqTrip.passengers,
          vehicleType: VehicleType[reqTrip.vehicle_type as keyof typeof VehicleType] || undefined,
          maxPassengers: reqTrip.max_passengers || undefined,
          createdAt: reqTrip.created_at,
        };
        const dispatch = await dispatchService.findDriver(trip);
        if (dispatch) {
          callback(null, { dispatch });
        } else {
          callback({ code: grpc.status.NOT_FOUND, message: 'No available drivers' });
        }
      } catch (error) {
        console.error('Error in FindDriver:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
  });
  return server;
}

function serve() {
  const server = getServer();
  server.bindAsync(
    '0.0.0.0:50054',
    grpc.ServerCredentials.createInsecure(),
    (err: Error | null, port: number) => {
      if (err) {
        console.error(`Error starting gRPC server: ${err.message}`);
        return;
      }
      console.log(`gRPC Dispatch service listening on port ${port}`);
      server.start();
    }
  );
}

serve();