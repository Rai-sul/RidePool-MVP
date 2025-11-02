import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = __dirname + '../../../proto/auth.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto: any = grpc.loadPackageDefinition(packageDefinition).auth;

const client = new authProto.AuthService(
  'localhost:50052',
  grpc.credentials.createInsecure()
);

export const authClient = client;
