// package: trip
// file: trip.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Location extends jspb.Message { 
    getLat(): number;
    setLat(value: number): Location;
    getLng(): number;
    setLng(value: number): Location;
    getAddress(): string;
    setAddress(value: string): Location;

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
        address: string,
    }
}

export class Trip extends jspb.Message { 
    getId(): string;
    setId(value: string): Trip;
    getUserId(): string;
    setUserId(value: string): Trip;

    hasDriverId(): boolean;
    clearDriverId(): void;
    getDriverId(): string | undefined;
    setDriverId(value: string): Trip;

    hasOrigin(): boolean;
    clearOrigin(): void;
    getOrigin(): Location | undefined;
    setOrigin(value?: Location): Trip;

    hasDestination(): boolean;
    clearDestination(): void;
    getDestination(): Location | undefined;
    setDestination(value?: Location): Trip;
    getStatus(): TripStatus;
    setStatus(value: TripStatus): Trip;
    getFare(): number;
    setFare(value: number): Trip;

    hasPoolId(): boolean;
    clearPoolId(): void;
    getPoolId(): string | undefined;
    setPoolId(value: string): Trip;
    clearPassengersList(): void;
    getPassengersList(): Array<string>;
    setPassengersList(value: Array<string>): Trip;
    addPassengers(value: string, index?: number): string;

    hasVehicleType(): boolean;
    clearVehicleType(): void;
    getVehicleType(): VehicleType | undefined;
    setVehicleType(value: VehicleType): Trip;

    hasMaxPassengers(): boolean;
    clearMaxPassengers(): void;
    getMaxPassengers(): number | undefined;
    setMaxPassengers(value: number): Trip;
    getCreatedAt(): number;
    setCreatedAt(value: number): Trip;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Trip.AsObject;
    static toObject(includeInstance: boolean, msg: Trip): Trip.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Trip, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Trip;
    static deserializeBinaryFromReader(message: Trip, reader: jspb.BinaryReader): Trip;
}

export namespace Trip {
    export type AsObject = {
        id: string,
        userId: string,
        driverId?: string,
        origin?: Location.AsObject,
        destination?: Location.AsObject,
        status: TripStatus,
        fare: number,
        poolId?: string,
        passengersList: Array<string>,
        vehicleType?: VehicleType,
        maxPassengers?: number,
        createdAt: number,
    }
}

export class RidePool extends jspb.Message { 
    getId(): string;
    setId(value: string): RidePool;
    clearTripsList(): void;
    getTripsList(): Array<Trip>;
    setTripsList(value: Array<Trip>): RidePool;
    addTrips(value?: Trip, index?: number): Trip;
    getCurrentPassengers(): number;
    setCurrentPassengers(value: number): RidePool;
    getMaxPassengers(): number;
    setMaxPassengers(value: number): RidePool;
    getVehicleType(): VehicleType;
    setVehicleType(value: VehicleType): RidePool;

    hasOrigin(): boolean;
    clearOrigin(): void;
    getOrigin(): Location | undefined;
    setOrigin(value?: Location): RidePool;

    hasDestination(): boolean;
    clearDestination(): void;
    getDestination(): Location | undefined;
    setDestination(value?: Location): RidePool;
    getStatus(): PoolStatus;
    setStatus(value: PoolStatus): RidePool;
    getCreatedAt(): number;
    setCreatedAt(value: number): RidePool;

    hasDriverId(): boolean;
    clearDriverId(): void;
    getDriverId(): string | undefined;
    setDriverId(value: string): RidePool;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RidePool.AsObject;
    static toObject(includeInstance: boolean, msg: RidePool): RidePool.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RidePool, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RidePool;
    static deserializeBinaryFromReader(message: RidePool, reader: jspb.BinaryReader): RidePool;
}

export namespace RidePool {
    export type AsObject = {
        id: string,
        tripsList: Array<Trip.AsObject>,
        currentPassengers: number,
        maxPassengers: number,
        vehicleType: VehicleType,
        origin?: Location.AsObject,
        destination?: Location.AsObject,
        status: PoolStatus,
        createdAt: number,
        driverId?: string,
    }
}

export class CreateTripRequest extends jspb.Message { 

    hasTrip(): boolean;
    clearTrip(): void;
    getTrip(): Trip | undefined;
    setTrip(value?: Trip): CreateTripRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateTripRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CreateTripRequest): CreateTripRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateTripRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateTripRequest;
    static deserializeBinaryFromReader(message: CreateTripRequest, reader: jspb.BinaryReader): CreateTripRequest;
}

export namespace CreateTripRequest {
    export type AsObject = {
        trip?: Trip.AsObject,
    }
}

export class GetTripRequest extends jspb.Message { 
    getId(): string;
    setId(value: string): GetTripRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetTripRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetTripRequest): GetTripRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetTripRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetTripRequest;
    static deserializeBinaryFromReader(message: GetTripRequest, reader: jspb.BinaryReader): GetTripRequest;
}

export namespace GetTripRequest {
    export type AsObject = {
        id: string,
    }
}

export class GetPoolRequest extends jspb.Message { 
    getId(): string;
    setId(value: string): GetPoolRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetPoolRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetPoolRequest): GetPoolRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetPoolRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetPoolRequest;
    static deserializeBinaryFromReader(message: GetPoolRequest, reader: jspb.BinaryReader): GetPoolRequest;
}

export namespace GetPoolRequest {
    export type AsObject = {
        id: string,
    }
}

