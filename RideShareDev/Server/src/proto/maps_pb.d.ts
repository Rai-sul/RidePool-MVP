// package: maps
// file: maps.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class GeocodeRequest extends jspb.Message { 
    getAddress(): string;
    setAddress(value: string): GeocodeRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GeocodeRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GeocodeRequest): GeocodeRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GeocodeRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GeocodeRequest;
    static deserializeBinaryFromReader(message: GeocodeRequest, reader: jspb.BinaryReader): GeocodeRequest;
}

export namespace GeocodeRequest {
    export type AsObject = {
        address: string,
    }
}

export class GeocodeResponse extends jspb.Message { 

    hasLocation(): boolean;
    clearLocation(): void;
    getLocation(): Location | undefined;
    setLocation(value?: Location): GeocodeResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GeocodeResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GeocodeResponse): GeocodeResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GeocodeResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GeocodeResponse;
    static deserializeBinaryFromReader(message: GeocodeResponse, reader: jspb.BinaryReader): GeocodeResponse;
}

export namespace GeocodeResponse {
    export type AsObject = {
        location?: Location.AsObject,
    }
}

export class ReverseGeocodeRequest extends jspb.Message { 

    hasLocation(): boolean;
    clearLocation(): void;
    getLocation(): Location | undefined;
    setLocation(value?: Location): ReverseGeocodeRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ReverseGeocodeRequest.AsObject;
    static toObject(includeInstance: boolean, msg: ReverseGeocodeRequest): ReverseGeocodeRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ReverseGeocodeRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ReverseGeocodeRequest;
    static deserializeBinaryFromReader(message: ReverseGeocodeRequest, reader: jspb.BinaryReader): ReverseGeocodeRequest;
}

export namespace ReverseGeocodeRequest {
    export type AsObject = {
        location?: Location.AsObject,
    }
}

export class ReverseGeocodeResponse extends jspb.Message { 
    getAddress(): string;
    setAddress(value: string): ReverseGeocodeResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ReverseGeocodeResponse.AsObject;
    static toObject(includeInstance: boolean, msg: ReverseGeocodeResponse): ReverseGeocodeResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ReverseGeocodeResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ReverseGeocodeResponse;
    static deserializeBinaryFromReader(message: ReverseGeocodeResponse, reader: jspb.BinaryReader): ReverseGeocodeResponse;
}

export namespace ReverseGeocodeResponse {
    export type AsObject = {
        address: string,
    }
}

export class GetRouteRequest extends jspb.Message { 

    hasStart(): boolean;
    clearStart(): void;
    getStart(): Location | undefined;
    setStart(value?: Location): GetRouteRequest;

    hasEnd(): boolean;
    clearEnd(): void;
    getEnd(): Location | undefined;
    setEnd(value?: Location): GetRouteRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetRouteRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetRouteRequest): GetRouteRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetRouteRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetRouteRequest;
    static deserializeBinaryFromReader(message: GetRouteRequest, reader: jspb.BinaryReader): GetRouteRequest;
}

export namespace GetRouteRequest {
    export type AsObject = {
        start?: Location.AsObject,
        end?: Location.AsObject,
    }
}

export class GetRouteResponse extends jspb.Message { 
    clearPathList(): void;
    getPathList(): Array<Location>;
    setPathList(value: Array<Location>): GetRouteResponse;
    addPath(value?: Location, index?: number): Location;
    getDistance(): number;
    setDistance(value: number): GetRouteResponse;
    getDuration(): number;
    setDuration(value: number): GetRouteResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetRouteResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetRouteResponse): GetRouteResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetRouteResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetRouteResponse;
    static deserializeBinaryFromReader(message: GetRouteResponse, reader: jspb.BinaryReader): GetRouteResponse;
}

export namespace GetRouteResponse {
    export type AsObject = {
        pathList: Array<Location.AsObject>,
        distance: number,
        duration: number,
    }
}

export class Location extends jspb.Message { 
    getLat(): number;
    setLat(value: number): Location;
    getLng(): number;
    setLng(value: number): Location;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Location.AsObject;
    static toObject(includeInstance: boolean, msg: Location): Location.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Location, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Location;
    static deserializeBinaryFromReader(message: Location, reader: jspb.BinaryReader): Location;
}

export namespace Location {
    export type AsObject = {
        lat: number,
        lng: number,
    }
}
