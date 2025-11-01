// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var pricing_pb = require('./pricing_pb.js');
var trip_pb = require('./trip_pb.js');

function serialize_pricing_CalculateFareRequest(arg) {
  if (!(arg instanceof pricing_pb.CalculateFareRequest)) {
    throw new Error('Expected argument of type pricing.CalculateFareRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pricing_CalculateFareRequest(buffer_arg) {
  return pricing_pb.CalculateFareRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pricing_CalculateFareResponse(arg) {
  if (!(arg instanceof pricing_pb.CalculateFareResponse)) {
    throw new Error('Expected argument of type pricing.CalculateFareResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pricing_CalculateFareResponse(buffer_arg) {
  return pricing_pb.CalculateFareResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var PricingServiceService = exports.PricingServiceService = {
  calculateFare: {
    path: '/pricing.PricingService/CalculateFare',
    requestStream: false,
    responseStream: false,
    requestType: pricing_pb.CalculateFareRequest,
    responseType: pricing_pb.CalculateFareResponse,
    requestSerialize: serialize_pricing_CalculateFareRequest,
    requestDeserialize: deserialize_pricing_CalculateFareRequest,
    responseSerialize: serialize_pricing_CalculateFareResponse,
    responseDeserialize: deserialize_pricing_CalculateFareResponse,
  },
};

exports.PricingServiceClient = grpc.makeGenericClientConstructor(PricingServiceService, 'PricingService');
