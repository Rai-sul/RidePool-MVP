import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as paymentService from './payment.service';
import { Payment, PaymentStatus } from './payment.service'; // Import local types

const PROTO_PATH = __dirname + '../../../proto/payment.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const paymentProto: any = grpc.loadPackageDefinition(packageDefinition).payment;

function getServer(): grpc.Server {
  const server = new grpc.Server();
  server.addService(paymentProto.PaymentService.service, {
    InitiatePayment: async (call: any, callback: any) => {
      try {
        const { userId, tripId, amount, currency } = call.request;
        const result = await paymentService.initiatePayment(userId, tripId, amount, currency);
        if (result) {
          callback(null, { paymentUrl: result.paymentUrl, transactionId: result.transactionId });
        } else {
          callback({ code: grpc.status.INTERNAL, message: 'Payment initiation failed' });
        }
      } catch (error) {
        console.error('Error in InitiatePayment:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    HandlePaymentCallback: async (call: any, callback: any) => {
      try {
        const { transactionId, status, gatewayResponse } = call.request;
        const payment = await paymentService.handlePaymentCallback(transactionId, status, gatewayResponse);
        callback(null, { payment });
      } catch (error) {
        console.error('Error in HandlePaymentCallback:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
  });
  return server;
}

function serve() {
  const server = getServer();
  server.bindAsync(
    '0.0.0.0:50056',
    grpc.ServerCredentials.createInsecure(),
    (err: Error | null, port: number) => {
      if (err) {
        console.error(`Error starting gRPC server: ${err.message}`);
        return;
      }
      console.log(`gRPC Payment service listening on port ${port}`);
      server.start();
    }
  );
}

serve();