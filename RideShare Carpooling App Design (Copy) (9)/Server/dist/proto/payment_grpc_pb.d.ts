// package: payment
// file: payment.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as payment_pb from "./payment_pb";

interface IPaymentServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    initiatePayment: IPaymentServiceService_IInitiatePayment;
    handlePaymentCallback: IPaymentServiceService_IHandlePaymentCallback;
}

interface IPaymentServiceService_IInitiatePayment extends grpc.MethodDefinition<payment_pb.InitiatePaymentRequest, payment_pb.InitiatePaymentResponse> {
    path: "/payment.PaymentService/InitiatePayment";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<payment_pb.InitiatePaymentRequest>;
    requestDeserialize: grpc.deserialize<payment_pb.InitiatePaymentRequest>;
    responseSerialize: grpc.serialize<payment_pb.InitiatePaymentResponse>;
    responseDeserialize: grpc.deserialize<payment_pb.InitiatePaymentResponse>;
}
interface IPaymentServiceService_IHandlePaymentCallback extends grpc.MethodDefinition<payment_pb.HandlePaymentCallbackRequest, payment_pb.HandlePaymentCallbackResponse> {
    path: "/payment.PaymentService/HandlePaymentCallback";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<payment_pb.HandlePaymentCallbackRequest>;
    requestDeserialize: grpc.deserialize<payment_pb.HandlePaymentCallbackRequest>;
    responseSerialize: grpc.serialize<payment_pb.HandlePaymentCallbackResponse>;
    responseDeserialize: grpc.deserialize<payment_pb.HandlePaymentCallbackResponse>;
}

export const PaymentServiceService: IPaymentServiceService;

export interface IPaymentServiceServer extends grpc.UntypedServiceImplementation {
    initiatePayment: grpc.handleUnaryCall<payment_pb.InitiatePaymentRequest, payment_pb.InitiatePaymentResponse>;
    handlePaymentCallback: grpc.handleUnaryCall<payment_pb.HandlePaymentCallbackRequest, payment_pb.HandlePaymentCallbackResponse>;
}

export interface IPaymentServiceClient {
    initiatePayment(request: payment_pb.InitiatePaymentRequest, callback: (error: grpc.ServiceError | null, response: payment_pb.InitiatePaymentResponse) => void): grpc.ClientUnaryCall;
    initiatePayment(request: payment_pb.InitiatePaymentRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: payment_pb.InitiatePaymentResponse) => void): grpc.ClientUnaryCall;
    initiatePayment(request: payment_pb.InitiatePaymentRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: payment_pb.InitiatePaymentResponse) => void): grpc.ClientUnaryCall;
    handlePaymentCallback(request: payment_pb.HandlePaymentCallbackRequest, callback: (error: grpc.ServiceError | null, response: payment_pb.HandlePaymentCallbackResponse) => void): grpc.ClientUnaryCall;
    handlePaymentCallback(request: payment_pb.HandlePaymentCallbackRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: payment_pb.HandlePaymentCallbackResponse) => void): grpc.ClientUnaryCall;
    handlePaymentCallback(request: payment_pb.HandlePaymentCallbackRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: payment_pb.HandlePaymentCallbackResponse) => void): grpc.ClientUnaryCall;
}

export class PaymentServiceClient extends grpc.Client implements IPaymentServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public initiatePayment(request: payment_pb.InitiatePaymentRequest, callback: (error: grpc.ServiceError | null, response: payment_pb.InitiatePaymentResponse) => void): grpc.ClientUnaryCall;
    public initiatePayment(request: payment_pb.InitiatePaymentRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: payment_pb.InitiatePaymentResponse) => void): grpc.ClientUnaryCall;
    public initiatePayment(request: payment_pb.InitiatePaymentRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: payment_pb.InitiatePaymentResponse) => void): grpc.ClientUnaryCall;
    public handlePaymentCallback(request: payment_pb.HandlePaymentCallbackRequest, callback: (error: grpc.ServiceError | null, response: payment_pb.HandlePaymentCallbackResponse) => void): grpc.ClientUnaryCall;
    public handlePaymentCallback(request: payment_pb.HandlePaymentCallbackRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: payment_pb.HandlePaymentCallbackResponse) => void): grpc.ClientUnaryCall;
    public handlePaymentCallback(request: payment_pb.HandlePaymentCallbackRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: payment_pb.HandlePaymentCallbackResponse) => void): grpc.ClientUnaryCall;
}
