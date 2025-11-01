// package: pricing
// file: pricing.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as pricing_pb from "./pricing_pb";
import * as trip_pb from "./trip_pb";

interface IPricingServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    calculateFare: IPricingServiceService_ICalculateFare;
}

interface IPricingServiceService_ICalculateFare extends grpc.MethodDefinition<pricing_pb.CalculateFareRequest, pricing_pb.CalculateFareResponse> {
    path: "/pricing.PricingService/CalculateFare";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<pricing_pb.CalculateFareRequest>;
    requestDeserialize: grpc.deserialize<pricing_pb.CalculateFareRequest>;
    responseSerialize: grpc.serialize<pricing_pb.CalculateFareResponse>;
    responseDeserialize: grpc.deserialize<pricing_pb.CalculateFareResponse>;
}

export const PricingServiceService: IPricingServiceService;

export interface IPricingServiceServer extends grpc.UntypedServiceImplementation {
    calculateFare: grpc.handleUnaryCall<pricing_pb.CalculateFareRequest, pricing_pb.CalculateFareResponse>;
}

export interface IPricingServiceClient {
    calculateFare(request: pricing_pb.CalculateFareRequest, callback: (error: grpc.ServiceError | null, response: pricing_pb.CalculateFareResponse) => void): grpc.ClientUnaryCall;
    calculateFare(request: pricing_pb.CalculateFareRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: pricing_pb.CalculateFareResponse) => void): grpc.ClientUnaryCall;
    calculateFare(request: pricing_pb.CalculateFareRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: pricing_pb.CalculateFareResponse) => void): grpc.ClientUnaryCall;
}

export class PricingServiceClient extends grpc.Client implements IPricingServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public calculateFare(request: pricing_pb.CalculateFareRequest, callback: (error: grpc.ServiceError | null, response: pricing_pb.CalculateFareResponse) => void): grpc.ClientUnaryCall;
    public calculateFare(request: pricing_pb.CalculateFareRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: pricing_pb.CalculateFareResponse) => void): grpc.ClientUnaryCall;
    public calculateFare(request: pricing_pb.CalculateFareRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: pricing_pb.CalculateFareResponse) => void): grpc.ClientUnaryCall;
}
