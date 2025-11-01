import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = __dirname + '../../../proto/dispatch.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const dispatchProto: any = grpc.loadPackageDefinition(packageDefinition).dispatch;

const client = new dispatchProto.DispatchService(
  'localhost:50054',
  grpc.credentials.createInsecure()
);

export const dispatchClient = client;
