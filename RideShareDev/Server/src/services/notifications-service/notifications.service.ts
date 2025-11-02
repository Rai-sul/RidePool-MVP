import { Notification } from './notifications.model';
import { v4 as uuidv4 } from 'uuid';

const notifications: Notification[] = [];

export class NotificationsService {
  async sendNotification(userId: string, message: string): Promise<Notification> {
    const newNotification: Notification = {
      id: uuidv4(),
      userId,
      message,
      type: 'system', // Default type
      read: false,
      createdAt: Date.now(),
    };
    notifications.push(newNotification);
    console.log(`Notification sent to user ${newNotification.userId}: ${newNotification.message}`);
    return newNotification;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  }

  async markAsRead(notificationId: string): Promise<Notification | undefined> {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
    return notification;
  }
}