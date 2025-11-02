// package: trip
// file: trip.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as trip_pb from "./trip_pb";

interface ITripServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    createTrip: ITripServiceService_ICreateTrip;
    getTrip: ITripServiceService_IGetTrip;
    getPool: ITripServiceService_IGetPool;
    joinPool: ITripServiceService_IJoinPool;
    leavePool: ITripServiceService_ILeavePool;
    getOpenPools: ITripServiceService_IGetOpenPools;
    addFriendToPool: ITripServiceService_IAddFriendToPool;
}

interface ITripServiceService_ICreateTrip extends grpc.MethodDefinition<trip_pb.CreateTripRequest, trip_pb.TripResponse> {
    path: "/trip.TripService/CreateTrip";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<trip_pb.CreateTripRequest>;
    requestDeserialize: grpc.deserialize<trip_pb.CreateTripRequest>;
    responseSerialize: grpc.serialize<trip_pb.TripResponse>;
    responseDeserialize: grpc.deserialize<trip_pb.TripResponse>;
}
interface ITripServiceService_IGetTrip extends grpc.MethodDefinition<trip_pb.GetTripRequest, trip_pb.TripResponse> {
    path: "/trip.TripService/GetTrip";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<trip_pb.GetTripRequest>;
    requestDeserialize: grpc.deserialize<trip_pb.GetTripRequest>;
    responseSerialize: grpc.serialize<trip_pb.TripResponse>;
    responseDeserialize: grpc.deserialize<trip_pb.TripResponse>;
}
interface ITripServiceService_IGetPool extends grpc.MethodDefinition<trip_pb.GetPoolRequest, trip_pb.PoolResponse> {
    path: "/trip.TripService/GetPool";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<trip_pb.GetPoolRequest>;
    requestDeserialize: grpc.deserialize<trip_pb.GetPoolRequest>;
    responseSerialize: grpc.serialize<trip_pb.PoolResponse>;
    responseDeserialize: grpc.deserialize<trip_pb.PoolResponse>;
}
interface ITripServiceService_IJoinPool extends grpc.MethodDefinition<trip_pb.JoinPoolRequest, trip_pb.PoolResponse> {
    path: "/trip.TripService/JoinPool";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<trip_pb.JoinPoolRequest>;
    requestDeserialize: grpc.deserialize<trip_pb.JoinPoolRequest>;
    responseSerialize: grpc.serialize<trip_pb.PoolResponse>;
    responseDeserialize: grpc.deserialize<trip_pb.PoolResponse>;
}
interface ITripServiceService_ILeavePool extends grpc.MethodDefinition<trip_pb.LeavePoolRequest, trip_pb.PoolResponse> {
    path: "/trip.TripService/LeavePool";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<trip_pb.LeavePoolRequest>;
    requestDeserialize: grpc.deserialize<trip_pb.LeavePoolRequest>;
    responseSerialize: grpc.serialize<trip_pb.PoolResponse>;
    responseDeserialize: grpc.deserialize<trip_pb.PoolResponse>;
}
interface ITripServiceService_IGetOpenPools extends grpc.MethodDefinition<trip_pb.GetOpenPoolsRequest, trip_pb.OpenPoolsResponse> {
    path: "/trip.TripService/GetOpenPools";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<trip_pb.GetOpenPoolsRequest>;
    requestDeserialize: grpc.deserialize<trip_pb.GetOpenPoolsRequest>;
    responseSerialize: grpc.serialize<trip_pb.OpenPoolsResponse>;
    responseDeserialize: grpc.deserialize<trip_pb.OpenPoolsResponse>;
}
interface ITripServiceService_IAddFriendToPool extends grpc.MethodDefinition<trip_pb.AddFriendToPoolRequest, trip_pb.PoolResponse> {
    path: "/trip.TripService/AddFriendToPool";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<trip_pb.AddFriendToPoolRequest>;
    requestDeserialize: grpc.deserialize<trip_pb.AddFriendToPoolRequest>;
    responseSerialize: grpc.serialize<trip_pb.PoolResponse>;
    responseDeserialize: grpc.deserialize<trip_pb.PoolResponse>;
}

