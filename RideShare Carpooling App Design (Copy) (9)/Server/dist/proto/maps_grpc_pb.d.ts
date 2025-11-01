// package: maps
// file: maps.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as maps_pb from "./maps_pb";

interface IMapsService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    geocode: IMapsService_IGeocode;
    reverseGeocode: IMapsService_IReverseGeocode;
    getRoute: IMapsService_IGetRoute;
}

interface IMapsService_IGeocode extends grpc.MethodDefinition<maps_pb.GeocodeRequest, maps_pb.GeocodeResponse> {
    path: "/maps.Maps/Geocode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<maps_pb.GeocodeRequest>;
    requestDeserialize: grpc.deserialize<maps_pb.GeocodeRequest>;
    responseSerialize: grpc.serialize<maps_pb.GeocodeResponse>;
    responseDeserialize: grpc.deserialize<maps_pb.GeocodeResponse>;
}
interface IMapsService_IReverseGeocode extends grpc.MethodDefinition<maps_pb.ReverseGeocodeRequest, maps_pb.ReverseGeocodeResponse> {
    path: "/maps.Maps/ReverseGeocode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<maps_pb.ReverseGeocodeRequest>;
    requestDeserialize: grpc.deserialize<maps_pb.ReverseGeocodeRequest>;
    responseSerialize: grpc.serialize<maps_pb.ReverseGeocodeResponse>;
    responseDeserialize: grpc.deserialize<maps_pb.ReverseGeocodeResponse>;
}
interface IMapsService_IGetRoute extends grpc.MethodDefinition<maps_pb.GetRouteRequest, maps_pb.GetRouteResponse> {
    path: "/maps.Maps/GetRoute";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<maps_pb.GetRouteRequest>;
    requestDeserialize: grpc.deserialize<maps_pb.GetRouteRequest>;
    responseSerialize: grpc.serialize<maps_pb.GetRouteResponse>;
    responseDeserialize: grpc.deserialize<maps_pb.GetRouteResponse>;
}

export const MapsService: IMapsService;

export interface IMapsServer extends grpc.UntypedServiceImplementation {
    geocode: grpc.handleUnaryCall<maps_pb.GeocodeRequest, maps_pb.GeocodeResponse>;
    reverseGeocode: grpc.handleUnaryCall<maps_pb.ReverseGeocodeRequest, maps_pb.ReverseGeocodeResponse>;
    getRoute: grpc.handleUnaryCall<maps_pb.GetRouteRequest, maps_pb.GetRouteResponse>;
}

export interface IMapsClient {
    geocode(request: maps_pb.GeocodeRequest, callback: (error: grpc.ServiceError | null, response: maps_pb.GeocodeResponse) => void): grpc.ClientUnaryCall;
    geocode(request: maps_pb.GeocodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: maps_pb.GeocodeResponse) => void): grpc.ClientUnaryCall;
    geocode(request: maps_pb.GeocodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: maps_pb.GeocodeResponse) => void): grpc.ClientUnaryCall;
    reverseGeocode(request: maps_pb.ReverseGeocodeRequest, callback: (error: grpc.ServiceError | null, response: maps_pb.ReverseGeocodeResponse) => void): grpc.ClientUnaryCall;
    reverseGeocode(request: maps_pb.ReverseGeocodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: maps_pb.ReverseGeocodeResponse) => void): grpc.ClientUnaryCall;
    reverseGeocode(request: maps_pb.ReverseGeocodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: maps_pb.ReverseGeocodeResponse) => void): grpc.ClientUnaryCall;
    getRoute(request: maps_pb.GetRouteRequest, callback: (error: grpc.ServiceError | null, response: maps_pb.GetRouteResponse) => void): grpc.ClientUnaryCall;
    getRoute(request: maps_pb.GetRouteRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: maps_pb.GetRouteResponse) => void): grpc.ClientUnaryCall;
    getRoute(request: maps_pb.GetRouteRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: maps_pb.GetRouteResponse) => void): grpc.ClientUnaryCall;
}

export class MapsClient extends grpc.Client implements IMapsClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public geocode(request: maps_pb.GeocodeRequest, callback: (error: grpc.ServiceError | null, response: maps_pb.GeocodeResponse) => void): grpc.ClientUnaryCall;
    public geocode(request: maps_pb.GeocodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: maps_pb.GeocodeResponse) => void): grpc.ClientUnaryCall;
    public geocode(request: maps_pb.GeocodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: maps_pb.GeocodeResponse) => void): grpc.ClientUnaryCall;
    public reverseGeocode(request: maps_pb.ReverseGeocodeRequest, callback: (error: grpc.ServiceError | null, response: maps_pb.ReverseGeocodeResponse) => void): grpc.ClientUnaryCall;
    public reverseGeocode(request: maps_pb.ReverseGeocodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: maps_pb.ReverseGeocodeResponse) => void): grpc.ClientUnaryCall;
    public reverseGeocode(request: maps_pb.ReverseGeocodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: maps_pb.ReverseGeocodeResponse) => void): grpc.ClientUnaryCall;
    public getRoute(request: maps_pb.GetRouteRequest, callback: (error: grpc.ServiceError | null, response: maps_pb.GetRouteResponse) => void): grpc.ClientUnaryCall;
    public getRoute(request: maps_pb.GetRouteRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: maps_pb.GetRouteResponse) => void): grpc.ClientUnaryCall;
    public getRoute(request: maps_pb.GetRouteRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: maps_pb.GetRouteResponse) => void): grpc.ClientUnaryCall;
}
