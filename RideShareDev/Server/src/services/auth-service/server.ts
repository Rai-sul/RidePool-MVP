import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as authService from './auth.service';
import { User } from './auth.service'; // Import local User

const PROTO_PATH = __dirname + '../../../proto/auth.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto: any = grpc.loadPackageDefinition(packageDefinition).auth;

function getServer(): grpc.Server {
  const server = new grpc.Server();
  server.addService(authProto.AuthService.service, {
    Register: async (call: any, callback: any) => {
      try {
        const newUser = await authService.register(call.request.email, call.request.password);
        callback(null, { user: newUser });
      } catch (error) {
        console.error('Error in Register:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    Login: async (call: any, callback: any) => {
      try {
        const loggedInUser = await authService.login(call.request.email, call.request.password);
        if (loggedInUser) {
          callback(null, { user: loggedInUser });
        } else {
          callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid credentials' });
        }
      } catch (error) {
        console.error('Error in Login:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
  });
  return server;
}

function serve() {
  const server = getServer();
  server.bindAsync(
    '0.0.0.0:50052',
    grpc.ServerCredentials.createInsecure(),
    (err: Error | null, port: number) => {
      if (err) {
        console.error(`Error starting gRPC server: ${err.message}`);
        return;
      }
      console.log(`gRPC Auth service listening on port ${port}`);
      server.start();
    }
  );
}

serve();