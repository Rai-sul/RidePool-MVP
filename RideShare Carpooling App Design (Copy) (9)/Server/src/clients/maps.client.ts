
import * as grpc from '@grpc/grpc-js';
import { MapsClient } from '../proto/maps_grpc_pb';

export const mapsClient = new MapsClient(
  process.env.MAPS_SERVICE_URL || 'localhost:50057',
  grpc.credentials.createInsecure()
);
