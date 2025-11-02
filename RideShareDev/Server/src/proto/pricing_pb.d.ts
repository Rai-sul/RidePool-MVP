// package: pricing
// file: pricing.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as trip_pb from "./trip_pb";

export class Price extends jspb.Message { 
    getTripId(): string;
    setTripId(value: string): Price;
    getFare(): number;
    setFare(value: number): Price;
    getSurgeMultiplier(): number;
    setSurgeMultiplier(value: number): Price;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Price.AsObject;
    static toObject(includeInstance: boolean, msg: Price): Price.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Price, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Price;
    static deserializeBinaryFromReader(message: Price, reader: jspb.BinaryReader): Price;
}

export namespace Price {
    export type AsObject = {
        tripId: string,
        fare: number,
        surgeMultiplier: number,
    }
}

export class CalculateFareRequest extends jspb.Message { 

    hasTrip(): boolean;
    clearTrip(): void;
    getTrip(): trip_pb.Trip | undefined;
    setTrip(value?: trip_pb.Trip): CalculateFareRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CalculateFareRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CalculateFareRequest): CalculateFareRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CalculateFareRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CalculateFareRequest;
    static deserializeBinaryFromReader(message: CalculateFareRequest, reader: jspb.BinaryReader): CalculateFareRequest;
}

export namespace CalculateFareRequest {
    export type AsObject = {
        trip?: trip_pb.Trip.AsObject,
    }
}

export class CalculateFareResponse extends jspb.Message { 

    hasPrice(): boolean;
    clearPrice(): void;
    getPrice(): Price | undefined;
    setPrice(value?: Price): CalculateFareResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CalculateFareResponse.AsObject;
    static toObject(includeInstance: boolean, msg: CalculateFareResponse): CalculateFareResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CalculateFareResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CalculateFareResponse;
    static deserializeBinaryFromReader(message: CalculateFareResponse, reader: jspb.BinaryReader): CalculateFareResponse;
}

export namespace CalculateFareResponse {
    export type AsObject = {
        price?: Price.AsObject,
    }
}
