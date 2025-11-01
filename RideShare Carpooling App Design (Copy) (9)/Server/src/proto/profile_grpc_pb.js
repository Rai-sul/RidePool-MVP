// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var profile_pb = require('./profile_pb.js');

function serialize_profile_AddFriendRequest(arg) {
  if (!(arg instanceof profile_pb.AddFriendRequest)) {
    throw new Error('Expected argument of type profile.AddFriendRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_profile_AddFriendRequest(buffer_arg) {
  return profile_pb.AddFriendRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_profile_CreateUserProfileRequest(arg) {
  if (!(arg instanceof profile_pb.CreateUserProfileRequest)) {
    throw new Error('Expected argument of type profile.CreateUserProfileRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_profile_CreateUserProfileRequest(buffer_arg) {
  return profile_pb.CreateUserProfileRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_profile_GetUserByUniqueIdRequest(arg) {
  if (!(arg instanceof profile_pb.GetUserByUniqueIdRequest)) {
    throw new Error('Expected argument of type profile.GetUserByUniqueIdRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_profile_GetUserByUniqueIdRequest(buffer_arg) {
  return profile_pb.GetUserByUniqueIdRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_profile_GetUserProfileRequest(arg) {
  if (!(arg instanceof profile_pb.GetUserProfileRequest)) {
    throw new Error('Expected argument of type profile.GetUserProfileRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_profile_GetUserProfileRequest(buffer_arg) {
  return profile_pb.GetUserProfileRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_profile_UserProfileResponse(arg) {
  if (!(arg instanceof profile_pb.UserProfileResponse)) {
    throw new Error('Expected argument of type profile.UserProfileResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_profile_UserProfileResponse(buffer_arg) {
  return profile_pb.UserProfileResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var ProfileServiceService = exports.ProfileServiceService = {
  createUserProfile: {
    path: '/profile.ProfileService/CreateUserProfile',
    requestStream: false,
    responseStream: false,
    requestType: profile_pb.CreateUserProfileRequest,
    responseType: profile_pb.UserProfileResponse,
    requestSerialize: serialize_profile_CreateUserProfileRequest,
    requestDeserialize: deserialize_profile_CreateUserProfileRequest,
    responseSerialize: serialize_profile_UserProfileResponse,
    responseDeserialize: deserialize_profile_UserProfileResponse,
  },
  getUserProfile: {
    path: '/profile.ProfileService/GetUserProfile',
    requestStream: false,
    responseStream: false,
    requestType: profile_pb.GetUserProfileRequest,
    responseType: profile_pb.UserProfileResponse,
    requestSerialize: serialize_profile_GetUserProfileRequest,
    requestDeserialize: deserialize_profile_GetUserProfileRequest,
    responseSerialize: serialize_profile_UserProfileResponse,
    responseDeserialize: deserialize_profile_UserProfileResponse,
  },
  getUserByUniqueId: {
    path: '/profile.ProfileService/GetUserByUniqueId',
    requestStream: false,
    responseStream: false,
    requestType: profile_pb.GetUserByUniqueIdRequest,
    responseType: profile_pb.UserProfileResponse,
    requestSerialize: serialize_profile_GetUserByUniqueIdRequest,
    requestDeserialize: deserialize_profile_GetUserByUniqueIdRequest,
    responseSerialize: serialize_profile_UserProfileResponse,
    responseDeserialize: deserialize_profile_UserProfileResponse,
  },
  addFriend: {
    path: '/profile.ProfileService/AddFriend',
    requestStream: false,
    responseStream: false,
    requestType: profile_pb.AddFriendRequest,
    responseType: profile_pb.UserProfileResponse,
    requestSerialize: serialize_profile_AddFriendRequest,
    requestDeserialize: deserialize_profile_AddFriendRequest,
    responseSerialize: serialize_profile_UserProfileResponse,
    responseDeserialize: deserialize_profile_UserProfileResponse,
  },
};

exports.ProfileServiceClient = grpc.makeGenericClientConstructor(ProfileServiceService, 'ProfileService');
