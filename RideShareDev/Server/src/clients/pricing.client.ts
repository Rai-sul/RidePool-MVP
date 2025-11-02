import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = __dirname + '../../../proto/pricing.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pricingProto: any = grpc.loadPackageDefinition(packageDefinition).pricing;

const client = new pricingProto.PricingService(
  'localhost:50055',
  grpc.credentials.createInsecure()
);

export const pricingClient = client;