import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ProfileServiceService } from '../proto/profile_grpc_pb';
import { UserProfileResponse, UserProfile, CreateUserProfileRequest, GetUserProfileRequest, GetUserByUniqueIdRequest, AddFriendRequest } from '../proto/profile_pb';

const PROTO_PATH = __dirname + '../../../proto/profile.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const profileProto: any = grpc.loadPackageDefinition(packageDefinition).profile;

const client = new profileProto.ProfileService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

export const profileClient = client;
