// package: payment
// file: payment.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Payment extends jspb.Message { 
    getId(): string;
    setId(value: string): Payment;
    getUserId(): string;
    setUserId(value: string): Payment;
    getTripId(): string;
    setTripId(value: string): Payment;
    getAmount(): number;
    setAmount(value: number): Payment;
    getCurrency(): string;
    setCurrency(value: string): Payment;
    getStatus(): Payment.PaymentStatus;
    setStatus(value: Payment.PaymentStatus): Payment;
    getTransactionId(): string;
    setTransactionId(value: string): Payment;
    getGatewayResponse(): string;
    setGatewayResponse(value: string): Payment;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Payment.AsObject;
    static toObject(includeInstance: boolean, msg: Payment): Payment.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Payment, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Payment;
    static deserializeBinaryFromReader(message: Payment, reader: jspb.BinaryReader): Payment;
}

export namespace Payment {
    export type AsObject = {
        id: string,
        userId: string,
        tripId: string,
        amount: number,
        currency: string,
        status: Payment.PaymentStatus,
        transactionId: string,
        gatewayResponse: string,
    }

    export enum PaymentStatus {
    PENDING = 0,
    COMPLETED = 1,
    FAILED = 2,
    REFUNDED = 3,
    }

}

export class InitiatePaymentRequest extends jspb.Message { 
    getUserId(): string;
    setUserId(value: string): InitiatePaymentRequest;
    getTripId(): string;
    setTripId(value: string): InitiatePaymentRequest;
    getAmount(): number;
    setAmount(value: number): InitiatePaymentRequest;
    getCurrency(): string;
    setCurrency(value: string): InitiatePaymentRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InitiatePaymentRequest.AsObject;
    static toObject(includeInstance: boolean, msg: InitiatePaymentRequest): InitiatePaymentRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InitiatePaymentRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InitiatePaymentRequest;
    static deserializeBinaryFromReader(message: InitiatePaymentRequest, reader: jspb.BinaryReader): InitiatePaymentRequest;
}

export namespace InitiatePaymentRequest {
    export type AsObject = {
        userId: string,
        tripId: string,
        amount: number,
        currency: string,
    }
}

export class InitiatePaymentResponse extends jspb.Message { 
    getPaymentUrl(): string;
    setPaymentUrl(value: string): InitiatePaymentResponse;
    getTransactionId(): string;
    setTransactionId(value: string): InitiatePaymentResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InitiatePaymentResponse.AsObject;
    static toObject(includeInstance: boolean, msg: InitiatePaymentResponse): InitiatePaymentResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InitiatePaymentResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InitiatePaymentResponse;
    static deserializeBinaryFromReader(message: InitiatePaymentResponse, reader: jspb.BinaryReader): InitiatePaymentResponse;
}

export namespace InitiatePaymentResponse {
    export type AsObject = {
        paymentUrl: string,
        transactionId: string,
    }
}

export class HandlePaymentCallbackRequest extends jspb.Message { 
    getTransactionId(): string;
    setTransactionId(value: string): HandlePaymentCallbackRequest;
    getStatus(): string;
    setStatus(value: string): HandlePaymentCallbackRequest;
    getGatewayResponse(): string;
    setGatewayResponse(value: string): HandlePaymentCallbackRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HandlePaymentCallbackRequest.AsObject;
    static toObject(includeInstance: boolean, msg: HandlePaymentCallbackRequest): HandlePaymentCallbackRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HandlePaymentCallbackRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HandlePaymentCallbackRequest;
    static deserializeBinaryFromReader(message: HandlePaymentCallbackRequest, reader: jspb.BinaryReader): HandlePaymentCallbackRequest;
}

export namespace HandlePaymentCallbackRequest {
    export type AsObject = {
        transactionId: string,
        status: string,
        gatewayResponse: string,
    }
}

export class HandlePaymentCallbackResponse extends jspb.Message { 

    hasPayment(): boolean;
    clearPayment(): void;
    getPayment(): Payment | undefined;
    setPayment(value?: Payment): HandlePaymentCallbackResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HandlePaymentCallbackResponse.AsObject;
    static toObject(includeInstance: boolean, msg: HandlePaymentCallbackResponse): HandlePaymentCallbackResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HandlePaymentCallbackResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HandlePaymentCallbackResponse;
    static deserializeBinaryFromReader(message: HandlePaymentCallbackResponse, reader: jspb.BinaryReader): HandlePaymentCallbackResponse;
}

export namespace HandlePaymentCallbackResponse {
    export type AsObject = {
        payment?: Payment.AsObject,
    }
}
