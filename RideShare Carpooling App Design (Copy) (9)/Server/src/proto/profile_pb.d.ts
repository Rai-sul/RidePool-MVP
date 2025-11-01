// package: profile
// file: profile.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class UserProfile extends jspb.Message { 
    getId(): string;
    setId(value: string): UserProfile;
    getUniqueId(): string;
    setUniqueId(value: string): UserProfile;
    getName(): string;
    setName(value: string): UserProfile;
    getEmail(): string;
    setEmail(value: string): UserProfile;
    getPhoneNumber(): string;
    setPhoneNumber(value: string): UserProfile;
    getAvatarUrl(): string;
    setAvatarUrl(value: string): UserProfile;
    clearFriendsList(): void;
    getFriendsList(): Array<string>;
    setFriendsList(value: Array<string>): UserProfile;
    addFriends(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UserProfile.AsObject;
    static toObject(includeInstance: boolean, msg: UserProfile): UserProfile.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UserProfile, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UserProfile;
    static deserializeBinaryFromReader(message: UserProfile, reader: jspb.BinaryReader): UserProfile;
}

export namespace UserProfile {
    export type AsObject = {
        id: string,
        uniqueId: string,
        name: string,
        email: string,
        phoneNumber: string,
        avatarUrl: string,
        friendsList: Array<string>,
    }
}

export class CreateUserProfileRequest extends jspb.Message { 

    hasProfile(): boolean;
    clearProfile(): void;
    getProfile(): UserProfile | undefined;
    setProfile(value?: UserProfile): CreateUserProfileRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateUserProfileRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CreateUserProfileRequest): CreateUserProfileRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateUserProfileRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateUserProfileRequest;
    static deserializeBinaryFromReader(message: CreateUserProfileRequest, reader: jspb.BinaryReader): CreateUserProfileRequest;
}

export namespace CreateUserProfileRequest {
    export type AsObject = {
        profile?: UserProfile.AsObject,
    }
}

export class GetUserProfileRequest extends jspb.Message { 
    getId(): string;
    setId(value: string): GetUserProfileRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetUserProfileRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetUserProfileRequest): GetUserProfileRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetUserProfileRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetUserProfileRequest;
    static deserializeBinaryFromReader(message: GetUserProfileRequest, reader: jspb.BinaryReader): GetUserProfileRequest;
}

export namespace GetUserProfileRequest {
    export type AsObject = {
        id: string,
    }
}

export class GetUserByUniqueIdRequest extends jspb.Message { 
    getUniqueId(): string;
    setUniqueId(value: string): GetUserByUniqueIdRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetUserByUniqueIdRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetUserByUniqueIdRequest): GetUserByUniqueIdRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetUserByUniqueIdRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetUserByUniqueIdRequest;
    static deserializeBinaryFromReader(message: GetUserByUniqueIdRequest, reader: jspb.BinaryReader): GetUserByUniqueIdRequest;
}

export namespace GetUserByUniqueIdRequest {
    export type AsObject = {
        uniqueId: string,
    }
}

export class AddFriendRequest extends jspb.Message { 
    getUserId(): string;
    setUserId(value: string): AddFriendRequest;
    getFriendUniqueId(): string;
    setFriendUniqueId(value: string): AddFriendRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddFriendRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AddFriendRequest): AddFriendRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddFriendRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddFriendRequest;
    static deserializeBinaryFromReader(message: AddFriendRequest, reader: jspb.BinaryReader): AddFriendRequest;
}

export namespace AddFriendRequest {
    export type AsObject = {
        userId: string,
        friendUniqueId: string,
    }
}

export class UserProfileResponse extends jspb.Message { 

    hasProfile(): boolean;
    clearProfile(): void;
    getProfile(): UserProfile | undefined;
    setProfile(value?: UserProfile): UserProfileResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UserProfileResponse.AsObject;
    static toObject(includeInstance: boolean, msg: UserProfileResponse): UserProfileResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UserProfileResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UserProfileResponse;
    static deserializeBinaryFromReader(message: UserProfileResponse, reader: jspb.BinaryReader): UserProfileResponse;
}

export namespace UserProfileResponse {
    export type AsObject = {
        profile?: UserProfile.AsObject,
    }
}
