// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var maps_pb = require('./maps_pb.js');

function serialize_maps_GeocodeRequest(arg) {
  if (!(arg instanceof maps_pb.GeocodeRequest)) {
    throw new Error('Expected argument of type maps.GeocodeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_maps_GeocodeRequest(buffer_arg) {
  return maps_pb.GeocodeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_maps_GeocodeResponse(arg) {
  if (!(arg instanceof maps_pb.GeocodeResponse)) {
    throw new Error('Expected argument of type maps.GeocodeResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_maps_GeocodeResponse(buffer_arg) {
  return maps_pb.GeocodeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_maps_GetRouteRequest(arg) {
  if (!(arg instanceof maps_pb.GetRouteRequest)) {
    throw new Error('Expected argument of type maps.GetRouteRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_maps_GetRouteRequest(buffer_arg) {
  return maps_pb.GetRouteRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_maps_GetRouteResponse(arg) {
  if (!(arg instanceof maps_pb.GetRouteResponse)) {
    throw new Error('Expected argument of type maps.GetRouteResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_maps_GetRouteResponse(buffer_arg) {
  return maps_pb.GetRouteResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_maps_ReverseGeocodeRequest(arg) {
  if (!(arg instanceof maps_pb.ReverseGeocodeRequest)) {
    throw new Error('Expected argument of type maps.ReverseGeocodeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_maps_ReverseGeocodeRequest(buffer_arg) {
  return maps_pb.ReverseGeocodeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_maps_ReverseGeocodeResponse(arg) {
  if (!(arg instanceof maps_pb.ReverseGeocodeResponse)) {
    throw new Error('Expected argument of type maps.ReverseGeocodeResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_maps_ReverseGeocodeResponse(buffer_arg) {
  return maps_pb.ReverseGeocodeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var MapsService = exports.MapsService = {
  geocode: {
    path: '/maps.Maps/Geocode',
    requestStream: false,
    responseStream: false,
    requestType: maps_pb.GeocodeRequest,
    responseType: maps_pb.GeocodeResponse,
    requestSerialize: serialize_maps_GeocodeRequest,
    requestDeserialize: deserialize_maps_GeocodeRequest,
    responseSerialize: serialize_maps_GeocodeResponse,
    responseDeserialize: deserialize_maps_GeocodeResponse,
  },
  reverseGeocode: {
    path: '/maps.Maps/ReverseGeocode',
    requestStream: false,
    responseStream: false,
    requestType: maps_pb.ReverseGeocodeRequest,
    responseType: maps_pb.ReverseGeocodeResponse,
    requestSerialize: serialize_maps_ReverseGeocodeRequest,
    requestDeserialize: deserialize_maps_ReverseGeocodeRequest,
    responseSerialize: serialize_maps_ReverseGeocodeResponse,
    responseDeserialize: deserialize_maps_ReverseGeocodeResponse,
  },
  getRoute: {
    path: '/maps.Maps/GetRoute',
    requestStream: false,
    responseStream: false,
    requestType: maps_pb.GetRouteRequest,
    responseType: maps_pb.GetRouteResponse,
    requestSerialize: serialize_maps_GetRouteRequest,
    requestDeserialize: deserialize_maps_GetRouteRequest,
    responseSerialize: serialize_maps_GetRouteResponse,
    responseDeserialize: deserialize_maps_GetRouteResponse,
  },
};

exports.MapsClient = grpc.makeGenericClientConstructor(MapsService, 'Maps');
