import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as profileService from './profile.service';
import { UserProfile } from './profile.service'; // Import local UserProfile

const PROTO_PATH = __dirname + '../../../proto/profile.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const profileProto: any = grpc.loadPackageDefinition(packageDefinition).profile;

function getServer(): grpc.Server {
  const server = new grpc.Server();
  server.addService(profileProto.ProfileService.service, {
    CreateUserProfile: async (call: any, callback: any) => {
      try {
        const reqProfile = call.request.profile;
        const userProfile = await profileService.createUserProfile({
          id: reqProfile.id,
          uniqueId: reqProfile.unique_id,
          name: reqProfile.name,
          email: reqProfile.email,
          phoneNumber: reqProfile.phone_number,
          avatarUrl: reqProfile.avatar_url,
          friends: reqProfile.friends,
        });
        callback(null, { profile: userProfile });
      } catch (error) {
        console.error('Error in CreateUserProfile:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    GetUserProfile: async (call: any, callback: any) => {
      try {
        const userProfile = await profileService.getUserProfile(call.request.id);
        if (userProfile) {
          callback(null, { profile: userProfile });
        } else {
          callback({ code: grpc.status.NOT_FOUND, message: 'Profile not found' });
        }
      } catch (error) {
        console.error('Error in GetUserProfile:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    GetUserByUniqueId: async (call: any, callback: any) => {
      try {
        const userProfile = await profileService.getUserByUniqueId(call.request.unique_id);
        if (userProfile) {
          callback(null, { profile: userProfile });
        } else {
          callback({ code: grpc.status.NOT_FOUND, message: 'Profile not found' });
        }
      } catch (error) {
        console.error('Error in GetUserByUniqueId:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
    AddFriend: async (call: any, callback: any) => {
      try {
        const updatedUser = await profileService.addFriend(call.request.user_id, call.request.friend_unique_id);
        if (updatedUser) {
          callback(null, { profile: updatedUser });
        } else {
          callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Could not add friend' });
        }
      } catch (error) {
        console.error('Error in AddFriend:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
      }
    },
  });
  return server;
}

function serve() {
  const server = getServer();
  server.bindAsync(
    '0.0.0.0:50051',
    grpc.ServerCredentials.createInsecure(),
    (err: Error | null, port: number) => {
      if (err) {
        console.error(`Error starting gRPC server: ${err.message}`);
        return;
      }
      console.log(`gRPC Profile service listening on port ${port}`);
      server.start();
    }
  );
}

serve();
