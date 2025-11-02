import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as pricingService from './pricing.service';
import { Price } from './pricing.service'; // Import local types
import { Trip, Location, TripStatus, VehicleType } from '../trip-service/trip.service'; // Import Trip types

const PROTO_PATH = __dirname + '../../../proto/pricing.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pricingProto: any = grpc.loadPackageDefinition(packageDefinition).pricing;

function getServer(): grpc.Server {
  const server = new grpc.Server();
  server.addService(pricingProto.PricingService.service, {
    CalculateFare: async (call: any, callback: any) => {
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
        const price = pricingService.calculateFare(trip);
        callback(null, { price });
      } catch (error) {
        console.error('Error in CalculateFare:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
  });
  return server;
}

function serve() {
  const server = getServer();
  server.bindAsync(
    '0.0.0.0:50055',
    grpc.ServerCredentials.createInsecure(),
    (err: Error | null, port: number) => {
      if (err) {
        console.error(`Error starting gRPC server: ${err.message}`);
        return;
      }
      console.log(`gRPC Pricing service listening on port ${port}`);
      server.start();
    }
  );
}

serve();