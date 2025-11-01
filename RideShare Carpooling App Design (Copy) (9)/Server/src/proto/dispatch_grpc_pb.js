// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var dispatch_pb = require('./dispatch_pb.js');
var trip_pb = require('./trip_pb.js');

function serialize_dispatch_FindDriverRequest(arg) {
  if (!(arg instanceof dispatch_pb.FindDriverRequest)) {
    throw new Error('Expected argument of type dispatch.FindDriverRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_dispatch_FindDriverRequest(buffer_arg) {
  return dispatch_pb.FindDriverRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_dispatch_FindDriverResponse(arg) {
  if (!(arg instanceof dispatch_pb.FindDriverResponse)) {
    throw new Error('Expected argument of type dispatch.FindDriverResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_dispatch_FindDriverResponse(buffer_arg) {
  return dispatch_pb.FindDriverResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var DispatchServiceService = exports.DispatchServiceService = {
  findDriver: {
    path: '/dispatch.DispatchService/FindDriver',
    requestStream: false,
    responseStream: false,
    requestType: dispatch_pb.FindDriverRequest,
    responseType: dispatch_pb.FindDriverResponse,
    requestSerialize: serialize_dispatch_FindDriverRequest,
    requestDeserialize: deserialize_dispatch_FindDriverRequest,
    responseSerialize: serialize_dispatch_FindDriverResponse,
    responseDeserialize: deserialize_dispatch_FindDriverResponse,
  },
};

exports.DispatchServiceClient = grpc.makeGenericClientConstructor(DispatchServiceService, 'DispatchService');
