"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationAsRead = exports.getNotificationsByUserId = exports.sendNotification = void 0;
const uuid_1 = require("uuid");
const notifications = [];
const sendNotification = (notification) => __awaiter(void 0, void 0, void 0, function* () {
    const newNotification = Object.assign(Object.assign({}, notification), { id: (0, uuid_1.v4)(), read: false, createdAt: Date.now() });
    notifications.push(newNotification);
    console.log(`Notification sent to user ${newNotification.userId}: ${newNotification.message}`);
    return newNotification;
});
exports.sendNotification = sendNotification;
const getNotificationsByUserId = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
});
exports.getNotificationsByUserId = getNotificationsByUserId;
const markNotificationAsRead = (notificationId) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
    }
    return notification;
});
exports.markNotificationAsRead = markNotificationAsRead;
