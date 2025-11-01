// package: dispatch
// file: dispatch.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as trip_pb from "./trip_pb";

export class Dispatch extends jspb.Message { 
    getId(): string;
    setId(value: string): Dispatch;
    getTripId(): string;
    setTripId(value: string): Dispatch;
    getDriverId(): string;
    setDriverId(value: string): Dispatch;
    getStatus(): Dispatch.DispatchStatus;
    setStatus(value: Dispatch.DispatchStatus): Dispatch;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Dispatch.AsObject;
    static toObject(includeInstance: boolean, msg: Dispatch): Dispatch.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Dispatch, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Dispatch;
    static deserializeBinaryFromReader(message: Dispatch, reader: jspb.BinaryReader): Dispatch;
}

export namespace Dispatch {
    export type AsObject = {
        id: string,
        tripId: string,
        driverId: string,
        status: Dispatch.DispatchStatus,
    }

    export enum DispatchStatus {
    PENDING = 0,
    ACCEPTED = 1,
    REJECTED = 2,
    COMPLETED = 3,
    CANCELLED = 4,
    }

}

export class FindDriverRequest extends jspb.Message { 

    hasTrip(): boolean;
    clearTrip(): void;
    getTrip(): trip_pb.Trip | undefined;
    setTrip(value?: trip_pb.Trip): FindDriverRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): FindDriverRequest.AsObject;
    static toObject(includeInstance: boolean, msg: FindDriverRequest): FindDriverRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: FindDriverRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): FindDriverRequest;
    static deserializeBinaryFromReader(message: FindDriverRequest, reader: jspb.BinaryReader): FindDriverRequest;
}

export namespace FindDriverRequest {
    export type AsObject = {
        trip?: trip_pb.Trip.AsObject,
    }
}

export class FindDriverResponse extends jspb.Message { 

    hasDispatch(): boolean;
    clearDispatch(): void;
    getDispatch(): Dispatch | undefined;
    setDispatch(value?: Dispatch): FindDriverResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): FindDriverResponse.AsObject;
    static toObject(includeInstance: boolean, msg: FindDriverResponse): FindDriverResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: FindDriverResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): FindDriverResponse;
    static deserializeBinaryFromReader(message: FindDriverResponse, reader: jspb.BinaryReader): FindDriverResponse;
}

export namespace FindDriverResponse {
    export type AsObject = {
        dispatch?: Dispatch.AsObject,
    }
}
