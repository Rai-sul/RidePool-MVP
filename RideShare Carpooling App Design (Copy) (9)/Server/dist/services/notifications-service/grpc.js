"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGrpcServer = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const notifications_service_1 = require("./notifications.service");
const notifications_grpc_pb_1 = require("../../proto/notifications_grpc_pb");
const notifications_pb_1 = require("../../proto/notifications_pb");
const notificationsService = new notifications_service_1.NotificationsService();
const notificationsServer = {
    sendNotification: (call, callback) => {
        const { userid, message } = call.request.toObject();
        notificationsService.sendNotification(userid, message).then(notification => {
            const response = new notifications_pb_1.NotificationResponse();
            const protoNotification = new notifications_pb_1.Notification();
            protoNotification.setId(notification.id);
            protoNotification.setUserid(notification.userId);
            protoNotification.setMessage(notification.message);
            protoNotification.setRead(notification.read);
            protoNotification.setCreatedat(notification.createdAt.toString());
            response.setNotification(protoNotification);
            callback(null, response);
        });
    },
    getNotifications: (call, callback) => {
        notificationsService.getNotifications(call.request.getUserid()).then(notifications => {
            const response = new notifications_pb_1.NotificationsResponse();
            const protoNotifications = notifications.map(notification => {
                const protoNotification = new notifications_pb_1.Notification();
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
    markAsRead: (call, callback) => {
        notificationsService.markAsRead(call.request.getId()).then(notification => {
            if (notification) {
                const response = new notifications_pb_1.NotificationResponse();
                const protoNotification = new notifications_pb_1.Notification();
                protoNotification.setId(notification.id);
                protoNotification.setUserid(notification.userId);
                protoNotification.setMessage(notification.message);
                protoNotification.setRead(notification.read);
                protoNotification.setCreatedat(notification.createdAt.toString());
                response.setNotification(protoNotification);
                callback(null, response);
            }
            else {
                const error = new Error('Notification not found.');
                error.code = grpc.status.NOT_FOUND;
                callback(error, null);
            }
        });
    }
};
const startGrpcServer = () => {
    const server = new grpc.Server();
    const serviceDef = notifications_grpc_pb_1.NotificationsService.service;
    server.addService(serviceDef, notificationsServer);
    server.bindAsync('0.0.0.0:50058', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(`Error starting gRPC server for notifications service: ${err.message}`);
            return;
        }
        console.log(`gRPC server for notifications service listening on port ${port}`);
        server.start();
    });
};
exports.startGrpcServer = startGrpcServer;
