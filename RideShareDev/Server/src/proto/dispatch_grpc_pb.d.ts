// package: dispatch
// file: dispatch.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as dispatch_pb from "./dispatch_pb";
import * as trip_pb from "./trip_pb";

interface IDispatchServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    findDriver: IDispatchServiceService_IFindDriver;
}

interface IDispatchServiceService_IFindDriver extends grpc.MethodDefinition<dispatch_pb.FindDriverRequest, dispatch_pb.FindDriverResponse> {
    path: "/dispatch.DispatchService/FindDriver";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<dispatch_pb.FindDriverRequest>;
    requestDeserialize: grpc.deserialize<dispatch_pb.FindDriverRequest>;
    responseSerialize: grpc.serialize<dispatch_pb.FindDriverResponse>;
    responseDeserialize: grpc.deserialize<dispatch_pb.FindDriverResponse>;
}

export const DispatchServiceService: IDispatchServiceService;

export interface IDispatchServiceServer extends grpc.UntypedServiceImplementation {
    findDriver: grpc.handleUnaryCall<dispatch_pb.FindDriverRequest, dispatch_pb.FindDriverResponse>;
}

export interface IDispatchServiceClient {
    findDriver(request: dispatch_pb.FindDriverRequest, callback: (error: grpc.ServiceError | null, response: dispatch_pb.FindDriverResponse) => void): grpc.ClientUnaryCall;
    findDriver(request: dispatch_pb.FindDriverRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: dispatch_pb.FindDriverResponse) => void): grpc.ClientUnaryCall;
    findDriver(request: dispatch_pb.FindDriverRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: dispatch_pb.FindDriverResponse) => void): grpc.ClientUnaryCall;
}

export class DispatchServiceClient extends grpc.Client implements IDispatchServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public findDriver(request: dispatch_pb.FindDriverRequest, callback: (error: grpc.ServiceError | null, response: dispatch_pb.FindDriverResponse) => void): grpc.ClientUnaryCall;
    public findDriver(request: dispatch_pb.FindDriverRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: dispatch_pb.FindDriverResponse) => void): grpc.ClientUnaryCall;
    public findDriver(request: dispatch_pb.FindDriverRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: dispatch_pb.FindDriverResponse) => void): grpc.ClientUnaryCall;
}
