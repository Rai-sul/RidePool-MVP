// package: notifications
// file: notifications.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as notifications_pb from "./notifications_pb";

interface INotificationsService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    sendNotification: INotificationsService_ISendNotification;
    getNotifications: INotificationsService_IGetNotifications;
    markAsRead: INotificationsService_IMarkAsRead;
}

interface INotificationsService_ISendNotification extends grpc.MethodDefinition<notifications_pb.SendNotificationRequest, notifications_pb.NotificationResponse> {
    path: "/notifications.Notifications/SendNotification";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<notifications_pb.SendNotificationRequest>;
    requestDeserialize: grpc.deserialize<notifications_pb.SendNotificationRequest>;
    responseSerialize: grpc.serialize<notifications_pb.NotificationResponse>;
    responseDeserialize: grpc.deserialize<notifications_pb.NotificationResponse>;
}
interface INotificationsService_IGetNotifications extends grpc.MethodDefinition<notifications_pb.GetNotificationsRequest, notifications_pb.NotificationsResponse> {
    path: "/notifications.Notifications/GetNotifications";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<notifications_pb.GetNotificationsRequest>;
    requestDeserialize: grpc.deserialize<notifications_pb.GetNotificationsRequest>;
    responseSerialize: grpc.serialize<notifications_pb.NotificationsResponse>;
    responseDeserialize: grpc.deserialize<notifications_pb.NotificationsResponse>;
}
interface INotificationsService_IMarkAsRead extends grpc.MethodDefinition<notifications_pb.MarkAsReadRequest, notifications_pb.NotificationResponse> {
    path: "/notifications.Notifications/MarkAsRead";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<notifications_pb.MarkAsReadRequest>;
    requestDeserialize: grpc.deserialize<notifications_pb.MarkAsReadRequest>;
    responseSerialize: grpc.serialize<notifications_pb.NotificationResponse>;
    responseDeserialize: grpc.deserialize<notifications_pb.NotificationResponse>;
}

export const NotificationsService: INotificationsService;

export interface INotificationsServer extends grpc.UntypedServiceImplementation {
    sendNotification: grpc.handleUnaryCall<notifications_pb.SendNotificationRequest, notifications_pb.NotificationResponse>;
    getNotifications: grpc.handleUnaryCall<notifications_pb.GetNotificationsRequest, notifications_pb.NotificationsResponse>;
    markAsRead: grpc.handleUnaryCall<notifications_pb.MarkAsReadRequest, notifications_pb.NotificationResponse>;
}

export interface INotificationsClient {
    sendNotification(request: notifications_pb.SendNotificationRequest, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    sendNotification(request: notifications_pb.SendNotificationRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    sendNotification(request: notifications_pb.SendNotificationRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    getNotifications(request: notifications_pb.GetNotificationsRequest, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationsResponse) => void): grpc.ClientUnaryCall;
    getNotifications(request: notifications_pb.GetNotificationsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationsResponse) => void): grpc.ClientUnaryCall;
    getNotifications(request: notifications_pb.GetNotificationsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationsResponse) => void): grpc.ClientUnaryCall;
    markAsRead(request: notifications_pb.MarkAsReadRequest, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    markAsRead(request: notifications_pb.MarkAsReadRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    markAsRead(request: notifications_pb.MarkAsReadRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
}

export class NotificationsClient extends grpc.Client implements INotificationsClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public sendNotification(request: notifications_pb.SendNotificationRequest, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    public sendNotification(request: notifications_pb.SendNotificationRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    public sendNotification(request: notifications_pb.SendNotificationRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    public getNotifications(request: notifications_pb.GetNotificationsRequest, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationsResponse) => void): grpc.ClientUnaryCall;
    public getNotifications(request: notifications_pb.GetNotificationsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationsResponse) => void): grpc.ClientUnaryCall;
    public getNotifications(request: notifications_pb.GetNotificationsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationsResponse) => void): grpc.ClientUnaryCall;
    public markAsRead(request: notifications_pb.MarkAsReadRequest, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    public markAsRead(request: notifications_pb.MarkAsReadRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
    public markAsRead(request: notifications_pb.MarkAsReadRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: notifications_pb.NotificationResponse) => void): grpc.ClientUnaryCall;
}
