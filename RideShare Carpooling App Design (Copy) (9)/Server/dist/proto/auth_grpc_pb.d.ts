// package: auth
// file: auth.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as auth_pb from "./auth_pb";

interface IAuthServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    register: IAuthServiceService_IRegister;
    login: IAuthServiceService_ILogin;
}

interface IAuthServiceService_IRegister extends grpc.MethodDefinition<auth_pb.RegisterRequest, auth_pb.RegisterResponse> {
    path: "/auth.AuthService/Register";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<auth_pb.RegisterRequest>;
    requestDeserialize: grpc.deserialize<auth_pb.RegisterRequest>;
    responseSerialize: grpc.serialize<auth_pb.RegisterResponse>;
    responseDeserialize: grpc.deserialize<auth_pb.RegisterResponse>;
}
interface IAuthServiceService_ILogin extends grpc.MethodDefinition<auth_pb.LoginRequest, auth_pb.LoginResponse> {
    path: "/auth.AuthService/Login";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<auth_pb.LoginRequest>;
    requestDeserialize: grpc.deserialize<auth_pb.LoginRequest>;
    responseSerialize: grpc.serialize<auth_pb.LoginResponse>;
    responseDeserialize: grpc.deserialize<auth_pb.LoginResponse>;
}

export const AuthServiceService: IAuthServiceService;

export interface IAuthServiceServer extends grpc.UntypedServiceImplementation {
    register: grpc.handleUnaryCall<auth_pb.RegisterRequest, auth_pb.RegisterResponse>;
    login: grpc.handleUnaryCall<auth_pb.LoginRequest, auth_pb.LoginResponse>;
}

export interface IAuthServiceClient {
    register(request: auth_pb.RegisterRequest, callback: (error: grpc.ServiceError | null, response: auth_pb.RegisterResponse) => void): grpc.ClientUnaryCall;
    register(request: auth_pb.RegisterRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: auth_pb.RegisterResponse) => void): grpc.ClientUnaryCall;
    register(request: auth_pb.RegisterRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: auth_pb.RegisterResponse) => void): grpc.ClientUnaryCall;
    login(request: auth_pb.LoginRequest, callback: (error: grpc.ServiceError | null, response: auth_pb.LoginResponse) => void): grpc.ClientUnaryCall;
    login(request: auth_pb.LoginRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: auth_pb.LoginResponse) => void): grpc.ClientUnaryCall;
    login(request: auth_pb.LoginRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: auth_pb.LoginResponse) => void): grpc.ClientUnaryCall;
}

export class AuthServiceClient extends grpc.Client implements IAuthServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public register(request: auth_pb.RegisterRequest, callback: (error: grpc.ServiceError | null, response: auth_pb.RegisterResponse) => void): grpc.ClientUnaryCall;
    public register(request: auth_pb.RegisterRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: auth_pb.RegisterResponse) => void): grpc.ClientUnaryCall;
    public register(request: auth_pb.RegisterRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: auth_pb.RegisterResponse) => void): grpc.ClientUnaryCall;
    public login(request: auth_pb.LoginRequest, callback: (error: grpc.ServiceError | null, response: auth_pb.LoginResponse) => void): grpc.ClientUnaryCall;
    public login(request: auth_pb.LoginRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: auth_pb.LoginResponse) => void): grpc.ClientUnaryCall;
    public login(request: auth_pb.LoginRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: auth_pb.LoginResponse) => void): grpc.ClientUnaryCall;
}
