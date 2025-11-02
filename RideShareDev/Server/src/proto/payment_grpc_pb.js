// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var payment_pb = require('./payment_pb.js');

function serialize_payment_HandlePaymentCallbackRequest(arg) {
  if (!(arg instanceof payment_pb.HandlePaymentCallbackRequest)) {
    throw new Error('Expected argument of type payment.HandlePaymentCallbackRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_payment_HandlePaymentCallbackRequest(buffer_arg) {
  return payment_pb.HandlePaymentCallbackRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_payment_HandlePaymentCallbackResponse(arg) {
  if (!(arg instanceof payment_pb.HandlePaymentCallbackResponse)) {
    throw new Error('Expected argument of type payment.HandlePaymentCallbackResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_payment_HandlePaymentCallbackResponse(buffer_arg) {
  return payment_pb.HandlePaymentCallbackResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_payment_InitiatePaymentRequest(arg) {
  if (!(arg instanceof payment_pb.InitiatePaymentRequest)) {
    throw new Error('Expected argument of type payment.InitiatePaymentRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_payment_InitiatePaymentRequest(buffer_arg) {
  return payment_pb.InitiatePaymentRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_payment_InitiatePaymentResponse(arg) {
  if (!(arg instanceof payment_pb.InitiatePaymentResponse)) {
    throw new Error('Expected argument of type payment.InitiatePaymentResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_payment_InitiatePaymentResponse(buffer_arg) {
  return payment_pb.InitiatePaymentResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var PaymentServiceService = exports.PaymentServiceService = {
  initiatePayment: {
    path: '/payment.PaymentService/InitiatePayment',
    requestStream: false,
    responseStream: false,
    requestType: payment_pb.InitiatePaymentRequest,
    responseType: payment_pb.InitiatePaymentResponse,
    requestSerialize: serialize_payment_InitiatePaymentRequest,
    requestDeserialize: deserialize_payment_InitiatePaymentRequest,
    responseSerialize: serialize_payment_InitiatePaymentResponse,
    responseDeserialize: deserialize_payment_InitiatePaymentResponse,
  },
  handlePaymentCallback: {
    path: '/payment.PaymentService/HandlePaymentCallback',
    requestStream: false,
    responseStream: false,
    requestType: payment_pb.HandlePaymentCallbackRequest,
    responseType: payment_pb.HandlePaymentCallbackResponse,
    requestSerialize: serialize_payment_HandlePaymentCallbackRequest,
    requestDeserialize: deserialize_payment_HandlePaymentCallbackRequest,
    responseSerialize: serialize_payment_HandlePaymentCallbackResponse,
    responseDeserialize: deserialize_payment_HandlePaymentCallbackResponse,
  },
};

exports.PaymentServiceClient = grpc.makeGenericClientConstructor(PaymentServiceService, 'PaymentService');