export class JoinPoolRequest extends jspb.Message { 
    getPoolId(): string;
    setPoolId(value: string): JoinPoolRequest;
    getUserId(): string;
    setUserId(value: string): JoinPoolRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): JoinPoolRequest.AsObject;
    static toObject(includeInstance: boolean, msg: JoinPoolRequest): JoinPoolRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: JoinPoolRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): JoinPoolRequest;
    static deserializeBinaryFromReader(message: JoinPoolRequest, reader: jspb.BinaryReader): JoinPoolRequest;
}

export namespace JoinPoolRequest {
    export type AsObject = {
        poolId: string,
        userId: string,
    }
}

export class LeavePoolRequest extends jspb.Message { 
    getPoolId(): string;
    setPoolId(value: string): LeavePoolRequest;
    getUserId(): string;
    setUserId(value: string): LeavePoolRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LeavePoolRequest.AsObject;
    static toObject(includeInstance: boolean, msg: LeavePoolRequest): LeavePoolRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LeavePoolRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LeavePoolRequest;
    static deserializeBinaryFromReader(message: LeavePoolRequest, reader: jspb.BinaryReader): LeavePoolRequest;
}

export namespace LeavePoolRequest {
    export type AsObject = {
        poolId: string,
        userId: string,
    }
}

export class GetOpenPoolsRequest extends jspb.Message { 

    hasVehicleType(): boolean;
    clearVehicleType(): void;
    getVehicleType(): VehicleType | undefined;
    setVehicleType(value: VehicleType): GetOpenPoolsRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetOpenPoolsRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetOpenPoolsRequest): GetOpenPoolsRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetOpenPoolsRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetOpenPoolsRequest;
    static deserializeBinaryFromReader(message: GetOpenPoolsRequest, reader: jspb.BinaryReader): GetOpenPoolsRequest;
}

export namespace GetOpenPoolsRequest {
    export type AsObject = {
        vehicleType?: VehicleType,
    }
}

export class AddFriendToPoolRequest extends jspb.Message { 
    getPoolId(): string;
    setPoolId(value: string): AddFriendToPoolRequest;
    getFriendUniqueId(): string;
    setFriendUniqueId(value: string): AddFriendToPoolRequest;
    getRequestingUserId(): string;
    setRequestingUserId(value: string): AddFriendToPoolRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddFriendToPoolRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AddFriendToPoolRequest): AddFriendToPoolRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddFriendToPoolRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddFriendToPoolRequest;
    static deserializeBinaryFromReader(message: AddFriendToPoolRequest, reader: jspb.BinaryReader): AddFriendToPoolRequest;
}

export namespace AddFriendToPoolRequest {
    export type AsObject = {
        poolId: string,
        friendUniqueId: string,
        requestingUserId: string,
    }
}

export class TripResponse extends jspb.Message { 

    hasTrip(): boolean;
    clearTrip(): void;
    getTrip(): Trip | undefined;
    setTrip(value?: Trip): TripResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TripResponse.AsObject;
    static toObject(includeInstance: boolean, msg: TripResponse): TripResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TripResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TripResponse;
    static deserializeBinaryFromReader(message: TripResponse, reader: jspb.BinaryReader): TripResponse;
}

export namespace TripResponse {
    export type AsObject = {
        trip?: Trip.AsObject,
    }
}

export class PoolResponse extends jspb.Message { 

    hasPool(): boolean;
    clearPool(): void;
    getPool(): RidePool | undefined;
    setPool(value?: RidePool): PoolResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PoolResponse.AsObject;
    static toObject(includeInstance: boolean, msg: PoolResponse): PoolResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PoolResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PoolResponse;
    static deserializeBinaryFromReader(message: PoolResponse, reader: jspb.BinaryReader): PoolResponse;
}

export namespace PoolResponse {
    export type AsObject = {
        pool?: RidePool.AsObject,
    }
}

export class OpenPoolsResponse extends jspb.Message { 
    clearPoolsList(): void;
    getPoolsList(): Array<RidePool>;
    setPoolsList(value: Array<RidePool>): OpenPoolsResponse;
    addPools(value?: RidePool, index?: number): RidePool;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OpenPoolsResponse.AsObject;
    static toObject(includeInstance: boolean, msg: OpenPoolsResponse): OpenPoolsResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OpenPoolsResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OpenPoolsResponse;
    static deserializeBinaryFromReader(message: OpenPoolsResponse, reader: jspb.BinaryReader): OpenPoolsResponse;
}

export namespace OpenPoolsResponse {
    export type AsObject = {
        poolsList: Array<RidePool.AsObject>,
    }
}

export enum VehicleType {
    VEHICLE_TYPE_CAR = 0,
    VEHICLE_TYPE_CNG = 1,
}

export enum TripStatus {
    TRIP_STATUS_PENDING = 0,
    TRIP_STATUS_ACCEPTED = 1,
    TRIP_STATUS_IN_PROGRESS = 2,
    TRIP_STATUS_COMPLETED = 3,
    TRIP_STATUS_CANCELLED = 4,
    TRIP_STATUS_POOLED = 5,
}

export enum PoolStatus {
    POOL_STATUS_OPEN = 0,
    POOL_STATUS_MATCHED = 1,
    POOL_STATUS_IN_PROGRESS = 2,
    POOL_STATUS_COMPLETED = 3,
    POOL_STATUS_CANCELLED = 4,
}
