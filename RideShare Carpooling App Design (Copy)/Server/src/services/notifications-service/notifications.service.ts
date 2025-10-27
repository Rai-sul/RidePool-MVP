import { Notification } from './notifications.model';
import { v4 as uuidv4 } from 'uuid';

const notifications: Notification[] = [];

export const sendNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> => {
  const newNotification: Notification = {
    ...notification,
    id: uuidv4(),
    read: false,
    createdAt: Date.now(),
  };
  notifications.push(newNotification);
  console.log(`Notification sent to user ${newNotification.userId}: ${newNotification.message}`);
  return newNotification;
};

export const getNotificationsByUserId = async (userId: string): Promise<Notification[]> => {
  return notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
};

export const markNotificationAsRead = async (notificationId: string): Promise<Notification | undefined> => {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
  return notification;
};