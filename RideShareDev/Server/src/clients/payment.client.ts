import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = __dirname + '../../../proto/payment.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const paymentProto: any = grpc.loadPackageDefinition(packageDefinition).payment;

const client = new paymentProto.PaymentService(
  'localhost:50056',
  grpc.credentials.createInsecure()
);

export const paymentClient = client;
