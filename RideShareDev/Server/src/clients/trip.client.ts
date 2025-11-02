import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = __dirname + '../../../proto/trip.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const tripProto: any = grpc.loadPackageDefinition(packageDefinition).trip;

const client = new tripProto.TripService(
  'localhost:50053',
  grpc.credentials.createInsecure()
);

export const tripClient = client;
