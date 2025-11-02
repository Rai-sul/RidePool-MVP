// package: notifications
// file: notifications.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Notification extends jspb.Message { 
    getId(): string;
    setId(value: string): Notification;
    getUserid(): string;
    setUserid(value: string): Notification;
    getMessage(): string;
    setMessage(value: string): Notification;
    getRead(): boolean;
    setRead(value: boolean): Notification;
    getCreatedat(): string;
    setCreatedat(value: string): Notification;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Notification.AsObject;
    static toObject(includeInstance: boolean, msg: Notification): Notification.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Notification, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Notification;
    static deserializeBinaryFromReader(message: Notification, reader: jspb.BinaryReader): Notification;
}

export namespace Notification {
    export type AsObject = {
        id: string,
        userid: string,
        message: string,
        read: boolean,
        createdat: string,
    }
}

export class SendNotificationRequest extends jspb.Message { 
    getUserid(): string;
    setUserid(value: string): SendNotificationRequest;
    getMessage(): string;
    setMessage(value: string): SendNotificationRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SendNotificationRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SendNotificationRequest): SendNotificationRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SendNotificationRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SendNotificationRequest;
    static deserializeBinaryFromReader(message: SendNotificationRequest, reader: jspb.BinaryReader): SendNotificationRequest;
}

export namespace SendNotificationRequest {
    export type AsObject = {
        userid: string,
        message: string,
    }
}

export class GetNotificationsRequest extends jspb.Message { 
    getUserid(): string;
    setUserid(value: string): GetNotificationsRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetNotificationsRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetNotificationsRequest): GetNotificationsRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetNotificationsRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetNotificationsRequest;
    static deserializeBinaryFromReader(message: GetNotificationsRequest, reader: jspb.BinaryReader): GetNotificationsRequest;
}

export namespace GetNotificationsRequest {
    export type AsObject = {
        userid: string,
    }
}

export class MarkAsReadRequest extends jspb.Message { 
    getId(): string;
    setId(value: string): MarkAsReadRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): MarkAsReadRequest.AsObject;
    static toObject(includeInstance: boolean, msg: MarkAsReadRequest): MarkAsReadRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: MarkAsReadRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): MarkAsReadRequest;
    static deserializeBinaryFromReader(message: MarkAsReadRequest, reader: jspb.BinaryReader): MarkAsReadRequest;
}

export namespace MarkAsReadRequest {
    export type AsObject = {
        id: string,
    }
}

export class NotificationResponse extends jspb.Message { 

    hasNotification(): boolean;
    clearNotification(): void;
    getNotification(): Notification | undefined;
    setNotification(value?: Notification): NotificationResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NotificationResponse.AsObject;
    static toObject(includeInstance: boolean, msg: NotificationResponse): NotificationResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NotificationResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NotificationResponse;
    static deserializeBinaryFromReader(message: NotificationResponse, reader: jspb.BinaryReader): NotificationResponse;
}

export namespace NotificationResponse {
    export type AsObject = {
        notification?: Notification.AsObject,
    }
}

export class NotificationsResponse extends jspb.Message { 
    clearNotificationsList(): void;
    getNotificationsList(): Array<Notification>;
    setNotificationsList(value: Array<Notification>): NotificationsResponse;
    addNotifications(value?: Notification, index?: number): Notification;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NotificationsResponse.AsObject;
    static toObject(includeInstance: boolean, msg: NotificationsResponse): NotificationsResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NotificationsResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NotificationsResponse;
    static deserializeBinaryFromReader(message: NotificationsResponse, reader: jspb.BinaryReader): NotificationsResponse;
}

export namespace NotificationsResponse {
    export type AsObject = {
        notificationsList: Array<Notification.AsObject>,
    }
}
