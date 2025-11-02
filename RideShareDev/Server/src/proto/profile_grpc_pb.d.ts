// package: profile
// file: profile.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as profile_pb from "./profile_pb";

interface IProfileServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    createUserProfile: IProfileServiceService_ICreateUserProfile;
    getUserProfile: IProfileServiceService_IGetUserProfile;
    getUserByUniqueId: IProfileServiceService_IGetUserByUniqueId;
    addFriend: IProfileServiceService_IAddFriend;
}

interface IProfileServiceService_ICreateUserProfile extends grpc.MethodDefinition<profile_pb.CreateUserProfileRequest, profile_pb.UserProfileResponse> {
    path: "/profile.ProfileService/CreateUserProfile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<profile_pb.CreateUserProfileRequest>;
    requestDeserialize: grpc.deserialize<profile_pb.CreateUserProfileRequest>;
    responseSerialize: grpc.serialize<profile_pb.UserProfileResponse>;
    responseDeserialize: grpc.deserialize<profile_pb.UserProfileResponse>;
}
interface IProfileServiceService_IGetUserProfile extends grpc.MethodDefinition<profile_pb.GetUserProfileRequest, profile_pb.UserProfileResponse> {
    path: "/profile.ProfileService/GetUserProfile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<profile_pb.GetUserProfileRequest>;
    requestDeserialize: grpc.deserialize<profile_pb.GetUserProfileRequest>;
    responseSerialize: grpc.serialize<profile_pb.UserProfileResponse>;
    responseDeserialize: grpc.deserialize<profile_pb.UserProfileResponse>;
}
interface IProfileServiceService_IGetUserByUniqueId extends grpc.MethodDefinition<profile_pb.GetUserByUniqueIdRequest, profile_pb.UserProfileResponse> {
    path: "/profile.ProfileService/GetUserByUniqueId";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<profile_pb.GetUserByUniqueIdRequest>;
    requestDeserialize: grpc.deserialize<profile_pb.GetUserByUniqueIdRequest>;
    responseSerialize: grpc.serialize<profile_pb.UserProfileResponse>;
    responseDeserialize: grpc.deserialize<profile_pb.UserProfileResponse>;
}
interface IProfileServiceService_IAddFriend extends grpc.MethodDefinition<profile_pb.AddFriendRequest, profile_pb.UserProfileResponse> {
    path: "/profile.ProfileService/AddFriend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<profile_pb.AddFriendRequest>;
    requestDeserialize: grpc.deserialize<profile_pb.AddFriendRequest>;
    responseSerialize: grpc.serialize<profile_pb.UserProfileResponse>;
    responseDeserialize: grpc.deserialize<profile_pb.UserProfileResponse>;
}

export const ProfileServiceService: IProfileServiceService;

export interface IProfileServiceServer extends grpc.UntypedServiceImplementation {
    createUserProfile: grpc.handleUnaryCall<profile_pb.CreateUserProfileRequest, profile_pb.UserProfileResponse>;
    getUserProfile: grpc.handleUnaryCall<profile_pb.GetUserProfileRequest, profile_pb.UserProfileResponse>;
    getUserByUniqueId: grpc.handleUnaryCall<profile_pb.GetUserByUniqueIdRequest, profile_pb.UserProfileResponse>;
    addFriend: grpc.handleUnaryCall<profile_pb.AddFriendRequest, profile_pb.UserProfileResponse>;
}

export interface IProfileServiceClient {
    createUserProfile(request: profile_pb.CreateUserProfileRequest, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    createUserProfile(request: profile_pb.CreateUserProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    createUserProfile(request: profile_pb.CreateUserProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    getUserProfile(request: profile_pb.GetUserProfileRequest, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    getUserProfile(request: profile_pb.GetUserProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    getUserProfile(request: profile_pb.GetUserProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    getUserByUniqueId(request: profile_pb.GetUserByUniqueIdRequest, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    getUserByUniqueId(request: profile_pb.GetUserByUniqueIdRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    getUserByUniqueId(request: profile_pb.GetUserByUniqueIdRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    addFriend(request: profile_pb.AddFriendRequest, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    addFriend(request: profile_pb.AddFriendRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    addFriend(request: profile_pb.AddFriendRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
}

export class ProfileServiceClient extends grpc.Client implements IProfileServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public createUserProfile(request: profile_pb.CreateUserProfileRequest, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public createUserProfile(request: profile_pb.CreateUserProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public createUserProfile(request: profile_pb.CreateUserProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public getUserProfile(request: profile_pb.GetUserProfileRequest, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public getUserProfile(request: profile_pb.GetUserProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public getUserProfile(request: profile_pb.GetUserProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public getUserByUniqueId(request: profile_pb.GetUserByUniqueIdRequest, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public getUserByUniqueId(request: profile_pb.GetUserByUniqueIdRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public getUserByUniqueId(request: profile_pb.GetUserByUniqueIdRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public addFriend(request: profile_pb.AddFriendRequest, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public addFriend(request: profile_pb.AddFriendRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
    public addFriend(request: profile_pb.AddFriendRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: profile_pb.UserProfileResponse) => void): grpc.ClientUnaryCall;
}
