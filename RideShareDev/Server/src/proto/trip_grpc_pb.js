// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var trip_pb = require('./trip_pb.js');

function serialize_trip_AddFriendToPoolRequest(arg) {
  if (!(arg instanceof trip_pb.AddFriendToPoolRequest)) {
    throw new Error('Expected argument of type trip.AddFriendToPoolRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_AddFriendToPoolRequest(buffer_arg) {
  return trip_pb.AddFriendToPoolRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_trip_CreateTripRequest(arg) {
  if (!(arg instanceof trip_pb.CreateTripRequest)) {
    throw new Error('Expected argument of type trip.CreateTripRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_CreateTripRequest(buffer_arg) {
  return trip_pb.CreateTripRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_trip_GetOpenPoolsRequest(arg) {
  if (!(arg instanceof trip_pb.GetOpenPoolsRequest)) {
    throw new Error('Expected argument of type trip.GetOpenPoolsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_GetOpenPoolsRequest(buffer_arg) {
  return trip_pb.GetOpenPoolsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_trip_GetPoolRequest(arg) {
  if (!(arg instanceof trip_pb.GetPoolRequest)) {
    throw new Error('Expected argument of type trip.GetPoolRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_GetPoolRequest(buffer_arg) {
  return trip_pb.GetPoolRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_trip_GetTripRequest(arg) {
  if (!(arg instanceof trip_pb.GetTripRequest)) {
    throw new Error('Expected argument of type trip.GetTripRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_GetTripRequest(buffer_arg) {
  return trip_pb.GetTripRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_trip_JoinPoolRequest(arg) {
  if (!(arg instanceof trip_pb.JoinPoolRequest)) {
    throw new Error('Expected argument of type trip.JoinPoolRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_JoinPoolRequest(buffer_arg) {
  return trip_pb.JoinPoolRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_trip_LeavePoolRequest(arg) {
  if (!(arg instanceof trip_pb.LeavePoolRequest)) {
    throw new Error('Expected argument of type trip.LeavePoolRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_LeavePoolRequest(buffer_arg) {
  return trip_pb.LeavePoolRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_trip_OpenPoolsResponse(arg) {
  if (!(arg instanceof trip_pb.OpenPoolsResponse)) {
    throw new Error('Expected argument of type trip.OpenPoolsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_OpenPoolsResponse(buffer_arg) {
  return trip_pb.OpenPoolsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_trip_PoolResponse(arg) {
  if (!(arg instanceof trip_pb.PoolResponse)) {
    throw new Error('Expected argument of type trip.PoolResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_PoolResponse(buffer_arg) {
  return trip_pb.PoolResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_trip_TripResponse(arg) {
  if (!(arg instanceof trip_pb.TripResponse)) {
    throw new Error('Expected argument of type trip.TripResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_trip_TripResponse(buffer_arg) {
  return trip_pb.TripResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var TripServiceService = exports.TripServiceService = {
  createTrip: {
    path: '/trip.TripService/CreateTrip',
    requestStream: false,
    responseStream: false,
    requestType: trip_pb.CreateTripRequest,
    responseType: trip_pb.TripResponse,
    requestSerialize: serialize_trip_CreateTripRequest,
    requestDeserialize: deserialize_trip_CreateTripRequest,
    responseSerialize: serialize_trip_TripResponse,
    responseDeserialize: deserialize_trip_TripResponse,
  },
  getTrip: {
    path: '/trip.TripService/GetTrip',
    requestStream: false,
    responseStream: false,
    requestType: trip_pb.GetTripRequest,
    responseType: trip_pb.TripResponse,
    requestSerialize: serialize_trip_GetTripRequest,
    requestDeserialize: deserialize_trip_GetTripRequest,
    responseSerialize: serialize_trip_TripResponse,
    responseDeserialize: deserialize_trip_TripResponse,
  },
  getPool: {
    path: '/trip.TripService/GetPool',
    requestStream: false,
    responseStream: false,
    requestType: trip_pb.GetPoolRequest,
    responseType: trip_pb.PoolResponse,
    requestSerialize: serialize_trip_GetPoolRequest,
    requestDeserialize: deserialize_trip_GetPoolRequest,
    responseSerialize: serialize_trip_PoolResponse,
    responseDeserialize: deserialize_trip_PoolResponse,
  },
  joinPool: {
    path: '/trip.TripService/JoinPool',
    requestStream: false,
    responseStream: false,
    requestType: trip_pb.JoinPoolRequest,
    responseType: trip_pb.PoolResponse,
    requestSerialize: serialize_trip_JoinPoolRequest,
    requestDeserialize: deserialize_trip_JoinPoolRequest,
    responseSerialize: serialize_trip_PoolResponse,
    responseDeserialize: deserialize_trip_PoolResponse,
  },
  leavePool: {
    path: '/trip.TripService/LeavePool',
    requestStream: false,
    responseStream: false,
    requestType: trip_pb.LeavePoolRequest,
    responseType: trip_pb.PoolResponse,
    requestSerialize: serialize_trip_LeavePoolRequest,
    requestDeserialize: deserialize_trip_LeavePoolRequest,
    responseSerialize: serialize_trip_PoolResponse,
    responseDeserialize: deserialize_trip_PoolResponse,
  },
  getOpenPools: {
    path: '/trip.TripService/GetOpenPools',
    requestStream: false,
    responseStream: false,
    requestType: trip_pb.GetOpenPoolsRequest,
    responseType: trip_pb.OpenPoolsResponse,
    requestSerialize: serialize_trip_GetOpenPoolsRequest,
    requestDeserialize: deserialize_trip_GetOpenPoolsRequest,
    responseSerialize: serialize_trip_OpenPoolsResponse,
    responseDeserialize: deserialize_trip_OpenPoolsResponse,
  },
  addFriendToPool: {
    path: '/trip.TripService/AddFriendToPool',
    requestStream: false,
    responseStream: false,
    requestType: trip_pb.AddFriendToPoolRequest,
    responseType: trip_pb.PoolResponse,
    requestSerialize: serialize_trip_AddFriendToPoolRequest,
    requestDeserialize: deserialize_trip_AddFriendToPoolRequest,
    responseSerialize: serialize_trip_PoolResponse,
    responseDeserialize: deserialize_trip_PoolResponse,
  },
};

exports.TripServiceClient = grpc.makeGenericClientConstructor(TripServiceService, 'TripService');
