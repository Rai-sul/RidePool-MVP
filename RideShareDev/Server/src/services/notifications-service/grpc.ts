import * as grpc from '@grpc/grpc-js';
import { NotificationsService } from './notifications.service';
import { INotificationsServer, NotificationsService as NotificationsGRPCService } from '../../proto/notifications_grpc_pb';
import { SendNotificationRequest, GetNotificationsRequest, MarkAsReadRequest, NotificationResponse, NotificationsResponse, Notification as ProtoNotification } from '../../proto/notifications_pb';

const notificationsService = new NotificationsService();

const notificationsServer: INotificationsServer = {
  sendNotification: (call: grpc.ServerUnaryCall<SendNotificationRequest, NotificationResponse>, callback: grpc.sendUnaryData<NotificationResponse>): void => {
    const { userid, message } = call.request.toObject();
    notificationsService.sendNotification(userid, message).then(notification => {
      const response = new NotificationResponse();
      const protoNotification = new ProtoNotification();
      protoNotification.setId(notification.id);
      protoNotification.setUserid(notification.userId);
      protoNotification.setMessage(notification.message);
      protoNotification.setRead(notification.read);
      protoNotification.setCreatedat(notification.createdAt.toString());
      response.setNotification(protoNotification);
      callback(null, response);
    });
  },

  getNotifications: (call: grpc.ServerUnaryCall<GetNotificationsRequest, NotificationsResponse>, callback: grpc.sendUnaryData<NotificationsResponse>): void => {
    notificationsService.getNotifications(call.request.getUserid()).then(notifications => {
      const response = new NotificationsResponse();
      const protoNotifications = notifications.map(notification => {
        const protoNotification = new ProtoNotification();
        protoNotification.setId(notification.id);
        protoNotification.setUserid(notification.userId);
        protoNotification.setMessage(notification.message);
        protoNotification.setRead(notification.read);
        protoNotification.setCreatedat(notification.createdAt.toString());
        return protoNotification;
      });
      response.setNotificationsList(protoNotifications);
      callback(null, response);
    });
  },

  markAsRead: (call: grpc.ServerUnaryCall<MarkAsReadRequest, NotificationResponse>, callback: grpc.sendUnaryData<NotificationResponse>): void => {
    notificationsService.markAsRead(call.request.getId()).then(notification => {
      if (notification) {
        const response = new NotificationResponse();
        const protoNotification = new ProtoNotification();
        protoNotification.setId(notification.id);
        protoNotification.setUserid(notification.userId);
        protoNotification.setMessage(notification.message);
        protoNotification.setRead(notification.read);
        protoNotification.setCreatedat(notification.createdAt.toString());
        response.setNotification(protoNotification);
        callback(null, response);
      } else {
        const error: grpc.ServiceError = new Error('Notification not found.') as grpc.ServiceError;
        error.code = grpc.status.NOT_FOUND;
        callback(error, null);
      }
    });
  }
};

export const startGrpcServer = () => {
  const server = new grpc.Server();
  const serviceDef = NotificationsGRPCService.service;
  server.addService(serviceDef as any, notificationsServer);
  server.bindAsync('0.0.0.0:50058', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(`Error starting gRPC server for notifications service: ${err.message}`);
      return;
    }
    console.log(`gRPC server for notifications service listening on port ${port}`);
    server.start();
  });
};
