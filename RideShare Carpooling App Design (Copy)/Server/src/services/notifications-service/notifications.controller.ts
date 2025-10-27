import { Request, Response } from 'express';
import * as notificationsService from './notifications.service';
import { Notification } from './notifications.model';

export const sendNotification = async (req: Request, res: Response) => {
  const { userId, type, message, metadata } = req.body;
  if (!userId || !type || !message) {
    return res.status(400).send('User ID, type, and message are required.');
  }
  try {
    const notification = await notificationsService.sendNotification({ userId, type, message, metadata });
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).send('Internal server error.');
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const notifications = await notificationsService.getNotificationsByUserId(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).send('Internal server error.');
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  try {
    const notification = await notificationsService.markNotificationAsRead(notificationId);
    if (notification) {
      res.json(notification);
    } else {
      res.status(404).send('Notification not found.');
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).send('Internal server error.');
  }
};