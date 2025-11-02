// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var notifications_pb = require('./notifications_pb.js');

function serialize_notifications_GetNotificationsRequest(arg) {
  if (!(arg instanceof notifications_pb.GetNotificationsRequest)) {
    throw new Error('Expected argument of type notifications.GetNotificationsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_notifications_GetNotificationsRequest(buffer_arg) {
  return notifications_pb.GetNotificationsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_notifications_MarkAsReadRequest(arg) {
  if (!(arg instanceof notifications_pb.MarkAsReadRequest)) {
    throw new Error('Expected argument of type notifications.MarkAsReadRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_notifications_MarkAsReadRequest(buffer_arg) {
  return notifications_pb.MarkAsReadRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_notifications_NotificationResponse(arg) {
  if (!(arg instanceof notifications_pb.NotificationResponse)) {
    throw new Error('Expected argument of type notifications.NotificationResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_notifications_NotificationResponse(buffer_arg) {
  return notifications_pb.NotificationResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_notifications_NotificationsResponse(arg) {
  if (!(arg instanceof notifications_pb.NotificationsResponse)) {
    throw new Error('Expected argument of type notifications.NotificationsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_notifications_NotificationsResponse(buffer_arg) {
  return notifications_pb.NotificationsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_notifications_SendNotificationRequest(arg) {
  if (!(arg instanceof notifications_pb.SendNotificationRequest)) {
    throw new Error('Expected argument of type notifications.SendNotificationRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_notifications_SendNotificationRequest(buffer_arg) {
  return notifications_pb.SendNotificationRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var NotificationsService = exports.NotificationsService = {
  sendNotification: {
    path: '/notifications.Notifications/SendNotification',
    requestStream: false,
    responseStream: false,
    requestType: notifications_pb.SendNotificationRequest,
    responseType: notifications_pb.NotificationResponse,
    requestSerialize: serialize_notifications_SendNotificationRequest,
    requestDeserialize: deserialize_notifications_SendNotificationRequest,
    responseSerialize: serialize_notifications_NotificationResponse,
    responseDeserialize: deserialize_notifications_NotificationResponse,
  },
  getNotifications: {
    path: '/notifications.Notifications/GetNotifications',
    requestStream: false,
    responseStream: false,
    requestType: notifications_pb.GetNotificationsRequest,
    responseType: notifications_pb.NotificationsResponse,
    requestSerialize: serialize_notifications_GetNotificationsRequest,
    requestDeserialize: deserialize_notifications_GetNotificationsRequest,
    responseSerialize: serialize_notifications_NotificationsResponse,
    responseDeserialize: deserialize_notifications_NotificationsResponse,
  },
  markAsRead: {
    path: '/notifications.Notifications/MarkAsRead',
    requestStream: false,
    responseStream: false,
    requestType: notifications_pb.MarkAsReadRequest,
    responseType: notifications_pb.NotificationResponse,
    requestSerialize: serialize_notifications_MarkAsReadRequest,
    requestDeserialize: deserialize_notifications_MarkAsReadRequest,
    responseSerialize: serialize_notifications_NotificationResponse,
    responseDeserialize: deserialize_notifications_NotificationResponse,
  },
};

exports.NotificationsClient = grpc.makeGenericClientConstructor(NotificationsService, 'Notifications');