export const TripServiceService: ITripServiceService;

export interface ITripServiceServer extends grpc.UntypedServiceImplementation {
    createTrip: grpc.handleUnaryCall<trip_pb.CreateTripRequest, trip_pb.TripResponse>;
    getTrip: grpc.handleUnaryCall<trip_pb.GetTripRequest, trip_pb.TripResponse>;
    getPool: grpc.handleUnaryCall<trip_pb.GetPoolRequest, trip_pb.PoolResponse>;
    joinPool: grpc.handleUnaryCall<trip_pb.JoinPoolRequest, trip_pb.PoolResponse>;
    leavePool: grpc.handleUnaryCall<trip_pb.LeavePoolRequest, trip_pb.PoolResponse>;
    getOpenPools: grpc.handleUnaryCall<trip_pb.GetOpenPoolsRequest, trip_pb.OpenPoolsResponse>;
    addFriendToPool: grpc.handleUnaryCall<trip_pb.AddFriendToPoolRequest, trip_pb.PoolResponse>;
}

export interface ITripServiceClient {
    createTrip(request: trip_pb.CreateTripRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    createTrip(request: trip_pb.CreateTripRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    createTrip(request: trip_pb.CreateTripRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    getTrip(request: trip_pb.GetTripRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    getTrip(request: trip_pb.GetTripRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    getTrip(request: trip_pb.GetTripRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    getPool(request: trip_pb.GetPoolRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    getPool(request: trip_pb.GetPoolRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    getPool(request: trip_pb.GetPoolRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    joinPool(request: trip_pb.JoinPoolRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    joinPool(request: trip_pb.JoinPoolRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    joinPool(request: trip_pb.JoinPoolRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    leavePool(request: trip_pb.LeavePoolRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    leavePool(request: trip_pb.LeavePoolRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    leavePool(request: trip_pb.LeavePoolRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    getOpenPools(request: trip_pb.GetOpenPoolsRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.OpenPoolsResponse) => void): grpc.ClientUnaryCall;
    getOpenPools(request: trip_pb.GetOpenPoolsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.OpenPoolsResponse) => void): grpc.ClientUnaryCall;
    getOpenPools(request: trip_pb.GetOpenPoolsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.OpenPoolsResponse) => void): grpc.ClientUnaryCall;
    addFriendToPool(request: trip_pb.AddFriendToPoolRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    addFriendToPool(request: trip_pb.AddFriendToPoolRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    addFriendToPool(request: trip_pb.AddFriendToPoolRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
}

export class TripServiceClient extends grpc.Client implements ITripServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public createTrip(request: trip_pb.CreateTripRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    public createTrip(request: trip_pb.CreateTripRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    public createTrip(request: trip_pb.CreateTripRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    public getTrip(request: trip_pb.GetTripRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    public getTrip(request: trip_pb.GetTripRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    public getTrip(request: trip_pb.GetTripRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.TripResponse) => void): grpc.ClientUnaryCall;
    public getPool(request: trip_pb.GetPoolRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public getPool(request: trip_pb.GetPoolRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public getPool(request: trip_pb.GetPoolRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public joinPool(request: trip_pb.JoinPoolRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public joinPool(request: trip_pb.JoinPoolRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public joinPool(request: trip_pb.JoinPoolRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public leavePool(request: trip_pb.LeavePoolRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public leavePool(request: trip_pb.LeavePoolRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public leavePool(request: trip_pb.LeavePoolRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public getOpenPools(request: trip_pb.GetOpenPoolsRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.OpenPoolsResponse) => void): grpc.ClientUnaryCall;
    public getOpenPools(request: trip_pb.GetOpenPoolsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.OpenPoolsResponse) => void): grpc.ClientUnaryCall;
    public getOpenPools(request: trip_pb.GetOpenPoolsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.OpenPoolsResponse) => void): grpc.ClientUnaryCall;
    public addFriendToPool(request: trip_pb.AddFriendToPoolRequest, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public addFriendToPool(request: trip_pb.AddFriendToPoolRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
    public addFriendToPool(request: trip_pb.AddFriendToPoolRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: trip_pb.PoolResponse) => void): grpc.ClientUnaryCall;
}
